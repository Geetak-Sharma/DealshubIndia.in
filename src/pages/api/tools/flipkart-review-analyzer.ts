import type { APIRoute } from 'astro';
import { scrapeFlipkartReviews } from '../../../lib/tools/flipkartReviewScraper';
// Analysis module removed — tool currently focuses on review listing
import { sortFlipkartReviews } from '../../../lib/tools/flipkartReviewSort';
import type { SortMode } from '../../../lib/tools/flipkartReviewSort';
import { resolveFlipkartUrl } from '../../../lib/tools/flipkartUrlResolver';
import type { AnalyzerAPIResponse } from '../../../types/tools';

// 30 Minutes In-Memory Cache for scraped pages
const scrapeCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1800000; // 30 mins

// In-Memory Rate Limiting (Simple sliding window per IP)
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 900000; // 15 mins
const MAX_REQUESTS_PER_WINDOW = 20; // Relaxed slightly for active users

export const POST: APIRoute = async ({ request }) => {
  // 1. Basic IP Rate Limiting
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'global-client';
  const now = Date.now();
  
  const timestamps = ipRequestHistory.get(clientIP) || [];
  const activeTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Too many requests. You have reached the analyzer limit of 20 requests per 15 minutes. Please try again later.',
    } as AnalyzerAPIResponse), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  activeTimestamps.push(now);
  ipRequestHistory.set(clientIP, activeTimestamps);

  try {
    const { url, sort = 'helpful', page = 1, search = '' } = await request.json();

    // 2. Validate URL Format & Domain
    if (!url || typeof url !== 'string' || !url.trim()) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Please paste a valid Flipkart link.',
      } as AnalyzerAPIResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.includes('flipkart.com') && !trimmedUrl.includes('fkrt.cc')) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Invalid link. This analyzer strictly supports Flipkart product or short URLs (e.g. contains flipkart.com or fkrt.cc).',
      } as AnalyzerAPIResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Extract Canonical URL for caching
    let resolvedInfo;
    try {
      resolvedInfo = await resolveFlipkartUrl(trimmedUrl);
    } catch (e: any) {
      return new Response(JSON.stringify({
        ok: false,
        error: e.message || 'Could not parse the provided Flipkart link. Make sure it is formatted correctly.',
      } as AnalyzerAPIResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = `${resolvedInfo.canonicalUrl}_${sort}`;
    let scrapedData: any;

    // 4. Cache Hit Check
    const cached = scrapeCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      scrapedData = cached.data;
    } else {
      // 5. Scrape fresh page
      scrapedData = await scrapeFlipkartReviews(trimmedUrl, 5, sort); // fetch up to 5 pages
      // If we are completely blocked and got no reviews or product metadata, throw specific error
      if (scrapedData.isBlocked && scrapedData.reviews.length === 0) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Flipkart is currently blocking our requests with anti-bot verification (reCAPTCHA/E002). Please try again in a few minutes.',
          warnings: scrapedData.warnings,
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Store in cache only if we successfully retrieved reviews, or if we know the product truly has 0 reviews
      if (scrapedData.reviews.length > 0 || scrapedData.product.reviewCount === 0) {
        scrapeCache.set(cacheKey, { timestamp: now, data: scrapedData });
      }
    }

    // 6. Sort the reviews
    const sortedReviews = sortFlipkartReviews(scrapedData.reviews, sort as SortMode);

    // 7. Filter reviews by keyword (body, title, or author name)
    let filteredReviews = sortedReviews;
    if (search && typeof search === 'string' && search.trim()) {
      const query = search.toLowerCase().trim();
      filteredReviews = sortedReviews.filter((r: any) => 
        (r.body || '').toLowerCase().includes(query) ||
        (r.title || '').toLowerCase().includes(query) ||
        (r.author || '').toLowerCase().includes(query)
      );
    }

    // 8. Paginate the reviews (10 per page)
    const pageSize = 10;
    const pageNum = parseInt(page as any, 10) || 1;
    const totalReviews = filteredReviews.length;
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedReviews = filteredReviews.slice(startIndex, startIndex + pageSize);

    const hasNextPage = startIndex + pageSize < totalReviews;
    const hasPrevPage = pageNum > 1;

    const payload = {
      ok: true,
      inputUrl: trimmedUrl,
      resolvedUrl: resolvedInfo.canonicalUrl,
      canonicalUrl: resolvedInfo.canonicalUrl,
      sortApplied: sort,
      page: pageNum,
      pageSize,
      totalCount: totalReviews,
      hasNextPage,
      hasPrevPage,
      product: scrapedData.product,
      reviews: paginatedReviews,
      distribution: scrapedData.distribution,
      analysis: null,
      warnings: scrapedData.warnings,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': cached ? 'HIT' : 'MISS',
      },
    });

  } catch (error: any) {
    console.error('[API Flipkart Review Analyzer] error:', error);
    
    // User safe human-readable error messages
    let errorMsg = 'Failed to analyze the reviews. Please verify the URL is valid and the product has existing reviews.';
    if (error.message && error.message.includes('timeout')) {
      errorMsg = 'Request timed out while connecting to Flipkart. Please try again in a few seconds.';
    } else if (error.message) {
      errorMsg = error.message;
    }

    return new Response(JSON.stringify({
      ok: false,
      error: errorMsg,
    } as AnalyzerAPIResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
