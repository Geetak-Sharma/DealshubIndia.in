/**
 * QC Historical Import Script
 * Scrapes @dealbeetricks backwards in time, collecting up to 7 days of posts.
 * Run: node src/scripts/qc-historical-import.mjs
 *
 * Uses ?before=MSGID pagination on Telegram's public web view.
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_DIR        = path.resolve(__dirname, '../../data');
const DB_PATH         = path.resolve(DATA_DIR, 'qc_posts.json');
const CHECKPOINT_PATH = path.resolve(DATA_DIR, 'qc_checkpoint.json');
const CONFIG_PATH     = path.resolve(DATA_DIR, 'qc_config.json');

// ─── Config ───────────────────────────────────────────────────────────────────
const CHANNEL_ID    = 'dealbeetricks';
const BASE_URL      = `https://t.me/s/${CHANNEL_ID}`;
const DAYS_BACK     = 7;
const MAX_PAGES     = 30;   // safety cap — each page has ~20 posts → ~600 posts max
const DELAY_MS      = 1500; // polite delay between requests

const CUTOFF_MS = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;

// ─── QC keyword filter ────────────────────────────────────────────────────────
const QC_KEYWORDS = [
  'swiggy', 'zomato', 'blinkit', 'zepto', 'bigbasket', 'instamart',
  'eatsure', 'domino', 'kfc', 'mcdonald', 'pizza hut', 'magicpin',
  'food delivery', 'grocery', 'restaurant', 'quick commerce',
  'bb now', 'dunzo', 'grofers', 'eatclub', 'free delivery',
  'food coupon', 'cashback on food', 'order food', 'food order',
  'burger', 'biryani', 'pizza',
];

const SPAM_REGEX = [
  /join\s+(?:our\s+)?(?:channel|group)/i,
  /share\s+(?:this\s+)?with\s+(?:your\s+)?friends/i,
  /good\s+(?:morning|evening|night)/i,
  /forward\s+this/i,
];

function isQC(text)   { const l = text.toLowerCase(); return QC_KEYWORDS.some(k => l.includes(k)); }
function isSpam(text) { return SPAM_REGEX.some(r => r.test(text)); }

// ─── Merchant detector ────────────────────────────────────────────────────────
const MERCHANTS = {
  'Swiggy Instamart': { color: '#FC8019', emoji: '🛒', kw: ['instamart'] },
  'Swiggy':      { color: '#FC8019', emoji: '🧡', kw: ['swiggy'] },
  'Zomato':      { color: '#E23744', emoji: '❤️',  kw: ['zomato'] },
  'Blinkit':     { color: '#F8D531', emoji: '⚡',  kw: ['blinkit', 'grofers'] },
  'Zepto':       { color: '#8B5CF6', emoji: '💜',  kw: ['zepto'] },
  'BigBasket':   { color: '#84BE41', emoji: '🛒',  kw: ['bigbasket', 'bb now'] },
  "Domino's":    { color: '#E31837', emoji: '🍕',  kw: ["dominos", "domino's", 'domino'] },
  'KFC':         { color: '#F40000', emoji: '🍗',  kw: ['kfc'] },
  "McDonald's":  { color: '#FFC72C', emoji: '🍔',  kw: ['mcdonald', 'mcd '] },
  'Pizza Hut':   { color: '#E31937', emoji: '🍕',  kw: ['pizza hut'] },
  'EatSure':     { color: '#FF6B00', emoji: '🍱',  kw: ['eatsure'] },
  'Magicpin':    { color: '#6C3483', emoji: '✨',  kw: ['magicpin'] },
  'Paytm':       { color: '#00BAF2', emoji: '💳',  kw: ['paytm'] },
  'PhonePe':     { color: '#5F259F', emoji: '💳',  kw: ['phonepe'] },
  'Amazon Pay':  { color: '#FF9900', emoji: '💳',  kw: ['amazon pay'] },
};

function detectMerchant(text) {
  const l = text.toLowerCase();
  for (const [name, data] of Object.entries(MERCHANTS)) {
    if (data.kw.some(k => l.includes(k))) return { name, ...data };
  }
  return null;
}

function extractCoupon(text) {
  const m = text.match(/(?:use\s+code|coupon\s+code|code)[:\s]+([A-Z0-9]{3,16})/i);
  if (m) {
    const code = m[1].toUpperCase();
    if (!['THE','FOR','AND','GET','OFF','NOW','YOU','APP'].includes(code)) return code;
  }
  return null;
}

function extractDiscount(text) {
  let m = text.match(/(?:₹|rs\.?)\s*(\d[\d,]*)\s*off/i);
  if (m) return { discount: `₹${m[1]} OFF`, discountNum: parseInt(m[1].replace(/,/g,''),10) };
  m = text.match(/(\d{1,3})\s*%\s*off/i);
  if (m) { const n = parseInt(m[1],10); if(n>0&&n<=100) return { discount: `${n}% OFF`, discountNum: n }; }
  m = text.match(/up\s*to\s*(\d{1,3})\s*%/i);
  if (m) { const n = parseInt(m[1],10); if(n>0&&n<=100) return { discount: `UP TO ${n}% OFF`, discountNum: n }; }
  if (/free\s+deliver/i.test(text)) return { discount: 'FREE DELIVERY', discountNum: 0 };
  return { discount: null, discountNum: 0 };
}

function extractCashback(text) {
  const m = text.match(/(?:₹|rs\.?)\s*(\d[\d,]*)\s*cashback|(\d{1,3})\s*%\s*cashback/i);
  if (m) return m[1] ? `₹${m[1]} Cashback` : `${m[2]}% Cashback`;
  return null;
}

function extractValidity(text) {
  if (/today\s+only|only\s+today|expires?\s+today|ends?\s+today/i.test(text)) {
    const e = new Date(); e.setHours(23,59,59,999);
    return { validTill: e.toISOString(), isExpiringToday: true };
  }
  if (/limited\s+(?:period|time)/i.test(text)) {
    const e = new Date(Date.now() + 3*24*3600*1000);
    return { validTill: e.toISOString(), isExpiringToday: false };
  }
  return { validTill: null, isExpiringToday: false };
}

function makeSlug(title, ts) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'-').slice(0,60);
  return `${base}-${Math.floor(ts/1000).toString(36)}`;
}

function makeTitle(merchant, discount, coupon, text) {
  if (discount && merchant?.name) {
    if (discount === 'FREE DELIVERY') return `Free Delivery on ${merchant.name}`;
    return `Get ${discount} at ${merchant.name}${coupon ? ` – Use Code ${coupon}` : ''}`;
  }
  if (merchant?.name) return `${merchant.name} Exclusive Offer`;
  return 'Quick Commerce Offer';
}

function computeTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)    return 'Just now';
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
}

// ─── SVG Fallback (1200x630 OG dimensions) ───────────────────────────────────
function makeFallbackSVG(merchant, discount, coupon, category) {
  const accent   = merchant?.color || '#22C55E';
  const emoji    = merchant?.emoji || '🛍️';
  const name     = merchant?.name  || 'Quick Commerce';
  const discount2 = discount || 'SPECIAL OFFER';
  const tints = {
    'food-delivery':'rgba(252,128,25,0.07)',
    'grocery':'rgba(132,190,65,0.07)',
    'cashback':'rgba(0,186,242,0.07)',
    'freebies':'rgba(34,197,94,0.10)',
    'first-order':'rgba(139,92,246,0.07)',
    'bank-offers':'rgba(0,76,143,0.07)',
  };
  const tint = tints[category] || 'rgba(34,197,94,0.06)';

  function escX(s){ return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0E14"/>
      <stop offset="100%" stop-color="#131720"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="${tint}"/>
  <rect x="0" y="0" width="12" height="630" fill="${accent}"/>
  <line x1="240" y1="0" x2="240" y2="630" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>
  <line x1="480" y1="0" x2="480" y2="630" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>
  <line x1="720" y1="0" x2="720" y2="630" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>
  <line x1="960" y1="0" x2="960" y2="630" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>
  <rect x="40" y="40" width="280" height="44" rx="10" fill="rgba(34,197,94,0.08)"/>
  <text x="180" y="68" font-family="Inter,system-ui,sans-serif" font-size="20" font-weight="800" fill="#22C55E" text-anchor="middle" letter-spacing="3">DEALSHUB INDIA</text>
  <rect x="880" y="40" width="280" height="44" rx="10" fill="rgba(255,255,255,0.04)"/>
  <text x="1020" y="68" font-family="Inter,system-ui,sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.3)" text-anchor="middle" letter-spacing="2">VERIFIED OFFER</text>
  <text x="600" y="260" font-size="140" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="600" y="360" font-family="Inter,system-ui,sans-serif" font-size="32" font-weight="700" fill="rgba(255,255,255,0.75)" text-anchor="middle">${escX(name)}</text>
  <text x="600" y="440" font-family="Inter,system-ui,sans-serif" font-size="72" font-weight="900" fill="${accent}" text-anchor="middle">${escX(discount2.length > 16 ? discount2.slice(0,15)+'…' : discount2)}</text>
  ${coupon ? `
  <rect x="360" y="470" width="480" height="70" rx="35" fill="rgba(34,197,94,0.08)" stroke="${accent}" stroke-width="2" stroke-opacity="0.4"/>
  <text x="600" y="513" font-family="Courier New,monospace" font-size="28" font-weight="900" fill="${accent}" text-anchor="middle" letter-spacing="5">CODE: ${escX(coupon)}</text>` : ''}
  <text x="1180" y="618" font-family="Inter,system-ui,sans-serif" font-size="20" font-weight="400" fill="rgba(255,255,255,0.18)" text-anchor="end">dealshubindia.in</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg,'utf-8').toString('base64')}`;
}

// ─── Store helpers ────────────────────────────────────────────────────────────
function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(DB_PATH,'utf-8')); } catch {}
  }
  return { posts: [], lastUpdated: 0, totalRejected: 0, totalPublished: 0 };
}

function saveDB(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

function saveCheckpoint(lastMsgId) {
  const cp = fs.existsSync(CHECKPOINT_PATH)
    ? JSON.parse(fs.readFileSync(CHECKPOINT_PATH,'utf-8'))
    : {};
  cp[CHANNEL_ID] = { lastMsgId, savedAt: new Date().toISOString() };
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function isDuplicate(post, existing) {
  return existing.some(p =>
    p.id === post.id ||
    (p.slug && p.slug === post.slug) ||
    (p.couponCode && p.merchant === post.merchant && p.couponCode === post.couponCode &&
     Math.abs(p.timestamp - post.timestamp) < 24*3600*1000) ||
    (p.cleanUrl && p.cleanUrl === post.cleanUrl &&
     Math.abs(p.timestamp - post.timestamp) < 24*3600*1000)
  );
}

// ─── Strip affiliate params ───────────────────────────────────────────────────
function cleanUrl(raw) {
  try {
    const u = new URL(raw);
    ['ref','utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'fbclid','gclid','dealbee','dbtrk','source','tag','aff','affiliate'].forEach(k => u.searchParams.delete(k));
    for (const [k] of [...u.searchParams.entries()]) {
      if (k.startsWith('utm_') || k.startsWith('db_') || k.startsWith('aff_')) u.searchParams.delete(k);
    }
    return u.toString();
  } catch { return raw; }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Parse one Telegram page ──────────────────────────────────────────────────
function parsePage(html) {
  const $ = cheerio.load(html);
  const posts = [];
  let oldestMsgId = null;
  let oldestTs = Date.now();

  $('.tgme_widget_message').each((_, el) => {
    const $el      = $(el);
    const msgText  = $el.find('.tgme_widget_message_text').text().trim();
    if (!msgText || msgText.length < 10) return;

    // Extract msg ID
    const msgLink    = $el.find('.tgme_widget_message_date').attr('href') || '';
    const msgIdMatch = msgLink.match(/\/(\d+)$/);
    const msgId      = msgIdMatch ? msgIdMatch[1] : null;
    if (!msgId) return;

    // Extract timestamp
    const dtAttr  = $el.find('.tgme_widget_message_date time').attr('datetime');
    const timestamp = dtAttr ? new Date(dtAttr).getTime() : Date.now();

    // Track oldest
    if (timestamp < oldestTs) { oldestTs = timestamp; oldestMsgId = msgId; }

    // Image
    let image = null;
    const photoWrap = $el.find('.tgme_widget_message_photo_wrap');
    if (photoWrap.length) {
      const bgM = (photoWrap.attr('style') || '').match(/background-image:url\('([^']+)'\)/);
      if (bgM && !bgM[1].includes('Telegram_logo')) image = bgM[1];
    }

    // URLs
    const hrefs = [];
    $el.find('.tgme_widget_message_text a').each((_2, a) => {
      const h = $(a).attr('href');
      if (h && !h.includes('t.me/') && !h.includes('telegram.org') && h.startsWith('http')) hrefs.push(h);
    });

    const rawUrl = hrefs[0] || `https://t.me/s/${CHANNEL_ID}`;

    posts.push({ msgId, msgText, image, rawUrl, timestamp });
  });

  return { posts, oldestMsgId, oldestTs };
}

// ─── Main import loop ─────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🔍 QC Historical Import — Last ${DAYS_BACK} days from @${CHANNEL_ID}`);
  console.log(`   Cutoff: ${new Date(CUTOFF_MS).toLocaleString()}`);
  console.log('─'.repeat(60));

  const db = loadDB();
  const existingIds = new Set(db.posts.map(p => p.id));

  let allNew   = [];
  let pageNum  = 0;
  let beforeId = null;
  let reachedCutoff = false;

  // Stats
  let stats = { scraped: 0, rejected_spam: 0, rejected_qc: 0, duplicates: 0, published: 0 };

  while (pageNum < MAX_PAGES && !reachedCutoff) {
    const url = beforeId ? `${BASE_URL}?before=${beforeId}` : BASE_URL;
    console.log(`\n📄 Page ${pageNum + 1} — ${url}`);

    let html;
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
      html = res.data;
    } catch (e) {
      console.error(`   ❌ Fetch error: ${e.message}`);
      break;
    }

    const { posts: pagePosts, oldestMsgId, oldestTs } = parsePage(html);
    console.log(`   Found ${pagePosts.length} messages on this page`);

    if (pagePosts.length === 0) {
      console.log('   ⚠️  No posts found — stopping');
      break;
    }

    // Check if we've gone past our cutoff
    if (oldestTs < CUTOFF_MS) {
      console.log(`   ⏰ Reached ${DAYS_BACK}-day cutoff — processing this page then stopping`);
      reachedCutoff = true;
    }

    // Process each post
    for (const raw of pagePosts) {
      if (raw.timestamp < CUTOFF_MS) continue; // Skip posts older than cutoff
      stats.scraped++;

      // Spam check
      if (isSpam(raw.msgText)) { stats.rejected_spam++; continue; }

      // QC relevance check
      if (!isQC(raw.msgText)) { stats.rejected_qc++; continue; }

      const id = `qc-${CHANNEL_ID}-${raw.msgId}`;

      // Basic duplicate by ID
      if (existingIds.has(id)) { stats.duplicates++; continue; }

      // Enrich
      const merchant = detectMerchant(raw.msgText);
      const coupon   = extractCoupon(raw.msgText);
      const { discount, discountNum } = extractDiscount(raw.msgText);
      const cashback = extractCashback(raw.msgText);
      const { validTill, isExpiringToday } = extractValidity(raw.msgText);
      const { originalUrl, cleanUrl: cUrl } = (() => {
        const orig = raw.rawUrl;
        return { originalUrl: orig, cleanUrl: cleanUrl(orig) };
      })();

      const lines = raw.msgText.split('\n').filter(Boolean);
      const title = makeTitle(merchant, discount, coupon, raw.msgText);
      const slug  = makeSlug(title, raw.timestamp);

      // Detect category
      const text_l = raw.msgText.toLowerCase();
      let category = 'food-delivery';
      if (['blinkit','zepto','bigbasket','instamart','grofers','bb now'].some(k=>text_l.includes(k))) category = 'grocery';
      else if (['cashback','paytm','phonepe','amazon pay','upi'].some(k=>text_l.includes(k))) category = 'cashback';
      else if (['free food','free meal','freebie'].some(k=>text_l.includes(k))) category = 'freebies';
      else if (['new user','first order','1st order'].some(k=>text_l.includes(k))) category = 'first-order';

      const isLoot = discountNum >= 70;
      const diffMs = Date.now() - raw.timestamp;
      const mins   = Math.floor(diffMs / 60000);
      const timeAgo = mins < 1 ? 'Just now'
                    : mins < 60 ? `${mins}m ago`
                    : mins < 1440 ? `${Math.floor(mins/60)}h ago`
                    : `${Math.floor(mins/1440)}d ago`;

      // Fallback SVG (1200x630 OG safe dimensions)
      const fallbackSvg = raw.image ? null : makeFallbackSVG(merchant, discount, coupon, category);

      const post = {
        id,
        slug,
        source:          CHANNEL_ID,
        telegramMsgId:   raw.msgId,
        title,
        rawTitle:        lines[0] || '',
        merchant:        merchant?.name  || null,
        merchantColor:   merchant?.color || '#22C55E',
        merchantEmoji:   merchant?.emoji || '🛍️',
        category,
        couponCode:      coupon,
        discount,
        discountNum,
        discountPercent: discountNum,   // revenue field
        cashback,
        cashbackAmount:  cashback,      // revenue field
        finalPrice:      null,
        minOrder:        null,
        validTill,
        isExpiringToday,
        isExpired:       false,
        isLoot,
        isFreebie:       category === 'freebies',
        isFirstOrder:    category === 'first-order',
        text:            raw.msgText,
        image:           raw.image,
        hasFallbackImage: !raw.image,
        fallbackSvg,
        originalUrl,
        cleanUrl:        cUrl,
        url:             cUrl,          // Used in redirect
        clickCount:      0,
        timestamp:       raw.timestamp,
        timeAgo,
        badges:          ['LIVE', ...(isLoot ? ['🔥 LOOT'] : []), ...(coupon ? ['🎟️ COUPON'] : []), ...(cashback ? ['💰 CASHBACK'] : [])],
        aiContext:       coupon
          ? `🎟️ Verified Code: ${coupon} — apply at checkout for instant savings.`
          : discount
            ? `⚡ Smart Saver: ${discount}${merchant?.name ? ` at ${merchant.name}` : ''} — verified offer.`
            : '✨ Dealshub Verified: Confirmed quick commerce offer.',
        // Future revenue fields
        sourceChannel:   CHANNEL_ID,
        importedAt:      new Date().toISOString(),
        lastUpdatedAt:   new Date().toISOString(),
      };

      // Check duplicates against newly added posts too
      if (!isDuplicate(post, allNew)) {
        allNew.push(post);
        existingIds.add(id);
        process.stdout.write(`   ✅ ${merchant?.name || 'Unknown'} — ${discount || 'offer'} (${timeAgo})\n`);
        stats.published++;
      } else {
        stats.duplicates++;
      }
    }

    // Advance pagination
    if (!oldestMsgId) break;
    beforeId = oldestMsgId;
    pageNum++;

    if (!reachedCutoff) await delay(DELAY_MS);
  }

  // ─── Merge into DB ──────────────────────────────────────────────────────────
  console.log('\n─'.repeat(60));
  console.log('💾 Writing to database...');

  if (allNew.length > 0) {
    // Prepend new posts and sort
    db.posts = [...allNew, ...db.posts];
    db.posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    // Deduplicate final list by ID
    const seen = new Set();
    db.posts = db.posts.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

    db.lastUpdated    = Date.now();
    db.totalPublished = (db.totalPublished || 0) + allNew.length;
    saveDB(db);

    // Save checkpoint with newest message ID
    const newestMsgId = allNew[0]?.telegramMsgId;
    if (newestMsgId) saveCheckpoint(newestMsgId);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`
╔════════════════════════════════════╗
║   QC Historical Import Complete   ║
╠════════════════════════════════════╣
║  Scraped:    ${String(stats.scraped).padStart(4)}                   ║
║  Rejected (spam):  ${String(stats.rejected_spam).padStart(4)}             ║
║  Rejected (not QC):${String(stats.rejected_qc).padStart(4)}             ║
║  Duplicates: ${String(stats.duplicates).padStart(4)}                   ║
║  Published:  ${String(stats.published).padStart(4)}  ← NEW IN DB       ║
║  Total in DB:${String(db.posts.length).padStart(4)}                   ║
╚════════════════════════════════════╝

✅ Database: ${DB_PATH}
🔄 Restart dev server or hit /api/qc-search to see deals.
`);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
