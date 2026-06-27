import { SearchQuery } from './SearchQuery';
import { SearchResult } from './SearchResult';

export class SearchMetricsTracker {
  totalQueries: number = 0;
  zeroResults: number = 0;
  totalResponseTimeMs: number = 0;
  popularSearches: Map<string, number> = new Map();

  recordSearch(query: SearchQuery, result: SearchResult) {
    this.totalQueries++;
    this.totalResponseTimeMs += result.processingTimeMs;

    if (result.totalHits === 0) {
      this.zeroResults++;
    }

    if (query.rawString.trim() !== '') {
      const count = this.popularSearches.get(query.rawString) || 0;
      this.popularSearches.set(query.rawString, count + 1);
    }
  }

  get summary() {
    return {
      queries: this.totalQueries,
      zeroResultRate: this.totalQueries === 0 ? 0 : (this.zeroResults / this.totalQueries) * 100,
      avgLatencyMs: this.totalQueries === 0 ? 0 : Math.round(this.totalResponseTimeMs / this.totalQueries)
    };
  }
}

export const SearchMetrics = new SearchMetricsTracker();
