import axios from 'axios';
import * as cheerio from 'cheerio';

export const prerender = false;

export const GET = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const res = await axios.get(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB,en;q=0.9'
      },
      timeout: 5000,
      maxRedirects: 5
    });

    const ch = cheerio.load(res.data);
    
    // 1. Title
    let title = ch('#productTitle').text().trim() ||
                ch('span.B_NuCI').text().trim() ||
                ch('span._6EBuv-').text().trim() ||
                ch('meta[property=\"og:title\"]').attr('content') ||
                ch('title').text().trim() || '';

    title = title.replace(/\s+/g, ' ').replace(/:\s*Amazon\.in:.*/i, '').trim();

    // 2. Image
    let image = ch('#landingImage').attr('src') ||
                ch('#landingImage').attr('data-old-hires') ||
                ch('img.q6DClP').attr('src') ||
                ch('img._396cs4').attr('src') ||
                ch('meta[property=\"og:image\"]').attr('content') || '';

    // 3. Price
    let price = ch('.a-price .a-offscreen').first().text().trim() ||
                ch('div._30jeq3._16Jk6d').text().trim() ||
                ch('div.Nx9bqj.CxhGGd').text().trim() ||
                ch('meta[name=\"twitter:data1\"]').attr('content') || '';

    // 4. MRP
    let mrp = ch('.a-price.a-text-price .a-offscreen').first().text().trim() ||
              ch('div._3I9_wc._2p6lqe').text().trim() ||
              ch('div.yRaY8j').text().trim() || '';

    // 5. Discount
    let discount = ch('.savingsPercentage').first().text().trim() ||
                   ch('div._3Ay6Sb._31Dcoz').text().trim() ||
                   ch('div.UkUFwK').text().trim() || '';

    return new Response(JSON.stringify({
      success: true,
      title: title.slice(0, 100),
      image: image,
      price: price,
      mrp: mrp,
      discount: discount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
    });

  } catch(err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
