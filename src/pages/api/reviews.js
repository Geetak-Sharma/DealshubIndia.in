import * as cheerio from "cheerio";

function extractPID(url) {
  try {
    const parsed = new URL(url);
    const pidParam = parsed.searchParams.get("pid");
    if (pidParam) return pidParam;
    const pidMatch = parsed.pathname.match(/\/p\/(itm[a-zA-Z0-9]+)/i);
    if (pidMatch) return pidMatch[1];
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (const seg of segments.reverse()) {
      if (/^itm[a-zA-Z0-9]+$/i.test(seg)) return seg;
    }
    return null;
  } catch { return null; }
}

async function fetchHTML(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      }
    });
    return await res.text();
  } catch (e) {
    console.error("Fetch error:", e.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  const pid = extractPID(url);
  if (!pid) return new Response(JSON.stringify({ error: "Invalid product URL" }), { status: 400 });

  // Currently only Flipkart optimized scraping
  const reviewsUrl = `https://www.flipkart.com/product/reviews/itme?pid=${pid}`;
  const html = await fetchHTML(reviewsUrl);
  if (!html) return new Response(JSON.stringify({ error: "Failed to fetch reviews" }), { status: 500 });

  const $ = cheerio.load(html);
  const reviews = [];

  $("div._27M-N_").each((i, el) => {
    if (i > 5) return; // Limit for speed
    const rating = $(el).find("div._3LWZlK").text();
    const title = $(el).find("p._2-N1vD").text();
    const body = $(el).find("div.t-yY7C").text();
    if (rating && body) reviews.push({ rating, title, body });
  });

  return new Response(JSON.stringify({ pid, reviews }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
