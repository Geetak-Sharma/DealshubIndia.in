import { QCDataStore } from '../../../lib/qcStore.js';

/**
 * Redirect endpoint for QC deal outbound links.
 * Usage: /go/qc?id=qc-dealbeetricks-12345&action=get-offer
 * 
 * Flow: record click → fetch deal URL → 302 redirect
 * Falls back to /quick-commerce if deal not found.
 */
export const GET = async ({ url }) => {
  const id     = url.searchParams.get('id')     || '';
  const action = url.searchParams.get('action') || 'get-offer';

  if (!id) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/quick-commerce' },
    });
  }

  // Track the click
  QCDataStore.incrementClick(id);

  // Resolve deal URL
  const deal = QCDataStore.getById(id);

  if (!deal || !deal.url) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/quick-commerce' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: deal.url,
      'Cache-Control': 'no-store, no-cache',
    },
  });
};
