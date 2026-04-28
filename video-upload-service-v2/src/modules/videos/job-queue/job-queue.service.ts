import { randomUUID } from 'crypto';
import { JobType, JobPayload, VideoJob, JobStatus } from '../dto/job.dto';

export class JobQueueService {
  private jobs: Map<string, VideoJob> = new Map();
  private processingJobs: string[] = [];
  private readonly maxRetries: number;

  constructor(
    private readonly bufferSize: number = 100,
    maxRetries: number = 3,
  ) {
    this.maxRetries = maxRetries;
  }

  async enqueue(
    type: JobType,
    payload: JobPayload,
  ): Promise<string> {
    if (this.jobs.size >= this.bufferSize) {
      throw new Error('Job queue is full');
    }

    const id = randomUUID();
    const now = new Date();
    const job: VideoJob = {
      id,
      type,
      payload,
      status: JobStatus.Pending,
      retries: 0,
      created_at: now,
      updated_at: now,
    };

    this.jobs.set(id, job);
    return id;
  }

  async dequeue(): Promise<VideoJob | null> {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === JobStatus.Pending && !this.processingJobs.includes(id)) {
        this.processingJobs.push(id);
        return job;
      }
    }
    return null;
  }

  async markProcessing(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.Processing;
      job.updated_at = new Date();
    }
  }

  async markCompleted(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.Completed;
      job.updated_at = new Date();
    }
    this.processingJobs = this.processingJobs.filter((id) => id !== jobId);
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.retries += 1;
      job.status = job.retries < this.maxRetries ? JobStatus.Pending : JobStatus.Failed;
      job.updated_at = new Date();
    }
    this.processingJobs = this.processingJobs.filter((id) => id !== jobId);
  }

  pendingCount(): number {
    return this.jobs.size - this.processingJobs.length;
  }

  clear(): void {
    this.jobs.clear();
    this.processingJobs = [];
  }
}
