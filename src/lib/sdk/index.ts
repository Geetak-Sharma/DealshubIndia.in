
import { executePipeline } from '../request';
import { getLivePricing, getMerchantTrust } from '@/platform/commerce';
import { getAIRecommendation } from '@/platform/ai';
import { trackEvent } from '@/platform/analytics';

export const Platform = {
  deals: {
    get: (id: string) => executePipeline({
      key: `deal:${id}`,
      fetcher: () => getLivePricing(id),
      timeoutMs: 3000,
      retries: 1,
      cacheOptions: { ttlMs: 30000, swr: true }
    })
  },
  merchant: {
    get: (id: string) => executePipeline({
      key: `merchant:${id}`,
      fetcher: () => getMerchantTrust(id),
      cacheOptions: { ttlMs: 300000, swr: true } // merchants rarely change
    })
  },
  ai: {
    summary: (id: string) => executePipeline({
      key: `ai:${id}`,
      fetcher: () => getAIRecommendation(id),
      timeoutMs: 5000
    })
  },
  analytics: {
    track: trackEvent
  }
};
