import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobType, JobPayload } from '../dto/job.dto';

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);

  constructor(@InjectQueue('video-processing') private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Video processing queue initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Video processing queue destroyed');
  }

  async enqueue(
    type: JobType,
    payload: JobPayload,
  ): Promise<string> {
    const job = await this.queue.add(type, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    this.logger.log(`Job enqueued: ${job.id} (${type})`);
    return job.id ?? '';
  }

  async getPendingCount(): Promise<number> {
    const count = await this.queue.getJobCountByTypes('waiting');
    return count || 0;
  }
}
