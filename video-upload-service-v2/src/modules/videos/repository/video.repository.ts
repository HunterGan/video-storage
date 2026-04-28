import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, Video } from '@prisma/client';

export class VideoEntity {
  id!: string;
  title!: string;
  description?: string;
  url!: string;
  s3_key!: string;
  created_at!: Date;
}

@Injectable()
export class VideoRepository {
  private readonly logger = new Logger(VideoRepository.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: {
    id: string;
    title: string;
    description?: string;
    url: string;
    s3_key: string;
  }): Promise<VideoEntity> {
    const video = await this.prisma.video.create({
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        url: data.url,
        s3_key: data.s3_key,
      },
    });
    return this.mapEntity(video);
  }

  async findById(id: string): Promise<VideoEntity | null> {
    const video = await this.prisma.video.findUnique({ where: { id } });
    return video ? this.mapEntity(video) : null;
  }

  async findByS3Key(s3_key: string): Promise<VideoEntity | null> {
    const video = await this.prisma.video.findUnique({ where: { s3_key } });
    return video ? this.mapEntity(video) : null;
  }

  async list(limit: number, offset: number): Promise<{
    videos: VideoEntity[];
    total: number;
  }> {
    const [videos, total] = await this.prisma.$transaction([
      this.prisma.video.findMany({
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.video.count(),
    ]);

    return {
      videos: videos.map((v) => this.mapEntity(v)),
      total,
    };
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.prisma.video.delete({ where: { id } });
    return !!result;
  }

  async deleteByS3Key(s3_key: string): Promise<boolean> {
    const result = await this.prisma.video.delete({ where: { s3_key } });
    return !!result;
  }

  private mapEntity(video: Video): VideoEntity {
    return {
      id: video.id,
      title: video.title,
      description: video.description || undefined,
      url: video.url,
      s3_key: video.s3_key,
      created_at: video.created_at,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
