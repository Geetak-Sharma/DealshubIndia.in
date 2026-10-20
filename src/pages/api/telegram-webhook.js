import { TelegramDataStore } from '../../lib/telegramStore.js';
import { dealEmitter } from '../../lib/scraper.js';
import axios from 'axios';

function detectPlatform(url) {
  if (!url) return 'Store';
  const u = url.toLowerCase();
  if (u.includes('amazon') || u.includes('amzn.to') || u.includes('amzn.in') || u.includes('amzn')) return 'Amazon';
  if (u.includes('flipkart') || u.includes('fkrt.in') || u.includes('fkrt') || u.includes('dl.flipkart')) return 'Flipkart';
  if (u.includes('myntra') || u.includes('myntr.in') || u.includes('myntr')) return 'Myntra';
  if (u.includes('ajio')) return 'Ajio';
  if (u.includes('croma')) return 'Croma';
  if (u.includes('meesho')) return 'Meesho';
  if (u.includes('nykaa')) return 'Nykaa';
  if (u.includes('jiomart')) return 'JioMart';
  if (u.includes('tatacliq')) return 'Tata CLiQ';
  return 'Store';
}

function categorizeDeal(title) {
  if (!title) return 'other';
  const t = title.toLowerCase();
  const techKeywords = ['mobile', 'laptop', 'watch', 'earbuds', 'ssd', 'keyboard', 'mouse', 'monitor', 'iphone', 'samsung', 'oneplus', 'xiaomi', 'realme', 'redmi', 'boat', 'noise', 'boult', 'sony', 'jbl', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'logitech', 'sandisk', 'tp-link', 'storage', 'magsafe', 'charger', 'powerbank', 'processor', 'ram', 'graphics card', 'gpu', 'case', 'smps', 'motherboard'];
  const fashionKeywords = ['shirt', 'shoe', 'tshirt', 'dress', 'kurta', 'jeans', 'top', 'saree', 'watch', 'bag', 'backpack', 'wallet', 'nike', 'adidas', 'puma', 'reebok', 'levis', 'flying machine', 'allen solly', 'peter england', 'louis philippe', 'van heusen', 'biba', 'only', 'vero moda', 'roadster', 'hrx', 'zara', 'h&m', 'fossil', 'titan', 'fastrack', 'casio'];
  const homeKeywords = ['home', 'kitchen', 'bottle', 'mop', 'lamp', 'curtain', 'towel', 'bedsheet', 'pillow', 'cooker', 'pan', 'prestige', 'pigeon', 'butterfly', 'bajaj', 'havells', 'macho', 'philips', 'lifelong', 'milton', 'cello', 'solimo', 'bosch', 'lg', 'whirlpool', 'haier', 'voltas', 'daikin', 'godrej', 'carpet', 'furniture', 'sofa', 'table', 'chair', 'bookshelf', 'wardrobe', 'container', 'chopper', 'grinder', 'mixer', 'induction', 'kettle'];
  
  if (techKeywords.some(k => t.includes(k))) return 'tech';
  if (fashionKeywords.some(k => t.includes(k))) return 'fashion';
  if (homeKeywords.some(k => t.includes(k))) return 'home';
  return 'other';
}

