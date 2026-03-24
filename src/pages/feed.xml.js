import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  let deals = [];
  try {
    deals = await getCollection('deals');
    
    // Defensive Sorting
    deals.sort((a, b) => {
      const dateA = a.data.date instanceof Date ? a.data.date.getTime() : 0;
      const dateB = b.data.date instanceof Date ? b.data.date.getTime() : 0;
      return dateB - dateA;
    });
  } catch (e) {
    console.error('[RSS] Collection fetch failed:', e);
  }

  if (deals.length === 0) {
    return new Response("No deals available for feed", { status: 404 });
  }

  try {
    return rss({
      title: 'Dealshub India | Live Tech Loots',
      description: 'The best tech deals and bank offers in India, updated every 10 minutes.',
      site: context.site || 'https://dealshubindia.in',
      items: deals.slice(0, 50).map((deal) => ({
        title: `${deal.data.title} - ${deal.data.price}`,
        description: `Join the loot! Verified tech offer.`,
        link: deal.data.link,
        pubDate: deal.data.date,
      })),
      customData: `<language>en-in</language>`,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
