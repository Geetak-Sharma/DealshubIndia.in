export interface CachePolicyDef {
  ttlSeconds: number;
  swrSeconds: number; // Stale-While-Revalidate window
}

export const CachePolicies: Record<string, CachePolicyDef> = {
  Deals: { ttlSeconds: 300, swrSeconds: 600 },        // 5 min TTL, 10 min SWR
  Blog: { ttlSeconds: 86400, swrSeconds: 172800 },    // 24 hours
  Guides: { ttlSeconds: 86400, swrSeconds: 172800 },
  Coupons: { ttlSeconds: 3600, swrSeconds: 7200 },    // 1 hour
  Search: { ttlSeconds: 60, swrSeconds: 120 },        // 1 min
  Merchants: { ttlSeconds: 86400, swrSeconds: 172800 },
  Categories: { ttlSeconds: 86400, swrSeconds: 172800 },
  QuickCommerce: { ttlSeconds: 60, swrSeconds: 120 },
  ReviewAnalyzer: { ttlSeconds: 86400, swrSeconds: 0 }, // Highly expensive, long cache
  FlipkartExtractor: { ttlSeconds: 86400, swrSeconds: 0 }
};
