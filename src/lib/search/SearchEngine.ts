import { ISearchProvider } from './SearchProvider';
import { MemorySearchProvider } from './providers/MemorySearchProvider';
import { SearchQuery } from './SearchQuery';
import { QueryParser } from './QueryParser';
import { SearchMetrics } from './SearchMetrics';
import { CacheManager } from '../cache/CacheManager';
import { CachePolicies } from '../cache/CachePolicy';

export class SearchEngineImpl {
  private provider: ISearchProvider;

  constructor() {
    this.provider = new MemorySearchProvider();
  }

  setProvider(provider: ISearchProvider) {
    this.provider = provider;
  }
  
  getProvider(): ISearchProvider {
    return this.provider;
  }

  async search(rawQueryString: string, overrides?: Partial<SearchQuery>) {
    const query = QueryParser.parse(rawQueryString);
    if (overrides) {
      Object.assign(query.filters, overrides.filters);
      Object.assign(query.pagination, overrides.pagination);
    }

    // Phase 6: Cache Hook Integration
    // Create a deterministic hash for the query
    const cacheKey = `search:${query.rawString}:${JSON.stringify(query.filters)}:${query.pagination.limit}:${query.pagination.offset}`;

    return CacheManager.getOrFetch(cacheKey, CachePolicies.Deals, async () => {
        try {
            const results = await this.provider.search(query);
            SearchMetrics.recordSearch(query, results);
            return results;
        } catch (err) {
            console.error('Search Engine Execution Failed', err);
            throw err;
        }
    });
  }
}

export const SearchEngine = new SearchEngineImpl();
