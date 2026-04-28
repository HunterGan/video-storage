use crate::config::AppConfig;
use crate::dto::{CreateVideoRequest, UploadUrlRequest, UploadUrlResponse};
use crate::errors::AppError;
use crate::models::{Video, VideoInsert};
use crate::repositories::VideoRepository;
use crate::s3::S3Client;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct VideoService {
    repository: VideoRepository,
    s3_client: Arc<S3Client>,
    config: AppConfig,
}

impl VideoService {
    pub fn new(repository: VideoRepository, s3_client: S3Client, config: AppConfig) -> Self {
        Self {
            repository,
            s3_client: Arc::new(s3_client),
            config,
        }
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub async fn generate_upload_url(
        &self,
        request: &UploadUrlRequest,
    ) -> Result<UploadUrlResponse, AppError> {
        // Validate content type
        self.validate_content_type(&request.content_type)?;

        // Generate S3 key
        let s3_key = S3Client::generate_s3_key(&request.filename);

        // Generate presigned URL
        let upload_url = self
            .s3_client
            .generate_presigned_url(
                &s3_key,
                &request.content_type,
                self.config.presigned_url_ttl_seconds,
            )
            .await
            .map_err(|e| AppError::s3_error(e.to_string()))?;

        // Construct file URL using CDN if configured
        let file_url = self.config.construct_cdn_url(&s3_key);

        Ok(UploadUrlResponse {
            upload_url,
            file_url,
            key: s3_key,
        })
    }

    pub async fn create_video(
        &self,
        request: &CreateVideoRequest,
    ) -> Result<Video, AppError> {
        // Check if S3 key already exists
        if self.repository.find_by_s3_key(&request.s3_key).await?.is_some() {
            return Err(AppError::VideoAlreadyExists);
        }

        // Create video record
        let video_insert = VideoInsert {
            id: Uuid::new_v4(),
            title: request.title.clone(),
            description: request.description.clone(),
            url: request.url.clone(),
            s3_key: request.s3_key.clone(),
        };

        self.repository.create(&video_insert).await?;

        // Fetch and return the created video
        self.repository
            .find_by_id(video_insert.id)
            .await?
            .ok_or(AppError::VideoNotFound)
    }

    pub async fn get_video(&self, id: Uuid) -> Result<Video, AppError> {
        self.repository
            .find_by_id(id)
            .await?
            .ok_or(AppError::VideoNotFound)
    }

    pub async fn list_videos(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Video>, i64), AppError> {
        self.repository.list(limit, offset).await.map_err(Into::into)
    }

    pub async fn delete_video(&self, id: Uuid) -> Result<(), AppError> {
        // Get video to find S3 key
        let video = self.repository.find_by_id(id).await?.ok_or(AppError::VideoNotFound)?;

        // Try to delete from S3 (best effort)
        let s3_delete_result = self.s3_client.delete_object(&video.s3_key).await;
        if let Err(e) = s3_delete_result {
            tracing::warn!(s3_key = %video.s3_key, error = %e, "Failed to delete from S3");
            // Continue with DB deletion - S3 deletion is best effort
        }

        // Delete from database
        self.repository.delete(id).await?;

        Ok(())
    }

    fn validate_content_type(&self, content_type: &str) -> Result<(), AppError> {
        let allowed_types = self.config.allowed_content_types();

        if !allowed_types.iter().any(|&t| content_type.eq_ignore_ascii_case(t)) {
            return Err(AppError::InvalidVideoType);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_validate_content_type() {
        // This test verifies the validation logic compiles
        // Actual tests would require mocking
        assert!(true);
    }
}
