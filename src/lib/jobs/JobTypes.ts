import { Job, JobContext, JobResult } from './Job';

export class PriceRefreshJob implements Job {
  id: string;
  type = 'PRICE_REFRESH';
  payload: any;
  priority = 2;

  constructor(payload: any) {
    this.id = `price_refresh_${Date.now()}`;
    this.payload = payload;
  }

  async execute(context: JobContext): Promise<JobResult> {
    console.log(`Executing PriceRefreshJob for ${this.payload.dealId}...`);
    // Connects to Affiliate API -> PriceAnalyzer -> EntityRegistry -> Cache invalidate
    return { success: true };
  }
}

export class CacheWarmupJob implements Job {
  id: string;
  type = 'CACHE_WARMUP';
  payload: any;
  priority = 8; // Low priority

  constructor(payload: any) {
    this.id = `cache_warm_${Date.now()}`;
    this.payload = payload;
  }

  async execute(context: JobContext): Promise<JobResult> {
    // Hits internal API routes to pre-compile HTML
    return { success: true };
  }
}
