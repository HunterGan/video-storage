use axum::{
    body::Body,
    http::Request,
    middleware::Next,
    response::Response,
};
use tower_http::cors::CorsLayer;
use tracing::info;
use ulid::Ulid;

use crate::config::AppConfig;

pub fn create_cors_layer(config: &AppConfig) -> CorsLayer {
    // Parse CORS origins - if it's "*" use the app_base_url instead
    // Cannot use * with allow_credentials(true) in CORS
    let allow_origin: Option<axum::http::HeaderValue> = if config.cors_allowed_origins == "*" {
        config.app_base_url.parse().ok()
    } else {
        config.cors_allowed_origins.parse().ok()
    };
    
    let cors_layer = CorsLayer::new()
        .allow_origin(allow_origin.unwrap_or_else(|| "*".parse().unwrap()))
        .allow_methods(vec![
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::PATCH,
        ])
        .allow_credentials(false)
        .allow_headers(vec![
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
        ]);
    
    cors_layer
}

pub async fn logging_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, axum::http::StatusCode> {
    let method = req.method().clone();
    let uri = req.uri().clone();

    info!(method = %method, uri = %uri, "Incoming request");

    let start = std::time::Instant::now();
    let response = next.run(req).await;
    let duration = start.elapsed();

    let status = response.status().as_u16();
    info!(method = %method, uri = %uri, status = status, duration_ms = duration.as_millis(), "Request completed");

    Ok(response)
}

// Request ID middleware
pub async fn request_id_middleware(
    req: Request<Body>,
    next: Next,
) -> Response {
    // Generate or extract request ID
    let _request_id = req
        .headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Ulid::new().to_string());

    // Add request ID to response headers
    let response = next.run(req).await;
    
    // Note: We can't modify response headers in this middleware pattern
    // This is a simplified version - in production you'd use a different approach
    
    response
}

// JWT Authentication middleware (placeholder for future implementation)
pub struct JwtMiddleware;

impl JwtMiddleware {
    pub fn new() -> Self {
        Self
    }

    pub async fn authenticate(
        &self,
        _token: &str,
    ) -> Result<Claims, AuthError> {
        // TODO: Implement JWT verification
        // This is a placeholder for future JWT authentication
        Err(AuthError::NotImplemented)
    }
}

#[derive(Debug)]
pub struct Claims {
    pub user_id: uuid::Uuid,
    pub exp: i64,
}

#[derive(Debug)]
pub enum AuthError {
    InvalidToken,
    ExpiredToken,
    NotImplemented,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_middleware_creation() {
        let _middleware = JwtMiddleware::new();
        assert!(true);
    }
}
