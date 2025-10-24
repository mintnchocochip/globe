// use actix_web::{post, web, HttpResponse};
// use futures::stream::TryStreamExt;
// use gemini_client_api::gemini::{
//     ask::Gemini,
//     types::request::SystemInstruction,
//     types::sessions::Session,
// };
// use mongodb::{
//     bson::{doc, Bson, Document},
//     Client,
// };
// use serde::{Deserialize, Serialize};
// use serde_json::{json, Value as JsonValue};
// use std::{
//     collections::{HashMap, HashSet},
//     env,
//     str::FromStr,
// };

// const DEFAULT_SAMPLE_SIZE: i64 = 200;

// #[derive(Deserialize)]
// pub struct AiRequest {
//     pub database: Option<String>,
//     pub collection: String,
//     pub prompt: String,
// }

// #[derive(Serialize)]
// pub struct AiResponse {
//     pub query: JsonValue,
//     pub source: String,
//     pub used_prompt: String,
//     pub raw_response: JsonValue,
// }

// #[derive(Default)]
// struct FieldInfo {
//     count: i64,
//     types: HashSet<String>,
//     sample: Option<JsonValue>,
// }

// fn bson_type_name(value: &Bson) -> String {
//     match value {
//         Bson::Double(_) => "double",
//         Bson::String(_) => "string",
//         Bson::Array(_) => "array",
//         Bson::Document(_) => "document",
//         Bson::Boolean(_) => "bool",
//         Bson::Null => "null",
//         Bson::Int32(_) => "int32",
//         Bson::Int64(_) => "int64",
//         Bson::DateTime(_) => "datetime",
//         Bson::Decimal128(_) => "decimal",
//         Bson::ObjectId(_) => "objectId",
//         Bson::Binary(_) => "binary",
//         Bson::Timestamp(_) => "timestamp",
//         Bson::RegularExpression(_) => "regex",
//         Bson::JavaScriptCode(_) | Bson::JavaScriptCodeWithScope(_) => "javascript",
//         Bson::Symbol(_) => "symbol",
//         Bson::Undefined => "undefined",
//         Bson::MaxKey => "maxKey",
//         Bson::MinKey => "minKey",
//         _ => "other",
//     }
//     .to_string()
// }

// async fn describe_collection(
//     client: &Client,
//     database: &str,
//     collection: &str,
// ) -> mongodb::error::Result<JsonValue> {
//     let coll = client.database(database).collection::<Document>(collection);
//     let pipeline = vec![doc! { "$sample": { "size": DEFAULT_SAMPLE_SIZE } }];
//     let mut cursor = coll.aggregate(pipeline).await?;

//     let mut totals = 0_i64;
//     let mut fields: HashMap<String, FieldInfo> = HashMap::new();

//     while let Some(doc) = cursor.try_next().await? {
//         totals += 1;
//         for (key, value) in doc.iter() {
//             let entry = fields.entry(key.clone()).or_default();
//             entry.count += 1;
//             entry.types.insert(bson_type_name(value));
//             if entry.sample.is_none() {
//                 let json_value = serde_json::to_value(value.clone()).unwrap_or(JsonValue::Null);
//                 entry.sample = Some(json_value);
//             }
//         }
//     }

//     let mut field_array: Vec<JsonValue> = fields
//         .into_iter()
//         .map(|(name, info)| {
//             let mut type_list: Vec<String> = info.types.into_iter().collect();
//             type_list.sort();
//             json!({
//                 "name": name,
//                 "types": type_list,
//                 "sample": info.sample.unwrap_or(JsonValue::Null),
//                 "occurrence": info.count,
//             })
//         })
//         .collect();

//     field_array.sort_by(|a, b| {
//         let a_occ = a.get("occurrence").and_then(|v| v.as_i64()).unwrap_or(0);
//         let b_occ = b.get("occurrence").and_then(|v| v.as_i64()).unwrap_or(0);
//         b_occ.cmp(&a_occ)
//     });

//     Ok(json!({
//         "database": database,
//         "collection": collection,
//         "sampledDocumentCount": totals,
//         "fields": field_array,
//     }))
// }

// async fn call_gemini(prompt: &str) -> Result<(JsonValue, JsonValue), Box<dyn std::error::Error>> {
//     let mut session = Session::new(6).set_remember_reply(false);
//     let system_instruction = Some(SystemInstruction::from_str(
//         "You are a MongoDB query expert. Return only valid MongoDB find() filter JSON.",
//     ));

//     // If your crate exposes a way to set response MIME type explicitly,
//     // ensure it's application/json along with the schema.
//     // set_json_mode should map to responseMimeType + responseSchema.

