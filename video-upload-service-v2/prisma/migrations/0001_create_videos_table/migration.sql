CREATE TABLE "videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "videos_s3_key_key" ON "videos"("s3_key");
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at");
CREATE INDEX "videos_title_idx" ON "videos"("title");

ALTER TABLE "videos" ADD CONSTRAINT "videos_s3_key_unique" UNIQUE("s3_key");
