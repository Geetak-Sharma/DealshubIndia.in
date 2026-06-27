import { dealEmitter } from '../../lib/scraper.js';

export const GET = ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      // Send an initial connected ping
      controller.enqueue(new TextEncoder().encode(':\n\n'));

      const listener = (newDeals) => {
        try {
          const payload = JSON.stringify(newDeals);
          const data = `data: ${payload}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (err) {
          // Client likely disconnected
          cleanup();
        }
      };

      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':\n\n'));
        } catch (err) {
          cleanup();
        }
      }, 25000);

      function cleanup() {
        clearInterval(ping);
        dealEmitter.off('new_deals', listener);
        try { controller.close(); } catch (e) {}
      }

      dealEmitter.on('new_deals', listener);
      request.signal.addEventListener('abort', cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};
