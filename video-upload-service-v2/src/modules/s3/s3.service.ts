import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client = null as unknown as S3Client;
  private bucket: string = '';
  private endpoint: string = '';
  private presignedUrlTtlSeconds: number = 3600;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.endpoint = this.configService.getOrThrow<string>('S3_ENDPOINT');
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    this.presignedUrlTtlSeconds =
      this.configService.get<number>('PRESIGNED_URL_TTL_SECONDS') || 3600;
    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION') || 'ru-moscow-1',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
      requestHandler: {
        requestTimeout: 60_000,
      },
    });
    this.logger.log('S3 client initialized');
  }

  getEndpoint(): string {
    return this.endpoint;
  }

  getBucket(): string {
    return this.bucket;
  }

  generateS3Key(filename: string): string {
    const extension = filename.includes('.')
      ? filename.slice(filename.lastIndexOf('.') + 1)
      : 'mp4';
    return `videos/${crypto.randomUUID()}.${extension}`;
  }

  /**
   * Прямая загрузка файла в S3 через бекенд
   * @param fileBuffer - буфер файла
   * @param key - S3 ключ
   * @param contentType - MIME тип
   */
  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    this.logger.log(`File uploaded to S3: ${key}`);
  }

  async generatePresignedUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    };
    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.presignedUrlTtlSeconds,
    });

    // Presigned URL может быть относительным (начинается с /).
    // Это происходит при работе с кастомными endpoint (MinIO, S3 Gateway).
    // Если так — подставляем endpoint, как делает Rust-версия.
    if (url.startsWith('/')) {
      return `${this.endpoint}${url}`;
    }
    return url;
  }

  getPublicUrl(key: string): string {
    const endpoint = this.endpoint.replace(/\/+$/, '');
    return `${endpoint}/${this.bucket}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('404') || err.message.includes('NoSuchKey'))
      ) {
        return false;
      }
      throw err;
    }
  }

  async getObjectMetadata(key: string): Promise<{
    contentLength: number;
    contentType: string;
  }> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      contentLength: response.ContentLength || 0,
      contentType: response.ContentType || '',
    };
  }

  destroy(): void {
    this.client.destroy();
  }
}
