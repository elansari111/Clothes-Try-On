import { TryOnJob } from '../types/aiTryOn';

/**
 * In-memory job state tracker
 */
export class JobQueue {
  private jobs = new Map<string, TryOnJob>();

  addJob(job: TryOnJob): void {
    this.jobs.set(job.id, job);
  }

  getJob(jobId: string): TryOnJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<TryOnJob>): TryOnJob | undefined {
    const existing = this.jobs.get(jobId);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  listJobs(): TryOnJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const jobQueue = new JobQueue();
