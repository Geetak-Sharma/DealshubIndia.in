export interface SearchQuery {
  rawString: string;
  keywords: string[];
  filters: {
    categoryIds?: string[];
    merchantIds?: string[];
    brandIds?: string[];
  };
  pagination: {
    limit: number;
    offset: number;
  };
}
