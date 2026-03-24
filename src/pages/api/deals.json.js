import { getCollection } from 'astro:content';

export async function GET() {
  const allDeals = await getCollection('deals');
  // Sort by date descending
  const sortedDeals = allDeals.sort((a, b) => b.data.date - a.data.date);
  
  return new Response(JSON.stringify(sortedDeals), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
