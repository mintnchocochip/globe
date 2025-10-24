use std::collections::VecDeque;

use actix_web::{get, web, HttpResponse};
use chrono::{DateTime, Utc};
use mongodb::{
    bson::{doc, Bson},
    Client,
};
use serde::Serialize;
use tokio::sync::Mutex;

const HISTORY_LIMIT: usize = 60;
const MEGABYTE: f64 = 1024.0 * 1024.0;

pub struct MonitoringState {
    history: Mutex<MetricsHistory>,
}

impl MonitoringState {
    pub fn new() -> Self {
        Self {
            history: Mutex::new(MetricsHistory::default()),
        }
    }
}

#[derive(Default)]
struct MetricsHistory {
    ops: VecDeque<OpsHistory>,
    memory: VecDeque<MemoryHistory>,
    network: VecDeque<NetworkHistory>,
    last_sample: Option<LastSample>,
}

#[derive(Clone)]
struct OpsHistory {
    timestamp: DateTime<Utc>,
    ops_per_second: f64,
}

#[derive(Clone)]
struct MemoryHistory {
    timestamp: DateTime<Utc>,
    resident_mb: f64,
    cache_mb: f64,
    virtual_mb: f64,
}

#[derive(Clone)]
struct NetworkHistory {
    timestamp: DateTime<Utc>,
    bytes_in_per_second: f64,
    bytes_out_per_second: f64,
}

struct LastSample {
    timestamp: DateTime<Utc>,
    insert: i64,
    query: i64,
    update: i64,
    delete: i64,
    getmore: i64,
    command: i64,
    total_ops: i64,
    bytes_in: i64,
    bytes_out: i64,
}

