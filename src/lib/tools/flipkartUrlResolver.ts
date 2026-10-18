

export interface ResolvedFlipkartUrl {
  canonicalUrl: string;
  itemId: string | null;
  pid: string | null;
  slug: string | null;
  isShortUrl: boolean;
}

/**
 * Resolves short links (like fkrt.cc, dl.flipkart.com) to their absolute target URLs by following redirects.
 */


export async function resolveRedirect(shortUrl: string): Promise<string> {
  try {
    const userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(shortUrl, {
      method: 'GET',
      headers: { 'User-Agent': userAgent },
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return res.url || shortUrl;
  } catch (e) {
    console.error('[flipkartUrlResolver] Failed to resolve redirect via native fetch:', e);
  }
  return shortUrl;
}

/**
 * Parses and canonicalizes any supported Flipkart URL format.
 */
export async function resolveFlipkartUrl(inputUrl: string): Promise<ResolvedFlipkartUrl> {
  let url = inputUrl.trim();
  const isShort = url.includes('fkrt.cc') || url.includes('/s/') || url.includes('/s/ '); // excludes dl.flipkart.com from redirect tracing
  
  if (isShort) {
    url = await resolveRedirect(url);
  }

  // Normalize protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new Error('Invalid URL format. Please enter a valid URL.');
  }

  // Extract pid
  let pid = parsed.searchParams.get('pid') || null;
  if (!pid) {
    const pidMatch = url.match(/[?&]pid=([A-Z0-9]{16})/i);
    if (pidMatch) pid = pidMatch[1];
  }

  // Extract itemId starting with 'itm'
  let itemId: string | null = null;
  const itmMatch = url.match(/(itm[a-f0-9]{13,16})/i);
  if (itmMatch) {
    itemId = itmMatch[1];
  }

  // Extract product slug
  let slug: string | null = null;
  const pathParts = parsed.pathname.split('/');
  // Usually, the slug is the first non-empty segment in the pathname
  // e.g. /apple-iphone-15-black-128-gb/p/itm2d83c19c3b88e
  const slugIndex = pathParts.findIndex(part => part.length > 0);
  if (slugIndex !== -1 && pathParts[slugIndex] !== 'p' && pathParts[slugIndex] !== 'product-reviews') {
    slug = pathParts[slugIndex];
  }

  // If pid is still missing, try fetching the page to resolve the default product FSN/PID
  if (!pid && (itemId || (slug && slug !== 'p'))) {
    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        const fsnMatch = html.match(/"fsn"\s*:\s*"([A-Z0-9]{16})"/i);
        if (fsnMatch) {
          pid = fsnMatch[1];
        } else {
          const prodIdMatch = html.match(/"productId"\s*:\s*"([A-Z0-9]{16})"/i);
          if (prodIdMatch) {
            pid = prodIdMatch[1];
          } else {
            const pagePidMatch = html.match(/[?&]pid=([A-Z0-9]{16})/i);
            if (pagePidMatch) pid = pagePidMatch[1];
          }
        }
      }
    } catch (_) {
      // Ignore network timeout or fetch errors
    }
  }

  // Build canonical URL
  // If we have slug and itemId: https://www.flipkart.com/slug/p/itemId?pid=pid
  // If no slug: https://www.flipkart.com/product-reviews/itemId?pid=pid
  let canonicalUrl = url;
  if (itemId) {
    if (slug) {
      canonicalUrl = `https://www.flipkart.com/${slug}/p/${itemId}`;
    } else {
      canonicalUrl = `https://www.flipkart.com/p/${itemId}`;
    }
    if (pid) {
      canonicalUrl += `?pid=${pid}`;
    }
  }

  return {
    canonicalUrl,
    itemId,
    pid,
    slug,
    isShortUrl: isShort
  };
}
