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
  const browserUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const mobileUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.6367.82 Mobile Safari/537.36';

  const browserHeaders: Record<string, string> = {
    'User-Agent': browserUA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };

  // Strategy 1: Manual redirect (fast path)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(shortUrl, { method: 'GET', headers: browserHeaders, redirect: 'manual', signal: ctrl.signal });
    clearTimeout(t);
    let loc = res.headers.get('location');
    if (loc) {
      if (loc.includes('http://') && loc.indexOf('http://') > 0) loc = loc.slice(loc.indexOf('http://'));
      else if (loc.includes('https://') && loc.indexOf('https://') > 0) loc = loc.slice(loc.indexOf('https://'));
      if (loc.includes('m.flipkart.com')) loc = loc.replace('m.flipkart.com', 'www.flipkart.com');
      if (loc.includes('flipkart.com')) return loc;
    }
  } catch (_) {}

  // Strategy 2: Firebase Dynamic Links ?d=1 preview page
  // dl.flipkart.com uses Firebase Dynamic Links. The "?d=1" parameter returns a static
  // HTML preview page (not a JS redirect) which is NOT blocked by Flipkart 529 rate-limiting.
  // This page embeds the actual target Flipkart product URL in its HTML.
  try {
    const previewUrl = shortUrl.includes('?') ? shortUrl + '&d=1' : shortUrl + '?d=1';
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 10000);
    const previewRes = await fetch(previewUrl, {
      headers: { ...browserHeaders, 'User-Agent': mobileUA },
      redirect: 'follow',
      signal: ctrl2.signal
    });
    clearTimeout(t2);
    const html = await previewRes.text().catch(() => '');
    if (html) {
      // Try multiple URL extraction patterns from the preview HTML
      const flipkartUrlRegexes = [
        /"(https:\/\/www\.flipkart\.com\/(?:[^\/\"]+\/)*p\/itm[^\"]{0,120})"/,
        /'(https:\/\/www\.flipkart\.com\/(?:[^\/\']+\/)*p\/itm[^\']{0,120})'/,
        /href="(https:\/\/www\.flipkart\.com\/[^"]{10,})"/,
        /content="(https:\/\/www\.flipkart\.com\/[^"]{10,})"/,
        /url=(https?:\/\/[^\s&"]+flipkart\.com[^\s"&]+)/i,
      ];
      for (const pat of flipkartUrlRegexes) {
        const m = html.match(pat);
        if (m && m[1] && m[1].includes('flipkart.com')) {
          let found = m[1];
          if (found.includes('m.flipkart.com')) found = found.replace('m.flipkart.com', 'www.flipkart.com');
          return found;
        }
      }
      // Reconstruct URL from embedded fragments (itemId + pid + slug)
      const itmM = html.match(/(itm[a-f0-9]{13,16})/i);
      const pidM = html.match(/[?&]pid=([A-Z0-9]{16})/i);
      const slugM = html.match(/flipkart\.com\/([a-zA-Z0-9][a-zA-Z0-9-]{4,})\/(?:p\/|product-reviews\/)/);
      if (itmM && pidM) {
        const slug = (slugM && slugM[1] !== 'p') ? slugM[1] : 'product';
        return 'https://www.flipkart.com/' + slug + '/p/' + itmM[1] + '?pid=' + pidM[1];
      }
    }
  } catch (_) {}

  // Strategy 3: Mobile UA redirect follow
  try {
    const ctrl3 = new AbortController();
    const t3 = setTimeout(() => ctrl3.abort(), 8000);
    const res3 = await fetch(shortUrl, {
      headers: { 'User-Agent': mobileUA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-IN,en;q=0.9' },
      redirect: 'follow',
      signal: ctrl3.signal
    });
    clearTimeout(t3);
    if (res3.url && res3.url !== shortUrl && res3.url.includes('flipkart.com')) {
      return res3.url.replace('m.flipkart.com', 'www.flipkart.com');
    }
  } catch (_) {}

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
export function extractProductTitleFromInput(input: string): string | null {
  let cleaned = input.replace(/https?:\/\/\S+/gi, '').trim();
  cleaned = cleaned.replace(/^Take a look at this\s+/i, '');
  cleaned = cleaned.replace(/\s+on Flipkart.*$/i, '');
  cleaned = cleaned.replace(/Flipkart.*$/i, '');
  cleaned = cleaned.trim();
  return cleaned.length >= 3 ? cleaned : null;
}

export async function searchFlipkartProductByTitle(title: string): Promise<{ slug: string | null; itemId: string | null; pid: string | null } | null> {
  try {
    const searchUrl = 'https://www.flipkart.com/search?q=' + encodeURIComponent(title);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();
    
    const slugItemMatch = html.match(/\/([a-zA-Z0-9-]+)\/p\/(itm[a-f0-9]{12,16})/);
    const pidMatch = html.match(/[?&]pid=([A-Z0-9]{16})/i) || html.match(/"productId"\s*:\s*"([A-Z0-9]{16})"/i);

    if (slugItemMatch) {
      return {
        slug: slugItemMatch[1],
        itemId: slugItemMatch[2],
        pid: pidMatch ? pidMatch[1] : null
      };
    }
  } catch (e) {
    console.error('[flipkartUrlResolver] Flipkart title search fallback failed:', e);
  }
  return null;
}

export async function resolveFlipkartUrl(inputUrl: string): Promise<ResolvedFlipkartUrl> {
  let url = extractUrlFromInput(inputUrl);
  const detectedTitle = extractProductTitleFromInput(inputUrl);

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

  // If short URL failed to resolve directly, attempt title search fallback before throwing
  if (isShort && (!pid || !itemId) && detectedTitle) {
    const searchResult = await searchFlipkartProductByTitle(detectedTitle);
    if (searchResult && searchResult.itemId && searchResult.pid) {
      itemId = searchResult.itemId;
      pid = searchResult.pid;
      if (searchResult.slug) slug = searchResult.slug;
    }
  }

  // If short URL still failed to resolve to full product page
  if (isShort && !pid && !itemId) {
    throw new Error('SHORT_URL_BLOCKED: Flipkart blocked automatic expansion of this app link. Please open the link in your phone or browser once and paste the complete product link (flipkart.com/.../p/itm...).');
  }

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
