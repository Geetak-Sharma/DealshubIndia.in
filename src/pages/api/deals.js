import { getCollection } from 'astro:content';

export const prerender = false; // Force SSR

export async function GET() {
  try {
    let deals = await getCollection('deals');
    
    // Defensive Sorting: Ensure date exists and is a valid Date object
    deals.sort((a, b) => {
      const dateA = a.data.date instanceof Date ? a.data.date.getTime() : 0;
      const dateB = b.data.date instanceof Date ? b.data.date.getTime() : 0;
      return dateB - dateA;
    });

    // Log for GCP Cloud Run Debugging
    console.log(`[SERVER] Found ${deals.length} deals. Latest: ${deals[0]?.data?.title || 'None'}`);

    if (!deals || deals.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No deals found in content collection",
        timestamp: new Date().toISOString() 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Map to simple JSON for production serializability
    const payload = deals.map(d => ({
      id: d.id,
      slug: d.slug,
      title: d.data.title,
      price: d.data.price,
      originalPrice: d.data.originalPrice,
      link: d.data.link,
      category: d.data.category,
      image: d.data.image,
      isLoot: d.data.isLoot,
      date: d.data.date instanceof Date ? d.data.date.toISOString() : new Date().toISOString()
    }));

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (error) {
    console.error("[SERVER ERROR]:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
