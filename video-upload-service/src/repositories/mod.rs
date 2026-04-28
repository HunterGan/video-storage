use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{Video, VideoInsert};

#[derive(Clone)]
pub struct VideoRepository {
    pool: PgPool,
}

impl VideoRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, video: &VideoInsert) -> Result<Uuid, AppError> {
        sqlx::query(
            "INSERT INTO videos (id, title, description, url, s3_key, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())",
        )
        .bind(video.id)
        .bind(&video.title)
        .bind(&video.description)
        .bind(&video.url)
        .bind(&video.s3_key)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok(video.id)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Video>, AppError> {
        let row = sqlx::query_as::<_, Video>(
            "SELECT id, title, description, url, s3_key, created_at FROM videos WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok(row)
    }

    pub async fn find_by_s3_key(&self, s3_key: &str) -> Result<Option<Video>, AppError> {
        let row = sqlx::query_as::<_, Video>(
            "SELECT id, title, description, url, s3_key, created_at FROM videos WHERE s3_key = $1",
        )
        .bind(s3_key)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok(row)
    }

    pub async fn list(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Video>, i64), AppError> {
        let videos = sqlx::query_as::<_, Video>(
            "SELECT id, title, description, url, s3_key, created_at 
             FROM videos 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM videos")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok((videos, total))
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM videos WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_by_s3_key(&self, s3_key: &str) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM videos WHERE s3_key = $1")
            .bind(s3_key)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::DatabaseUnavailable(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_repository_creation() {
        // This is just to verify the module compiles
        // Actual tests require a database connection
        assert!(true);
    }
}
