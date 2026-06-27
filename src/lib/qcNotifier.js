import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBS_PATH = path.resolve(__dirname, '../data/push_subscriptions.json');

function ensureDir() {
  const dir = path.dirname(SUBS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadSubscriptions() {
  try {
    ensureDir();
    if (fs.existsSync(SUBS_PATH)) {
      return JSON.parse(fs.readFileSync(SUBS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[QCNotifier] Failed to load subscriptions:', e);
  }
  return [];
}

export function saveSubscriptions(subs) {
  try {
    ensureDir();
    const tmp = `${SUBS_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(subs, null, 2));
    fs.renameSync(tmp, SUBS_PATH);
  } catch (e) {
    console.error('[QCNotifier] Failed to save subscriptions:', e);
  }
}

let vapidConfigured = false;
function configureWebPush() {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[QCNotifier] VAPID keys not configured in environment.');
    return false;
  }
  webpush.setVapidDetails(
    'mailto:alerts@dealshubindia.in',
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export class QCNotifier {
  static getPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  static subscribe(subscription) {
    if (!subscription || !subscription.endpoint) return false;
    const subs = loadSubscriptions();
    const exists = subs.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subs.push(subscription);
      saveSubscriptions(subs);
      console.log('[QCNotifier] New subscriber added. Total:', subs.length);
    }
    return true;
  }

  static unsubscribe(subscription) {
    if (!subscription || !subscription.endpoint) return false;
    const subs = loadSubscriptions();
    const filtered = subs.filter(s => s.endpoint !== subscription.endpoint);
    if (filtered.length !== subs.length) {
      saveSubscriptions(filtered);
      console.log('[QCNotifier] Subscriber removed. Total:', filtered.length);
    }
    return true;
  }

  static async postToTelegram(deal) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('[QCNotifier] TELEGRAM_BOT_TOKEN not configured in environment.');
      return;
    }

    const channelId = '@QuickCommercedeals';
    const origin = 'https://dealshubindia.in';
    const dealUrl = `${origin}/quick-commerce?deal=${deal.id || ''}`;
    
    // Format bold and sleek markdown description
    const caption = `🔥 *QC Deal: ${deal.merchant || 'Dealshub'}*\n\n` +
      `${deal.title || 'New deal available!'}\n\n` +
      `👉 *Get Deal:* [Click Here](${dealUrl})`;

    const absoluteImage = deal.image && deal.image.startsWith('/') 
      ? `${origin}${deal.image}` 
      : (deal.image || null);

    try {
      if (absoluteImage && !deal.fallbackSvg) {
        const res = await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, {
          chat_id: channelId,
          photo: absoluteImage,
          caption: caption,
          parse_mode: 'Markdown'
        });
        console.log('[QCNotifier] Deal posted to Telegram (Photo):', res.data?.ok);
      } else {
        const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: channelId,
          text: caption,
          parse_mode: 'Markdown'
        });
        console.log('[QCNotifier] Deal posted to Telegram (Text):', res.data?.ok);
      }
    } catch (err) {
      console.error('[QCNotifier] Failed to post deal to Telegram channel:', err.response?.data || err.message);
      if (absoluteImage) {
        try {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: channelId,
            text: caption + `\n\n🖼️ [Deal Image](${absoluteImage})`,
            parse_mode: 'Markdown'
          });
          console.log('[QCNotifier] Fallback text post to Telegram succeeded');
        } catch (fbErr) {
          console.error('[QCNotifier] Fallback Telegram post failed:', fbErr.response?.data || fbErr.message);
        }
      }
    }
  }

  static async sendNotificationToAll(deal) {
    // 1. Post to Telegram group
    await this.postToTelegram(deal).catch(err => {
      console.error('[QCNotifier] Telegram post failed:', err);
    });

    // 2. Send Browser Push Notifications
    if (!configureWebPush()) return;
    const subs = loadSubscriptions();
    if (subs.length === 0) return;

    console.log(`[QCNotifier] Dispatching notification to ${subs.length} subscribers for deal: ${deal.title}`);

    const origin = 'https://dealshubindia.in';
    const absoluteImage = deal.image && deal.image.startsWith('/') 
      ? `${origin}${deal.image}` 
      : (deal.image || undefined);

    const payload = JSON.stringify({
      title: `🔥 QC Deal: ${deal.merchant || 'Dealshub'}`,
      body: deal.title || 'New deal available!',
      icon: `${origin}/favicon.ico`,
      badge: `${origin}/favicon.svg`,
      image: absoluteImage,
      data: {
        url: `${origin}/quick-commerce?deal=${deal.id || ''}`
      }
    });

    const invalidEndpoints = [];
    const promises = subs.map(sub => {
      return webpush.sendNotification(sub, payload)
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            invalidEndpoints.push(sub.endpoint);
          } else {
            console.error('[QCNotifier] Push error for endpoint:', sub.endpoint, err.message);
          }
        });
    });

    await Promise.all(promises);

    if (invalidEndpoints.length > 0) {
      const remaining = subs.filter(s => !invalidEndpoints.includes(s.endpoint));
      saveSubscriptions(remaining);
      console.log(`[QCNotifier] Pruned ${invalidEndpoints.length} expired subscribers. Remaining: ${remaining.length}`);
    }
  }
}
