import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../s3/s3.service';
import { DatabaseMonitorService } from '../../common/database-monitor/database-monitor.service';

export interface DatabaseHealth {
  status: string;
  reconnectAttempts: number;
  lastCheck: string;
  timeSinceLastDisconnect?: string;
}

export interface S3Health {
  status: string;
  endpoint: string;
}

export interface HealthResponse {
  status: string;
  components: {
    database: DatabaseHealth;
    s3: S3Health;
  };
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private startTime: number;
  private checkInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly databaseMonitor: DatabaseMonitorService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  async onModuleInit(): Promise<void> {
    this.startHealthCheck();
  }

  onModuleDestroy(): void {
    clearInterval(this.checkInterval);
  }

  async check(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();
    const uptimeSeconds = Math.floor(
      (Date.now() - this.startTime) / 1000,
    );

    // Check database
    const isConnected = this.databaseMonitor.isConnected();
    const reconnectAttempts = this.databaseMonitor.getReconnectAttempts();
    const lastDisconnectTime = this.databaseMonitor.getLastDisconnectTime();
    const timeSinceDisconnect = this.databaseMonitor.getTimeSinceDisconnect();

    const dbStatus = isConnected ? 'connected' : (reconnectAttempts > 0 ? 'reconnecting' : 'disconnected');
    const timeSinceDisconnectStr = timeSinceDisconnect !== null ? this.formatDuration(timeSinceDisconnect) : undefined;

    // Check S3
    let s3Status: S3Health = { status: 'unknown', endpoint: this.configService.get('S3_ENDPOINT') || '' };
    try {
      const endpoint = this.configService.get('S3_ENDPOINT');
      const bucket = this.configService.get('S3_BUCKET');
      if (endpoint && bucket) {
        await this.s3Service.objectExists('health-check');
        s3Status = { status: 'connected', endpoint };
      }
    } catch (err) {
      s3Status = { status: 'disconnected', endpoint: this.configService.get('S3_ENDPOINT') || '' };
    }

    const overallStatus = (isConnected && s3Status.status === 'connected') ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      components: {
        database: {
          status: dbStatus,
          reconnectAttempts,
          lastCheck: timestamp,
          timeSinceLastDisconnect: timeSinceDisconnectStr,
        },
        s3: s3Status,
      },
      uptimeSeconds,
      timestamp,
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  private startHealthCheck(): void {
    this.checkInterval = setInterval(async () => {
      try {
        const isConnected = await this.databaseMonitor.checkDatabase();
        if (isConnected && !this.databaseMonitor.isConnected()) {
          this.logger.log('Database connection restored');
        }
      } catch (err) {
        this.logger.debug(`Health check database error: ${err}`);
      }
    }, 10_000);
  }
}
