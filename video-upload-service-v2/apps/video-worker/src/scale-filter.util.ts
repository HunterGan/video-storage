import { VideoMetadata } from './ffmpeg.service';

export function buildScaleFilter(metadata: VideoMetadata): string {
  const { width, height } = metadata;

  // Вертикальное видео (высота больше ширины, например 9:16)
  if (height > width) {
    return 'scale=720:-2';
  }

  // Сверхширокое видео (соотношение шире 2:1, например 21:9)
  if (width / height > 2.0) {
    return 'scale=1280:-2';
  }

  // Full HD и выше — фиксируем высоту 720px, ширина пропорционально
  if (width > 1920 || height > 1080) {
    return 'scale=-2:720';
  }

  // Обычное горизонтальное видео меньше 1080p
  // Если высота уже меньше 720 — не растягиваем, иначе скейлим до 720
  if (width > height) {
    const targetHeight = Math.min(height, 720);
    return `scale=-2:${targetHeight}`;
  }

  // Квадратное или близкое к квадратному — делаем 720x720
  return 'scale=720:720';
}
