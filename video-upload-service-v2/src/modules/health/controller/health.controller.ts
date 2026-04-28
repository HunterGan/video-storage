import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { HealthService, HealthResponse } from '../service/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiExcludeEndpoint()
  async check(): Promise<HealthResponse> {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiExcludeEndpoint()
  async readiness(): Promise<{ status: string }> {
    const health = await this.healthService.check();
    return {
      status: health.status === 'healthy' ? 'ok' : 'degraded',
    };
  }
}
