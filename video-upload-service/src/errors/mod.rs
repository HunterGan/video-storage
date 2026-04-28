use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Database unavailable: {0}")]
    DatabaseUnavailable(String),

    #[error("S3 error: {0}")]
    S3(String),

    #[error("Video not found")]
    VideoNotFound,

    #[error("Video already exists")]
    VideoAlreadyExists,

    #[error("Invalid video type")]
    InvalidVideoType,

    #[error("File too large. Max size: {0} MB")]
    FileTooLarge(u64),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Authentication required")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,
}

impl AppError {
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    pub fn s3_error(msg: impl Into<String>) -> Self {
        Self::S3(msg.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::VideoNotFound => (StatusCode::NOT_FOUND, "Video not found".to_string()),
            AppError::VideoAlreadyExists => (StatusCode::CONFLICT, "Video already exists".to_string()),
            AppError::InvalidVideoType => (StatusCode::UNPROCESSABLE_ENTITY, "Invalid video type".to_string()),
            AppError::FileTooLarge(max_mb) => {
                (StatusCode::PAYLOAD_TOO_LARGE, format!("File too large. Max size: {} MB", max_mb))
            }
            AppError::RateLimitExceeded => (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded".to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Authentication required".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            AppError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string()),
            AppError::DatabaseUnavailable(_) => (StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string()),
            AppError::S3(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Storage error".to_string()),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
        };

        let body = serde_json::to_string(&json!({
            "error": error_message,
            "status": status.as_u16()
        })).unwrap_or_else(|_| json!({"error": "Internal server error"}).to_string());

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error() {
        let error = AppError::validation("Test validation error");
        assert!(matches!(error, AppError::Validation(_)));
    }

    #[test]
    fn test_internal_error() {
        let error = AppError::internal("Test internal error");
        assert!(matches!(error, AppError::Internal(_)));
    }

    #[test]
    fn test_s3_error() {
        let error = AppError::s3_error("Test S3 error");
        assert!(matches!(error, AppError::S3(_)));
    }
}
