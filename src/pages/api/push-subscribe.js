import { QCNotifier } from '../../lib/qcNotifier.js';

export const GET = async () => {
  const publicKey = QCNotifier.getPublicKey();
  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export const POST = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, subscription } = body;

    if (!action || !subscription) {
      return new Response(JSON.stringify({ error: 'action and subscription are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let success = false;
    if (action === 'subscribe') {
      success = QCNotifier.subscribe(subscription);
    } else if (action === 'unsubscribe') {
      success = QCNotifier.unsubscribe(subscription);
    } else {
      return new Response(JSON.stringify({ error: 'invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[Push Subscribe API] Error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
