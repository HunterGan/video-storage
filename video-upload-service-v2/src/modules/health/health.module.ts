import { Module } from '@nestjs/common';
import { HealthController } from './controller/health.controller';
import { HealthService } from './service/health.service';
import { DatabaseMonitorService } from '../common/database-monitor/database-monitor.service';
import { S3Module } from '../s3/s3.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [S3Module, EventEmitterModule.forRoot()],
  controllers: [HealthController],
  providers: [HealthService, DatabaseMonitorService],
})
export class HealthModule {}
