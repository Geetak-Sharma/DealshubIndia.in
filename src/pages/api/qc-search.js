import { QCDataStore } from '../../lib/qcStore.js';
import { startQCScraper } from '../../lib/qcScraper.js';

// Ensure scraper is running when this route is hit
startQCScraper();

export const GET = async ({ url }) => {
  try {
    const q            = url.searchParams.get('q')           || '';
    const category     = url.searchParams.get('cat')         || 'all';
    const merchant     = url.searchParams.get('merchant')    || 'all';
    const hasCoupon    = url.searchParams.get('coupon')      || '';
    const hasCashback  = url.searchParams.get('cashback')    || '';
    const expiringToday = url.searchParams.get('expiring')   || '';
    const minDiscount  = url.searchParams.get('minDiscount') || '';
    const limit        = Math.min(parseInt(url.searchParams.get('limit')  || '20', 10), 50);
    const offset       = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);

    const results = QCDataStore.search(q, limit, offset, {
      category,
      merchant,
      hasCoupon,
      hasCashback,
      expiringToday,
      minDiscount,
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (e) {
    console.error('[QC Search API] Error:', e);
    return new Response(JSON.stringify({ error: 'Search failed', deals: [], total: 0, hasMore: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
