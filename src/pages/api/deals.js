import { getCachedDeals, getCacheMeta, startScraper, fetchAndCacheDeals } from '../../lib/scraper.js';

// Boot the scraper poller whenever this API is initialized by the Node process
startScraper();

export const GET = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '24');
  const page = parseInt(url.searchParams.get('page') || '1');
  const customOffset = url.searchParams.get('offset');
  const offset = customOffset !== null ? parseInt(customOffset) : (page - 1) * limit;

  let allDeals = getCachedDeals();

  if (allDeals.length === 0) {
    try {
      await fetchAndCacheDeals();
      allDeals = getCachedDeals();
    } catch(err) {
      console.error(err);
    }
  }

  // Fallback deal if completely empty
  if (allDeals.length === 0) {
    allDeals.push({
      id: "manual-deal-1", title: "🔥 MEGA DEAL: Local Setup Works!",
      url: "https://t.me/DealsHubIndiaa", platform: "Telegram",
      price: "₹0", priceNum: 0, category: "other", originalPrice: "₹999",
      discount: "100%", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png",
      badge: "🔥 Super Loot", timestamp: Date.now(), isLoot: true
    });
  }

  const { lastUpdated } = getCacheMeta();
  const totalSavingsToday = allDeals.reduce((sum, deal) => {
    const savings = (deal.originalPriceNum || 0) - (deal.priceNum || 0);
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  // Paginate
  const paginatedDeals = allDeals.slice(offset, offset + limit);

  return new Response(JSON.stringify({
    deals: paginatedDeals,
    total: allDeals.length,
    page,
    limit,
    totalPages: Math.ceil(allDeals.length / limit),
    lastUpdated,
    totalSavingsToday
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60"
    }
  });
};
