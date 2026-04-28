import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DatabaseMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private readonly prisma: PrismaClient;
  private connected = false;
  private reconnectAttempts = 0;
  private lastDisconnectTime: Date | null = null;
  private checkInterval?: ReturnType<typeof setInterval>;
  private readonly maxReconnectAttempts = 30;
  private readonly checkIntervalMs = 10000;

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
}
