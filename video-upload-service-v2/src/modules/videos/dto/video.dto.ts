import { IsOptional, IsString, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadUrlRequestDto {
  @ApiProperty({ description: 'Filename of the video' })
  @IsString()
  @Length(1, 500, { message: 'Filename must be between 1 and 500 characters' })
  filename!: string;

  @ApiProperty({ description: 'MIME content type (e.g. video/mp4)' })
  @IsString()
  content_type!: string;
}

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'Presigned URL for uploading the file' })
  upload_url!: string;

  @ApiProperty({ description: 'URL to access the file after upload' })
  file_url!: string;

  @ApiProperty({ description: 'S3 key used for the upload' })
  key!: string;
}

export class CreateVideoRequestDto {
  @ApiProperty({ description: 'Title of the video', maxLength: 500 })
  @IsString()
  @Length(1, 500, { message: 'Title must be between 1 and 500 characters' })
  title!: string;

  @ApiProperty({ description: 'URL to the video file' })
  @IsString()
  url!: string;

  @ApiProperty({ description: 'S3 key of the uploaded file' })
  @IsString()
  s3_key!: string;

  @ApiPropertyOptional({ description: 'Optional description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}

export class VideoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  s3_key!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  created_at!: string;

  @ApiPropertyOptional()
  processed_url?: string;

  @ApiPropertyOptional()
  poster_url?: string;

  @ApiPropertyOptional()
  error_message?: string;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  processing_started_at?: string;

  @ApiPropertyOptional()
  processing_finished_at?: string;

  @ApiPropertyOptional()
  updated_at?: string;

  @ApiPropertyOptional()
  file_size?: number;
}

export class StatusResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ description: 'Error message if status is FAILED' })
  error_message?: string;
}

export class PaginationParamsDto {
  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class PaginatedVideosDto {
  @ApiProperty({ isArray: true })
  videos!: VideoResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class UploadVideoDto {
  @ApiProperty({ description: 'Title of the video' })
  @IsString()
  @Length(1, 500)
  title!: string;

  @ApiPropertyOptional({ description: 'Description of the video' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
