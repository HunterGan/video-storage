import { VideoMetadata } from './ffmpeg.service';

export interface EncodingDecision {
  encode: boolean;
  reason: string;
}

export function shouldEncode(metadata: VideoMetadata): EncodingDecision {
  // 1. Проверяем формат — если не mp4, всегда кодируем
  if (!metadata.format.toLowerCase().includes('mp4')) {
    return { encode: true, reason: 'not_mp4' };
  }

  // 2. Проверяем минимальное разрешение — если меньше 480p, кодируем
  if (metadata.height <= 480) {
    return { encode: true, reason: 'too_small_resolution' };
  }

  // 3. Проверяем, уже оптимизировано ли видео
  if (
    metadata.height <= 720 &&
    metadata.width <= 1280 &&
    metadata.bit_rate <= 1_500_000 &&
    metadata.codec.toLowerCase() === 'h264'
  ) {
    return { encode: false, reason: 'already_optimized' };
  }

  // 4. Проверяем низкий битрейт
  if (metadata.bit_rate > 0 && metadata.bit_rate <= 300_000) {
    return { encode: false, reason: 'low_bitrate_source' };
  }

  // 5. Проверяем слишком маленький файл
  if (metadata.file_size < 5_000_000) {
    return { encode: false, reason: 'small_file' };
  }

  // 6. Дефолтное поведение — кодируем
  return { encode: true, reason: 'needs_encoding' };
}