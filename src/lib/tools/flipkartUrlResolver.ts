export interface ResolvedFlipkartUrl {
  canonicalUrl: string;
  itemId: string | null;
  pid: string | null;
  slug: string | null;
  isShortUrl: boolean;
}

/**
 * Resolves short links (like fkrt.cc, dl.flipkart.com/s/...) to their absolute target URLs by following redirects.
 */
export async function resolveRedirect(shortUrl: string): Promise<string> {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // First try manual redirect to capture raw Location header (especially for dl.flipkart.com/s/... which returns 301)
    const manualRes = await fetch(shortUrl, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'manual',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    let loc = manualRes.headers.get('location');
    if (loc) {
      if (loc.includes('http://') && loc.indexOf('http://') > 0) {
        loc = loc.slice(loc.indexOf('http://'));
      } else if (loc.includes('https://') && loc.indexOf('https://') > 0) {
        loc = loc.slice(loc.indexOf('https://'));
      }
      if (loc.includes('m.flipkart.com')) {
        loc = loc.replace('m.flipkart.com', 'www.flipkart.com');
      }
      return loc;
    }

    // Fallback: Follow redirect if no direct 301/302 location header
    const followController = new AbortController();
    const followTimeoutId = setTimeout(() => followController.abort(), 8000);
    const res = await fetch(shortUrl, {
      method: 'GET',
      headers: { 'User-Agent': userAgent },
      redirect: 'follow',
      signal: followController.signal
    });
    clearTimeout(followTimeoutId);
    return res.url || shortUrl;
  } catch (e) {
    console.error('[flipkartUrlResolver] Failed to resolve redirect via native fetch:', e);
  }
  return shortUrl;
}

/**
 * Extracts pure URL from messy text (e.g. "Take a look at this product on Flipkart https://...")
 */
export function extractUrlFromInput(input: string): string {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);
  const found = words.find(w => w.startsWith('http://') || w.startsWith('https://'));
  if (found) return found;
  
  const domainFound = words.find(w => w.includes('flipkart.com') || w.includes('fkrt.cc'));
  if (domainFound) return domainFound;

  return trimmed;
}

/**
 * Parses and canonicalizes any supported Flipkart URL format.
 */
export async function resolveFlipkartUrl(inputUrl: string): Promise<ResolvedFlipkartUrl> {
  let url = extractUrlFromInput(inputUrl);

  const isShort = url.includes('fkrt.cc') || url.includes('/s/') || url.includes('/s/ ');
  
  if (isShort) {
    url = await resolveRedirect(url);
  }

  // Normalize protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (url.includes('http://') && url.indexOf('http://') > 0) {
    url = url.slice(url.indexOf('http://'));
  } else if (url.includes('https://') && url.indexOf('https://') > 0) {
    url = url.slice(url.indexOf('https://'));
  }

  if (url.includes('m.flipkart.com')) {
    url = url.replace('m.flipkart.com', 'www.flipkart.com');
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
