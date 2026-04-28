import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { VideoService } from '../service/video.service';
import {
  UploadUrlRequestDto,
  UploadUrlResponseDto,
  CreateVideoRequestDto,
  VideoResponseDto,
  PaginationParamsDto,
  PaginatedVideosDto,
  UploadVideoDto,
} from '../dto/video.dto';

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate presigned upload URL' })
  @ApiResponse({ status: 200, type: UploadUrlResponseDto })
  async generateUploadUrl(
    @Body() request: UploadUrlRequestDto,
  ): Promise<UploadUrlResponseDto> {
    return this.videoService.generateUploadUrl(request);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a video file directly' })
  @ApiResponse({ status: 201, type: VideoResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadVideoDto,
  ): Promise<VideoResponseDto> {
    const video = await this.videoService.uploadVideo(
      file,
      uploadDto.title,
      uploadDto.description,
    );
    return this.mapToDto(video);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new video record' })
  @ApiResponse({ status: 201, type: VideoResponseDto })
  async createVideo(
    @Body() request: CreateVideoRequestDto,
  ): Promise<VideoResponseDto> {
    const video = await this.videoService.createVideo(request);
    return this.mapToDto(video);
  }

  @Get()
  @ApiOperation({ summary: 'List videos with pagination' })
  @ApiQuery({ required: false, type: PaginationParamsDto })
  @ApiResponse({ status: 200, type: PaginatedVideosDto })
  async listVideos(
    @Query() params: PaginationParamsDto,
  ): Promise<PaginatedVideosDto> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const { videos, total } = await this.videoService.listVideos(limit, offset);

    return {
      videos: videos.map((v) => this.mapToDto(v)),
      total,
      limit,
      offset,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a video by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: VideoResponseDto })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideo(@Param('id') id: string): Promise<VideoResponseDto> {
    const video = await this.videoService.getVideo(id);
    return this.mapToDto(video);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a video and its S3 object' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async deleteVideo(@Param('id') id: string): Promise<void> {
    return this.videoService.deleteVideo(id);
  }

  private mapToDto(video: {
    id: string;
    title: string;
    description?: string;
    url: string;
    s3_key: string;
    created_at: Date;
  }): VideoResponseDto {
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      url: video.url,
      s3_key: video.s3_key,
      created_at: video.created_at.toISOString(),
    };
  }
}
