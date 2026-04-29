-- Add duration to videos table
ALTER TABLE "videos" ADD COLUMN "duration" DOUBLE PRECISION;

-- Create video_versions table
CREATE TYPE "video_quality" AS ENUM ('SD', 'HD');

CREATE TABLE "video_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "quality" "video_quality" NOT NULL DEFAULT 'HD',
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "video_versions_video_id_idx" ON "video_versions"("video_id");
CREATE INDEX "video_versions_quality_idx" ON "video_versions"("quality");

ALTER TABLE "video_versions" ADD CONSTRAINT "video_versions_video_id_fkey"
    FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;
