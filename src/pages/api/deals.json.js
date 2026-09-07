import { getCollection } from 'astro:content';
import { TelegramDataStore } from '../../lib/telegramStore.js';

export const prerender = false;

const isValidDealImage = (img) => {
  return Boolean(
    img &&
    typeof img === 'string' &&
    img.startsWith('http') &&
    !img.includes('example.com') &&
    !img.includes('Telegram_logo')
  );
};

export async function GET() {
  let contentDeals = [];
  try {
    const allCollection = await getCollection('deals');
    contentDeals = allCollection
      .filter(d => d.data.title && isValidDealImage(d.data.image))
      .map(d => ({
        id: d.id,
        title: d.data.title,
        price: d.data.price,
        originalPrice: d.data.originalPrice || '',
        link: d.data.link,
        image: d.data.image,
        merchant: 'Amazon',
        category: d.data.category || 'Tech',
        isLoot: d.data.isLoot,
        date: d.data.date,
        timestamp: new Date(d.data.date).getTime(),
      }));
  } catch (e) {
    console.warn('[API deals.json] contentDeals error:', e);
  }

  let tgDeals = [];
  try {
    const store = TelegramDataStore.load();
    if (store && Array.isArray(store.posts)) {
      tgDeals = store.posts
        .filter(p => p.title && isValidDealImage(p.image))
        .map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice || '',
          discount: p.discount || '',
          link: p.checkoutUrl || p.url || '#',
          image: p.image,
          merchant: p.platform || 'Amazon',
          category: p.category || 'General',
          isLoot: p.isLoot,
          timestamp: p.timestamp || Date.now(),
        }));
    }
  } catch (e) {
    console.warn('[API deals.json] tgDeals error:', e);
  }

  const combined = [...tgDeals, ...contentDeals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return new Response(JSON.stringify(combined), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
