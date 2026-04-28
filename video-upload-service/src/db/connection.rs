use crate::errors::AppError;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::watch;
use tokio::sync::Mutex;

/// Backoff steps for reconnect attempts (30s, 1m, 2m, 4m, 5m)
const BACKOFF_STEPS: [Duration; 6] = [
    Duration::from_secs(30),
    Duration::from_secs(60),
    Duration::from_secs(120),
    Duration::from_secs(240),
    Duration::from_secs(300),
    Duration::from_secs(300), // Maximum 5 minutes
];

/// Monitor loop for database connection health
pub async fn monitor_loop(
    pool: sqlx::PgPool,
    status: Arc<AtomicBool>,
    mut shutdown: watch::Receiver<()>,
    reconnect_attempts: Arc<Mutex<u32>>,
    last_disconnect_time: Arc<tokio::sync::RwLock<Option<std::time::Instant>>>,
) {
    let mut backoff_index = 0;
    let mut checking = false;

    loop {
        // Update checking status
        if checking && status.load(Ordering::Relaxed) {
            tracing::info!("✅ Database connection restored");
            *reconnect_attempts.lock().await = 0;
            *last_disconnect_time.write().await = None;
            backoff_index = 0;
            checking = false;
        }

        // Wait for either shutdown signal or backoff timeout
        let wait_duration = if checking {
            Duration::from_millis(100) // Check frequently when reconnecting
        } else {
            BACKOFF_STEPS[backoff_index.min(5)]
        };

        let shutdown_received = tokio::select! {
            _ = shutdown.changed() => true,
            _ = tokio::time::sleep(wait_duration) => false,
        };

        if shutdown_received {
            break;
        }

        // Try to acquire a connection
        match pool.acquire().await {
            Ok(_) => {
                if !status.load(Ordering::Relaxed) {
                    tracing::info!("✅ Database connection restored");
                    *reconnect_attempts.lock().await = 0;
                    *last_disconnect_time.write().await = None;
                }
                status.store(true, Ordering::Relaxed);
                checking = false;
                backoff_index = 0;
            }
            Err(e) => {
                checking = true;
                backoff_index = (backoff_index + 1).min(5);

                if backoff_index >= 3 {
                    tracing::error!(
                        "🔴 Database unavailable for extended period: {}",
                        e
                    );
                } else {
                    tracing::warn!("Database connection lost: {}", e);
                }

                status.store(false, Ordering::Relaxed);
                *reconnect_attempts.lock().await += 1;
                *last_disconnect_time.write().await = Some(std::time::Instant::now());
            }
        }
    }

    tracing::info!("Database monitor shutting down gracefully");
}

/// Check if database connection is healthy
pub async fn check_connection(pool: &sqlx::PgPool) -> Result<(), AppError> {
    let _ = pool.acquire()
        .await
        .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?
        .close()
        .await;
    Ok(())
}
