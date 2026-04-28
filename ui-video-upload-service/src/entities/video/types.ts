export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  size?: number;
  folderId?: string | null;
  status: 'idle' | 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface VideoFormData {
  title: string;
  folderId?: string | null;
}

export interface UploadVideoResponse {
  id: string;
  title: string;
  description?: string;
  url: string;
  s3_key: string;
  created_at: string;
}

export interface ProcessOptions {
  compress?: boolean;
  convertToMp4?: boolean;
  generateThumbnail?: boolean;
}

export type ViewMode = 'table' | 'grid';

export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
}