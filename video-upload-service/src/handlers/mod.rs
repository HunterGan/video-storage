pub mod health;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::config::AppConfig;
use crate::db::DbManager;
use crate::dto::{CreateVideoRequest, PaginationParams, UploadUrlRequest, UploadUrlResponse, VideoResponse, PaginatedVideos};
use crate::errors::AppError;
use crate::jobs::{JobQueue, VideoJob};
use crate::services::VideoService;
use validator::Validate;

#[derive(Clone)]
pub struct AppState {
    pub video_service: Arc<VideoService>,
    pub config: AppConfig,
    pub job_queue: Arc<dyn JobQueue>,
    pub db_manager: Arc<DbManager>,
}

pub async fn generate_upload_url(
    State(state): State<AppState>,
    Json(request): Json<UploadUrlRequest>,
) -> Result<Json<UploadUrlResponse>, AppError> {
    // Validate request
    request.validate().map_err(|e| {
        AppError::validation(
            e.to_string()
                .split("\n")
                .next()
                .unwrap_or("Validation failed")
        )
    })?;

    let response = state.video_service.generate_upload_url(&request).await?;

    Ok(Json(response))
}

pub async fn create_video(
    State(state): State<AppState>,
    Json(request): Json<CreateVideoRequest>,
) -> Result<Json<VideoResponse>, AppError> {
    // Validate request
    request.validate().map_err(|e| {
        AppError::validation(
            e.to_string()
                .split("\n")
                .next()
                .unwrap_or("Validation failed")
        )
    })?;

    let video = state.video_service.create_video(&request).await?;

    // Enqueue video processing job if enabled
    if state.config.video_processing_enabled {
        let job = VideoJob::ProcessVideo {
            s3_key: video.s3_key.clone(),
            output_key: format!("{}-processed", video.s3_key),
        };
        
        if let Err(e) = state.job_queue.enqueue(job).await {
            tracing::warn!("Failed to enqueue video processing job: {}", e);
            // Don't fail the request if job queue fails
        }
    }

    Ok(Json(VideoResponse::from(&video)))
}

pub async fn get_video(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<VideoResponse>, AppError> {
    let video_id = uuid::Uuid::parse_str(&id)
        .map_err(|_| AppError::validation("Invalid video ID"))?;

    let video = state.video_service.get_video(video_id).await?;

    Ok(Json(VideoResponse::from(&video)))
}

pub async fn list_videos(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedVideos>, AppError> {
    let limit = params.limit.max(1).min(100) as i64;
    let offset = params.offset.max(0) as i64;

    let (videos, total) = state.video_service.list_videos(limit, offset).await?;

    let response = PaginatedVideos {
        videos: videos.iter().map(VideoResponse::from).collect(),
        total,
        limit,
        offset,
    };

    Ok(Json(response))
}

pub async fn delete_video(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let video_id = uuid::Uuid::parse_str(&id)
        .map_err(|_| AppError::validation("Invalid video ID"))?;

    state.video_service.delete_video(video_id).await?;

    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_handler_module_compiles() {
        // Verify module compiles
        assert!(true);
    }
}
