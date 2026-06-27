export class RateLimiter {
  private static tokenBuckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  static async acquire(providerId: string, limitPerMinute: number = 60): Promise<boolean> {
    const now = Date.now();
    let bucket = this.tokenBuckets.get(providerId);

    if (!bucket) {
      bucket = { tokens: limitPerMinute, lastRefill: now };
      this.tokenBuckets.set(providerId, bucket);
    } else {
      const timePassed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timePassed / (60000 / limitPerMinute));
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(limitPerMinute, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }
    
    // Adaptive Backoff could trigger here if denied multiple times
    return false;
  }
}
