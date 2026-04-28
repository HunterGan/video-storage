use aws_sdk_s3::{
    config::{Config, Region, Credentials},
    types::ObjectCannedAcl,
    Client,
};

use crate::config::AppConfig;

pub struct S3Client {
    client: Client,
    bucket: String,
    endpoint: String,
}

impl S3Client {
    pub async fn new(config: &AppConfig) -> Self {
        let region = Region::new(config.s3_region.clone());
        let credentials = Credentials::new(
            &config.s3_access_key,
            &config.s3_secret_key,
            None,
            None,
            "static",
        );

        let s3_config = Config::builder()
            .region(region)
            .endpoint_url(&config.s3_endpoint)
            .credentials_provider(credentials)
            .build();

        let client = Client::from_conf(s3_config);

        Self {
            client,
            bucket: config.s3_bucket.clone(),
            endpoint: config.s3_endpoint.clone(),
        }
    }

    pub fn generate_s3_key(filename: &str) -> String {
        let uuid = uuid::Uuid::new_v4();
        let extension = if let Some(idx) = filename.rfind('.') {
            &filename[idx + 1..]
        } else {
            "mp4"
        };
        format!("videos/{}.{}", uuid, extension)
    }

    pub async fn generate_presigned_url(
        &self,
        key: &str,
        content_type: &str,
        ttl_seconds: u64,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let presigning_config = aws_sdk_s3::presigning::PresigningConfig::builder()
            .expires_in(std::time::Duration::from_secs(ttl_seconds))
            .build()
            .map_err(|e| format!("Failed to build presigning config: {}", e))?;

        let url = self.client.put_object()
            .bucket(&self.bucket)
            .key(key)
            .content_type(content_type)
            // .acl(ObjectCannedAcl::PublicRead)
            .presigned(presigning_config)
            .await
            .map_err(|e| format!("Failed to generate presigned URL: {}", e))?;

        // Преобразуем URI в полный URL с хостом
        let uri = url.uri().to_string();
        
        // Если URI относительный (начинается с /), добавляем endpoint
        // Это необходимо для local development и когда бэкенд и S3 на разных хостах
        let full_url = if uri.starts_with('/') {
            format!("{}{}", self.endpoint, uri)
        } else {
            uri
        };

        Ok(full_url)
    }

    pub async fn delete_object(
        &self,
        key: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("Failed to delete object {}: {}", key, e))?;

        Ok(())
    }

    pub(crate) async fn object_exists(&self, key: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        match self.client.head_object().bucket(&self.bucket).key(key).send().await {
            Ok(_) => Ok(true),
            Err(e) => {
                if e.to_string().contains("404") || e.to_string().contains("NoSuchKey") {
                    Ok(false)
                } else {
                    Err(format!("Failed to check object existence: {}", e).into())
                }
            }
        }
    }

    pub(crate) async fn get_object_metadata(
        &self,
        key: &str,
    ) -> Result<(i64, String), Box<dyn std::error::Error + Send + Sync>> {
        let response = self.client.head_object().bucket(&self.bucket).key(key).send().await
            .map_err(|e| format!("Failed to get object metadata: {}", e))?;

        let content_length = response.content_length();
        let content_type = response.content_type()
            .map(|s| s.to_string())
            .ok_or("Content type not available")?;

        Ok((content_length, content_type))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_s3_key() {
        let key = S3Client::generate_s3_key("test.mp4");
        assert!(key.starts_with("videos/"));
        assert!(key.ends_with(".mp4"));
    }

    #[test]
    fn test_generate_s3_key_with_different_extension() {
        let key = S3Client::generate_s3_key("video.webm");
        assert!(key.ends_with(".webm"));
    }

    #[test]
    fn test_generate_s3_key_without_extension() {
        let key = S3Client::generate_s3_key("videofile");
        assert!(key.ends_with(".mp4"));
    }
}
