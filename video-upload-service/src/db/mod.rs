pub mod connection;

use self::connection::monitor_loop;
use crate::config::AppConfig;
use crate::errors::AppError;
use sqlx::postgres::PgPool;
use sqlx::pool::PoolOptions;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::watch;
use tokio::task::JoinHandle;

/// Manager for database connections with automatic recovery
pub struct DbManager {
    pool: sqlx::PgPool,
    connection_status: Arc<AtomicBool>,
    monitor_handle: Option<JoinHandle<()>>,
    shutdown_tx: watch::Sender<()>,
    reconnect_attempts: Arc<tokio::sync::Mutex<u32>>,
    last_disconnect_time: Arc<tokio::sync::RwLock<Option<std::time::Instant>>>,
}

impl DbManager {
    /// Initialize with full database connection
    pub async fn new(config: &AppConfig) -> Result<Self, AppError> {
        let pool = PoolOptions::new()
            .max_connections(20)
            .min_connections(5)
            .acquire_timeout(Duration::from_secs(10))
            .connect(&config.database_url)
            .await
            .map_err(|e: sqlx::Error| AppError::DatabaseUnavailable(e.to_string()))?;

        let connection_status = Arc::new(AtomicBool::new(true));
        let (shutdown_tx, _shutdown_rx) = watch::channel(());

        Ok(Self {
            pool,
            connection_status,
            monitor_handle: None,
            shutdown_tx,
            reconnect_attempts: Arc::new(tokio::sync::Mutex::new(0)),
            last_disconnect_time: Arc::new(tokio::sync::RwLock::new(None)),
        })
    }

    /// Initialize in fallback mode when database is unavailable
    pub async fn new_fallback(config: &AppConfig) -> Self {
        tracing::warn!(
            "Database unavailable at startup, running in degraded mode"
        );

        // Create lazy pool (no immediate connection attempt)
        let pool: PgPool = PoolOptions::new()
            .max_connections(5)
            .connect_lazy(&config.database_url)
            .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))
            .expect("Failed to create lazy pool");

        let connection_status = Arc::new(AtomicBool::new(false));
        let (shutdown_tx, _shutdown_rx) = watch::channel(());

        Self {
            pool,
            connection_status,
            monitor_handle: None,
            shutdown_tx,
            reconnect_attempts: Arc::new(tokio::sync::Mutex::new(0)),
            last_disconnect_time: Arc::new(tokio::sync::RwLock::new(Some(
                std::time::Instant::now(),
            ))),
        }
    }

    /// Start the connection monitor
    pub async fn start_monitor(&mut self) {
        let shutdown_rx = self.shutdown_tx.subscribe();
        let handle = tokio::spawn(monitor_loop(
            self.pool.clone(),
            self.connection_status.clone(),
            shutdown_rx,
            self.reconnect_attempts.clone(),
            self.last_disconnect_time.clone(),
        ));
        self.monitor_handle = Some(handle);
    }

    /// Stop the monitor gracefully
    pub async fn stop_monitor(&mut self) {
        if let Err(_) = self.shutdown_tx.send(()) {
            // Channel already closed
        }
        if let Some(handle) = self.monitor_handle.take() {
            handle.abort();
        }
    }

    /// Check if database is currently connected
    pub fn is_connected(&self) -> bool {
        self.connection_status.load(Ordering::Relaxed)
    }

    /// Get the underlying pool (for use in repositories)
    pub fn pool(&self) -> &sqlx::PgPool {
        &self.pool
    }

    /// Get the number of reconnect attempts
    pub async fn get_reconnect_attempts(&self) -> u32 {
        *self.reconnect_attempts.lock().await
    }
    
    /// Get the last disconnect time
    pub async fn get_last_disconnect_time(&self) -> Option<std::time::Instant> {
        *self.last_disconnect_time.read().await
    }
}
