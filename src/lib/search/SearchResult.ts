export interface SearchResultItem {
  entityId: string;
  entityType: string;
  score: number;
  highlights?: Record<string, string>;
}

export interface SearchResult {
  items: SearchResultItem[];
  totalHits: number;
  processingTimeMs: number;
}
