use super::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Serialize;
use std::time::Duration;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub components: HealthComponents,
    pub uptime_seconds: u64,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct HealthComponents {
    pub database: DatabaseHealth,
}

#[derive(Serialize)]
pub struct DatabaseHealth {
    pub status: String,
    pub last_check: String,
    pub reconnect_attempts: u32,
    pub time_since_last_disconnect: Option<String>,
}

pub async fn health_check(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let is_connected = state.db_manager.is_connected();
    let reconnect_attempts = state.db_manager.get_reconnect_attempts().await;
    
    let timestamp = chrono::Utc::now().to_rfc3339();
    
    // Calculate time since last disconnect
    let time_since_disconnect = if !is_connected {
        if let Some(disconnect_time) = state.db_manager.get_last_disconnect_time().await {
            let duration = disconnect_time.elapsed();
            Some(format_duration(duration))
        } else {
            None
        }
    } else {
        None
    };
    
    let db_status = if is_connected {
        "connected".to_string()
    } else if reconnect_attempts > 0 {
        "reconnecting".to_string()
    } else {
        "disconnected".to_string()
    };
    
    let status = if is_connected {
        "healthy".to_string()
    } else {
        "degraded".to_string()
    };
    
    // Simple uptime calculation
    let uptime_seconds = chrono::Utc::now().timestamp() as u64;
    
    let response = HealthResponse {
        status,
        components: HealthComponents {
            database: DatabaseHealth {
                status: db_status,
                last_check: timestamp.clone(),
                reconnect_attempts,
                time_since_last_disconnect: time_since_disconnect,
            },
        },
        uptime_seconds,
        timestamp,
    };
    
    let status_code = if is_connected {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    
    (status_code, Json(response))
}

fn format_duration(duration: Duration) -> String {
    let hours = duration.as_secs() / 3600;
    let minutes = (duration.as_secs() % 3600) / 60;
    let seconds = duration.as_secs() % 60;
    
    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}
