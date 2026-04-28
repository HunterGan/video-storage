import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueService as InMemoryJobQueue } from './job-queue.service';
import { JobType, VideoJob, JobStatus } from '../dto/job.dto';

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly jobQueue: InMemoryJobQueue;
  private processorHandle?: ReturnType<typeof setInterval>;

  constructor(private readonly configService: ConfigService) {
    this.jobQueue = new InMemoryJobQueue(
      parseInt(this.configService.get('VIDEO_JOB_BUFFER_SIZE') || '100', 10),
      this.configService.get('VIDEO_JOB_MAX_RETRIES') || 3,
    );
  }

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get('VIDEO_PROCESSING_ENABLED') === 'true';
    if (enabled) {
      this.logger.log('Starting video job processor');
      this.processorHandle = setInterval(() => {
        this.processNextJob();
      }, parseInt(this.configService.get('VIDEO_JOB_INTERVAL_MS') || '1000', 10));
    } else {
      this.logger.log('Video processing is disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.processorHandle) {
      clearInterval(this.processorHandle);
      this.logger.log('Video job processor stopped');
    }
    this.jobQueue.clear();
  }

  async enqueue(
    type: JobType,
    payload: { s3_key: string; output_key?: string; output_prefix?: string },
  ): Promise<string> {
    return this.jobQueue.enqueue(type, payload);
  }

  async getPendingCount(): Promise<number> {
    return this.jobQueue.pendingCount();
  }

  private async processNextJob(): Promise<void> {
    const enabled = this.configService.get('VIDEO_PROCESSING_ENABLED') === 'true';
    if (!enabled) return;

    const job = await this.jobQueue.dequeue();
    if (!job) return;

    await this.executeJob(job);
  }

  private async executeJob(job: VideoJob): Promise<void> {
    try {
      await this.jobQueue.markProcessing(job.id);

      switch (job.type) {
        case JobType.ProcessVideo:
          this.logger.log(`Processing video: ${job.payload.s3_key}`);
          // TODO: Implement video processing logic (ffmpeg, etc.)
          break;
        case JobType.GenerateThumbnails:
          this.logger.log(`Generating thumbnails: ${job.payload.s3_key}`);
          // TODO: Implement thumbnail generation
          break;
        case JobType.ConvertToHls:
          this.logger.log(`Converting to HLS: ${job.payload.s3_key}`);
          // TODO: Implement HLS conversion
          break;
      }

      await this.jobQueue.markCompleted(job.id);
      this.logger.log(`Job completed: ${job.id}`);
    } catch (error: unknown) {
      this.logger.error(`Job failed: ${job.id} - ${error}`);
      await this.jobQueue.markFailed(job.id, error instanceof Error ? error.message : String(error));
    }
  }
}
