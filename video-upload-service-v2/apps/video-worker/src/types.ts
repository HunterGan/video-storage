export enum JobType {
  ProcessVideo = 'process_video',
  GenerateThumbnails = 'generate_thumbnails',
  ConvertToHls = 'convert_to_hls',
}

export interface JobPayload {
  s3_key: string;
  output_key?: string;
}