//     let response = Gemini::new(
//         env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY not set"),
//         "gemini-2.0-flash",
//         system_instruction,
//     )
//     .set_json_mode(serde_json::json!({
//         "type": "object",
//         "properties": {
//             // Use a string so the filter can be arbitrary JSON text
//             "query": { "type": "string", "description": "A MongoDB find() filter JSON string" }
//         },
//         "required": ["query"]
//     }))
//     .ask(session.ask_string(prompt))
//     .await?;

//     let raw_json: serde_json::Value = response.get_json()?;
//     // Extract the string and parse it as JSON
//     let filter_str = raw_json
//         .get("query")
//         .and_then(|v| v.as_str())
//         .map(|s| s.to_string())
//         .unwrap_or_else(|| raw_json.to_string());

//     let query_json: serde_json::Value =
//         serde_json::from_str(&filter_str).unwrap_or(serde_json::Value::Null);

//     Ok((query_json, raw_json))
// }

// #[post("/ai/query")]
// pub async fn query(
//     body: web::Json<AiRequest>,
//     client: web::Data<Client>,
// ) -> actix_web::Result<HttpResponse> {
//     let req = body.into_inner();
//     let db_name = req
//         .database
//         .clone()
//         .or_else(|| env::var("DATABASE_NAME").ok())
//         .unwrap_or_else(|| "test".to_string());

//     let schema_summary = match describe_collection(client.get_ref(), &db_name, &req.collection).await {
//         Ok(summary) => summary,
//         Err(err) => {
//             eprintln!("failed to build schema summary: {}", err);
//             JsonValue::Null
//         }
//     };

//     let schema_text = if schema_summary.is_null() {
//         "Unable to derive schema summary.".to_string()
//     } else {
//         serde_json::to_string_pretty(&schema_summary).unwrap_or_else(|_| schema_summary.to_string())
//     };

//     let augmented_prompt = format!(
//         "{}\n\nDatabase: {}\nCollection: {}\nSchema Summary (derived from recent samples):\n{}\n\nReturn only a valid MongoDB find() filter JSON (no aggregation pipeline, no explanations).",
//         req.prompt.trim(),
//         db_name,
//         req.collection,
//         schema_text
//     );

//     match call_gemini(&augmented_prompt).await {
//         Ok((query_json, raw_json)) => Ok(HttpResponse::Ok().json(AiResponse {
//             query: query_json,
//             source: "gemini".to_string(),
//             used_prompt: augmented_prompt,
//             raw_response: raw_json,
//         })),
//         Err(err) => {
//             eprintln!("gemini call failed: {}", err);
//             Ok(HttpResponse::InternalServerError().body("failed"))
//         }
//     }
// }

