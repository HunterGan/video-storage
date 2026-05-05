import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createLogger } from './logger';

const logger = createLogger('ffmpeg.service');

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
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

// Shared S3 client instance for metadata extraction
const s3MetadataClient = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

// Maximum bytes to fetch for ffprobe — typically enough for moov atom
const MAX_METADATA_BYTES = 5 * 1024 * 1024; // 5 MB

export class FfmpegService {
  async getMetadataFromS3(s3Key: string): Promise<VideoMetadata> {
    const bucket = process.env.S3_BUCKET || 'videos';
    const uuid = randomUUID();
    const tempFilePath = join('/tmp', `${uuid}-header.mp4`);

    try {
      // Get full file size via headObject
      const headResponse = await s3MetadataClient.send(
        new HeadObjectCommand({ Bucket: bucket, Key: s3Key }),
      );
      const fileSize = headResponse.ContentLength ?? 0;

      if (fileSize === 0) {
        throw new Error(`File ${s3Key} has zero size in S3`);
      }

      // Download only the first 5MB
      const response = await s3MetadataClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Range: `bytes=0-5242880`,
        }),
      );

      if (!response.Body) {
        throw new Error('Empty response from S3 for metadata extraction');
      }

      // Write partial file to /tmp
      const stream = createWriteStream(tempFilePath);
      await pipeline(response.Body as any, stream);

      // Run ffprobe on the partial file
      try {
        const metadata = await this.getMetadata(tempFilePath);
        // Override file_size with the real full size from headObject
        return { ...metadata, file_size: fileSize };
      } catch (probeErr) {
        // ffprobe may fail if moov atom is at end of file
        logger.warn(
          `ffprobe failed on partial file (likely moov atom at end), returning partial metadata: ${probeErr}`,
        );

        // Try to extract format name from the partial file
        let format = '';
        try {
          const probeProcess = await this.spawnProbe(tempFilePath);
          const probeInfo = JSON.parse(probeProcess);
          format = probeInfo.format?.format_name || '';
        } catch {
          // If we can't even parse the partial file, fall back to empty
        }

        return {
          duration: 0,
          width: 0,
          height: 0,
          codec: '',
          format,
          bit_rate: 0,
          file_size: fileSize,
        };
      }
    } finally {
      // Always clean up the temp file
      try {
        const fs = await import('node:fs');
        await fs.promises.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors — temp file may already be gone
      }
    }
  }

  private async spawnProbe(inputPath: string): Promise<string> {
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
          resolve(stdout);
        } else {
          reject(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', reject);
    });
  }

  async encode(
    inputPath: string,
    outputPath: string,
    options?: {
      crf?: number;
      preset?: string;
      audioBitrate?: string;
      scaleFilter?: string;
    },
  ): Promise<void> {
    const {
      crf = 23,
      preset = 'fast',
      audioBitrate = '128k',
      scaleFilter = 'scale=-2:720',
    } = options ?? {};

    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf),
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-movflags', '+faststart',
        '-vf', scaleFilter,
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
              codec: stream?.codec_name || '',
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
