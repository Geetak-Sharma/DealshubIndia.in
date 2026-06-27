export class RetryFramework {
  static getBackoffDelay(attempt: number, baseMs: number = 1000, maxMs: number = 30000): number {
    // Exponential backoff: baseMs * 2^attempt
    const delay = baseMs * Math.pow(2, attempt);
    return Math.min(delay, maxMs);
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        const delay = this.getBackoffDelay(attempt);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new Error('Retry exhausted');
  }
}
