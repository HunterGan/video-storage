-- CreateTable (не нужно, таблица уже существует)
-- AddColumn
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "original_bit_rate" INTEGER;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "original_codec" VARCHAR(20);
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "encode_settings" JSONB;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "skipped_encode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "skip_reason" VARCHAR(50);

-- AddIndex (если нужно)
CREATE INDEX IF NOT EXISTS "videos_skipped_encode_idx" ON "videos"("skipped_encode");
CREATE INDEX IF NOT EXISTS "videos_skip_reason_idx" ON "videos"("skip_reason");