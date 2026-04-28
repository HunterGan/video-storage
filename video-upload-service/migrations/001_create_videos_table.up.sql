-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    s3_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_s3_key ON videos(s3_key);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);

-- Add comments
COMMENT ON TABLE videos IS 'Stores video metadata and references';
COMMENT ON COLUMN videos.id IS 'Unique identifier for the video';
COMMENT ON COLUMN videos.title IS 'Video title';
COMMENT ON COLUMN videos.description IS 'Optional video description';
COMMENT ON COLUMN videos.url IS 'Public URL to access the video';
COMMENT ON COLUMN videos.s3_key IS 'S3 object key (unique identifier in storage)';
COMMENT ON COLUMN videos.created_at IS 'Timestamp when the video was created';
COMMENT ON COLUMN videos.updated_at IS 'Timestamp when the video was last updated';
