import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { readApiEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';

export type DependencyStatus = 'ok' | 'error';

export type HealthStatusResponse = {
  status: 'ok' | 'degraded';
  service: 'mepn-api';
  database: DependencyStatus;
  redis: DependencyStatus;
  environment: string;
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatusResponse> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      service: 'mepn-api',
      database,
      redis,
      environment: readApiEnv().nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      return await this.prisma.checkConnection();
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const client = createClient({
      url: readApiEnv().redisUrl,
    });

    client.on('error', () => undefined);

    try {
      await client.connect();
      await client.ping();
      return 'ok';
    } catch {
      return 'error';
    } finally {
      if (client.isOpen) {
        await client.quit();
      }
    }
  }
}
