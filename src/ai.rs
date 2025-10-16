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

async fn call_gemii(){
    let mut session = Session::new().set_remember_reply(false);
    let response = Gemini::new(
        env::var("GEMINI_API_KEY").expect("GEMINI_API_KEY not set"),
        "gemini-2.0-flash",
        "You are a MongoDB query expert. You are to generate a proper MongoDB query relevant to the user prompt. The query should be in JSON format and must be syntactically correct. Do not include any explanations or additional text, only provide the JSON query. If the prompt is ambiguous or does not provide enough information to generate a query, respond with an empty JSON object {}. Here are some examples of user prompts and the corresponding MongoDB queries you should generate:
        1. User Prompt: 'find products where price > 100 and name contains faizal'
           MongoDB Query: { \"price\": { \"$gt\": 100 }, \"name\": { \"$regex\": \"faizal\", \"$options\": \"i\" } }"
         )

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
