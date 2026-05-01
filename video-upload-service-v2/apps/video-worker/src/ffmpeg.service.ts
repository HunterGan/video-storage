import { spawn } from 'node:child_process';
import { join } from 'node:path';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bit_rate: number;
  file_size: number;
}

export interface FfmpegOptions {
  inputPath: string;
  outputPath: string;
  posterPath?: string;
  posterTime?: number;
}

export class FfmpegService {
  async encode(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-vf', 'scale=trunc(ih*a/2)*2:720',
        '-pix_fmt', 'yuv420p',
        outputPath,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      process.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', reject);
    });
  }

  async extractPoster(
    inputPath: string,
    posterPath: string,
    timeSeconds = 5,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', [
        '-y',
        '-ss', `${timeSeconds}`,
        '-i', inputPath,
        '-vframes', '1',
        '-q:v', '2',
        posterPath,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      process.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg poster exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', reject);
    });
  }

  async getMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      process.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      process.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            const format = info.format;
            const stream = info.streams.find(
              (s: any) => s.codec_type === 'video',
            );
            resolve({
              duration: parseFloat(format.duration),
              width: stream ? parseInt(stream.width) : 0,
              height: stream ? parseInt(stream.height) : 0,
              format: format.format_name || '',
              bit_rate: format.bit_rate ? parseInt(format.bit_rate) : 0,
              file_size: format.size ? parseInt(format.size) : 0,
            });
          } catch (err) {
            reject(new Error(`Failed to parse ffprobe output: ${err}`));
          }
        } else {
          reject(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', reject);
    });
  }
}
