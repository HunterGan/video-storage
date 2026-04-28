// Job queue types
export enum JobType {
  ProcessVideo = 'process_video',
  GenerateThumbnails = 'generate_thumbnails',
  ConvertToHls = 'convert_to_hls',
}

export interface JobPayload {
  s3_key: string;
  output_key?: string;
  output_prefix?: string;
}

export interface VideoJob {
  id: string;
  type: JobType;
  payload: JobPayload;
  status: JobStatus;
  retries: number;
  created_at: Date;
  updated_at: Date;
}

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
