import { apiClient } from './client';
import type {
  Video,
  VideoFormData,
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

  async uploadVideo(file: File, title: string, description?: string): Promise<Video> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    const response = await apiClient.post<Video>('/api/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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