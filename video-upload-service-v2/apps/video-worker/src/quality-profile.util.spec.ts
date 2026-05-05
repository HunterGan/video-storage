import { describe, it, expect } from 'vitest';
import { getQualityProfile } from './quality-profile.util';
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

describe('getQualityProfile', () => {
  it('high bitrate (> 5Mbps) -> crf: 20, preset: medium', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 8_000_000 }));
    expect(result).toEqual({ crf: 20, preset: 'medium', audioBitrate: '128k' });
  });

  it('high bitrate exactly 5.1Mbps -> crf: 20', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 5_100_000 }));
    expect(result).toEqual({ crf: 20, preset: 'medium', audioBitrate: '128k' });
  });

  it('medium bitrate (2-5Mbps) -> crf: 23, preset: fast', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 3_000_000 }));
    expect(result).toEqual({ crf: 23, preset: 'fast', audioBitrate: '128k' });
  });

  it('medium bitrate exactly 2Mbps -> crf: 23', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 2_000_000 }));
    expect(result).toEqual({ crf: 23, preset: 'fast', audioBitrate: '128k' });
  });

  it('medium bitrate exactly 5Mbps -> crf: 23', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 5_000_000 }));
    expect(result).toEqual({ crf: 23, preset: 'fast', audioBitrate: '128k' });
  });

  it('low bitrate (0-2Mbps) -> crf: 26, preset: fast', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 1_000_000 }));
    expect(result).toEqual({ crf: 26, preset: 'fast', audioBitrate: '96k' });
  });

  it('low bitrate exactly 2Mbps -> crf: 26', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 2_000_000 }));
    expect(result).toEqual({ crf: 26, preset: 'fast', audioBitrate: '96k' });
  });

  it('low bitrate exactly 1kbps -> crf: 26', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 1_000 }));
    expect(result).toEqual({ crf: 26, preset: 'fast', audioBitrate: '96k' });
  });

  it('unknown bitrate (0) -> default crf: 23, preset: fast', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 0 }));
    expect(result).toEqual({ crf: 23, preset: 'fast', audioBitrate: '128k' });
  });

  it('high bitrate 10Mbps drone footage -> crf: 20', () => {
    const result = getQualityProfile(buildMetadata({ bit_rate: 10_000_000 }));
    expect(result).toEqual({ crf: 20, preset: 'medium', audioBitrate: '128k' });
  });
});
