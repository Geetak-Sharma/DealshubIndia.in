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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 6000,
      maxRedirects: 5
    });

    const html = res.data;
    const ch = cheerio.load(html);
    const host = (new URL(target)).hostname.toLowerCase();

    // 1. Title Extraction
    let rawTitle = ch('#productTitle').text().trim() ||
                   ch('span.B_NuCI').text().trim() ||
                   ch('span._6EBuv-').text().trim() ||
                   ch('meta[property="og:title"]').attr('content') ||
                   ch('title').text().trim() || '';

    if (rawTitle === 'Amazon.in' || rawTitle.includes('Robot Check')) rawTitle = '';
    let title = rawTitle
      .replace(/- Buy [^-]+ Online at Best Prices.*/i, '')
      .replace(/:\s*Flipkart\.com.*/i, '')
      .replace(/:\s*Amazon\.in:.*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Image Extraction
    let image = ch('#landingImage').attr('src') ||
                ch('#landingImage').attr('data-old-hires') ||
                ch('img.q6DClP').attr('src') ||
                ch('img._396cs4').attr('src') ||
                ch('meta[property="og:image"]').attr('content') || '';

    // If Flipkart image from props
    if (!image && host.includes('flipkart')) {
      const imgMatch = html.match(/"baseUrl":\s*"([^"]+)"/i);
      if (imgMatch) {
        image = imgMatch[1].replace('{@width}', '400').replace('{@height}', '400').replace('{@quality}', '80');
      }
    }

    // 3. Price, MRP, Discount Extraction
    let price = '';
    let mrp = '';
    let discount = '';

    if (host.includes('flipkart')) {
      // Flipkart Price
      const pMatch = html.match(/"(?:finalPrice|specialPrice|sellingPrice)":\s*\{\s*"value":\s*([0-9]+)/i) ||
                     html.match(/"(?:finalPrice|specialPrice|sellingPrice|price)":\s*([0-9]+)/i);
      if (pMatch) {
        price = '₹' + parseInt(pMatch[1], 10).toLocaleString('en-IN');
      }

      // Flipkart MRP
      const mrpM = html.match(/"(?:mrp|maximumRetailPrice|strikeOffPrice)":\s*\{\s*"value":\s*([0-9]+)/i) ||
                   html.match(/"(?:mrp|maximumRetailPrice|strikeOffPrice)":\s*([0-9]+)/i);
      if (mrpM) {
        mrp = '₹' + parseInt(mrpM[1], 10).toLocaleString('en-IN');
      }

      // Flipkart Discount
      const dM = html.match(/"totalDiscount":\s*([0-9]+)/i) ||
                 html.match(/"discountPercentage":\s*([0-9]+)/i) ||
                 html.match(/([0-9]{1,2})%\s*off/i);
      if (dM) {
        discount = (dM[1] ? dM[1] : dM[0]).replace(/off/i, '').trim();
        if (!discount.includes('%')) discount += '%';
      }
    } else {
      // Amazon Price
      const pMatch = html.match(/class="a-price-whole">([0-9,]+)/i) ||
                     html.match(/class="a-offscreen">₹\s*([0-9,]+)/i) ||
                     html.match(/"priceAmount":\s*([0-9.]+)/i);
      if (pMatch) {
        price = '₹' + pMatch[1].replace(/,/g, '').trim();
      }

      // Amazon MRP
      const mrpM = html.match(/class="a-price a-text-price"[^>]*>[\s\S]*?class="a-offscreen">₹?\s*([0-9,]+)/i);
      if (mrpM) {
        mrp = '₹' + mrpM[1].trim();
      }

      // Amazon Discount
      const dM = html.match(/savingsPercentage">(-?[0-9]+%?)/i) ||
                 html.match(/([0-9]{1,2})%\s*off/i);
      if (dM) {
        discount = dM[1].replace('-', '').trim();
        if (!discount.includes('%')) discount += '%';
      }
    }

    // Fallbacks from Cheerio DOM classes if regex missed
    if (!price) {
      price = ch('.a-price .a-offscreen').first().text().trim() ||
              ch('div._30jeq3._16Jk6d').text().trim() ||
              ch('div.Nx9bqj').first().text().trim() || '';
    }
    if (!mrp) {
      mrp = ch('.a-price.a-text-price .a-offscreen').first().text().trim() ||
            ch('div._3I9_wc._2p6lqe').text().trim() ||
            ch('div.yRaY8j').first().text().trim() || '';
    }
    if (!discount) {
      discount = ch('.savingsPercentage').first().text().trim() ||
                 ch('div.UkUFwK').first().text().trim() ||
                 ch('div._3Ay6Sb').first().text().trim() || '';
    }

    const hasInfo = Boolean(title || image || price);

    return new Response(JSON.stringify({
      success: hasInfo,
      title: title.slice(0, 110),
      image: image,
      price: price,
      mrp: mrp,
      discount: discount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' }
    });

  } catch(err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
