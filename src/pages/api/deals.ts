import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';

// Global In-Memory Caching & State
let CACHE_DEALS: any[] = [];
let CACHE_LAST_UPDATED: number = 0;
let isFetching: boolean = false;

// Background scraping function
async function fetchAndCacheDeals() {
  // Prevent duplicate runs using a simple locking mechanism
  if (isFetching) return;
  isFetching = true;

  try {
    const url = 'https://t.me/s/DealsHubIndiaa';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`Telegram responded with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const parsedDeals: any[] = [];
    const seenLinks = new Set<string>();

    // Platform detection helper (supports full + short link domains)
    function detectPlatform(url: string): string {
      const u = url.toLowerCase();
      if (u.includes('amazon') || u.includes('amzn.to') || u.includes('amzn.in') || u.includes('amzn')) return 'Amazon';
      if (u.includes('flipkart') || u.includes('fkrt.in') || u.includes('fkrt') || u.includes('dl.flipkart')) return 'Flipkart';
      if (u.includes('myntra') || u.includes('myntr.in') || u.includes('myntr')) return 'Myntra';
      if (u.includes('ajio')) return 'Ajio';
      if (u.includes('croma')) return 'Croma';
      if (u.includes('meesho')) return 'Meesho';
      if (u.includes('nykaa')) return 'Nykaa';
      if (u.includes('jiomart')) return 'JioMart';
      if (u.includes('tatacliq')) return 'Tata CLiQ';
      return 'Deal';
    }

    // Sanitize a single text line (strip URLs, emojis)
    function sanitizeLine(text: string): string {
      let clean = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
      return clean;
    }

    $('.tgme_widget_message').each((_, element) => {
      const $elem = $(element);
      const msgText = $elem.find('.tgme_widget_message_text').text();
      const msgHtml = $elem.find('.tgme_widget_message_text').html() || '';
      
      if (!msgText.trim()) return;

      // ---- Step 1: Extract ALL external URLs from <a> tags ----
      const rawHrefs: string[] = [];
      $elem.find('.tgme_widget_message_text a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('t.me/') && !href.includes('telegram.org') && href.startsWith('http')) {
          rawHrefs.push(href);
        }
      });
      const uniqueHrefs = [...new Set(rawHrefs)];
      if (uniqueHrefs.length === 0) return;

      // Deduplicate by primary link across messages
      if (seenLinks.has(uniqueHrefs[0])) return;
      seenLinks.add(uniqueHrefs[0]);

      // ---- Step 2: Line-by-line pairing (text → link below it) ----
      const textLines = msgText.split('\n').map(l => l.trim()).filter(Boolean);
      const structuredLinks: { title: string; url: string; platform: string }[] = [];
      const usedUrls = new Set<string>();

      for (let i = 0; i < textLines.length; i++) {
        const current = textLines[i];
        const next = textLines[i + 1] || '';

        // Case A: The next line IS a URL — pair current text with it
        if (next.startsWith('http') && !next.includes('t.me/') && !usedUrls.has(next)) {
          const cleanLabel = sanitizeLine(current);
          if (cleanLabel) {
            structuredLinks.push({
              title: cleanLabel,
              url: next,
              platform: detectPlatform(next)
            });
            usedUrls.add(next);
            i++; // skip the URL line
          }
        }
        // Case B: Current line itself contains a URL embedded inline
        else if (current.startsWith('http') && !current.includes('t.me/') && !usedUrls.has(current)) {
          structuredLinks.push({
            title: 'View Deal',
            url: current,
            platform: detectPlatform(current)
          });
          usedUrls.add(current);
        }
      }

      // ---- Step 3: Catch any <a> hrefs that weren't matched line-by-line ----
      for (const href of uniqueHrefs) {
        if (!usedUrls.has(href)) {
          // Try to find the <a> text from DOM
          let linkText = '';
          $elem.find('.tgme_widget_message_text a').each((_, el) => {
            if ($(el).attr('href') === href) {
              linkText = $(el).text().trim();
            }
          });
          const label = sanitizeLine(linkText) || 'View Deal';
          structuredLinks.push({
            title: label,
            url: href,
            platform: detectPlatform(href)
          });
          usedUrls.add(href);
        }
      }

      // Deduplicate by URL
      const deduped = Array.from(
        new Map(structuredLinks.map(item => [item.url, item])).values()
      );

      if (deduped.length === 0) return;

      // ---- Step 4: Extract shared message-level metadata ----
      const priceMatch = msgText.match(/₹[\d,]+/);
      const price = priceMatch ? priceMatch[0] : null;
      if (!price) return; 
      
      const discountMatch = msgText.match(/(\d+% \w+)/i) || msgText.match(/(\d+%)(\s+off)?/i);
      const discount = discountMatch ? discountMatch[0] : null;

      // Extract numeric discount for sorting
      const discountNum = discount ? parseInt(discount.match(/(\d+)/)?.[1] || '0') : 0;

      let originalPrice = null;
      if (msgHtml.includes('<s>') || msgHtml.includes('<strike>')) {
        const strikeMatch = msgHtml.match(/<s[^>]*>(.*?)<\/s>/i) || msgHtml.match(/<strike[^>]*>(.*?)<\/strike>/i);
        if (strikeMatch) {
          const stripped = strikeMatch[1].replace(/<[^>]*>/g, '').trim();
          if (stripped.includes('₹')) originalPrice = stripped;
        }
      }

      const photoWrap = $elem.find('.tgme_widget_message_photo_wrap');
      let image = '';
      if (photoWrap.length > 0) {
        const style = photoWrap.attr('style') || '';
        const bgImgMatch = style.match(/background-image:url\('([^']+)'\)/);
        if (bgImgMatch) image = bgImgMatch[1];
      }

      let urgencyBadge = '';
      const lowerText = msgText.toLowerCase();
      if (lowerText.includes('loot') || lowerText.includes('error')) urgencyBadge = '🔥 Trending';
      else if (lowerText.includes('ending') || lowerText.includes('hurry')) urgencyBadge = '⏳ Ending Soon';
      else if (lowerText.includes('fast') || lowerText.includes('flash')) urgencyBadge = '⚡ Selling Fast';

      const timeAttr = $elem.find('.tgme_widget_message_date time').attr('datetime');
      const timestamp = timeAttr ? new Date(timeAttr).getTime() : 0;

      // ---- Step 5: FLATTEN — one deal per link ----
      // Use first clean text line from message as fallback title
      const msgFallbackTitle = sanitizeLine(textLines[0]) || 'Exclusive Deal';

      for (const link of deduped) {
        // Avoid generic 'View Deal' as title — always prefer real product name
        let dealTitle = link.title;
        if (!dealTitle || dealTitle === 'View Deal' || dealTitle.length < 3) {
          dealTitle = msgFallbackTitle;
        }

        // ---- Data Quality Gate: skip deals without real images or valid titles ----
        if (!image || !image.startsWith('http')) continue;  // Only real URLs, no SVG fallbacks
        if (!dealTitle || dealTitle.length < 3) continue;

        const dealId = dealTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + '-' + parsedDeals.length;

        // ---- Category Inference ----
        let category = 'other';
        const titleLower = dealTitle.toLowerCase();
        
        if (titleLower.includes('laptop') || titleLower.includes('mobile') || titleLower.includes('watch') || titleLower.includes('earbuds') || titleLower.includes('ssd') || titleLower.includes('keyboard')) {
          category = 'tech';
        } else if (titleLower.includes('shirt') || titleLower.includes('shoe') || titleLower.includes('tshirt') || titleLower.includes('dress') || titleLower.includes('kurta')) {
          category = 'fashion';
        } else if (titleLower.includes('home') || titleLower.includes('kitchen') || titleLower.includes('bottle') || titleLower.includes('mop') || titleLower.includes('lamp')) {
          category = 'home';
        }
        
        // ---- Price numeric extraction ----
        const priceNum = parseInt(price.replace(/[^0-9]/g, '')) || 0;
        if (priceNum > 0 && priceNum < 100) {
          category = 'under-99';
        }

        const isLoot = urgencyBadge.includes('Loot') || discountNum >= 90;

        parsedDeals.push({
          id: dealId,
          title: dealTitle,
          url: link.url,
          platform: link.platform,
          price,
          priceNum,
          category,
          originalPrice,
          discount,
          discountNum,
          image,
          badge: urgencyBadge,
          timestamp,
          isLoot
        });
      }
    });

    // Sort: newest first, then by highest discount
    parsedDeals.sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
      return b.discountNum - a.discountNum;
    });

    // ---- Triple Dedup Pipeline ----
    // 1. URL dedup
    const urlDedup = new Map<string, any>();
    for (const deal of parsedDeals) {
      if (!urlDedup.has(deal.url)) urlDedup.set(deal.url, deal);
    }
    // 2. Title+Price dedup (prevents visually identical cards)
    const titlePriceDedup = new Map<string, any>();
    for (const deal of urlDedup.values()) {
      const key = (deal.title + '|' + deal.price).toLowerCase();
      if (!titlePriceDedup.has(key)) titlePriceDedup.set(key, deal);
    }
    // 3. Image dedup — max 2 cards per image to avoid grid monotony
    const imageCount = new Map<string, number>();
    const dedupedDeals: any[] = [];
    for (const deal of titlePriceDedup.values()) {
      const imgKey = deal.image || 'no-image';
      const count = imageCount.get(imgKey) || 0;
      if (count < 2) {
        imageCount.set(imgKey, count + 1);
        // Replace generic 'Deal' platform with empty so no badge renders
        if (deal.platform === 'Deal') deal.platform = '';
        // Assign quality badge based on discount + text keywords
        if (!deal.badge) {
          if (deal.discountNum >= 70) deal.badge = '💥 Loot';
          else if (deal.discountNum >= 40) deal.badge = '🔥 Hot Deal';
          else if (deal.discountNum >= 20) deal.badge = '🟢 Good Price';
        }
        dedupedDeals.push(deal);
      }
    }
    const finalDeals = dedupedDeals.slice(0, 80);

    // Atomic cache update
    if (finalDeals.length > 0) {
      CACHE_DEALS = finalDeals;
      CACHE_LAST_UPDATED = Date.now();
      console.log(`[Scraper] Successfully fetched & parsed ${finalDeals.length} deals from Telegram at ${new Date(CACHE_LAST_UPDATED).toISOString()}`);
    } else {
      console.log(`[Scraper] Valid extraction yielded 0 deals. Preserving previous cache.`);
    }
  } catch (error: any) {
    // FAILSAFE: Logging error but preserving the old cache.
    console.error(`[Scraper] Error fetching from Telegram at ${new Date().toISOString()}:`, error.message);
  } finally {
    isFetching = false;
  }
}

// Instantiate the recurring job (Execution context bound to Node Memory scope).
// Runs every 5 minutes unattended without waiting for user requests limits.
setInterval(() => {
  fetchAndCacheDeals();
}, 5 * 60 * 1000);

export const GET: APIRoute = async ({ request }) => {
  try {
    // Check if the server literally just started and the cache is totally empty
    if (CACHE_DEALS.length === 0 && !isFetching) {
      await fetchAndCacheDeals();
    }

    // Instantly return data structurally decoupled from scraping logic guaranteeing <100ms payload delivery.
    return new Response(JSON.stringify({
      deals: CACHE_DEALS,
      lastUpdated: CACHE_LAST_UPDATED
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Background API Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
