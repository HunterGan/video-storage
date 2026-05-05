import { describe, it, expect } from 'vitest';
import { buildScaleFilter } from './scale-filter.util';
import { VideoMetadata } from './ffmpeg.service';

function buildMetadata(partial: Partial<VideoMetadata>): VideoMetadata {
  return {
    duration: 0,
    width: 0,
    height: 0,
    codec: '',
    format: '',
    bit_rate: 0,
    file_size: 0,
    ...partial,
  };
}

describe('buildScaleFilter', () => {
  it('vertical video 1080x1920 (9:16) -> scale=720:-2', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 1080, height: 1920 }),
    );
    expect(result).toBe('scale=720:-2');
  });

  it('vertical video 720x1280 (9:16) -> scale=720:-2', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 720, height: 1280 }),
    );
    expect(result).toBe('scale=720:-2');
  });

  it('horizontal video 1920x1080 (16:9, Full HD) -> scale=-2:720', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 1920, height: 1080 }),
    );
    expect(result).toBe('scale=-2:720');
  });

  it('horizontal video 4k 3840x2160 -> scale=-2:720', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 3840, height: 2160 }),
    );
    expect(result).toBe('scale=-2:720');
  });

  it('ultra-wide 3840x1600 (21:9) -> scale=1280:-2', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 3840, height: 1600 }),
    );
    expect(result).toBe('scale=1280:-2');
  });

  it('ultra-wide 2560x1080 (21:9) -> scale=1280:-2', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 2560, height: 1080 }),
    );
    expect(result).toBe('scale=1280:-2');
  });

  it('square video 1080x1080 (1:1) -> scale=720:720', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 1080, height: 1080 }),
    );
    expect(result).toBe('scale=720:720');
  });

  it('small horizontal 640x480 (4:3) -> scale=-2:480', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 640, height: 480 }),
    );
    expect(result).toBe('scale=-2:480');
  });

  it('small horizontal 800x600 (4:3) -> scale=-2:600', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 800, height: 600 }),
    );
    expect(result).toBe('scale=-2:600');
  });

  it('medium horizontal 1280x720 -> scale=-2:720', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 1280, height: 720 }),
    );
    expect(result).toBe('scale=-2:720');
  });

  it('ultra-wide 3440x1440 (21:9) -> scale=1280:-2', () => {
    const result = buildScaleFilter(
      buildMetadata({ width: 3440, height: 1440 }),
    );
    expect(result).toBe('scale=1280:-2');
  });

  it('border case width == height -> scale=720:720', () => {
    const result = buildScaleFilter(buildMetadata({ width: 500, height: 500 }));
    expect(result).toBe('scale=720:720');
  });
});
