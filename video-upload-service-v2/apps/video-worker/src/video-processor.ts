import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { VideoStatus } = require('@prisma/client');
import { Job } from 'bullmq';
import { createLogger } from './logger';
import { JobType } from './types';
import { FfmpegService, VideoMetadata } from './ffmpeg.service';
import { S3ClientService } from './s3-client.service';
import { TempFileService } from './temp-file.service';
import { shouldEncode } from './video-decision.service';
import { buildScaleFilter } from './scale-filter.util';
import { getQualityProfile } from './quality-profile.util';

const logger = createLogger('video-processor');

export class VideoProcessor {
  private readonly prisma = new PrismaClient();
  private readonly ffmpeg = new FfmpegService();
  private readonly s3 = new S3ClientService();
  private readonly tempFileService = new TempFileService();
  private readonly logger = logger;
  private _processingTimings = new Map<string, number>();

  async processVideo(job: Job): Promise<void> {
    const { s3_key } = job.data as { s3_key: string };

    const video = await this.prisma.video.findFirst({
      where: { s3_key },
    });

    if (!video) {
      this.logger.error(`Video not found for s3_key: ${s3_key}`);
      throw new Error(`Video not found for s3_key: ${s3_key}`);
    }

    const videoId = video.id;
    const startTime = Date.now();
    this._processingTimings.set(videoId, startTime);
    this.logger.info(`Processing video: ${videoId} (s3_key: ${s3_key})`);

    const claimResult = await this.prisma.video.updateMany({
      where: { id: videoId, status: VideoStatus.QUEUED },
      data: {
        status: VideoStatus.PROCESSING,
        processing_started_at: new Date(),
        error_message: null,
      },
    });

    if (claimResult.count === 0) {
      this.logger.info(`Job skipped (already processed): ${videoId}`);
      return;
    }

    let tempDir: string | null = null;
    let metadata: VideoMetadata | null = null;

    try {
      // Шаг 2: Получить метаданные через S3 range request (первые 5MB)
      this.logger.info(`[${videoId}] Extracting video metadata from S3...`);
      try {
        metadata = await this.ffmpeg.getMetadataFromS3(s3_key);
      } catch (error) {
        await this.failVideo(videoId, 'metadata_extraction_failed', error);
        throw error;
      }
      this.logger.info(
        `[${videoId}] Video metadata: ${metadata.duration.toFixed(2)}s, ${metadata.width}x${metadata.height}, codec: ${metadata.codec}, bit_rate: ${metadata.bit_rate}`,
      );

      // Шаг 3: Сохранить метаданные в БД
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          duration: metadata.duration,
          file_size: metadata.file_size,
        },
      });

      // Шаг 4: Принять решение — нужно ли кодировать
      const decision = shouldEncode(metadata);

      if (!decision.encode) {
        // Шаг 4a: Кодирование не нужно
        logger.info(`[${videoId}] Skipping encode: ${decision.reason}`);

        tempDir = await this.tempFileService.createTempDir('video-processor');
        const inputPath = `${tempDir}/input.mp4`;
        const posterPath = `${tempDir}/poster.jpg`;

        // Скачиваем оригинал для извлечения постера
        this.logger.info(`[${videoId}] Downloading original video for poster extraction...`);
        await this.s3.downloadFile(s3_key, inputPath);

        // Извлекаем постер
        this.logger.info(`[${videoId}] Extracting poster from original video...`);
        await this.ffmpeg.extractPoster(inputPath, posterPath, 5);

        // Загружаем постер в S3
        const posterKey = `${s3_key}-poster.jpg`;
        this.logger.info(`[${videoId}] Uploading poster to S3: ${posterKey}`);
        await this.s3.uploadFile(posterPath, posterKey, 'image/jpeg');

        // Обновляем статус
        const cdnBase = process.env.CDN_BASE_URL || '';
        await this.prisma.video.update({
          where: { id: videoId },
          data: {
            status: VideoStatus.COMPLETED,
            processing_finished_at: new Date(),
            processed_url: `${cdnBase}/${s3_key}`,
            poster_url: `${cdnBase}/${posterKey}`,
            skipped_encode: true,
            skip_reason: decision.reason,
          },
        });

        logger.info(`[${videoId}] Processing complete (skipped): ${decision.reason}`);

        // Structured log: video_skipped
        this.logSkipped(videoId, decision.reason, metadata.file_size);
        return;
      }

      // Шаг 4b: Кодирование нужно
      logger.info(`[${videoId}] Encoding: ${decision.reason}`);

      // Шаг 5: Определить параметры кодирования
      const scaleFilter = buildScaleFilter(metadata);
      const qualityProfile = getQualityProfile(metadata);

      logger.info(
        `[${videoId}] Encode settings: scale=${scaleFilter}, crf=${qualityProfile.crf}, preset=${qualityProfile.preset}, audioBitrate=${qualityProfile.audioBitrate}`,
      );

      // Шаг 6: Скачать оригинал ПОЛНОСТЬЮ
      tempDir = await this.tempFileService.createTempDir('video-processor');
      const inputPath = `${tempDir}/input.mp4`;
      const outputPath = `${tempDir}/output.mp4`;
      const posterPath = `${tempDir}/poster.jpg`;

      this.logger.info(`[${videoId}] Downloading original video from S3...`);
      await this.s3.downloadFile(s3_key, inputPath);

      // Шаг 7: Закодировать с адаптивными параметрами
      this.logger.info(`[${videoId}] Starting ffmpeg encode...`);
      await this.ffmpeg.encode(inputPath, outputPath, {
        crf: qualityProfile.crf,
        preset: qualityProfile.preset,
        audioBitrate: qualityProfile.audioBitrate,
        scaleFilter,
      });
      this.logger.info(`[${videoId}] Encoded MP4 created at ${outputPath}`);

      // Шаг 8: Извлечь постер из ОБРАБОТАННОГО видео
      this.logger.info(`[${videoId}] Extracting poster from processed video...`);
      await this.ffmpeg.extractPoster(outputPath, posterPath, 5);

      // Шаг 9: Загрузить результат в S3
      const processedKey = `${s3_key}-processed.mp4`;
      const posterKey = `${s3_key}-poster.jpg`;

      this.logger.info(`[${videoId}] Uploading processed video to S3: ${processedKey}`);
      await this.s3.uploadFile(outputPath, processedKey, 'video/mp4');

      this.logger.info(`[${videoId}] Uploading poster to S3: ${posterKey}`);
      await this.s3.uploadFile(posterPath, posterKey, 'image/jpeg');

      // Шаг 10: Сохранить результат в БД
      const processedMetadata = await this.ffmpeg.getMetadata(outputPath);
      const cdnBase = process.env.CDN_BASE_URL || '';
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: VideoStatus.COMPLETED,
          processing_finished_at: new Date(),
          processed_url: `${cdnBase}/${processedKey}`,
          poster_url: `${cdnBase}/${posterKey}`,
          duration: processedMetadata.duration,
          file_size: processedMetadata.file_size,
          skipped_encode: false,
          encode_crf: qualityProfile.crf,
          encode_preset: qualityProfile.preset,
          encode_scale_filter: scaleFilter,
          encode_audio_bitrate: qualityProfile.audioBitrate,
        },
      });

      this.logger.info(
        `[${videoId}] Processing complete: ${metadata.file_size} → ${processedMetadata.file_size} bytes`,
      );

      // Structured log: video_processed
      this.logProcessed(
        videoId,
        metadata.file_size,
        processedMetadata.file_size,
        {
          crf: qualityProfile.crf,
          preset: qualityProfile.preset,
          scale: scaleFilter,
        },
      );
    } catch (err) {
      await this.failVideo(videoId, 'processing_failed', err);
      throw err;
    } finally {
      if (tempDir) {
        await this.tempFileService.cleanup(tempDir);
      }
    }
  }

  private async failVideo(
    videoId: string,
    reason: string,
    error: unknown,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`[${videoId}] Failed: ${reason} - ${errorMessage}`);
    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: VideoStatus.FAILED,
        processing_finished_at: new Date(),
        error_message: `${reason}: ${errorMessage}`,
      },
    });
  }

  private logProcessed(
    videoId: string,
    originalSize: number,
    processedSize: number,
    settings: { crf: number; preset: string; scale: string },
  ): void {
    const durationMs = this._processingTimings.get(videoId) ?? 0;
    this._processingTimings.delete(videoId);

    const payload = {
      event: 'video_processed',
      videoId,
      duration_ms: durationMs,
      original_size_bytes: originalSize,
      processed_size_bytes: processedSize,
      skipped: false,
      settings,
      compression_ratio: originalSize > 0 ? processedSize / originalSize : 0,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(JSON.stringify(payload));
  }

  private logSkipped(
    videoId: string,
    reason: string,
    originalSize: number,
  ): void {
    const durationMs = this._processingTimings.get(videoId) ?? 0;
    this._processingTimings.delete(videoId);

    const payload = {
      event: 'video_skipped',
      videoId,
      reason,
      original_size_bytes: originalSize,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(JSON.stringify(payload));
  }
}