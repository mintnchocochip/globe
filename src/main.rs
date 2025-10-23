use actix_web::{post, web, App, HttpServer, HttpResponse};
use actix_cors::Cors;
use actix_web::http::header;
use mongodb::{bson::{self, doc, Document}, Client};
use serde::{Deserialize, Serialize};
use dotenv;
use std::env;
use futures::stream::TryStreamExt;
use crate::dbs::databases;
mod dbs;
mod ops;
mod ai;
mod collections;
mod state;
use state::AppInfo;

#[derive(Deserialize)]
struct QueryRequest {
    database: Option<String>,
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
    let req = req.into_inner();
    let db_name = req
        .database
        .clone()
        .or_else(|| env::var("DATABASE_NAME").ok())
        .unwrap_or_else(|| "test".to_string());
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

    let client = match Client::with_uri_str(&uri).await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("mongodb client connection error: {}", e);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, "mongodb client connection failed"));
        }
    };

    eprintln!("MongoDB client created successfully (not yet verified network connectivity)");

    let client_data = web::Data::new(client.clone());
    let app_info = web::Data::new(AppInfo::new(&uri));

    eprintln!("Starting HTTP server on 127.0.0.1:6969");
    HttpServer::new({
        let client_data = client_data.clone();
        let app_info = app_info.clone();
        move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![header::CONTENT_TYPE, header::ACCEPT])
            .max_age(3600);
        App::new()
            .wrap(cors)
            .app_data(client_data.clone())
            .app_data(app_info.clone())
            .service(run_query)
            .service(ai::query)
            .service(databases)
            .service(crate::collections::collections)
            .service(crate::collections::list_documents)
            .service(crate::collections::list_indexes)
            .service(crate::collections::get_document_by_id)
            .service(crate::collections::collection_stats)
            .service(crate::collections::create_document)
            .service(crate::collections::update_document)
            .service(crate::collections::delete_document)
            .service(dbs::dashboard)
            .service(dbs::get_status)
    }
    })
    .bind(("127.0.0.1", 6969))?
    .run()
    .await
}
