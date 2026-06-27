export interface JobContext {
  jobId: string;
  attempt: number;
  maxRetries: number;
  scheduledAt: number;
}

export interface JobResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: number; // 1 (High) to 10 (Low)
  execute(context: JobContext): Promise<JobResult>;
}
