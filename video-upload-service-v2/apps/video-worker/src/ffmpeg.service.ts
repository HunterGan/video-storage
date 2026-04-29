import { spawn } from 'node:child_process';
import { join } from 'node:path';

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
}
