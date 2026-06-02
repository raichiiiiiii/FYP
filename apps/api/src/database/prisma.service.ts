import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { readApiEnv } from '../config/env';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const env = readApiEnv();
    process.env.DATABASE_URL ||= env.databaseUrl;
    const adapter = new PrismaPg({ connectionString: env.databaseUrl });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkConnection(): Promise<'ok'> {
    await this.$queryRaw`SELECT 1`;
    return 'ok';
  }
}
