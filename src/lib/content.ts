import { getCollection } from 'astro:content';
import { normalizeBlog, type NormalizedBlog } from './normalizers/blog.ts';
import { normalizeDeal, type NormalizedDeal } from './normalizers/deals.ts';
import { TelegramDataStore } from './telegramStore.js';

export async function getNormalizedBlogPosts(): Promise<NormalizedBlog[]> {
  try {
    const rawPosts = await getCollection('blog');
    return rawPosts
      .map(normalizeBlog)
      .filter((post): post is NormalizedBlog => post !== null)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  } catch (e) {
    console.error('[Content Lib] getNormalizedBlogPosts error:', e);
    return [];
  }
}

export function getNormalizedDeals(limit = 12, offset = 0, category = 'all'): { deals: NormalizedDeal[]; hasMore: boolean } {
  try {
    const storeResults = TelegramDataStore.search('', limit, offset, category);
    const deals = (storeResults.deals || [])
      .map(normalizeDeal)
      .filter((deal): deal is NormalizedDeal => deal !== null);
    
    return {
      deals,
      hasMore: storeResults.hasMore,
    };
  } catch (e) {
    console.error('[Content Lib] getNormalizedDeals error:', e);
    return { deals: [], hasMore: false };
  }
}

export function getFeaturedDeals(limit = 6): NormalizedDeal[] {
  try {
    const data = TelegramDataStore.load();
    const posts = data.posts || [];
    return posts
      .map(normalizeDeal)
      .filter((deal): deal is NormalizedDeal => deal !== null)
      .filter(deal => deal.isLoot || deal.discountPercent !== undefined)
      .slice(0, limit);
  } catch (e) {
    console.error('[Content Lib] getFeaturedDeals error:', e);
    return [];
  }
}
