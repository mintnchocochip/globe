use actix_web::{post, web, App, HttpServer, HttpResponse};
use actix_cors::Cors;
use mongodb::{bson::{self, doc, Document}, Client};
use serde::{Deserialize, Serialize};
use dotenv;
use std::env;
use futures::stream::TryStreamExt;
mod dbs;
mod ops;
mod ai;

#[derive(Deserialize)]
struct QueryRequest {
    collection: String,
    query: serde_json::Value,
}

#[derive(Serialize)]
struct QueryResponse {
    // Return BSON Documents directly (they implement Serialize via serde)
    results: Vec<Document>,
    stats: String, // Replace with actual stats structure
}

#[post("/query")]
async fn run_query(
    req: web::Json<QueryRequest>,
    data: web::Data<Client>,
) -> actix_web::Result<HttpResponse> {
    let db_name = env::var("DATABASE_NAME").unwrap_or_else(|_| "test".to_string());
    let db = data.database(&db_name);

    // Use BSON Document as the collection element type
    let collection = db.collection::<Document>(&req.collection);

    // Convert incoming JSON (serde_json::Value) to a BSON document for the filter.
    // Use bson::to_bson to handle serde_json::Value conversion and extract a Document when possible.
    let filter: Document = match bson::to_bson(&req.query) {
        Ok(bson::Bson::Document(d)) => d,
        Ok(other) => {
            // If the incoming JSON isn't an object, wrap it under a key so it's still a valid filter.
            let mut doc = Document::new();
            doc.insert("value", other);
            doc
        }
        Err(e) => return Ok(HttpResponse::BadRequest().body(format!("invalid query: {}", e))),
    };

    // Execute the find and collect results with error handling
    let cursor = match collection.find(filter).await {
        Ok(c) => c,
        Err(e) => return Ok(HttpResponse::InternalServerError().body(format!("find error: {}", e))),
    };

    // Collect cursor into Vec<Document>
    let results: Vec<Document> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(e) => return Ok(HttpResponse::InternalServerError().body(format!("cursor error: {}", e))),
    };

    Ok(HttpResponse::Ok().json(QueryResponse {
        results,
        stats: "example stats".to_string(),
    }))
}

#[actix_web::get("/databases")]
async fn get_databases(data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
    // Pass a &Client reference extracted from web::Data
    match dbs::list_databases(data.get_ref()).await {
        Ok(json) => Ok(HttpResponse::Ok().json(json)),
        Err(e) => {
            eprintln!("dbs error: {}", e);
            Ok(HttpResponse::InternalServerError().body("failed to list databases"))
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file into environment (if present).
    // Try project root first, then fall back to src/.env (some users put it there by mistake).
    if dotenv::from_filename(".env").is_ok() {
        eprintln!("Loaded .env from project root");
    } else if dotenv::from_filename("src/.env").is_ok() {
        eprintln!("Loaded .env from src/.env");
    } else {
        // no .env found; proceed and rely on environment variables
    }

    let uri = match env::var("MONGODB_URI") {
        Ok(mut u) => {
            // Trim surrounding single or double quotes if present
            if (u.starts_with('"') && u.ends_with('"')) || (u.starts_with('\'') && u.ends_with('\'')) {
                u = u[1..u.len()-1].to_string();
            }
            u.trim().to_string()
        }
        Err(e) => {
            eprintln!("MONGODB_URI not set: {}", e);
            panic!("MONGODB_URI must be set");
        }
    };

    // Parse client options and create the client, map mongodb errors to io::Error for compatibility
    let client = Client::with_uri_str(&uri).await.map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, format!("mongodb client error: {}", e))
    })?;

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            .app_data(web::Data::new(client.clone()))
            .service(run_query)
                .service(ai::ai_query)
            .service(get_databases)
    })
    .bind(("127.0.0.1", 6969))?
    .run()
    .await
}

// no extra sync main — #[actix_web::main] above provides runtime entry