import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { VideoStatus } = require('@prisma/client');
import { Job } from 'bullmq';
import { createLogger } from './logger';
import { JobType } from './types';
import { FfmpegService } from './ffmpeg.service';
import { S3ClientService } from './s3-client.service';
import { TempFileService } from './temp-file.service';

const logger = createLogger('video-processor');

export class VideoProcessor {
  private readonly prisma = new PrismaClient();
  private readonly ffmpeg = new FfmpegService();
  private readonly s3 = new S3ClientService();
  private readonly tempFileService = new TempFileService();
  private readonly logger = logger;

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
    try {
      tempDir = await this.tempFileService.createTempDir('video-processor');
      const inputPath = `${tempDir}/input.mp4`;
      const outputPath = `${tempDir}/output.mp4`;
      const posterPath = `${tempDir}/poster.jpg`;

      // Download from S3
      this.logger.info(`Downloading original video from S3: ${s3_key}`);
      await this.s3.downloadFile(s3_key, inputPath);
      this.logger.info(`Downloaded original video to ${inputPath}`);

      // Encode to optimized MP4
      this.logger.info('Starting ffmpeg encode...');
      await this.ffmpeg.encode(inputPath, outputPath);
      this.logger.info(`Encoded MP4 created at ${outputPath}`);

      // Extract poster
      this.logger.info('Extracting poster frame...');
      await this.ffmpeg.extractPoster(inputPath, posterPath, 5);
      this.logger.info(`Poster created at ${posterPath}`);

      // Upload back to S3
      const processedKey = `${s3_key}-processed.mp4`;
      const posterKey = `${s3_key}-poster.jpg`;

      this.logger.info(`Uploading processed video to S3: ${processedKey}`);
      await this.s3.uploadFile(outputPath, processedKey, 'video/mp4');

      this.logger.info(`Uploading poster to S3: ${posterKey}`);
      await this.s3.uploadFile(posterPath, posterKey, 'image/jpeg');

      const cdnBase = process.env.CDN_BASE_URL || '';
      const processedUrl = `${cdnBase}/${processedKey}`;
      const posterUrl = `${cdnBase}/${posterKey}`;

      // Update DB
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: VideoStatus.COMPLETED,
          processing_finished_at: new Date(),
          processed_url: processedUrl,
          poster_url: posterUrl,
        },
      });

      this.logger.info(`Video processed and saved: ${videoId}`);
    } catch (err) {
      this.logger.error(`Processing failed for ${videoId}: ${err}`);
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: VideoStatus.FAILED,
          processing_finished_at: new Date(),
          error_message: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    } finally {
      if (tempDir) {
        await this.tempFileService.cleanup(tempDir);
      }
    }
  }
}
