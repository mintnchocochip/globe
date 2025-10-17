use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::{Value as JsonValue, json};
use std::env;
use reqwest::Client;
use gemini_client_api::gemini::{
    ask::Gemini,
    types::request::{SystemInstruction, Tool},
    types::sessions::Session,
    utils::MarkdownToParts,
};
use futures::StreamExt;

#[derive(Deserialize)]
pub struct AiRequest {
    pub collection: String,
    pub prompt: String,
}

#[derive(Serialize)]
pub struct AiResponse {
    pub query: JsonValue,
    pub source: String,
}

async fn call_gemini(prompt: &str) -> Result<JsonValue, Box<dyn std::error::Error>> {
    // create a session if you need session state; otherwise pass the prompt directly
    let mut _session = Session::new(6).set_remember_reply(false);
    let response = Gemini::new(
        env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY not set"),
        "gemini-2.0-flash",
        Some(SystemInstruction::from_str("You are a MongoDB query expert. Given a natural language prompt, generate a valid MongoDB query in JSON format. Only output the JSON document without any additional text.")),
        )
        .set_json_mode(json!({
            "collection_name":"collectionname",
            "mongodb-query":{
                "type":"json"
            }
        }))
        .ask(_session.ask_string(prompt))
        .await?;
    let json_resp = response.get_json()?;
    println!("Gemini response JSON: {:?}", json_resp);
    Ok(json_resp)
}

#[post("/query")]
pub async fn query(body: web::Json<AiRequest>) -> actix_web::Result<HttpResponse> {
    println!("AI query received: collection='{}' prompt='{}'", body.collection, body.prompt);
    // If the Gemini call fails or is not configured, return a generic failure as requested.
    match call_gemini(&body.prompt).await {
        Ok(json_query) => Ok(HttpResponse::Ok().json(AiResponse { query: json_query, source: "gemini".to_string() })),
        Err(_) => Ok(HttpResponse::InternalServerError().body("failed")),
    }
}
