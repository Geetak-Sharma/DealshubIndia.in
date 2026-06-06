import { QCDataStore } from '../../lib/qcStore.js';
import { startQCScraper } from '../../lib/qcScraper.js';

// Ensure scraper is running when this route is hit
startQCScraper();

export const GET = async () => {
  try {
    const stats = QCDataStore.getStats();
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Keep stats fresh for developers/admins
      },
    });
  } catch (e) {
    console.error('[QC Stats API] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed to retrieve stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
