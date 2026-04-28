use std::env;
use std::time::Duration;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app_host: String,
    pub app_port: u16,
    pub app_base_url: String,
    pub database_url: String,
    pub s3_endpoint: String,
    pub s3_region: String,
    pub s3_bucket: String,
    pub s3_access_key: String,
    pub s3_secret_key: String,
    pub max_file_size_mb: u64, // Future: file size validation for uploads
    pub allowed_video_types: String,
    pub presigned_url_ttl_seconds: u64,
    pub cors_allowed_origins: String,
    pub video_processing_enabled: bool,
    pub ffmpeg_path: String, // Future: video transcoding pipeline
    pub cdn_base_url: String,
    pub rate_limit_requests_per_second: u32, // Future: rate limiting middleware
    pub enable_request_id: bool, // Future: request tracing and debugging
}

impl AppConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();
        
        let app_host = env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let app_port = env::var("APP_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .unwrap_or(8080);
        let app_base_url = env::var("APP_BASE_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let s3_endpoint = env::var("S3_ENDPOINT").expect("S3_ENDPOINT must be set");
        let s3_region = env::var("S3_REGION").unwrap_or_else(|_| "ru-moscow-1".to_string());
        let s3_bucket = env::var("S3_BUCKET").expect("S3_BUCKET must be set");
        let s3_access_key = env::var("S3_ACCESS_KEY").expect("S3_ACCESS_KEY must be set");
        let s3_secret_key = env::var("S3_SECRET_KEY").expect("S3_SECRET_KEY must be set");
        let max_file_size_mb = env::var("MAX_FILE_SIZE_MB")
            .unwrap_or_else(|_| "500".to_string())
            .parse()
            .unwrap_or(500);
        let allowed_video_types = env::var("ALLOWED_VIDEO_TYPES").unwrap_or_else(|_| "video/mp4,video/webm,video/quicktime".to_string());
        let presigned_url_ttl_seconds = env::var("PRESIGNED_URL_TTL_SECONDS")
            .unwrap_or_else(|_| "3600".to_string())
            .parse()
            .unwrap_or(3600);
        let cors_allowed_origins = env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "*".to_string());
        let video_processing_enabled = env::var("VIDEO_PROCESSING_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .parse()
            .unwrap_or(false);
        let ffmpeg_path = env::var("FFMPEG_PATH").unwrap_or_else(|_| "/usr/bin/ffmpeg".to_string());
        let cdn_base_url = env::var("CDN_BASE_URL").unwrap_or_default();
        let rate_limit_requests_per_second = env::var("RATE_LIMIT_REQUESTS_PER_SECOND")
            .unwrap_or_else(|_| "100".to_string())
            .parse()
            .unwrap_or(100);
        let enable_request_id = env::var("ENABLE_REQUEST_ID")
            .unwrap_or_else(|_| "true".to_string())
            .parse()
            .unwrap_or(true);

        Ok(Self {
            app_host,
            app_port,
            app_base_url,
            database_url,
            s3_endpoint,
            s3_region,
            s3_bucket,
            s3_access_key,
            s3_secret_key,
            max_file_size_mb,
            allowed_video_types,
            presigned_url_ttl_seconds,
            cors_allowed_origins,
            video_processing_enabled,
            ffmpeg_path,
            cdn_base_url,
            rate_limit_requests_per_second,
            enable_request_id,
        })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.app_host, self.app_port)
    }

    /// Future: used by upload handler to set presigned URL expiration
    #[allow(dead_code)]
    pub fn presigned_url_ttl(&self) -> Duration {
        Duration::from_secs(self.presigned_url_ttl_seconds)
    }

    #[allow(dead_code)]
    pub fn max_file_size_bytes(&self) -> u64 {
        self.max_file_size_mb * 1024 * 1024
    }

    pub fn cdn_enabled(&self) -> bool {
        !self.cdn_base_url.is_empty()
    }

    pub fn construct_cdn_url(&self, s3_key: &str) -> String {
        if self.cdn_enabled() {
            format!("{}/{}", self.cdn_base_url.trim_end_matches('/'), s3_key)
        } else {
            format!("{}/{}", self.app_base_url.trim_end_matches('/'), s3_key)
        }
    }

    pub fn allowed_content_types(&self) -> Vec<&str> {
        self.allowed_video_types
            .split(',')
            .map(|s| s.trim())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cdn_url_construction() {
        let config = AppConfig {
            app_host: "localhost".to_string(),
            app_port: 8080,
            app_base_url: "http://localhost:8080".to_string(),
            database_url: "postgres://test".to_string(),
            s3_endpoint: "http://s3.test".to_string(),
            s3_region: "ru-moscow-1".to_string(),
            s3_bucket: "test-bucket".to_string(),
            s3_access_key: "test".to_string(),
            s3_secret_key: "test".to_string(),
            max_file_size_mb: 500,
            allowed_video_types: "video/mp4".to_string(),
            presigned_url_ttl_seconds: 3600,
            cors_allowed_origins: "*".to_string(),
            video_processing_enabled: false,
            ffmpeg_path: "/usr/bin/ffmpeg".to_string(),
            cdn_base_url: "https://cdn.example.com".to_string(),
            rate_limit_requests_per_second: 100,
            enable_request_id: true,
        };

        let url = config.construct_cdn_url("videos/test.mp4");
        assert_eq!(url, "https://cdn.example.com/videos/test.mp4");
    }

    #[test]
    fn test_app_url_when_cdn_disabled() {
        let config = AppConfig {
            app_host: "localhost".to_string(),
            app_port: 8080,
            app_base_url: "http://localhost:8080".to_string(),
            database_url: "postgres://test".to_string(),
            s3_endpoint: "http://s3.test".to_string(),
            s3_region: "ru-moscow-1".to_string(),
            s3_bucket: "test-bucket".to_string(),
            s3_access_key: "test".to_string(),
            s3_secret_key: "test".to_string(),
            max_file_size_mb: 500,
            allowed_video_types: "video/mp4".to_string(),
            presigned_url_ttl_seconds: 3600,
            cors_allowed_origins: "*".to_string(),
            video_processing_enabled: false,
            ffmpeg_path: "/usr/bin/ffmpeg".to_string(),
            cdn_base_url: "".to_string(),
            rate_limit_requests_per_second: 100,
            enable_request_id: true,
        };

        let url = config.construct_cdn_url("videos/test.mp4");
        assert_eq!(url, "http://localhost:8080/videos/test.mp4");
    }

    #[test]
    fn test_allowed_content_types_parsing() {
        let config = AppConfig {
            app_host: "localhost".to_string(),
            app_port: 8080,
            app_base_url: "http://localhost:8080".to_string(),
            database_url: "postgres://test".to_string(),
            s3_endpoint: "http://s3.test".to_string(),
            s3_region: "ru-moscow-1".to_string(),
            s3_bucket: "test-bucket".to_string(),
            s3_access_key: "test".to_string(),
            s3_secret_key: "test".to_string(),
            max_file_size_mb: 500,
            allowed_video_types: "video/mp4, video/webm, video/quicktime".to_string(),
            presigned_url_ttl_seconds: 3600,
            cors_allowed_origins: "*".to_string(),
            video_processing_enabled: false,
            ffmpeg_path: "/usr/bin/ffmpeg".to_string(),
            cdn_base_url: "".to_string(),
            rate_limit_requests_per_second: 100,
            enable_request_id: true,
        };

        let types = config.allowed_content_types();
        assert_eq!(types, vec!["video/mp4", "video/webm", "video/quicktime"]);
    }
}
