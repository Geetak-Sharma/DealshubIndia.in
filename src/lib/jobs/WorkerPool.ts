import { Job } from './Job';
import { JobMetrics } from './JobMetrics';
import { RetryFramework } from './RetryFramework';

export class WorkerPool {
  private concurrencyLimit: number;
  private queue: Job[] = [];
  private activeCount: number = 0;

  constructor(limit: number = 5) {
    this.concurrencyLimit = limit;
  }

  enqueue(job: Job) {
    this.queue.push(job);
    // Sort by priority (1 is highest)
    this.queue.sort((a, b) => a.priority - b.priority);
    JobMetrics.queueLength = this.queue.length;
    this.processNext();
  }

  private async processNext() {
    if (this.activeCount >= this.concurrencyLimit || this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;
    JobMetrics.activeWorkers = this.activeCount;
    JobMetrics.queueLength = this.queue.length;

    const start = performance.now();
    try {
      await RetryFramework.executeWithRetry(async () => {
        const result = await job.execute({
          jobId: job.id,
          attempt: 0,
          maxRetries: 3,
          scheduledAt: Date.now()
        });
        if (!result.success) throw new Error(result.error || 'Job failed natively');
      }, 3);
      
      JobMetrics.recordExecution(true, performance.now() - start, false);
    } catch (err) {
      // Dead Letter Queue Hook logic would go here
      JobMetrics.recordExecution(false, performance.now() - start, true);
    } finally {
      this.activeCount--;
      JobMetrics.activeWorkers = this.activeCount;
      this.processNext();
    }
  }
}
