use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct Video {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub url: String,
    pub s3_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct VideoInsert {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub url: String,
    pub s3_key: String,
}

#[derive(Debug)]
pub struct VideoUpdate {
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub url: Option<String>,
}
