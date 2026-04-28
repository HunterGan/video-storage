import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../../s3/s3.service';
import { VideoRepository, VideoEntity } from '../repository/video.repository';
import { JobQueueService } from '../job-queue/job-queue.module';
import { JobType } from '../dto/job.dto';
import {
  CreateVideoRequestDto,
  UploadUrlRequestDto,
  UploadUrlResponseDto,
  UploadVideoDto,
} from '../dto/video.dto';

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly maxFileSizeMb: number;
  private readonly cdnBaseUrl: string;
  private readonly videoProcessingEnabled: boolean;

  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly s3Service: S3Service,
    private readonly jobQueueService: JobQueueService,
  ) {
    this.maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10);
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';
    this.videoProcessingEnabled = process.env.VIDEO_PROCESSING_ENABLED === 'true';
  }

  /**
   * @deprecated Используйте uploadVideo вместо этого метода
   */
  async generateUploadUrl(
    request: UploadUrlRequestDto,
  ): Promise<UploadUrlResponseDto> {
    this.validateContentType(request.content_type);
    const s3Key = this.s3Service.generateS3Key(request.filename);
    const uploadUrl = await this.s3Service.generatePresignedUrl(
      s3Key,
      request.content_type,
    );
    const fileUrl = this.s3Service.getPublicUrl(s3Key);
    return {
      upload_url: uploadUrl,
      file_url: fileUrl,
      key: s3Key,
    };
  }

  /**
   * Загрузка видео через бекенд (обходит CORS)
   * @param file - файл из запроса
   * @param title - название видео
   * @param description - описание (опционально)
   */
  async uploadVideo(
    file: Express.Multer.File,
    title: string,
    description?: string,
  ): Promise<VideoEntity> {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    this.validateContentType(file.mimetype);

    if (file.size > this.maxFileSizeMb * 1024 * 1024) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSizeMb}MB limit`,
      );
    }

    const s3Key = this.s3Service.generateS3Key(file.originalname);

    await this.s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

    const fileUrl = this.s3Service.getPublicUrl(s3Key);

    const video = await this.createVideo({
      title,
      description,
      url: fileUrl,
      s3_key: s3Key,
    });

    this.logger.log(`Video uploaded successfully: ${video.id}`);
    return video;
  }

  async createVideo(
    request: CreateVideoRequestDto,
  ): Promise<VideoEntity> {
    const existing = await this.videoRepository.findByS3Key(request.s3_key);
    if (existing) {
      throw new ConflictException('Video already exists with this S3 key');
    }
    const video = await this.videoRepository.create({
      id: uuidv4(),
      title: request.title,
      description: request.description,
      url: request.url,
      s3_key: request.s3_key,
    });
    this.logger.log(`Video created: ${video.id}`);
    if (this.videoProcessingEnabled) {
      const outputKey = `${request.s3_key}-processed`;
      await this.jobQueueService.enqueue(
        JobType.ProcessVideo,
        { s3_key: request.s3_key, output_key: outputKey },
      ).catch((err) => {
        this.logger.warn(`Failed to enqueue video processing job: ${err}`);
      });
    }
    return video;
  }

  async getVideo(id: string): Promise<VideoEntity> {
    const video = await this.videoRepository.findById(id);
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async listVideos(
    limit: number,
    offset: number,
  ): Promise<{ videos: VideoEntity[]; total: number }> {
    return this.videoRepository.list(limit, offset);
  }

  async deleteVideo(id: string): Promise<void> {
    const video = await this.videoRepository.findById(id);
    if (!video) throw new NotFoundException('Video not found');
    try {
      await this.s3Service.deleteObject(video.s3_key);
    } catch (err) {
      this.logger.warn(`Failed to delete from S3 (key: ${video.s3_key}): ${err}`);
    }
    await this.videoRepository.deleteById(id);
    this.logger.log(`Video deleted: ${id}`);
  }

  private validateContentType(contentType: string): void {
    const lower = contentType.toLowerCase();
    if (!ALLOWED_VIDEO_TYPES.some((type) => type === lower)) {
      throw new BadRequestException(
        `Invalid video type: ${contentType}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
      );
    }
  }
}
