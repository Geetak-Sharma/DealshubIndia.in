import { execSync } from 'child_process';

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
export function resolveRedirect(shortUrl: string): string {
  try {
    // We can use a fast curl HEAD request to follow and return the final location URL
    const cmd = `curl.exe -s -o NUL -w "%{url_effective}" -L "${shortUrl}"`;
    const finalUrl = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    if (finalUrl && finalUrl.startsWith('http')) {
      return finalUrl;
    }
  } catch (e) {
    console.error('[flipkartUrlResolver] Failed to resolve redirect via curl:', e);
  }
  return shortUrl;
}

/**
 * Parses and canonicalizes any supported Flipkart URL format.
 */
export function resolveFlipkartUrl(inputUrl: string): ResolvedFlipkartUrl {
  let url = inputUrl.trim();
  const isShort = url.includes('fkrt.cc') || url.includes('dl.flipkart.com/dl/s/') || url.includes('flipkart.com/s/');
  
  if (isShort) {
    url = resolveRedirect(url);
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
  const itmMatch = url.match(/(itm[a-f0-9]{16})/i);
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
