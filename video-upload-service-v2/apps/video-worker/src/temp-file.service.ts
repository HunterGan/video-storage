import { randomUUID } from 'crypto';
import { mkdtemp, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class TempFileService {
  private tempDirs: Set<string> = new Set();
  private watchdogInterval: ReturnType<typeof setInterval>;
  private readonly cleanupAgeMs = 15 * 60 * 1000; // 15 min

  constructor() {
    this.watchdogInterval = setInterval(() => this.cleanupStale(), this.cleanupAgeMs);
  }

  async createTempDir(prefix = 'video-worker'): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), `${prefix}-${randomUUID()}-`));
    this.tempDirs.add(dir);
    return dir;
  }

  async cleanup(dir: string): Promise<void> {
    try {
      await rm(dir, { recursive: true, force: true });
    } finally {
      this.tempDirs.delete(dir);
    }
  }

  async cleanupAll(): Promise<void> {
    clearInterval(this.watchdogInterval);
    const dirs = Array.from(this.tempDirs);
    this.tempDirs.clear();
    await Promise.allSettled(dirs.map((d) => rm(d, { recursive: true, force: true })));
  }

  private async cleanupStale(): Promise<void> {
    try {
      const { stat } = await import('node:fs');
      const entries = await readdir(tmpdir(), { withFileTypes: true });
      const now = Date.now();
      const stale = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('video-worker-'))
        .filter(async (e) => {
          const stats = await new Promise((resolve) =>
            stat(join(tmpdir(), e.name), resolve),
          ) as import('node:fs').Stats;
          return (now - stats.mtimeMs) > this.cleanupAgeMs;
        });
      const stalePaths = stale.map((e) => join(tmpdir(), e.name));
      await Promise.allSettled(
        stalePaths.map((d) => rm(d, { recursive: true, force: true }).catch(() => {})),
      );
      for (const d of stalePaths) {
        this.tempDirs.delete(d);
      }
    } catch {
      // Non-critical — skip
    }
  }
}
