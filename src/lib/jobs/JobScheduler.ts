import { Job } from './Job';
import { WorkerPool } from './WorkerPool';

export class JobSchedulerImpl {
  private pool: WorkerPool;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.pool = new WorkerPool(5); // Strict limit to protect 1GB OCI Node
  }

  enqueue(job: Job) {
    this.pool.enqueue(job);
  }

  scheduleInterval(jobFactory: () => Job, intervalMs: number, jobId: string) {
    if (this.intervals.has(jobId)) clearInterval(this.intervals.get(jobId));
    
    const timer = setInterval(() => {
      this.enqueue(jobFactory());
    }, intervalMs);
    
    this.intervals.set(jobId, timer);
  }

  // Future: cron syntax parsing for exact times
}

export const JobScheduler = new JobSchedulerImpl();
