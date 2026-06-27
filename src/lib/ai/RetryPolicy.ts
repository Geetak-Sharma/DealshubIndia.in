export interface IRetryPolicy {
  maxRetries: number;
  shouldRetry(error: any): boolean;
  getDelayMs(attempt: number): number;
}

export class ExponentialBackoffPolicy implements IRetryPolicy {
  constructor(public maxRetries: number = 3, private baseDelayMs: number = 1000) {}

  shouldRetry(error: any): boolean {
    // Retry on 429 Rate Limit or 5xx server errors
    if (error?.status === 429 || error?.status >= 500) return true;
    return false;
  }

  getDelayMs(attempt: number): number {
    return this.baseDelayMs * Math.pow(2, attempt);
  }
}

export class CircuitBreakerPolicy {
  // Architectural stub for managing repeated hard failures
  private failureCount = 0;
  private isOpen = false;

  recordFailure() {
    this.failureCount++;
    if (this.failureCount > 5) this.isOpen = true;
  }

  canExecute(): boolean {
    return !this.isOpen;
  }
}
