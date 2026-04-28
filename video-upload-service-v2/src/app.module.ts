import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideosModule } from './modules/videos/videos.module';
import { HealthModule } from './modules/health/health.module';
import { S3Module } from './modules/s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    S3Module,
    VideosModule,
    HealthModule,
  ],
})
export class AppModule {}
