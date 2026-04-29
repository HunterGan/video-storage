import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideosController } from './controller/videos.controller';
import { VideoService } from './service/video.service';
import { VideoRepository } from './repository/video.repository';
import { S3Module } from '../s3/s3.module';
import { JobQueueService } from './job-queue/job-queue.module';

@Module({
  imports: [
    S3Module,
    BullModule.registerQueue({
      name: 'video-processing',
    }),
  ],
  controllers: [VideosController],
  providers: [VideoService, VideoRepository, JobQueueService],
  exports: [],
})
export class VideosModule {}