use actix_web::{post, web, HttpResponse};
use futures::stream::TryStreamExt;
use gemini_client_api::gemini::{
    ask::Gemini,
    types::request::SystemInstruction,
    types::sessions::Session,
};
use mongodb::{
    bson::{doc, Bson, Document},
    Client,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use std::{
    collections::{HashMap, HashSet},
    env,
    str::FromStr,
};

const DEFAULT_SAMPLE_SIZE: i64 = 200;

#[derive(Deserialize)]
pub struct AiRequest {
    pub database: Option<String>,
    pub collection: String,
    pub prompt: String,
}

#[derive(Serialize)]
pub struct AiResponse {
    pub query: JsonValue,
    pub source: String,
    pub used_prompt: String,
    pub raw_response: JsonValue,
}

#[derive(Default)]
struct FieldInfo {
    count: i64,
    types: HashSet<String>,
    sample: Option<JsonValue>,
}

fn bson_type_name(value: &Bson) -> String {
    match value {
        Bson::Double(_) => "double",
        Bson::String(_) => "string",
        Bson::Array(_) => "array",
        Bson::Document(_) => "document",
        Bson::Boolean(_) => "bool",
        Bson::Null => "null",
        Bson::Int32(_) => "int32",
        Bson::Int64(_) => "int64",
        Bson::DateTime(_) => "datetime",
        Bson::Decimal128(_) => "decimal",
        Bson::ObjectId(_) => "objectId",
        Bson::Binary(_) => "binary",
        Bson::Timestamp(_) => "timestamp",
        Bson::RegularExpression(_) => "regex",
        Bson::JavaScriptCode(_) | Bson::JavaScriptCodeWithScope(_) => "javascript",
        Bson::Symbol(_) => "symbol",
        Bson::Undefined => "undefined",
        Bson::MaxKey => "maxKey",
        Bson::MinKey => "minKey",
        _ => "other",
    }
    .to_string()
}

async fn describe_collection(
    client: &Client,
    database: &str,
    collection: &str,
) -> mongodb::error::Result<JsonValue> {
    let coll = client.database(database).collection::<Document>(collection);
    let pipeline = vec![doc! { "$sample": { "size": DEFAULT_SAMPLE_SIZE } }];
    let mut cursor = coll.aggregate(pipeline).await?;

    let mut totals = 0_i64;
    let mut fields: HashMap<String, FieldInfo> = HashMap::new();

    while let Some(doc) = cursor.try_next().await? {
        totals += 1;
        for (key, value) in doc.iter() {
            let entry = fields.entry(key.clone()).or_default();
            entry.count += 1;
            entry.types.insert(bson_type_name(value));
            if entry.sample.is_none() {
                let json_value = serde_json::to_value(value.clone()).unwrap_or(JsonValue::Null);
                entry.sample = Some(json_value);
            }
        }
    }

    let mut sorted_fields: Vec<(String, FieldInfo)> = fields.into_iter().collect();
    sorted_fields.sort_by(|a, b| b.1.count.cmp(&a.1.count));

    let mut field_map = serde_json::Map::new();
    for (name, info) in sorted_fields {
        let mut type_list: Vec<String> = info.types.into_iter().collect();
        type_list.sort();
        field_map.insert(
            name,
            json!({
                "count": info.count,
                "types": type_list,
                "sample": info.sample.unwrap_or(JsonValue::Null),
            }),
        );
    }

    Ok(json!({
        "database": database,
        "collection": collection,
        "sampledDocumentCount": totals,
        "fields": field_map,
    }))
}

fn extract_json_from_text(s: &str) -> &str {
    let s = s.trim();
    if let Some(start) = s.find("```") {
        if let Some(end_rel) = s[start + 3..].find("```") {
            let inner = &s[start + 3..start + 3 + end_rel];
            if let Some(nl) = inner.find('\n') {
                return inner[nl + 1..].trim();
            }
            return inner.trim();
        }
    }
    s
}

fn parse_filter_lossy(text: &str) -> serde_json::Value {
    let t = extract_json_from_text(text);
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(t) {
        return v;
    }
    if let Ok(v5) = json5::from_str::<serde_json::Value>(t) {
        return v5;
    }
    serde_json::Value::Null
}

fn looks_like_filter(obj: &serde_json::Map<String, serde_json::Value>) -> bool {
    // Heuristic: if object has $ operators or typical filter keys, accept as filter.
    if obj.keys().any(|k| k.starts_with('$')) {
        return true;
    }
    let common = ["_id", "department", "dept", "program", "course", "branch", "name"];
    obj.keys().any(|k| common.contains(&k.as_str()))
}

async fn call_gemini(prompt: &str) -> Result<(JsonValue, JsonValue), Box<dyn std::error::Error>> {
    let mut session = Session::new(6).set_remember_reply(false);
    let system_instruction = Some(SystemInstruction::from_str(
        "You are a MongoDB query expert. Return ONLY a strict JSON object usable as db.collection.find(<FILTER>). Use double-quoted keys and strings, no comments, no trailing commas, no markdown, no prose. Use MongoDB Extended JSON when needed (e.g., {\"_id\":{\"$oid\":\"...\"}}, dates as {\"$date\":\"...Z\"}).",
    ));

    let client = Gemini::new(
        env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY not set"),
        "gemini-2.0-flash",
        system_instruction,
    )
    // Structured output: top-level object with a string field "query"
    // This avoids the OBJECT-with-empty-properties restriction.
    .set_json_mode(json!({
        "type": "object",
        "properties": {
            "query": { "type": "string", "description": "A strict JSON MongoDB find() filter, no code fences." }
        },
        "required": ["query"]
    }));

    let response = client.ask(session.ask_string(prompt)).await?;

    let mut structured_payload: Option<JsonValue> = None;
    let mut parse_error: Option<String> = None;

    match response.get_json::<JsonValue>() {
        Ok(raw_json) => {
            structured_payload = Some(raw_json.clone());

            if let Some(qs) = raw_json.get("query").and_then(|v| v.as_str()) {
                let parsed = parse_filter_lossy(qs);
                let final_filter = match parsed {
                    serde_json::Value::Object(map) if !map.is_empty() => serde_json::Value::Object(map),
                    _ => serde_json::Value::Object(serde_json::Map::new()),
                };
                return Ok((final_filter, raw_json));
            }

            if let serde_json::Value::Object(map) = &raw_json {
                if looks_like_filter(map) {
                    return Ok((raw_json.clone(), raw_json));
                }
            }
        }
        Err(err) => {
            parse_error = Some(err.to_string());
        }
    }

    let text = response.get_text("\n");
    let parsed = parse_filter_lossy(&text);
    let final_filter = match parsed {
        serde_json::Value::Object(map) if !map.is_empty() => serde_json::Value::Object(map),
        _ => serde_json::Value::Object(serde_json::Map::new()),
    };

    let raw = json!({
        "text": text,
        "structured": structured_payload.unwrap_or(JsonValue::Null),
        "parse_error": parse_error,
        "parsed": final_filter.clone()
    });

    Ok((final_filter, raw))
}

#[post("/ai/query")]
pub async fn query(
    body: web::Json<AiRequest>,
    client: web::Data<Client>,
) -> actix_web::Result<HttpResponse> {
    let req = body.into_inner();
    let db_name = req
        .database
        .clone()
        .or_else(|| env::var("DATABASE_NAME").ok())
        .unwrap_or_else(|| "test".to_string());

    let (database_schema, mut schema_summary) = match describe_database(
        client.get_ref(),
        &db_name,
        &req.collection,
    )
    .await
    {
        Ok((db_schema, maybe_target)) => {
            let target = if let Some(summary) = maybe_target {
                summary
            } else {
                match describe_collection(client.get_ref(), &db_name, &req.collection).await {
                    Ok(summary) => summary,
                    Err(err) => {
                        eprintln!("failed to build schema summary: {}", err);
                        JsonValue::Null
                    }
                }
            };
            (db_schema, target)
        }
        Err(err) => {
            eprintln!("failed to build database schema: {}", err);
            let summary = match describe_collection(client.get_ref(), &db_name, &req.collection).await {
                Ok(summary) => summary,
                Err(inner) => {
                    eprintln!("failed to build schema summary: {}", inner);
                    JsonValue::Null
                }
            };
            (JsonValue::Null, summary)
        }
    };

    if schema_summary.is_null() {
        schema_summary = JsonValue::Null;
    }

    let schema_text = if schema_summary.is_null() {
        "Unable to derive schema summary.".to_string()
    } else {
        serde_json::to_string_pretty(&schema_summary)
            .unwrap_or_else(|_| schema_summary.to_string())
    };

    let database_schema_text = if database_schema.is_null() {
        "Unable to derive database-wide schema summary.".to_string()
    } else {
        serde_json::to_string_pretty(&database_schema)
            .unwrap_or_else(|_| database_schema.to_string())
    };

    // Provide field hints when there’s no sample to reduce empty outputs.
    let augmented_prompt = format!(
        "{}\n\nDatabase: {}\nCollection: {}\nCollection Schema Summary (derived from recent samples):\n{}\n\nDatabase Schema Overview (all collections):\n{}\n\nReturn ONLY a strict JSON object that can be passed to MongoDB find() as the filter. If schema is unknown, infer likely fields (e.g., \"department\", \"program\", \"course\", \"branch\"). Use MongoDB Extended JSON where appropriate. No markdown or prose.",
        req.prompt.trim(),
        db_name,
        req.collection,
        schema_text,
        database_schema_text
    );

    match call_gemini(&augmented_prompt).await {
        Ok((query_json, raw_json)) => Ok(HttpResponse::Ok().json(AiResponse {
            query: query_json,
            source: "gemini".to_string(),
            used_prompt: augmented_prompt,
            raw_response: raw_json,
        })),
        Err(err) => {
            eprintln!("gemini call failed: {}", err);
            Ok(HttpResponse::InternalServerError().body("failed"))
        }
    }
}

async fn describe_database(
    client: &Client,
    database: &str,
    target_collection: &str,
) -> mongodb::error::Result<(JsonValue, Option<JsonValue>)> {
    let db = client.database(database);
    let collection_names = db.list_collection_names().await?;

    let mut summaries: Vec<JsonValue> = Vec::new();
    let mut target_summary: Option<JsonValue> = None;

    for name in collection_names {
        match describe_collection(client, database, &name).await {
            Ok(summary) => {
                if name == target_collection {
                    target_summary = Some(summary.clone());
                }
                summaries.push(summary);
            }
            Err(err) => {
                eprintln!(
                    "failed to describe collection {}.{}: {}",
                    database, name, err
                );
                summaries.push(json!({
                    "database": database,
                    "collection": name,
                    "error": err.to_string()
                }));
            }
        }
    }

    Ok((
        json!({
            "database": database,
            "collectionCount": summaries.len(),
            "collections": summaries,
        }),
        target_summary,
    ))
}