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

    let mut field_array: Vec<JsonValue> = fields
        .into_iter()
        .map(|(name, info)| {
            let mut type_list: Vec<String> = info.types.into_iter().collect();
            type_list.sort();
            json!({
                "name": name,
                "types": type_list,
                "sample": info.sample.unwrap_or(JsonValue::Null),
                "occurrence": info.count,
            })
        })
        .collect();

    field_array.sort_by(|a, b| {
        let a_occ = a.get("occurrence").and_then(|v| v.as_i64()).unwrap_or(0);
        let b_occ = b.get("occurrence").and_then(|v| v.as_i64()).unwrap_or(0);
        b_occ.cmp(&a_occ)
    });

    Ok(json!({
        "database": database,
        "collection": collection,
        "sampledDocumentCount": totals,
        "fields": field_array,
    }))
}

async fn call_gemini(prompt: &str) -> Result<(JsonValue, JsonValue), Box<dyn std::error::Error>> {
    let mut session = Session::new(6).set_remember_reply(false);
    let system_instruction = Some(SystemInstruction::from_str(
        "You are a MongoDB query expert. Return only valid MongoDB find() filter JSON.",
    ));

    let response = Gemini::new(
        env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY not set"),
        "gemini-2.0-flash",
        system_instruction,
    )
    .set_json_mode(json!({
        "mongodb-query": {
            "type": "json"
        }
    }))
    .ask(session.ask_string(prompt))
    .await?;

    let raw_json: serde_json::Value = response.get_json()?;
    println!("Gemini raw response: {:?}", raw_json);
    let query_json = raw_json
        .get("mongodb-query")
        .cloned()
        .or_else(|| raw_json.get("query").cloned())
        .unwrap_or_else(|| raw_json.clone());

    Ok((query_json, raw_json))
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

    let schema_summary = match describe_collection(client.get_ref(), &db_name, &req.collection).await {
        Ok(summary) => summary,
        Err(err) => {
            eprintln!("failed to build schema summary: {}", err);
            JsonValue::Null
        }
    };

    let schema_text = if schema_summary.is_null() {
        "Unable to derive schema summary.".to_string()
    } else {
        serde_json::to_string_pretty(&schema_summary).unwrap_or_else(|_| schema_summary.to_string())
    };

    let augmented_prompt = format!(
        "{}\n\nDatabase: {}\nCollection: {}\nSchema Summary (derived from recent samples):\n{}\n\nReturn only a valid MongoDB find() filter JSON (no aggregation pipeline, no explanations).",
        req.prompt.trim(),
        db_name,
        req.collection,
        schema_text
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