function sanitizeTitle(text) {
  if (!text) return 'Exclusive Deal';
  let clean = text.replace(/https?:\/\/[^\s]+/g, '').trim();
  clean = clean.replace(/#\w+/g, '').trim();
  clean = clean.replace(/sale\s*-/gi, '').trim();
  clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  clean = clean.replace(/\s+/g, ' ');
  return clean || 'Exclusive Deal';
}

async function getTelegramPhotoUrl(token, fileId) {
  try {
    const res = await axios.get('https://api.telegram.org/bot' + token + '/getFile?file_id=' + fileId);
    if (res.data && res.data.ok && res.data.result && res.data.result.file_path) {
      return 'https://api.telegram.org/file/bot' + token + '/' + res.data.result.file_path;
    }
  } catch (err) {
    console.error('[Telegram Webhook] Failed to fetch photo URL:', err.message);
  }
  return null;
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const post = body.channel_post || body.message;

    if (!post) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no channel_post or message' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = post.text || post.caption || '';
    if (!text && (!post.photo || post.photo.length === 0)) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no content' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rawHeadline = lines[0] || 'Exclusive Deal';
    const title = sanitizeTitle(rawHeadline);

    const urls = [...new Set(text.match(/https?:\/\/[^\s]+/g) || [])].filter(u => !u.includes('t.me/') && !u.includes('telegram.org'));
    const checkoutUrl = urls[0] || '';
    const platform = detectPlatform(checkoutUrl);

    let price = 'Check Price';
    let originalPrice = '';
    let priceNum = 0;
    let originalPriceNum = 0;
    let discount = '';

    // Match @ 1,899, @1899/-, at 1899, ₹1899, Rs. 1899
    const priceMatches = [...text.matchAll(/(?:@|at\s*|₹|Rs\.?|INR)\s*([\d,]+)/gi)];
    if (priceMatches.length > 0) {
      priceNum = parseInt(priceMatches[0][1].replace(/,/g, ''), 10);
      price = '₹' + priceNum;
      if (priceMatches.length > 1) {
        originalPriceNum = parseInt(priceMatches[1][1].replace(/,/g, ''), 10);
        if (originalPriceNum < priceNum) {
          const temp = priceNum;
          priceNum = originalPriceNum;
          originalPriceNum = temp;
          price = '₹' + priceNum;
        }
        originalPrice = '₹' + originalPriceNum;
      }
    }

    const mrpMatch = text.match(/(?:mrp|original|strike|was|regular)\s*(?::|-)?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
    if (mrpMatch && !originalPrice) {
      originalPriceNum = parseInt(mrpMatch[1].replace(/,/g, ''), 10);
      originalPrice = '₹' + originalPriceNum;
    }

    const discountMatch = text.match(/(\d{1,2})%\s*(?:off|discount)/i);
    if (discountMatch) {
      discount = discountMatch[1] + '%';
    } else if (originalPriceNum > 0 && priceNum > 0 && originalPriceNum > priceNum) {
      const discPct = Math.round(((originalPriceNum - priceNum) / originalPriceNum) * 100);
      if (discPct > 0) discount = discPct + '%';
    }

    if (!post.photo || post.photo.length === 0) {
      return new Response(JSON.stringify({ status: "ignored", reason: "deal has no photo/image" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let image = null;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (post.photo && post.photo.length > 0 && botToken) {
      const bestPhoto = post.photo[post.photo.length - 1];
      image = await getTelegramPhotoUrl(botToken, bestPhoto.file_id);
    }

    const postId = 'tg-' + (post.message_id || Date.now());
    const timestamp = (post.date ? post.date * 1000 : Date.now());
    const category = categorizeDeal(title);
    const isLoot = (discount && parseInt(discount) >= 70) || (priceNum > 0 && priceNum <= 99);

    const dealItem = {
      id: postId,
      title: title,
      text: text,
      url: checkoutUrl || (post.chat && post.chat.username ? 'https://t.me/' + post.chat.username + '/' + post.message_id : 'https://t.me/DealsHubIndiaa'),
      checkoutUrl: checkoutUrl,
      platform: platform,
      price: price,
      priceNum: priceNum,
      originalPrice: originalPrice,
      originalPriceNum: originalPriceNum,
      discount: discount,
      category: category,
      image: image || '',
      timestamp: timestamp,
      isLoot: isLoot,
      msgHtml: text.replace(/\n/g, '<br/>')
    };

    const addedCount = TelegramDataStore.upsertPosts([dealItem]);

    if (addedCount > 0) {
      dealEmitter.emit('tg_new_deals', [dealItem]);
    }

    return new Response(JSON.stringify({
      success: true,
      deal: dealItem,
      added: addedCount > 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[Telegram Webhook] Error processing post:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET = async () => {
  return new Response(JSON.stringify({
    status: 'active',
    endpoint: 'Telegram Webhook Endpoint Ready',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
