use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::{Validate, ValidationError};

// Import Video model
use crate::models::Video;

// Upload URL Generation
#[derive(Debug, Deserialize, Validate)]
pub struct UploadUrlRequest {
    #[validate(length(min = 1, message = "Filename is required"))]
    pub filename: String,

    #[validate(custom = "validate_content_type")]
    pub content_type: String,
}

fn validate_content_type(value: &str) -> Result<(), ValidationError> {
    let allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if !allowed.iter().any(|&t| value.eq_ignore_ascii_case(t)) {
        return Err(ValidationError::new("invalid_content_type"));
    }
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct UploadUrlResponse {
    pub upload_url: String,
    pub file_url: String,
    pub key: String,
}

// Video Management
#[derive(Debug, Deserialize, Validate)]
pub struct CreateVideoRequest {
    #[validate(length(min = 1, max = 500, message = "Title must be between 1 and 500 characters"))]
    pub title: String,

    #[validate(url(message = "Invalid URL"))]
    pub url: String,

    #[validate(length(min = 1, message = "S3 key is required"))]
    pub s3_key: String,

    #[validate(length(max = 2000, message = "Description too long"))]
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VideoResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub url: String,
    pub s3_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedVideos {
    pub videos: Vec<VideoResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

// Pagination query params
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    20
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            limit: 20,
            offset: 0,
        }
    }
}

impl From<&Video> for VideoResponse {
    fn from(video: &Video) -> Self {
        Self {
            id: video.id,
            title: video.title.clone(),
            description: video.description.clone(),
            url: video.url.clone(),
            s3_key: video.s3_key.clone(),
            created_at: video.created_at,
        }
    }
}
