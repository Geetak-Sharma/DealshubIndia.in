import { QCDataStore } from '../../lib/qcStore.js';

export const POST = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { dealId, merchant, action } = body;

    if (!dealId) {
      return new Response(JSON.stringify({ error: 'dealId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = QCDataStore.incrementClick(dealId);

    return new Response(JSON.stringify({ success }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[QC Click API] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
