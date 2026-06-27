import { SearchQuery } from './SearchQuery';
import { SearchResult } from './SearchResult';
import { SearchIndexSchema } from './SearchIndex';

export interface ISearchProvider {
  name: string;
  index(document: SearchIndexSchema): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult>;
}
