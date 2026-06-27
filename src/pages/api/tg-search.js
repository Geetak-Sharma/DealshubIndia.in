import { TelegramDataStore } from '../../lib/telegramStore.js';
import { startScraper } from '../../lib/scraper.js';
import { normalizeDeal } from '../../lib/normalizers/deals.ts';

// Ensure scraper is running
startScraper();

export const GET = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('cat') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = TelegramDataStore.search(query, limit, offset, category);
    
    // Server-side normalization of deals
    if (results.deals && Array.isArray(results.deals)) {
      results.deals = results.deals
        .map(normalizeDeal)
        .filter(d => d !== null);
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30"
      }
    });
  } catch (e) {
    console.error("[Search API] Error:", e);
    return new Response(JSON.stringify({ error: "Search failed" }), { status: 500 });
  }
};
