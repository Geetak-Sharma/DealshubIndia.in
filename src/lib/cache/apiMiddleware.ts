import { CacheManager } from './CacheManager';
import { CachePolicies } from './CachePolicy';
import { CacheKey } from './CacheKey';

type AstroEndpoint = (context: any) => Promise<Response>;

export function withCache(policyKey: keyof typeof CachePolicies, endpointFn: AstroEndpoint): AstroEndpoint {
  return async (context) => {
    const policy = CachePolicies[policyKey];
    if (!policy) return endpointFn(context); // Fallback if no policy defined

    const key = CacheKey.api(context.url.pathname + context.url.search);

    try {
      const responseBody = await CacheManager.getOrFetch(key, policy, async () => {
        const response = await endpointFn(context);
        if (!response.ok) throw new Error('Non-200 response');
        return await response.json(); // Cache the JSON payload
      });

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${policy.ttlSeconds}, stale-while-revalidate=${policy.swrSeconds}`
        }
      });
    } catch (err) {
      console.error(`Cache middleware failed for ${key}`, err);
      // Fallback to origin
      return endpointFn(context);
    }
  };
}
