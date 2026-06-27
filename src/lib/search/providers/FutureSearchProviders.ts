import { ISearchProvider } from '../SearchProvider';
import { SearchQuery } from '../SearchQuery';
import { SearchResult } from '../SearchResult';
import { SearchIndexSchema } from '../SearchIndex';

export class FutureDatabaseProvider implements ISearchProvider {
  name = 'PostgreSQL_FTS';
  async index(document: SearchIndexSchema): Promise<void> {}
  async search(query: SearchQuery): Promise<SearchResult> { return { items: [], totalHits: 0, processingTimeMs: 0 }; }
}

export class FutureMeilisearchProvider implements ISearchProvider {
  name = 'Meilisearch';
  async index(document: SearchIndexSchema): Promise<void> {}
  async search(query: SearchQuery): Promise<SearchResult> { return { items: [], totalHits: 0, processingTimeMs: 0 }; }
}
