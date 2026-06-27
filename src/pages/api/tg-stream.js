import { dealEmitter } from '../../lib/scraper.js';
import { normalizeDeal } from '../../lib/normalizers/deals.ts';

export const GET = async ({ request }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const onNewDeals = (deals) => {
        try {
          const normalized = Array.isArray(deals)
            ? deals.map(normalizeDeal).filter(Boolean)
            : [];
          const data = `data: ${JSON.stringify(normalized)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          console.error("[SSE] Enqueue error:", e);
        }
      };

      dealEmitter.on('tg_new_deals', onNewDeals);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);

      const cleanup = () => {
        dealEmitter.off('tg_new_deals', onNewDeals);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch (e) {}
      };

      request.signal.addEventListener('abort', cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
