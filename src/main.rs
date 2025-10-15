use actix_web::{post, web, App, HttpServer, Responder, HttpResponse};
use actix_cors::Cors;
use mongodb::{bson::{self, doc, Document}, Client, options::ClientOptions};
use serde::{Deserialize, Serialize};
use dotenv::dotenv;
use std::env;
use futures::stream::TryStreamExt;
mod dbs;
mod ops;

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
) -> actix_web::Result<impl Responder> {
    let db_name = env::var("DATABASE_NAME").unwrap_or_else(|_| "test".to_string());
    let db = data.database(&db_name);

    // Use BSON Document as the collection element type
    let collection = db.collection::<Document>(&req.collection);

    // Convert incoming JSON (serde_json::Value) to a BSON document for the filter
    let filter = match bson::to_document(&req.query) {
        Ok(d) => d,
        Err(e) => {
            return Ok(HttpResponse::BadRequest().body(format!("invalid query: {}", e)));
        }
    };

    // Execute the find and collect results with error handling
    let cursor = match collection.find(filter).await {
        Ok(c) => c,
        Err(e) => return Ok(HttpResponse::InternalServerError().body(format!("find error: {}", e))),
    };

    let results: Vec<Document> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(e) => return Ok(HttpResponse::InternalServerError().body(format!("cursor error: {}", e))),
    };

    Ok(web::Json(QueryResponse {
        results,
        stats: "example stats".to_string(),
    }))
}

#[actix_web::get("/databases")]
async fn get_databases(data: web::Data<Client>) -> actix_web::Result<impl Responder> {
    // Pass a &Client reference extracted from web::Data
    match dbs::list_databases(data.get_ref()).await {
        Ok(json) => Ok(web::Json(json)),
        Err(e) => {
            log::error!("dbs error: {}", e);
            Ok(HttpResponse::InternalServerError().body("failed to list databases"))
        }
    }
}

#[actix_web::main]
async fn connect() -> std::io::Result<()> {
    // Load .env file into environment (if present)
    dotenv().ok();

    let uri = match env::var("MONGODB_URI") {
        Ok(u) => u,
        Err(e) => {
            eprintln!("MONGODB_URI not set: {}", e);
            panic!("MONGODB_URI must be set");
        }
    };

    // Parse client options and create the client
    let client = Client::with_uri_str(&uri).await?;

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            .app_data(web::Data::new(client.clone()))
            .service(run_query)
            .service(get_databases)
    })
    .bind(("127.0.0.1", 6969))?
    .run()
    .await
}

fn main() -> std::io::Result<()> {
    connect();
}