import { VideoMetadata } from './ffmpeg.service';

export interface QualityProfile {
  crf: number;
  preset: string;
  audioBitrate: string;
}

export function getQualityProfile(metadata: VideoMetadata): QualityProfile {
  const { bit_rate } = metadata;

  if (bit_rate > 5_000_000) {
    return { crf: 20, preset: 'medium', audioBitrate: '128k' };
  }

  if (bit_rate > 2_000_000 && bit_rate <= 5_000_000) {
    return { crf: 23, preset: 'fast', audioBitrate: '128k' };
  }

  if (bit_rate > 0 && bit_rate <= 2_000_000) {
    return { crf: 26, preset: 'fast', audioBitrate: '96k' };
  }

  // bit_rate === 0 (неизвестно)
  return { crf: 23, preset: 'fast', audioBitrate: '128k' };
}
