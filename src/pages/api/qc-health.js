import { QCDataStore } from '../../lib/qcStore.js';

export const GET = async () => {
  const stats = QCDataStore.getStats();
  const db = QCDataStore.load();
  
  const visible = db.posts.filter(p => !p.isExpired).length;
  const hidden = db.posts.filter(p => p.isExpired).length;
  
  const scanned = Object.values(stats.sourceMetrics || {}).reduce((acc, m) => acc + (m.scanned || 0), 0);
  const accepted = Object.values(stats.sourceMetrics || {}).reduce((acc, m) => acc + (m.accepted || 0), 0);
  const rejected = Math.max(0, scanned - accepted);
  
  const body = {
    scanned,
    accepted,
    rejected,
    visible,
    hidden,
    sourceMetrics: stats.sourceMetrics || {},
    rejectionReasons: {
      "non-food-or-low-quality": rejected,
      "duplicates-and-spam": stats.totalRejected || 0
    }
  };

  // Failsafe Warning Log
  if (visible < 10) {
    console.warn(`[QC-WARNING] Low inventory alert! Only ${visible} deals visible in Quick Commerce feed.`);
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache'
    }
  });
};
