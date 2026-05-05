import { describe, it, expect } from 'vitest';
import { shouldEncode } from './video-decision.service';
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

describe('shouldEncode', () => {
  it('encodes non-mp4 formats (e.g. mov)', () => {
    const result = shouldEncode(buildMetadata({ format: 'mov' }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('not_mp4');
  });

  it('encodes non-mp4 formats (e.g. avi)', () => {
    const result = shouldEncode(buildMetadata({ format: 'avi' }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('not_mp4');
  });

  it('encodes videos with height <= 480 (360p)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 360,
      width: 640,
      bit_rate: 1_000_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('too_small_resolution');
  });

  it('encodes videos with height == 480 (border case)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 480,
      width: 854,
      bit_rate: 1_000_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('too_small_resolution');
  });

  it('skips encoding already optimized video (720p, h264, 1Mbps)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 720,
      width: 1280,
      bit_rate: 1_000_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(false);
    expect(result.reason).toBe('already_optimized');
  });

  it('skips encoding already optimized video (480p, h264, 800kbps)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 480,
      width: 854,
      bit_rate: 800_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(false);
    expect(result.reason).toBe('already_optimized');
  });

  it('skips encoding low bitrate source (<= 300kbps)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 1080,
      width: 1920,
      bit_rate: 250_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(false);
    expect(result.reason).toBe('low_bitrate_source');
  });

  it('skips encoding small files (< 5MB)', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 1080,
      width: 1920,
      bit_rate: 5_000_000,
      codec: 'h264',
      file_size: 4_000_000,
    }));
    expect(result.encode).toBe(false);
    expect(result.reason).toBe('small_file');
  });

  it('encodes by default when no conditions match', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 1080,
      width: 1920,
      bit_rate: 8_000_000,
      codec: 'h264',
      file_size: 10_000_000,
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('needs_encoding');
  });

  it('encodes HEVC video regardless of resolution', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 720,
      width: 1280,
      bit_rate: 1_000_000,
      codec: 'hevc',
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('needs_encoding');
  });

  it('encodes video with bit_rate > 1.5Mbps even at 720p', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 720,
      width: 1280,
      bit_rate: 2_000_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('needs_encoding');
  });

  it('encodes video with width > 1280 even at 720p', () => {
    const result = shouldEncode(buildMetadata({
      format: 'mp4',
      height: 720,
      width: 1281,
      bit_rate: 1_000_000,
      codec: 'h264',
    }));
    expect(result.encode).toBe(true);
    expect(result.reason).toBe('needs_encoding');
  });
});
