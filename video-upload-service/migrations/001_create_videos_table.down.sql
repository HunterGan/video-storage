-- Drop indexes
DROP INDEX IF EXISTS idx_videos_title;
DROP INDEX IF EXISTS idx_videos_s3_key;
DROP INDEX IF EXISTS idx_videos_created_at;

-- Drop table
DROP TABLE IF EXISTS videos;
