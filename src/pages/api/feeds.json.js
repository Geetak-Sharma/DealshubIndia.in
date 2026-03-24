import { getCollection } from 'astro:content';

export async function GET() {
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
    console.error('[JSON Feed] Collection fetch failed:', e);
  }

  const data = {
    info: {
      name: "Dealshub India AI Discovery API",
      description: "Live data stream for AI discovery and feed aggregators.",
      version: "2026.1"
    },
    top_deals: deals.slice(0, 50).map(d => ({
      id: d.id,
      title: d.data.title,
      price: d.data.price,
      link: d.data.link,
      date: d.data.date instanceof Date ? d.data.date.toISOString() : new Date().toISOString()
    }))
  };

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: { 
      "Content-Type": "application/json", 
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=600"
    }
  });
}
