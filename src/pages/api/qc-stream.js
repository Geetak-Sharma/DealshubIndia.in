import { qcDealEmitter } from '../../lib/qcScraper.js';

export const GET = async ({ request }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const onNewDeals = (deals) => {
        try {
          const payload = `data: ${JSON.stringify(deals)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          console.error('[QC SSE] Enqueue error:', e);
        }
      };

      qcDealEmitter.on('qc_new_deals', onNewDeals);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      const cleanup = () => {
        qcDealEmitter.off('qc_new_deals', onNewDeals);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* ignore */ }
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
