export class CacheMetrics {
  hits: number = 0;
  misses: number = 0;
  evictions: number = 0;
  refreshes: number = 0;
  totalLookupTimeMs: number = 0;

  recordHit(timeMs: number) {
    this.hits++;
    this.totalLookupTimeMs += timeMs;
  }

  recordMiss(timeMs: number) {
    this.misses++;
    this.totalLookupTimeMs += timeMs;
  }

  get hitRatio() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }
}
export const GlobalCacheMetrics = new CacheMetrics();
