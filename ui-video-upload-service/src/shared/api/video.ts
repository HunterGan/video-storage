import { apiClient } from './client';
import type {
  Video,
  VideoFormData,
  UploadUrlResponse,
  ProcessOptions,
} from '../../entities/video/types';

export class VideoApi {
  async getVideos(): Promise<{videos: Video[], total: number, limit: number, offset: number}> {
    const response = await apiClient.get<{videos: Video[], total: number, limit: number, offset: number}>('/api/videos?limit=20&offset=0');
    return response;
  }

  async createVideo(data: VideoFormData): Promise<Video> {
    const response = await apiClient.post<Video>('/api/videos', data);
    return response;
  }

  async getUploadUrl(filename: string, contentType?: string): Promise<UploadUrlResponse> {
    const response = await apiClient.post<UploadUrlResponse>('/api/videos/upload-url', {
      filename,
      content_type: contentType || 'video/mp4',
    });
    return response;
  }

  async deleteVideo(id: string): Promise<void> {
    await apiClient.post(`/api/videos/${id}/delete`, {});
  }

  async processVideo(id: string, options: ProcessOptions): Promise<void> {
    await apiClient.post(`/api/videos/${id}/process`, options);
  }
}

export const videoApi = new VideoApi();