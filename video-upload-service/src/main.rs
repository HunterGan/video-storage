#![allow(dead_code)]

mod config;
mod db;
mod dto;
mod errors;
mod handlers;
mod jobs;
mod middleware;
mod models;
mod repositories;
mod s3;
mod services;

use axum::{
    routing::{delete, get, post},
    Router,
};
use config::AppConfig;
use db::DbManager;
use handlers::health::health_check as health_check_handler;
use handlers::{AppState, create_video, delete_video, generate_upload_url, get_video, list_videos};
use jobs::{create_job_queue, JobQueue};
use middleware::create_cors_layer;
use repositories::VideoRepository;
use s3::S3Client;
use services::VideoService;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tokio::time::Duration;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "video_upload_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = AppConfig::load().expect("Failed to load configuration");

    tracing::info!("Starting video upload service on {}", config.bind_address());

    // Initialize database manager with graceful fallback
    let mut db_manager = match DbManager::new(&config).await {
        Ok(manager) => {
            tracing::info!("Successfully connected to database");
            manager
        }
        Err(_) => {
            tracing::warn!("Database unavailable at startup, will attempt to reconnect");
            DbManager::new_fallback(&config).await
        }
    };

    // Start database connection monitor
    db_manager.start_monitor().await;

    // Run migrations if database is available
    if db_manager.is_connected() {
        if let Err(e) = run_migrations(db_manager.pool()).await {
            tracing::warn!("Failed to run migrations: {}", e);
        } else {
            tracing::info!("Database migrations completed");
        }
    } else {
        tracing::warn!("Skipping migrations - database not available");
    }

    // Initialize S3 client
    let s3_client = S3Client::new(&config).await;

    // Initialize job queue
    let job_queue: Arc<dyn JobQueue> = create_job_queue(&config);
    
    // Start job processor if video processing is enabled
    if config.video_processing_enabled {
        if let Some(_processor) = start_job_processor(job_queue.clone(), &config) {
            tracing::info!("Job processor started");
        }
    }

    // Initialize repository and service
    let video_repository = VideoRepository::new(db_manager.pool().clone());
    let video_service = VideoService::new(video_repository, s3_client, config.clone());

    // Create CORS layer
    let cors_layer = create_cors_layer(&config);

    // Build router
    let app_state = AppState {
        video_service: Arc::new(video_service),
        config: config.clone(),
        job_queue,
        db_manager: Arc::new(db_manager),
    };

    let app = Router::new()
        // Health check
        .route("/health", get(health_check_handler))
        // API routes
        .route("/api/videos/upload-url", post(generate_upload_url))
        .route("/api/videos", post(create_video))
        .route("/api/videos", get(list_videos))
        .route("/api/videos/:id", get(get_video))
        .route("/api/videos/:id", delete(delete_video))
        .layer(cors_layer)
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    // Create listener
    let addr: SocketAddr = format!("{}:{}", config.app_host, config.app_port)
        .parse()
        .expect("Invalid address format");

    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Server listening on {}", addr);

    // Run server with graceful shutdown
    run_server_with_graceful_shutdown(listener, app).await?;

    Ok(())
}

async fn run_migrations(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    // Create videos table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS videos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            description TEXT,
            url TEXT NOT NULL,
            s3_key TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_videos_s3_key ON videos(s3_key);
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

fn start_job_processor(
    _job_queue: Arc<dyn JobQueue>,
    _config: &AppConfig,
) -> Option<tokio::task::JoinHandle<()>> {
    // Job processor is started in the InMemoryJobQueue
    // This is a placeholder for future enhancements
    None
}

async fn run_server_with_graceful_shutdown(
    listener: tokio::net::TcpListener,
    app: Router,
) -> Result<(), Box<dyn std::error::Error>> {
    // Graceful shutdown signal
    let graceful = async {
        signal::ctrl_c().await.unwrap();
        tracing::info!("Received shutdown signal");
    };

    // Server runtime
    let server = async {
        axum::serve(listener, app).await?;
        Ok::<_, Box<dyn std::error::Error>>(())
    };

    // Wait for either signal or server error
    tokio::select! {
        _ = graceful => {
            tracing::info!("Shutting down gracefully...");
            // Wait for background tasks to complete
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
        result = server => {
            if let Err(e) = result {
                tracing::error!("Server error: {}", e);
            }
        }
    }

    Ok(())
}
