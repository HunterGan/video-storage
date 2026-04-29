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

async function start() {
  logger.info(`Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`);

  const worker = new Worker(
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

  const gracefulShutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    await processor['tempFileService'].cleanupAll();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

start().catch((err) => {
  logger.error('Failed to start worker:', err);
  process.exit(1);
});
