use mongodb::{bson::{self, doc, Bson, Document}, Client};
use serde_json::Value as JsonValue;
use actix_web::{get, web, HttpResponse};
use serde::Serialize;
use crate::state::AppInfo;

pub async fn list_databases(client: &Client) -> mongodb::error::Result<JsonValue> {
    // Get database names
    let names = client.list_database_names().await?;

    let mut out = Vec::new();
    for name in names {
        // Skip internal DBs if desired
        if name == "admin" || name == "local" {
            // still include if you want; here we include them
        }

        let db = client.database(&name);

        // collection names
        let collections = db.list_collection_names().await.unwrap_or_default();
        // dbStats command
        let stats_doc = match db.run_command(doc! { "dbstats": 1u32 }).await {
            Ok(d) => d,
            Err(_) => Document::new(),
        };

        // Convert some fields safely
        let objects = stats_doc.get_i64("objects").unwrap_or(0);
        let storage_size = stats_doc.get_i64("storageSize").unwrap_or(0);

        // Convert full stats doc to JSON for convenience
        let stats_json = bson::to_bson(&stats_doc).ok()
            .and_then(|b| serde_json::to_value(&b).ok())
            .unwrap_or(JsonValue::Null);

        out.push(serde_json::json!({
            "name": name,
            "collections": collections.len(),
            "documents": objects,
            "storageSize": storage_size,
            "stats": stats_json,
        }));
    }

    Ok(JsonValue::Array(out))
}

#[get("/databases")]
pub async fn databases(data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
    println!("Databases request received");
    match list_databases(data.get_ref()).await {
        Ok(json) => Ok(HttpResponse::Ok().json(json)),
        Err(e) => {
            eprintln!("dbs error: {}", e);
            Ok(HttpResponse::InternalServerError().body("failed to list databases"))
        }
    }
}

#[get("/status")]
pub async fn get_status(data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
    // println!("Status request received");
    match data.get_ref().database("admin").run_command(doc! { "ping": 1 }).await {
        Ok(_) => Ok(HttpResponse::Ok().body("MongoDB is up and running")),
        Err(e) => {
            eprintln!("status error: {}", e);
            Ok(HttpResponse::InternalServerError().body("failed to check MongoDB status"))
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardTotals {
    databases: usize,
    collections: i64,
    documents: i64,
    indexes: i64,
    storage_size_bytes: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardServer {
    uptime_seconds: f64,
    connections_current: i64,
    ops_per_second: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardResponse {
    connected_to: String,
    totals: DashboardTotals,
    server: DashboardServer,
}

fn extract_i64(value: Option<&Bson>) -> i64 {
    match value {
        Some(Bson::Int32(v)) => *v as i64,
        Some(Bson::Int64(v)) => *v,
        Some(Bson::Double(v)) => *v as i64,
        Some(Bson::String(s)) => s.parse::<i64>().unwrap_or(0),
        _ => 0,
    }
}

fn document_i64(doc: &Document, key: &str) -> i64 {
    extract_i64(doc.get(key))
}

fn sum_opcounters(doc: &Document) -> i64 {
    ["insert", "query", "update", "delete", "getmore", "command"]
        .iter()
        .map(|k| document_i64(doc, k))
        .sum()
}

#[get("/dashboard")]
pub async fn dashboard(
    client: web::Data<Client>,
    app_info: web::Data<AppInfo>,
) -> actix_web::Result<HttpResponse> {
    let client = client.get_ref();
    let db_names = match client.list_database_names().await {
        Ok(names) => names,
        Err(e) => {
            eprintln!("failed to list databases for dashboard: {}", e);
            return Ok(HttpResponse::InternalServerError().body("failed to collect dashboard stats"));
        }
    };

    let mut total_collections: i64 = 0;
    let mut total_documents: i64 = 0;
    let mut total_indexes: i64 = 0;
    let mut total_storage_bytes: i64 = 0;

    for name in &db_names {
        let db = client.database(name);

        let collection_names = db.list_collection_names().await.unwrap_or_default();
        total_collections += collection_names.len() as i64;

        match db.run_command(doc! { "dbstats": 1 }).await {
            Ok(stats) => {
                total_documents += document_i64(&stats, "objects");
                total_indexes += document_i64(&stats, "indexes");
                total_storage_bytes += document_i64(&stats, "storageSize");
            }
            Err(e) => {
                eprintln!("dbstats failed for {}: {}", name, e);
            }
        }
    }

    let mut uptime_seconds: f64 = 0.0;
    let mut connections_current: i64 = 0;
    let mut ops_per_second: f64 = 0.0;

    match client.database("admin").run_command(doc! { "serverStatus": 1 }).await {
        Ok(status) => {
            uptime_seconds = status.get_f64("uptime").unwrap_or(0.0);
            if let Ok(conn_doc) = status.get_document("connections") {
                connections_current = document_i64(conn_doc, "current");
            }
            if let Ok(op_doc) = status.get_document("opcounters") {
                let total_ops = sum_opcounters(op_doc) as f64;
                if uptime_seconds > 0.0 {
                    ops_per_second = (total_ops / uptime_seconds * 100.0).round() / 100.0;
                }
            }
        }
        Err(e) => {
            eprintln!("serverStatus command failed: {}", e);
        }
    }

    let response = DashboardResponse {
        connected_to: app_info.shortened_uri.clone(),
        totals: DashboardTotals {
            databases: db_names.len(),
            collections: total_collections,
            documents: total_documents,
            indexes: total_indexes,
            storage_size_bytes: total_storage_bytes,
        },
        server: DashboardServer {
            uptime_seconds,
            connections_current,
            ops_per_second,
        },
    };

    Ok(HttpResponse::Ok().json(response))
}
