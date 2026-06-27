import { QCNotifier } from '../../lib/qcNotifier.js';

export const GET = async () => {
  const mockDeal = {
    id: `test-deal-${Date.now()}`,
    merchant: 'Blinkit',
    title: '⚡ Verification Test: Upto 94% Off Electronics Sale!',
    productName: 'Blinkit Electronics Sale starts from ₹49',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png',
    fallbackSvg: false
  };

  try {
    await QCNotifier.sendNotificationToAll(mockDeal);
    return new Response(JSON.stringify({ success: true, message: 'Test notification sent to all subscribers!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
