use async_trait::async_trait;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::info;

use crate::config::AppConfig;

/// Video processing job types
#[derive(Debug, Clone)]
pub enum VideoJob {
    /// Process a video after upload (resize, compress, etc.)
    ProcessVideo {
        s3_key: String,
        output_key: String,
    },
    /// Generate thumbnails for a video
    GenerateThumbnails {
        s3_key: String,
        output_prefix: String,
    },
    /// Convert video to HLS format
    ConvertToHls {
        s3_key: String,
        output_prefix: String,
    },
}

/// Trait for job queue implementations
#[async_trait]
pub trait JobQueue: Send + Sync {
    /// Enqueue a job for processing
    async fn enqueue(&self, job: VideoJob) -> Result<(), JobQueueError>;
    
    /// Get the number of pending jobs
    async fn pending_count(&self) -> Result<u64, JobQueueError>;
}

/// Error type for job queue operations
#[derive(Debug, thiserror::Error)]
pub enum JobQueueError {
    #[error("Failed to enqueue job: {0}")]
    EnqueueFailed(String),
    #[error("Queue is full")]
    QueueFull,
    #[error("Connection error: {0}")]
    ConnectionError(String),
}

/// In-memory job queue for development/testing
pub struct InMemoryJobQueue {
    sender: mpsc::Sender<VideoJob>,
    pending_count: Arc<AtomicUsize>,
}

impl InMemoryJobQueue {
    pub fn new(buffer_size: usize) -> Self {
        let (sender, mut receiver) = mpsc::channel(buffer_size);
        let pending_count = Arc::new(AtomicUsize::new(0));
        let count_clone = pending_count.clone();
        
        // Spawn a task to keep the receiver alive and process (or drop) jobs
        // In a real implementation, this would process the jobs
        tokio::spawn(async move {
            while let Some(job) = receiver.recv().await {
                // Decrement counter when job is received
                count_clone.fetch_sub(1, Ordering::SeqCst);
                
                // For now, just log the job and continue
                // In production, this would dispatch to actual workers
                match &job {
                    VideoJob::ProcessVideo { s3_key, output_key } => {
                        info!(s3_key, output_key, "Received video processing job");
                    }
                    VideoJob::GenerateThumbnails { s3_key, output_prefix } => {
                        info!(s3_key, output_prefix, "Received thumbnail generation job");
                    }
                    VideoJob::ConvertToHls { s3_key, output_prefix } => {
                        info!(s3_key, output_prefix, "Received HLS conversion job");
                    }
                }
            }
        });
        
        Self {
            sender,
            pending_count,
        }
    }

    pub fn start_processor(&self, _config: &AppConfig) -> tokio::task::JoinHandle<()> {
        // The processor is already running in the background task above
        // This is a placeholder for more advanced configurations
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                info!("Job processor heartbeat");
            }
        })
    }
}

#[async_trait]
impl JobQueue for InMemoryJobQueue {
    async fn enqueue(&self, job: VideoJob) -> Result<(), JobQueueError> {
        self.sender
            .send(job)
            .await
            .map_err(|_| JobQueueError::QueueFull)?;
        // Increment counter when job is enqueued
        self.pending_count.fetch_add(1, Ordering::SeqCst);
        Ok(())
    }

    async fn pending_count(&self) -> Result<u64, JobQueueError> {
        Ok(self.pending_count.load(Ordering::SeqCst) as u64)
    }
}

/// Null job queue for when video processing is disabled
pub struct NullJobQueue;

impl NullJobQueue {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl JobQueue for NullJobQueue {
    async fn enqueue(&self, _job: VideoJob) -> Result<(), JobQueueError> {
        // Silently ignore jobs when processing is disabled
        Ok(())
    }

    async fn pending_count(&self) -> Result<u64, JobQueueError> {
        Ok(0)
    }
}

/// Factory function to create the appropriate job queue based on config
pub fn create_job_queue(config: &AppConfig) -> Arc<dyn JobQueue> {
    if config.video_processing_enabled {
        Arc::new(InMemoryJobQueue::new(100))
    } else {
        Arc::new(NullJobQueue::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_in_memory_job_queue_enqueue() {
        let queue = InMemoryJobQueue::new(10);
        let job = VideoJob::ProcessVideo {
            s3_key: "videos/test.mp4".to_string(),
            output_key: "videos/test-processed.mp4".to_string(),
        };

        let result = queue.enqueue(job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_null_job_queue() {
        let queue = NullJobQueue::new();
        let job = VideoJob::ProcessVideo {
            s3_key: "videos/test.mp4".to_string(),
            output_key: "videos/test-processed.mp4".to_string(),
        };

        let result = queue.enqueue(job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_pending_count() {
        let queue = InMemoryJobQueue::new(10);
        let count = queue.pending_count().await.unwrap();
        assert_eq!(count, 0);
    }
}
