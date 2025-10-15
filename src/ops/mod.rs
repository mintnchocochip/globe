use actix_web::{web, HttpResponse};
use mongodb::{bson::doc, Client, error::Result as MongoResult};

pub async fn create_document() -> HttpResponse {
    HttpResponse::NotImplemented().body("create_document not implemented")
}

pub async fn update_document() -> HttpResponse {
    HttpResponse::NotImplemented().body("update_document not implemented")
}

pub async fn delete_document() -> HttpResponse {
    HttpResponse::NotImplemented().body("delete_document not implemented")
}
