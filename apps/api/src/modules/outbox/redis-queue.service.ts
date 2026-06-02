import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { readApiEnv } from '../../config/env';

@Injectable()
export class RedisQueueService {
  async enqueue(queueName: string, payload: unknown) {
    const client = createClient({ url: readApiEnv().redisUrl });
    const key = this.key(queueName);

    try {
      await client.connect();
      await client.rPush(key, JSON.stringify(payload));
      return client.lLen(key);
    } finally {
      if (client.isOpen) {
        await client.quit();
      }
    }
  }

  async dequeue<T = unknown>(queueName: string): Promise<T | null> {
    const client = createClient({ url: readApiEnv().redisUrl });

    try {
      await client.connect();
      const raw = await client.lPop(this.key(queueName));
      return raw ? (JSON.parse(raw) as T) : null;
    } finally {
      if (client.isOpen) {
        await client.quit();
      }
    }
  }

  async size(queueName: string) {
    const client = createClient({ url: readApiEnv().redisUrl });

    try {
      await client.connect();
      return client.lLen(this.key(queueName));
    } finally {
      if (client.isOpen) {
        await client.quit();
      }
    }
  }

  private key(queueName: string) {
    return `mepn:queue:${queueName}`;
  }
}
