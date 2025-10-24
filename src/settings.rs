use std::env;

use actix_web::{get, post, web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::state::AppInfo;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsResponse {
    connection_string: String,
    shortened_connection_string: String,
    auth_enabled_default: bool,
    has_gemini_key: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsUpdateRequest {
    gemini_api_key: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsUpdateResponse {
    success: bool,
    has_gemini_key: bool,
}

#[get("/settings")]
pub async fn get_settings(app_info: web::Data<AppInfo>) -> actix_web::Result<HttpResponse> {
    let has_gemini_key = env::var("GEMINI_API_KEY")
        .ok()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    Ok(HttpResponse::Ok().json(SettingsResponse {
        connection_string: app_info.original_uri.clone(),
        shortened_connection_string: app_info.shortened_uri.clone(),
        auth_enabled_default: true,
        has_gemini_key,
    }))
}

#[post("/settings")]
pub async fn update_settings(
    payload: web::Json<SettingsUpdateRequest>,
) -> actix_web::Result<HttpResponse> {
    if let Some(key) = payload
        .gemini_api_key
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        env::set_var("GEMINI_API_KEY", key);
    }

    let has_gemini_key = env::var("GEMINI_API_KEY")
        .ok()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    Ok(HttpResponse::Ok().json(SettingsUpdateResponse {
        success: true,
        has_gemini_key,
    }))
}
