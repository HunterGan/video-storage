export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

export interface ImageAnalysisRequest {
  images: UploadedImage[];
  prompt: string;
}

export interface ImageAnalysisResponse {
  content: string;
  images: string[];
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
