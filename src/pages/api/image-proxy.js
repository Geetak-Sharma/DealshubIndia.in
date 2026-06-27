import axios from 'axios';

export const prerender = false;

export async function GET({ request }) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`[Image Proxy] Fetching: ${url}`);
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = res.headers['content-type'] || 'image/jpeg';
    
    return new Response(res.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    console.error("[Image Proxy Error]", err.message);
    return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
