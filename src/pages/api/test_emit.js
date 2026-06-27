import { dealEmitter } from '../../lib/scraper.js';

export const GET = () => {
  const mockDeal = {
    id: `mock-loot-${Date.now()}`,
    title: "🔥 TEST LOOT: Apple AirPods Pro (SSE DYNAMIC INJECTION)",
    url: "https://amazon.in/test",
    platform: "Amazon",
    price: "₹1,999",
    priceNum: 1999,
    category: "tech",
    originalPrice: "₹24,900",
    discount: "92% OFF",
    discountNum: 92,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png",
    badge: "🔥 Super Loot",
    timestamp: Date.now(),
    isLoot: true
  };

  dealEmitter.emit('new_deals', [mockDeal]);

  return new Response("SSE payload fired successfully to all listeners.", { status: 200 });
};
