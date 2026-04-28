# Video Upload Service

A production-ready Rust backend service for managing video uploads using S3-compatible storage (Selectel S3).

## Features

- **Presigned URL Generation**: Direct client-to-S3 uploads with secure temporary URLs
- **Video Metadata Management**: Store and retrieve video information in PostgreSQL
- **CRUD Operations**: Create, read, list, and delete videos
- **S3 Integration**: Full object management with Selectel S3
- **Clean Architecture**: Separated handlers, services, repositories, and models
- **Async First**: Built with Tokio for high-performance async operations
- **Structured Logging**: Using tracing for observability
- **Validation**: Request validation with the validator crate
- **CORS Support**: Configurable cross-origin resource sharing

## Tech Stack

- **Runtime**: Tokio
- **Web Framework**: Axum
- **Database**: PostgreSQL with SQLx
- **S3 Client**: aws-sdk-s3 (configured for Selectel)
- **UUID**: uuid crate
- **Time**: chrono
- **Validation**: validator
- **Error Handling**: thiserror + anyhow
- **Logging**: tracing + tracing-subscriber

## Architecture

```
src/
├── config/      # Environment configuration
├── dto/         # Data Transfer Objects (request/response)
├── errors/      # Custom error types
├── handlers/    # HTTP request handlers
├── middleware/  # Authentication, logging middleware
├── models/      # Database and domain models
├── repositories/# Database access layer
├── s3/          # S3 client abstraction
├── services/    # Business logic
└── main.rs      # Application entry point
```

## API Endpoints

### Generate Upload URL
```http
POST /api/videos/upload-url
Content-Type: application/json

{
  "filename": "video.mp4",
  "contentType": "video/mp4"
}
```

Response:
```json
{
  "uploadUrl": "https://...presigned.url...",
  "fileUrl": "http://localhost:8080/videos/uuid.mp4",
  "key": "videos/uuid.mp4"
}
```

### Create Video Record
```http
POST /api/videos
Content-Type: application/json

{
  "title": "My Video",
  "url": "http://example.com/video.mp4",
  "s3_key": "videos/uuid.mp4",
  "description": "Optional description"
}
```

### List Videos
```http
GET /api/videos?limit=20&offset=0
```

### Get Video by ID
```http
GET /api/videos/{id}
```

### Delete Video
```http
DELETE /api/videos/{id}
```

## Setup Instructions

### Prerequisites

- Rust 1.70+ (latest stable)
- PostgreSQL 12+
- S3-compatible storage (Selectel S3)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd video-upload-service
```

2. **Set up PostgreSQL database**
```sql
CREATE DATABASE video_upload_db;
```

3. **Configure environment variables**

Create a `.env` file in the project root:

```env
# Application Configuration
APP_HOST=0.0.0.0
APP_PORT=8080
APP_BASE_URL=http://localhost:8080

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/video_upload_db

# S3 Configuration (Selectel)
S3_ENDPOINT=https://object-storage.ru-moscow-1.selectel.cloud
S3_REGION=ru-moscow-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Upload Configuration
MAX_FILE_SIZE_MB=500
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime
PRESIGNED_URL_TTL_SECONDS=3600

# CORS Configuration
CORS_ALLOWED_ORIGINS=*

# Video Processing (Future Feature)
VIDEO_PROCESSING_ENABLED=false
FFMPEG_PATH=/usr/bin/ffmpeg
```

4. **Build and run**
```bash
# Build
 cargo build --release

# Run
cargo run
```

## Running Tests

```bash
# Run all tests
cargo test

# Run with coverage (requires additional setup)
cargo test -- --test-threads=1
```

## Database Schema

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    s3_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_s3_key ON videos(s3_key);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| APP_HOST | Server bind host | 0.0.0.0 |
| APP_PORT | Server bind port | 8080 |
| APP_BASE_URL | Base URL for file access | http://localhost:8080 |
| DATABASE_URL | PostgreSQL connection string | (required) |
| S3_ENDPOINT | S3-compatible endpoint | (required) |
| S3_REGION | S3 region | ru-moscow-1 |
| S3_BUCKET | S3 bucket name | (required) |
| S3_ACCESS_KEY | S3 access key | (required) |
| S3_SECRET_KEY | S3 secret key | (required) |
| MAX_FILE_SIZE_MB | Maximum upload size | 500 |
| ALLOWED_VIDEO_TYPES | Comma-separated MIME types | video/mp4,video/webm,video/quicktime |
| PRESIGNED_URL_TTL_SECONDS | Presigned URL expiration | 3600 |
| CORS_ALLOWED_ORIGINS | CORS allowed origins | * |
| VIDEO_PROCESSING_ENABLED | Enable video processing | false |
| FFMPEG_PATH | FFmpeg binary path | /usr/bin/ffmpeg |

## Future Extensibility

The architecture supports adding:

1. **Video Processing Pipeline**
   - Background job queue (Redis/RabbitMQ)
   - FFmpeg processing workers
   - Thumbnail generation
   - Format conversion

2. **Authentication**
   - JWT-based authentication
   - User management
   - Role-based access control

3. **CDN Integration**
   - Configurable CDN URLs
   - Cache invalidation

4. **Advanced Features**
   - HLS streaming support
   - Video transcoding
   - Adaptive bitrate streaming

## Security Considerations

- Presigned URLs prevent direct S3 access
- MIME type validation prevents upload attacks
- File size limits prevent DoS
- No file proxying - direct S3 access
- CORS configuration for frontend integration

## License

MIT
