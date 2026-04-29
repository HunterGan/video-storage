import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

export class S3ClientService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'videos';

    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY || '';
    const secretAccessKey = process.env.S3_SECRET_KEY || '';
    const endpoint = process.env.S3_ENDPOINT;

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    filePath: string,
    key: string,
    contentType: string,
  ): Promise<void> {
    const fs = await import('node:fs');
    const file = fs.createReadStream(filePath);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    }));
  }

  async downloadFile(
    key: string,
    destinationPath: string,
  ): Promise<void> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    const stream = createWriteStream(destinationPath);
    await pipeline(response.Body as any, stream);
  }
}
