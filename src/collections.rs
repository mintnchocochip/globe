use actix_web::{get, post, web, HttpResponse};
use mongodb::{bson::{self, doc, oid::ObjectId, Document, Bson}, Client};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use futures::stream::TryStreamExt;

#[derive(Deserialize)]
pub struct ListDocsQuery {
	// Optional JSON filter sent as query param (stringified JSON)
	// e.g. ?filter={"name":"foo"}
	filter: Option<String>,
	// pagination
	skip: Option<u64>,
	limit: Option<u64>,
}

#[get("/collections/{db_name}")]
pub async fn collections(path: web::Path<String>, data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
	let db_name = path.into_inner();
	let db = data.database(&db_name);
	// list collection names
	match db.list_collection_names().await {
		Ok(names) => Ok(HttpResponse::Ok().json(serde_json::json!({"database": db_name, "collections": names}))),
		Err(e) => {
			eprintln!("list collections error: {}", e);
			Ok(HttpResponse::InternalServerError().body("failed to list collections"))
		}
	}
}

#[get("/collections/{db_name}/{coll_name}")]
pub async fn list_documents(path: web::Path<(String, String)>, query: web::Query<ListDocsQuery>, data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
	let (db_name, coll_name) = path.into_inner();
	let db = data.database(&db_name);
	let coll = db.collection::<Document>(&coll_name);

	// parse filter if provided
	let filter_doc = if let Some(filter_str) = &query.filter {
		match serde_json::from_str::<JsonValue>(filter_str) {
			Ok(json) => match bson::to_bson(&json) {
				Ok(Bson::Document(d)) => d,
				Ok(other) => {
					let mut d = Document::new();
					d.insert("value", other);
					d
				}
				Err(_) => Document::new(),
			},
			Err(_) => Document::new(),
		}
	} else {
		Document::new()
	};

	let skip = query.skip;
	let limit = query.limit;

	// Build aggregation pipeline to support $match, $skip, $limit which works across driver versions
	let mut pipeline: Vec<Document> = Vec::new();
	if !filter_doc.is_empty() {
		pipeline.push(doc! { "$match": filter_doc });
	}
	if let Some(s) = skip {
		pipeline.push(doc! { "$skip": Bson::Int64(s as i64) });
	}
	if let Some(l) = limit {
		pipeline.push(doc! { "$limit": Bson::Int64(l as i64) });
	}

	let mut cursor = match coll.aggregate(pipeline).await {
		Ok(c) => c,
		Err(e) => return Ok(HttpResponse::InternalServerError().body(format!("aggregate failed: {}", e))),
	};

	let mut docs: Vec<JsonValue> = Vec::new();
	while let Some(item) = cursor.try_next().await.map_err(|e| {
		eprintln!("cursor next error: {}", e);
		actix_web::error::ErrorInternalServerError("cursor error")
	})? {
		// convert Document to JSON Value
		let j = bson::to_bson(&item).ok()
			.and_then(|b| serde_json::to_value(&b).ok())
			.unwrap_or(JsonValue::Null);
		docs.push(j);
	}

	Ok(HttpResponse::Ok().json(serde_json::json!({"database": db_name, "collection": coll_name, "documents": docs})))
}

#[get("/collections/{db_name}/{coll_name}/indexes")]
pub async fn list_indexes(path: web::Path<(String, String)>, data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
	let (db_name, coll_name) = path.into_inner();
	let db = data.database(&db_name);
	let coll = db.collection::<Document>(&coll_name);
	match coll.list_indexes().await {
		Ok(mut cursor) => {
			let mut out: Vec<JsonValue> = Vec::new();
					while let Some(idx) = cursor.try_next().await.map_err(|e| {
						eprintln!("index cursor error: {}", e);
						actix_web::error::ErrorInternalServerError("index cursor error")
					})? {
				let j = bson::to_bson(&idx).ok()
					.and_then(|b| serde_json::to_value(&b).ok())
					.unwrap_or(JsonValue::Null);
				out.push(j);
			}
			Ok(HttpResponse::Ok().json(serde_json::json!({"database": db_name, "collection": coll_name, "indexes": out})))
		}
		Err(e) => {
			eprintln!("list indexes error: {}", e);
			Ok(HttpResponse::InternalServerError().body("failed to list indexes"))
		}
	}
}

// get document by id
#[get("/documents/{db_name}/{coll_name}/{id}")]
pub async fn get_document_by_id(path: web::Path<(String, String, String)>, data: web::Data<Client>) -> actix_web::Result<HttpResponse> {
	let (db_name, coll_name, id_str) = path.into_inner();
	let db = data.database(&db_name);
	let coll = db.collection::<Document>(&coll_name);

	// try to parse as ObjectId first
	let filter = if let Ok(oid) = ObjectId::parse_str(&id_str) {
		doc!{"_id": oid}
	} else {
		// fall back to string id
		doc!{"_id": id_str}
	};

	match coll.find_one(filter).await {
		Ok(Some(doc)) => {
			let j = bson::to_bson(&doc).ok()
				.and_then(|b| serde_json::to_value(&b).ok())
				.unwrap_or(JsonValue::Null);
			Ok(HttpResponse::Ok().json(j))
		}
		Ok(None) => Ok(HttpResponse::NotFound().body("document not found")),
		Err(e) => {
			eprintln!("find_one error: {}", e);
			Ok(HttpResponse::InternalServerError().body("find_one failed"))
		}
	}
}
