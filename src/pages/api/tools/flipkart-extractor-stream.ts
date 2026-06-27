import type { APIRoute } from 'astro';
import { scrapeFlipkartReviewsConcurrent } from '../../../lib/tools/flipkartReviewScraper';
import { resolveFlipkartUrl } from '../../../lib/tools/flipkartUrlResolver';

// In-Memory Rate Limiting (Simple sliding window per IP)
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 900000; // 15 mins
const MAX_REQUESTS_PER_WINDOW = 20;

export const POST: APIRoute = async ({ request }) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'global-client';
  const now = Date.now();
  const timestamps = ipRequestHistory.get(clientIP) || [];
  const activeTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Too many requests. Limit: 20 per 15 minutes.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }
  activeTimestamps.push(now);
  ipRequestHistory.set(clientIP, activeTimestamps);

  let url: string;
  let sort: string = 'helpful';

  try {
    const body = await request.json();
    url = body.url;
    sort = body.sort || 'helpful';
  } catch (e) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Invalid request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Please paste a valid Flipkart link.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl.includes('flipkart.com') && !trimmedUrl.includes('fkrt.cc')) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Invalid link. Must be a Flipkart URL (flipkart.com or fkrt.cc).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate URL can be parsed before starting the stream
  try {
    await resolveFlipkartUrl(trimmedUrl);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ type: 'error', error: e.message || 'Could not parse the Flipkart link.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (_) {
          // client disconnected, ignore
        }
      };

      try {
        const generator = scrapeFlipkartReviewsConcurrent(trimmedUrl, 10, sort);
        for await (const event of generator) {
          sendEvent(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      } catch (err: any) {
        console.error('[SSE flipkart-reviews-stream] error:', err);
        sendEvent({ type: 'error', error: err.message || 'Unexpected error during review scraping.' });
      } finally {
        try { controller.close(); } catch (_) {}
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};

