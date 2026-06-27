export interface SearchIndexSchema {
  entityId: string;
  entityType: string;
  title: string;
  slug: string;
  description: string;
  keywords: string[];
  taxonomy: string[]; // e.g., ["electronics", "phones"]
  relationships: {
    merchantId?: string;
    categoryId?: string;
    brandId?: string;
  };
}
