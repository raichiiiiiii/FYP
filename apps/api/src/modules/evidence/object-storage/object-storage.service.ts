import { Injectable } from '@nestjs/common';
import { Client } from 'minio';

export type StoreObjectInput = {
  bucket?: string;
  objectName: string;
  content: Buffer | string;
  contentType?: string;
};

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.MINIO_BUCKET || 'mepn-evidence';

  async ensureBucket(bucket = this.bucket) {
    const client = this.createClient();
    const exists = await client.bucketExists(bucket);

    if (!exists) {
      await client.makeBucket(bucket);
    }

    return bucket;
  }

  async putObject(input: StoreObjectInput) {
    const client = this.createClient();
    const bucket = input.bucket || this.bucket;
    const content = Buffer.isBuffer(input.content)
      ? input.content
      : Buffer.from(input.content, 'utf8');

    await this.ensureBucket(bucket);
    await client.putObject(bucket, input.objectName, content, content.length, {
      'Content-Type': input.contentType || 'application/octet-stream',
    });

    return {
      bucket,
      objectName: input.objectName,
      storageUri: `s3://${bucket}/${input.objectName}`,
      sizeBytes: content.length,
    };
  }

  async getObjectText(bucket: string, objectName: string) {
    const client = this.createClient();
    const stream = await client.getObject(bucket, objectName);
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? new Uint8Array(chunk)
          : Buffer.from(chunk as ArrayBufferLike),
      );
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  async removeObject(bucket: string, objectName: string) {
    await this.createClient().removeObject(bucket, objectName);
  }

  private createClient() {
    const endpoint = new URL(
      process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    );

    return new Client({
      endPoint: endpoint.hostname,
      port: Number(
        endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80),
      ),
      useSSL: endpoint.protocol === 'https:',
      accessKey: process.env.MINIO_ACCESS_KEY || 'mepn',
      secretKey: process.env.MINIO_SECRET_KEY || 'mepn_password',
    });
  }
}
