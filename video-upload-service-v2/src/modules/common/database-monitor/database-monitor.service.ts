import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, VideoStatus } from '@prisma/client';
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DatabaseMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private readonly prisma: PrismaClient;
  private connected = false;
  private reconnectAttempts = 0;
  private lastDisconnectTime: Date | null = null;
  private checkInterval?: ReturnType<typeof setInterval>;
  private recoveryInterval?: ReturnType<typeof setInterval>;
  private readonly maxReconnectAttempts = 30;
  private readonly checkIntervalMs = 10000;
  private readonly recoveryCheckMinutes = 30;
  private readonly recoveryEnabled = process.env.RECOVERY_ENABLED !== 'false';

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const dbUrl = this.configService.get('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    this.prisma = new PrismaClient();
  }

  async onModuleInit(): Promise<void> {
    const connected = await this.checkDatabase();
    this.connected = connected;

    if (connected) {
      this.logger.log('Database connection established');
      this.eventEmitter.emit('database.connected');
    } else {
      this.logger.warn('Database connection failed, will attempt to reconnect');
    }

    this.startHealthCheck();
    this.startRecoveryCheck();
  }

  onModuleDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  @OnEvent('database.disconnected')
  async handleDisconnect(): Promise<void> {
    this.connected = false;
    this.lastDisconnectTime = new Date();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getLastDisconnectTime(): Date | null {
    return this.lastDisconnectTime;
  }

  getTimeSinceDisconnect(): number | null {
    if (!this.lastDisconnectTime) return null;
    return Math.floor((Date.now() - this.lastDisconnectTime.getTime()) / 1000);
  }

  async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(`Database check failed: ${error}`);
      return false;
    }
  }

  private startHealthCheck(): void {
    this.checkInterval = setInterval(async () => {
      const wasConnected = this.connected;
      const isNowConnected = await this.checkDatabase();

      if (isNowConnected && !wasConnected) {
        this.logger.log('Database connection restored');
        this.reconnectAttempts = 0;
        this.lastDisconnectTime = null;
        this.eventEmitter.emit('database.connected');
      } else if (!isNowConnected && wasConnected) {
        this.reconnectAttempts += 1;
        this.lastDisconnectTime = new Date();
        this.logger.warn(
          `Database connection lost (attempts: ${this.reconnectAttempts})`,
        );
        this.eventEmitter.emit('database.disconnected');
      }
    }, this.checkIntervalMs);
  }

  private startRecoveryCheck(): void {
    if (!this.recoveryEnabled) return;
    this.recoveryInterval = setInterval(async () => {
      const stuckThreshold = new Date(Date.now() - this.recoveryCheckMinutes * 60 * 1000);
      const result = await this.prisma.video.updateMany({
        where: {
          status: VideoStatus.PROCESSING,
          processing_started_at: { lte: stuckThreshold },
        },
        data: {
          status: VideoStatus.QUEUED,
          processing_started_at: null,
          error_message: 'Worker crash recovery — job reset',
        },
      });
      if (result.count > 0) {
        this.logger.warn(`Recovery: reset ${result.count} stuck processing jobs`);
      }
    }, 5 * 60 * 1000); // every 5 minutes
  }
}
