-- Drop and recreate videos table with ALL fields
DROP TABLE IF EXISTS "video_versions" CASCADE;

DROP TABLE IF EXISTS "videos" CASCADE;

CREATE TABLE "videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "processed_url" TEXT,
    "poster_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "processing_started_at" TIMESTAMP(3),
    "processing_finished_at" TIMESTAMP(3),
    "error_message" TEXT,
    "duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "videos_s3_key_key" ON "videos"("s3_key");
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at");
CREATE INDEX "videos_title_idx" ON "videos"("title");
CREATE INDEX "videos_status_idx" ON "videos"("status");
CREATE INDEX "videos_s3_key_idx" ON "videos"("s3_key");

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