import { Worker } from 'bullmq';
import { createLogger } from './logger';
import { JobType } from './types';
import { VideoProcessor } from './video-processor';

const logger = createLogger('worker');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const queueName = 'video-processing';

const processor = new VideoProcessor();

const MAX_STARTUP_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

async function start() {
  logger.info(`Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`);

  let lastError: Error | undefined;
  let worker: Worker | undefined;

  for (let attempt = 1; attempt <= MAX_STARTUP_RETRIES; attempt++) {
    try {
      logger.info(`Attempt ${attempt}/${MAX_STARTUP_RETRIES} to connect to Redis...`);

      worker = new Worker(
        queueName,
        async (job) => {
          logger.info(`Processing job ${job.id} (${job.name})`);

          switch (job.name) {
            case JobType.ProcessVideo:
              return processor.processVideo(job);
            default:
              logger.warn(`Unknown job name: ${job.name}`);
              return null;
          }
        },
        {
          connection: redisConfig,
          concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1', 10),
          lockDuration: 60_000,
          stalledInterval: 30_000,
        },
      );

      worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      worker.on('error', (err) => {
        logger.error(`Worker error: ${err.message}`);
      });

      logger.info(`Worker started, listening for jobs on queue: ${queueName}`);
      return; // success
    } catch (err) {
      lastError = err as Error;
      const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      logger.warn(`Redis connection failed (${err}), retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.error(`Failed to start worker after ${MAX_STARTUP_RETRIES} retries: ${lastError?.message}`);
  process.exit(1);
}

start().catch((err) => {
  logger.error('Fatal error during startup:', err);
  process.exit(1);
});