#[derive(Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct OperationPerSecond {
    insert: f64,
    query: f64,
    update: f64,
    delete: f64,
    getmore: f64,
    command: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OperationTotals {
    insert: i64,
    query: i64,
    update: i64,
    delete: i64,
    getmore: i64,
    command: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpsHistoryPoint {
    timestamp: String,
    ops_per_second: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MemoryHistoryPoint {
    timestamp: String,
    resident_mb: f64,
    cache_mb: f64,
    virtual_mb: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkHistoryPoint {
    timestamp: String,
    bytes_in_per_second: f64,
    bytes_out_per_second: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseMemory {
    name: String,
    data_size_mb: f64,
    index_size_mb: f64,
    collections: Vec<CollectionMemory>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CollectionMemory {
    name: String,
    storage_size_mb: f64,
    total_index_size_mb: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerInfo {
    host: Option<String>,
    version: Option<String>,
    uptime_seconds: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionMetrics {
    current: i64,
    available: Option<i64>,
    total_created: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationsMetrics {
    current_ops_per_second: f64,
    per_operation_per_second: OperationPerSecond,
    totals: OperationTotals,
    history: Vec<OpsHistoryPoint>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MemoryMetrics {
    resident_mb: f64,
    virtual_mb: f64,
    cache_mb: f64,
    cache_max_mb: Option<f64>,
    total_data_size_mb: f64,
    total_index_size_mb: f64,
    history: Vec<MemoryHistoryPoint>,
    databases: Vec<DatabaseMemory>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkMetrics {
    bytes_in_per_second: f64,
    bytes_out_per_second: f64,
    history: Vec<NetworkHistoryPoint>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonitoringResponse {
    timestamp: String,
    server: ServerInfo,
    connections: ConnectionMetrics,
    operations: OperationsMetrics,
    memory: MemoryMetrics,
    network: NetworkMetrics,
}

#[get("/monitoring")]
pub async fn metrics(
    client: web::Data<Client>,
    state: web::Data<MonitoringState>,
) -> actix_web::Result<HttpResponse> {
    let admin_db = client.database("admin");
    let status = match admin_db.run_command(doc! { "serverStatus": 1 }).await {
        Ok(doc) => doc,
        Err(err) => {
            eprintln!("serverStatus command failed: {}", err);
            return Ok(HttpResponse::InternalServerError().body("serverStatus failed"));
        }
    };

    let now = status
        .get_datetime("localTime")
        .map(|dt| DateTime::<Utc>::from(dt.to_system_time()))
        .unwrap_or_else(|_| Utc::now());

    let uptime_seconds = status.get_f64("uptime").unwrap_or(0.0);
    let host = status
        .get_str("host")
        .ok()
        .map(|s| s.to_string());
    let version = status
        .get_str("version")
        .ok()
        .map(|s| s.to_string());

    let connections_doc = status.get_document("connections").ok();
    let (connections_current, connections_available, connections_total_created) = match connections_doc {
        Some(doc) => (
            extract_i64(doc.get("current")),
            Some(extract_i64(doc.get("available"))),
            Some(extract_i64(doc.get("totalCreated"))),
        ),
        None => (0, None, None),
    };

    let opcounters = status.get_document("opcounters").ok();
    let insert_total = extract_i64(opcounters.and_then(|doc| doc.get("insert")));
    let query_total = extract_i64(opcounters.and_then(|doc| doc.get("query")));
    let update_total = extract_i64(opcounters.and_then(|doc| doc.get("update")));
    let delete_total = extract_i64(opcounters.and_then(|doc| doc.get("delete")));
    let getmore_total = extract_i64(opcounters.and_then(|doc| doc.get("getmore")));
    let command_total = extract_i64(opcounters.and_then(|doc| doc.get("command")));
    let total_ops = insert_total + query_total + update_total + delete_total + getmore_total + command_total;

    let network_doc = status.get_document("network").ok();
    let bytes_in_total = extract_i64(network_doc.and_then(|doc| doc.get("bytesIn")));
    let bytes_out_total = extract_i64(network_doc.and_then(|doc| doc.get("bytesOut")));

    let mem_doc = status.get_document("mem").ok();
    let resident_mb = extract_f64(mem_doc.and_then(|doc| doc.get("resident")));
    let virtual_mb = extract_f64(mem_doc.and_then(|doc| doc.get("virtual")));

    let wired_tiger_cache = status
        .get_document("wiredTiger")
        .ok()
        .and_then(|wt| wt.get_document("cache").ok());

    let cache_bytes = wired_tiger_cache
        .and_then(|cache| cache.get("bytes currently in the cache"))
        .map(|b| extract_f64(Some(b)) / MEGABYTE)
        .unwrap_or(0.0);
    let cache_max_mb = wired_tiger_cache
        .and_then(|cache| cache.get("maximum bytes configured"))
        .map(|b| extract_f64(Some(b)) / MEGABYTE);

    let mut history_lock = state.history.lock().await;

    let (current_ops_per_second, per_op_rates, bytes_in_per_second, bytes_out_per_second) =
        compute_rates_and_update_history(
            &mut history_lock,
            LastSample {
                timestamp: now,
                insert: insert_total,
                query: query_total,
                update: update_total,
                delete: delete_total,
                getmore: getmore_total,
                command: command_total,
                total_ops,
                bytes_in: bytes_in_total,
                bytes_out: bytes_out_total,
            },
            resident_mb,
            cache_bytes,
            virtual_mb,
        );

    let ops_history: Vec<OpsHistoryPoint> = history_lock
        .ops
        .iter()
        .map(|entry| OpsHistoryPoint {
            timestamp: entry.timestamp.to_rfc3339(),
            ops_per_second: entry.ops_per_second,
        })
        .collect();

    let memory_history: Vec<MemoryHistoryPoint> = history_lock
        .memory
        .iter()
        .map(|entry| MemoryHistoryPoint {
            timestamp: entry.timestamp.to_rfc3339(),
            resident_mb: entry.resident_mb,
            cache_mb: entry.cache_mb,
            virtual_mb: entry.virtual_mb,
        })
        .collect();

    let network_history: Vec<NetworkHistoryPoint> = history_lock
        .network
        .iter()
        .map(|entry| NetworkHistoryPoint {
            timestamp: entry.timestamp.to_rfc3339(),
            bytes_in_per_second: entry.bytes_in_per_second,
            bytes_out_per_second: entry.bytes_out_per_second,
        })
        .collect();

    drop(history_lock);

    let (database_breakdown, total_data_size_mb, total_index_size_mb) =
        match collect_database_memory(client.get_ref()).await {
            Ok(result) => result,
            Err(err) => {
                eprintln!("database memory collection failed: {}", err);
                (Vec::new(), 0.0, 0.0)
            }
        };

    let response = MonitoringResponse {
        timestamp: now.to_rfc3339(),
        server: ServerInfo {
            host,
            version,
            uptime_seconds,
        },
        connections: ConnectionMetrics {
            current: connections_current,
            available: connections_available,
            total_created: connections_total_created,
        },
        operations: OperationsMetrics {
            current_ops_per_second,
            per_operation_per_second: per_op_rates,
            totals: OperationTotals {
                insert: insert_total,
                query: query_total,
                update: update_total,
                delete: delete_total,
                getmore: getmore_total,
                command: command_total,
            },
            history: ops_history,
        },
        memory: MemoryMetrics {
            resident_mb,
            virtual_mb,
            cache_mb: cache_bytes,
            cache_max_mb,
            total_data_size_mb,
            total_index_size_mb,
            history: memory_history,
            databases: database_breakdown,
        },
        network: NetworkMetrics {
            bytes_in_per_second,
            bytes_out_per_second,
            history: network_history,
        },
    };

    Ok(HttpResponse::Ok().json(response))
}

fn compute_rates_and_update_history(
    history: &mut MetricsHistory,
    sample: LastSample,
    resident_mb: f64,
    cache_mb: f64,
    virtual_mb: f64,
) -> (f64, OperationPerSecond, f64, f64) {
    let mut ops_rate = 0.0;
    let mut per_op_rates = OperationPerSecond::default();
    let mut bytes_in_rate = 0.0;
    let mut bytes_out_rate = 0.0;

    if let Some(previous) = history.last_sample.as_ref() {
        let elapsed = (sample.timestamp - previous.timestamp).num_milliseconds() as f64 / 1000.0;
        if elapsed > 0.0 {
            ops_rate = rate(sample.total_ops - previous.total_ops, elapsed);
            per_op_rates.insert = rate(sample.insert - previous.insert, elapsed);
            per_op_rates.query = rate(sample.query - previous.query, elapsed);
            per_op_rates.update = rate(sample.update - previous.update, elapsed);
            per_op_rates.delete = rate(sample.delete - previous.delete, elapsed);
            per_op_rates.getmore = rate(sample.getmore - previous.getmore, elapsed);
            per_op_rates.command = rate(sample.command - previous.command, elapsed);
            bytes_in_rate = rate(sample.bytes_in - previous.bytes_in, elapsed);
            bytes_out_rate = rate(sample.bytes_out - previous.bytes_out, elapsed);
        }
    }

    history.ops.push_back(OpsHistory {
        timestamp: sample.timestamp,
        ops_per_second: ops_rate,
    });
    if history.ops.len() > HISTORY_LIMIT {
        history.ops.pop_front();
    }

    history.memory.push_back(MemoryHistory {
        timestamp: sample.timestamp,
        resident_mb,
        cache_mb,
        virtual_mb,
    });
    if history.memory.len() > HISTORY_LIMIT {
        history.memory.pop_front();
    }

    history.network.push_back(NetworkHistory {
        timestamp: sample.timestamp,
        bytes_in_per_second: bytes_in_rate,
        bytes_out_per_second: bytes_out_rate,
    });
    if history.network.len() > HISTORY_LIMIT {
        history.network.pop_front();
    }

    history.last_sample = Some(sample);

    (ops_rate, per_op_rates, bytes_in_rate, bytes_out_rate)
}

fn rate(delta: i64, elapsed: f64) -> f64 {
    if elapsed <= 0.0 {
        return 0.0;
    }
    let value = delta.max(0) as f64 / elapsed;
    (value * 100.0).round() / 100.0
}

fn extract_i64(value: Option<&Bson>) -> i64 {
    match value {
        Some(Bson::Int32(v)) => *v as i64,
        Some(Bson::Int64(v)) => *v,
        Some(Bson::Double(v)) => *v as i64,
        Some(Bson::Decimal128(v)) => v
            .to_string()
            .parse::<f64>()
            .map(|f| f as i64)
            .unwrap_or(0),
        Some(Bson::String(s)) => s.parse::<i64>().unwrap_or(0),
        _ => 0,
    }
}

fn extract_f64(value: Option<&Bson>) -> f64 {
    match value {
        Some(Bson::Double(v)) => *v,
        Some(Bson::Int32(v)) => *v as f64,
        Some(Bson::Int64(v)) => *v as f64,
        Some(Bson::Decimal128(v)) => v
            .to_string()
            .parse::<f64>()
            .unwrap_or(0.0),
        Some(Bson::String(s)) => s.parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

async fn collect_database_memory(client: &Client) -> mongodb::error::Result<(Vec<DatabaseMemory>, f64, f64)> {
    let mut breakdown = Vec::new();
    let mut total_data = 0.0;
    let mut total_index = 0.0;

    let db_names = client.list_database_names().await?;

    for name in db_names {
        let db = client.database(&name);
        let stats = match db.run_command(doc! { "dbstats": 1 }).await {
            Ok(doc) => doc,
            Err(err) => {
                eprintln!("dbstats failed for {}: {}", name, err);
                continue;
            }
        };

        let data_size_mb = extract_f64(stats.get("dataSize")) / MEGABYTE;
        let index_size_mb = extract_f64(stats.get("indexSize")) / MEGABYTE;
        total_data += data_size_mb;
        total_index += index_size_mb;

        let mut collection_stats: Vec<CollectionMemory> = Vec::new();
        let collections = match db.list_collection_names().await {
            Ok(list) => list,
            Err(err) => {
                eprintln!("list_collection_names failed for {}: {}", name, err);
                Vec::new()
            }
        };

        for coll in collections {
            match db.run_command(doc! { "collStats": coll.clone() }).await {
                Ok(doc) => {
                    let storage_mb = extract_f64(doc.get("storageSize")) / MEGABYTE;
                    let index_mb = extract_f64(doc.get("totalIndexSize")) / MEGABYTE;
                    if storage_mb > 0.0 || index_mb > 0.0 {
                        collection_stats.push(CollectionMemory {
                            name: coll.clone(),
                            storage_size_mb: storage_mb,
                            total_index_size_mb: index_mb,
                        });
                    }
                }
                Err(err) => {
                    eprintln!("collStats failed for {}.{}: {}", name, coll, err);
                }
            }
        }

        collection_stats.sort_by(|a, b| b
            .storage_size_mb
            .partial_cmp(&a.storage_size_mb)
            .unwrap_or(std::cmp::Ordering::Equal));
        if collection_stats.len() > 5 {
            collection_stats.truncate(5);
        }

        breakdown.push(DatabaseMemory {
            name,
            data_size_mb,
            index_size_mb,
            collections: collection_stats,
        });
    }

    breakdown.sort_by(|a, b| b
        .data_size_mb
        .partial_cmp(&a.data_size_mb)
        .unwrap_or(std::cmp::Ordering::Equal));

    Ok((breakdown, total_data, total_index))
}
