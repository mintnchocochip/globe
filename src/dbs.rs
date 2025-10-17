use mongodb::{bson::{self, doc, Document}, Client};
use serde_json::Value as JsonValue;
use actix_web::{post, web, HttpResponse,get};
use serde::{Deserialize, Serialize};
use std::env;

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
async fn databases(data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
    println!("Databases request received");
    match list_databases(data.get_ref()).await {
        Ok(json) => Ok(HttpResponse::Ok().json(json)),
        Err(e) => {
            eprintln!("dbs error: {}", e);
            Ok(HttpResponse::InternalServerError().body("failed to list databases"))
        }
    }
}