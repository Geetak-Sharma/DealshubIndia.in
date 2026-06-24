import axios from 'axios';
// ─── Merchant Map ─────────────────────────────────────────────────────────────
// Order matters: more specific entries first

export const MERCHANTS = {
  'Swiggy Instamart': { color: '#FC8019', emoji: '🛒', keywords: ['swiggy instamart', 'instamart'] },
  'Swiggy':           { color: '#FC8019', emoji: '🧡', keywords: ['swiggy'] },
  'Zomato':           { color: '#E23744', emoji: '❤️', keywords: ['zomato', 'zomato pro'] },
  'Blinkit':          { color: '#F8D531', emoji: '⚡', keywords: ['blinkit', 'grofers'] },
  'Zepto':            { color: '#8B5CF6', emoji: '💜', keywords: ['zepto'] },
  'BigBasket':        { color: '#84BE41', emoji: '🛒', keywords: ['bigbasket', 'bb now', 'bb express', 'big basket'] },
  "Domino's":         { color: '#E31837', emoji: '🍕', keywords: ["dominos", "domino's", "domino", "pizza dominoes"] },
  'KFC':              { color: '#F40000', emoji: '🍗', keywords: ['kfc', 'kentucky fried'] },
  "McDonald's":       { color: '#FFC72C', emoji: '🍔', keywords: ['mcdonald', 'mcdocalds', 'mc donalds', 'mcd ', 'mcd.'] },
  'Pizza Hut':        { color: '#E31937', emoji: '🍕', keywords: ['pizza hut'] },
  'EatSure':          { color: '#FF6B00', emoji: '🍱', keywords: ['eatsure', 'eat sure', 'faasos'] },
  'Magicpin':         { color: '#6C3483', emoji: '✨', keywords: ['magicpin', 'magic pin'] },
  'Paytm':            { color: '#00BAF2', emoji: '💳', keywords: ['paytm'] },
  'PhonePe':          { color: '#5F259F', emoji: '💳', keywords: ['phonepe', 'phone pe'] },
  'Amazon Pay':       { color: '#FF9900', emoji: '💳', keywords: ['amazon pay', 'amazonpay'] },
  'Mobikwik':         { color: '#A93226', emoji: '💳', keywords: ['mobikwik'] },
};

// ─── Category Map ─────────────────────────────────────────────────────────────

export const CATEGORIES = {
  'food-delivery': {
    label: 'Food Delivery',
    icon: '🍕',
    keywords: [
      'swiggy', 'zomato', 'eatsure', 'domino', 'kfc', 'mcdonald', 'pizza hut',
      'food delivery', 'order food', 'restaurant', 'eatclub', 'freshmenu',
      'burger', 'biryani', 'pizza delivery', 'food order',
    ],
  },
  'grocery': {
    label: 'Grocery',
    icon: '🛒',
    keywords: [
      'blinkit', 'zepto', 'bigbasket', 'instamart', 'grofers', 'bb now',
      'grocery', 'vegetables', 'fruits', 'daily essentials', 'household',
    ],
  },
  'cashback': {
    label: 'Cashback',
    icon: '💳',
    keywords: [
      'cashback', 'paytm', 'phonepe', 'amazon pay', 'mobikwik',
      'gpay', 'google pay', 'upi cashback', 'wallet cashback',
    ],
  },
  'freebies': {
    label: 'Freebies',
    icon: '🆓',
    keywords: [
      'free', 'freebie', 'sample', 'giveaway', 'complimentary', 'no cost',
      'zero cost', 'absolutely free', 'free food', 'free delivery',
    ],
  },
  'first-order': {
    label: 'First Order',
    icon: '🆕',
    keywords: [
      'first order', '1st order', 'new user', 'first time', 'new customer',
      'first app', 'new sign', 'first download', 'new account',
    ],
  },
  'bank-offers': {
    label: 'Bank Offers',
    icon: '🏦',
    keywords: [
      'sbi card', 'hdfc bank', 'icici bank', 'axis bank', 'kotak', 'rbl',
      'idfc', 'credit card', 'debit card', 'emi offer', 'bank offer',
      'card offer', 'card discount', 'bank cashback',
    ],
  },
};

// ─── QC Relevance & Reject Keywords ───────────────────────────────────────────

// Phrases that are safe for substring matching (multi-word, won't false-positive)
const REJECT_PHRASES = [
  'amazon shopping', 'amazon product', 'amazon deals', 'amazon offers', 'amazon loot', 'amazon prime video',
  'myntra', 'ajio', 'meesho', 'flipkart',
  // Bank card spend deals (NOT quick-commerce delivery deals)
  'hdfc credit card', 'icici credit card', 'sbi credit card', 'axis credit card',
  'credit card spend', 'debit card spend', 'credit card bill',
];

// Bank-offer subjects: title starts with a card/bank name, not a delivery platform.
// Used to reject deals like "HDFC Credit Card + 23k spends = ₹400 voucher like Swiggy"
const BANK_CARD_PRIMARY_REGEX = /^\d+%\s+off\s+on\s*-\s*(?:hdfc|icici|sbi|axis|kotak|rbl|idfc|onecard|citi|amex|yes\s*bank|au\s*bank|indusind)/i;

// ─── Spam Patterns ────────────────────────────────────────────────────────────

const SPAM_REGEXES = [
  /join\s+(?:our\s+)?(?:channel|group|community)/i,
  /(?:click|tap)\s+(?:here|below)\s+to\s+join/i,
  /share\s+(?:this\s+)?(?:with|to)\s+(?:your\s+)?friends/i,
  /forward\s+this/i,
  /subscribe\s+to\s+(?:our|the)/i,
  /(?:whatsapp|telegram)\s+(?:group|channel)\s+link/i,
  /invite\s+link/i,
  /good\s+(?:morning|evening|night|afternoon)/i,
  /^(?:happy\s+\w+[!🎉])/i,
  /all\s+the\s+best[!.]/i,
];

// ─── Public validators ────────────────────────────────────────────────────────

export function detectMerchantFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.toLowerCase();
  if (u.includes('swiggy.com/instamart') || u.includes('instamart')) return 'Swiggy Instamart';
  if (u.includes('swiggy.com') || u.includes('swiggy')) return 'Swiggy';
  if (u.includes('blinkit.com') || u.includes('blinkit') || u.includes('grofers.com') || u.includes('grofers')) return 'Blinkit';
  if (u.includes('zepto')) return 'Zepto';
  if (u.includes('bigbasket.com') || u.includes('bbnow') || u.includes('bigbasket') || u.includes('bb.com')) return 'BigBasket';
  if (u.includes('dominos.co.in') || u.includes('domino')) return "Domino's";
  if (u.includes('online.kfc.co.in') || u.includes('kfc')) return 'KFC';
  if (u.includes('mcdelivery') || u.includes('mcdonald')) return "McDonald's";
  if (u.includes('pizzahut') || u.includes('pizza hut')) return 'Pizza Hut';
  if (u.includes('eatsure')) return 'EatSure';
  if (u.includes('magicpin')) return 'Magicpin';
  return null;
}

export function isQCRelevant(text, url) {
  if (!text) return false;
  const lower = text.toLowerCase();

  // 1. Reject if it contains multi-word non-QC product phrases (safe substring match)
  if (REJECT_PHRASES.some(kw => lower.includes(kw))) {
    return false;
  }

  // 1d. Reject if the PRIMARY subject is a bank card spend deal
  if (BANK_CARD_PRIMARY_REGEX.test(text.trim())) {
    return false;
  }

  return true;
}

export function isSpam(text) {
  if (!text || text.trim().length < 10) return true;
  return SPAM_REGEXES.some(rx => rx.test(text));
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

export function detectMerchant(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [name, data] of Object.entries(MERCHANTS)) {
    if (data.keywords.some(kw => lower.includes(kw))) {
      return { name, ...data };
    }
  }
  return null;
}

export function detectCategory(text, merchantName) {
  if (!text) return 'food-delivery';
  const lower = text.toLowerCase();
  for (const [catId, catData] of Object.entries(CATEGORIES)) {
    if (catData.keywords.some(kw => lower.includes(kw))) {
      return catId;
    }
  }
  // Merchant-based fallback
  if (merchantName) {
    const foodMerchants = ['Swiggy', 'Zomato', "Domino's", 'KFC', "McDonald's", 'Pizza Hut', 'EatSure', 'Magicpin'];
    const groceryMerchants = ['Blinkit', 'Zepto', 'BigBasket', 'Swiggy Instamart'];
    const cashbackMerchants = ['Paytm', 'PhonePe', 'Amazon Pay', 'Mobikwik'];
    if (foodMerchants.includes(merchantName)) return 'food-delivery';
    if (groceryMerchants.includes(merchantName)) return 'grocery';
    if (cashbackMerchants.includes(merchantName)) return 'cashback';
  }
  return 'food-delivery';
}

export function extractCouponCode(text) {
  if (!text) return null;
  const patterns = [
    /(?:use\s+code|coupon\s+code|promo\s+code|apply\s+code|use\s+coupon|coupon)[:\s]+([A-Z0-9]{3,16})/i,
    /(?:code)[:\s]*["']([A-Z0-9]{3,16})["']?/i,
    /["']([A-Z0-9]{4,12})["'](?:\s+(?:for|to\s+get|and\s+get))/i,
    /\bcode[:\s]+([A-Z0-9]{4,14})\b/i,
  ];
  // Common English words to ignore
  const IGNORE = new Set(['THE', 'FOR', 'AND', 'GET', 'OFF', 'USE', 'NOW', 'FREE', 'YOU', 'APP', 'NEW', 'ALL']);

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const code = match[1].toUpperCase().trim();
      if (/^[A-Z0-9]{3,16}$/.test(code) && !IGNORE.has(code)) {
        return code;
      }
    }
  }
  return null;
}

export function extractDiscount(text) {
  if (!text) return { discount: null, discountNum: 0 };

  // ₹XXX off
  let m = text.match(/(?:flat\s+)?(?:₹|rs\.?)\s*(\d[\d,]*)\s*off/i);
  if (m) {
    const num = parseInt(m[1].replace(/,/g, ''), 10);
    return { discount: `₹${m[1]} OFF`, discountNum: Math.min(num, 9999) };
  }

  // XX% off
  m = text.match(/(\d{1,3})\s*%\s*(?:off|discount)/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > 0 && num <= 100) return { discount: `${num}% OFF`, discountNum: num };
  }

  // Up to XX% off
  m = text.match(/(?:up\s*to|upto)\s*(\d{1,3})\s*%/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > 0 && num <= 100) return { discount: `UP TO ${num}% OFF`, discountNum: num };
  }

  // FREE DELIVERY
  if (/free\s+deliver(?:y|ies)/i.test(text)) {
    return { discount: 'FREE DELIVERY', discountNum: 0 };
  }

  // FREE (standalone)
  if (/\bfree\s+(?:food|order|meal|item)/i.test(text)) {
    return { discount: 'FREE', discountNum: 100 };
  }

  return { discount: null, discountNum: 0 };
}

export function extractCashback(text) {
  if (!text) return null;
  let m = text.match(/(?:₹|rs\.?)\s*(\d[\d,]*)\s*cashback/i);
  if (m) return `₹${m[1]} Cashback`;
  m = text.match(/(\d{1,3})\s*%\s*cashback/i);
  if (m) return `${m[1]}% Cashback`;
  return null;
}

export function extractPrice(text) {
  if (!text) return { finalPrice: null, minOrder: null };

  // DesiDime format: "- Rs. 76Read More" or "- Rs. 36" at end of line
  const desiDimePriceM = text.match(/[-–]\s*Rs?\.?\s*(\d[\d,]*)(?:Read\s*More|Buy\s*Now|\b)/i);
  // Standard format: "at ₹36" / "for Rs. 99" / "only ₹99"
  const priceM = text.match(/(?:at|for|just|only|@)\s*(?:₹|rs\.?)\s*(\d[\d,]*)/i);
  // Min order
  const minM   = text.match(/(?:(?:orders?|cart)\s+(?:above|over|of|worth)|minimum\s+(?:order|cart)\s+of|min\.?\s+(?:order|cart)\s+of|above)\s*(?:₹|rs\.?)\s*(\d[\d,]*)/i);

  // Prefer explicit price keywords over DesiDime trailing price
  const rawPrice = priceM ? priceM[1] : (desiDimePriceM ? desiDimePriceM[1] : null);

  return {
    finalPrice: rawPrice ? `₹${rawPrice}` : null,
    minOrder:   minM   ? `₹${minM[1]}`   : null,
  };
}

export function extractValidity(text) {
  if (!text) return { validTill: null, isExpiringToday: false };

  if (/today\s+only|only\s+today|valid\s+today|expires?\s+today|ends?\s+today/i.test(text)) {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return { validTill: end.toISOString(), isExpiringToday: true };
  }
  if (/tonight|ends?\s+tonight|valid\s+(?:for\s+)?tonight/i.test(text)) {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return { validTill: end.toISOString(), isExpiringToday: true };
  }
  if (/24\s*hours?\s*only|next\s*24\s*hours?/i.test(text)) {
    const end = new Date(Date.now() + 24 * 3600 * 1000);
    return { validTill: end.toISOString(), isExpiringToday: false };
  }
  if (/limited\s+(?:period|time|offer)/i.test(text)) {
    const end = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    return { validTill: end.toISOString(), isExpiringToday: false };
  }

  const dateM = text.match(/valid\s+(?:till|until|upto)\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i);
  if (dateM) {
    const day = parseInt(dateM[1], 10);
    const mon = parseInt(dateM[2], 10) - 1;
    const yr  = dateM[3] ? (dateM[3].length === 2 ? 2000 + parseInt(dateM[3], 10) : parseInt(dateM[3], 10)) : new Date().getFullYear();
    const d   = new Date(yr, mon, day, 23, 59, 59);
    if (!isNaN(d.getTime())) {
      return { validTill: d.toISOString(), isExpiringToday: d.toDateString() === new Date().toDateString() };
    }
  }
  return { validTill: null, isExpiringToday: false };
}

// ─── SEO Title & Slug ─────────────────────────────────────────────────────────

// Extracts clean product name from DesiDime's structured format:
// "{N}% off on - {Merchant} - {Product} - Rs. {Price}Read More..."
function extractDesiDimeProduct(text) {
  // Broad pattern: "{N}% off on - {anything} - {Product segment}"
  // The product is ALWAYS the part after the SECOND ' - ' and before '- Rs.' / 'Read More' / end
  const m = text.match(
    /^\d+%\s+off\s+on\s*-\s*.+?\s*-\s*(.+?)(?:\s*-\s*Rs?\.?\s*\d[\d,]*(?:Read\s*More)?|\s*Read\s*More|\s*Buy\s*Now|https?:\/\/|\s*$)/i
  );
  if (m && m[1]) {
    let prod = m[1].trim();
    // Strip any trailing ' on {MerchantName}' appended by DesiDime
    prod = prod.replace(/\s+on\s+\w[\w\s'&-]{1,30}$/i, '').trim();
    if (prod.length > 2) return prod;
  }
  return null;
}

// Cleans any remaining noise from a title segment
function stripTrailingNoise(text) {
  return text
    .replace(/\s*Read\s*More\b.*/i, '')
    .replace(/\s*Buy\s*Now\b.*/i, '')
    .replace(/\s*https?:\/\/\S+/gi, '')
    .replace(/\s*[-@]\s*Rs?\.?\s*\d[\d,]*\s*$/i, '')
    .replace(/\s*\|.*/i, '')  // truncate at pipe
    .trim();
}

export function cleanProductTitle(rawTitle, fullText, merchantName) {
  let textToParse = rawTitle || '';
  
  // Strip DesiDime truncation marker early
  textToParse = textToParse.replace(/\.\.\.read\s+more/gi, '');
  textToParse = textToParse.replace(/\s*read\s+more\s*$/gi, '');

  // Try DesiDime product extraction first, before any other parsing
  const desiDimeProduct = extractDesiDimeProduct(textToParse);
  if (desiDimeProduct && !/^Rs?\.?\s*\d/i.test(desiDimeProduct)) {
    // Valid product segment extracted — clean up parenthetical discount and use it
    textToParse = desiDimeProduct
      .replace(/\s*\(\d+%\s+OFF\)\s*$/i, '')  // Remove trailing "(90% OFF)" text
      .trim();
  } else if (/^\d+%\s+off\s+on\s*-/i.test(textToParse)) {
    // DesiDime format but regex failed to extract cleanly — strip the prefix pattern
    // "{N}% off on - {Merchant} - {Product}..." -> strip "{N}% off on - " prefix
    // Then strip first " - " delimited segment (merchant name) to leave product
    const stripped = textToParse.replace(/^\d+%\s+off\s+on\s*-\s*/i, '').trim();
    // Only strip merchant prefix if there's a clear " - " separator
    const dashIdx = stripped.indexOf(' - ');
    if (dashIdx > 0 && dashIdx < 40) {
      textToParse = stripped.slice(dashIdx + 3).trim() || stripped;
    } else {
      textToParse = stripped;
    }
  } else if (!textToParse || textToParse.length < 10 || /^loot$|^search$/i.test(textToParse.trim())) {
    const lines = (fullText || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      textToParse = lines[0];
    }
  }
  
  let cleaned = textToParse.trim();
  
  // 1. Strip raw URLs and trailing junk
  cleaned = stripTrailingNoise(cleaned);
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
  
  // Strip inline discount details so they don't leak into the product name segment
  cleaned = cleaned.replace(/\s*\b\d+%\s*(?:off|discount)\b/gi, '');
  cleaned = cleaned.replace(/\s*\b(?:flat|upto|up\s+to)\s*(?:₹|rs\.?)?\s*\d+\s*(?:off)?\b/gi, '');
  
  // 2. Recursively strip merchant names, forwarded prefixes, loot/search prefix words, and punctuation/emojis
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/^(?:fwd:|fwd|forwarded:|flat|Swiggy\s+Instamart|Swiggy|Instamart|Zomato|Zepto|Blinkit|BigBasket|Domino's|Dominos|KFC|McDonald's|McD|Pizza\s+Hut|EatSure|Magicpin|Paytm|PhonePe|Loot|LOOT|Search|Deals?|Offers?|Coupon|Promo|LootSearch|fast|official|tricks|DesiDime|Dime)\b\s*/i, '');
    cleaned = cleaned.replace(/^[:\- \t\s*★🔥⚡️📍📢🚨❗❌✨🎉🎁💰📣🎨🛍️🍟🍕🛒🍗🍔🍱✨!?()[\]#]+/i, '');
  } while (cleaned !== prev);

  // 3. Split at common separators to capture core product name
  const stopKeywords = [
    /\s+at\s+(?:Rs\.?|₹)\s*\d/i,
    /\s+for\s+just\s/i,
    /\s+just\s+(?:Rs\.?|₹)/i,
    /@\s*(?:Rs\.?|₹)?\s*\d/i,
    /\s+check\s+for\b/i,
    // "Then Click" or "ThenClick" (glued words like "KetchupThen Click")
    /Then\s*Click/i,
    /\s+then\s*click\b/i,
    /\s+click\s+here\b/i,
    /\s+click\s+to\b/i,
    /\s+sort\s+by\b/i,
    /\s+available\s+in\b/i,
    /https?:/i,
    /\s+amazon\s+at\b/i,
    /\s+selected\s+location/i,
    /\s+limited\s+location/i,
    /\s+-\s+Rs?\.?\s*\d/i,
    /\s*\|/,           // pipe separator
  ];
  
  for (const rx of stopKeywords) {
    const idx = cleaned.search(rx);
    if (idx > 2) {
      cleaned = cleaned.slice(0, idx).trim();
    }
  }
  
  // 3b. Recursively strip trailing stop words and punctuation/emojis
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/\b(?:then|click|here|link|to|now|sort|by|pincode|pincodes|location|locations|variant|variants|online|search|loot|offer|offers|deal|deals)\b\s*$/i, '');
    cleaned = cleaned.replace(/[:\-,\s*\u2605\ud83d\udd25\u26a1\ufe0f\ud83d\udccd\ud83d\udce2\ud83d\udea8\u2757\u274c\u2728\ud83c\udf89\ud83c\udf81\ud83d\udcb0\ud83d\udce3\ud83c\udfa8\ud83d\udecd\ufe0f\ud83c\udf5f\ud83c\udf55\ud83d\uded2\ud83c\udf57\ud83c\udf54\ud83c\udf71\u2728!?()[\]#]+$/, '');
  } while (cleaned !== prev);
  // Fix unclosed parenthesis — remove trailing open-paren and text if unmatched
  {
    const opens = (cleaned.match(/\(/g) || []).length;
    const closes = (cleaned.match(/\)/g) || []).length;
    if (opens > closes) {
      cleaned = cleaned.replace(/\s*\([^)]*$/, '').trim();
    }
  }
  
  // 4. Title-case formatting
  cleaned = cleaned.split(' ')
    .map(w => {
      if (!w) return '';
      if (/^[A-Z0-9]+$/.test(w) && w.length > 2) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
    
  if (!cleaned || cleaned.toLowerCase() === 'loot' || cleaned.toLowerCase() === 'search' || cleaned.toLowerCase() === 'special offer' || cleaned.toLowerCase() === 'grab' || /^(?:at|for|just|@)\s*(?:₹|rs\.?)\b/i.test(cleaned.trim())) {
    return '';
  }
  
  return cleaned;
}

export function cleanRawTitle(rawTitle) {
  return cleanProductTitle(rawTitle, '', '');
}

export function getStrongestOffer(post) {
  if (post.discount && post.discount.includes('%')) {
    return post.discount;
  }
  if (post.finalPrice) {
    return post.finalPrice;
  }
  if (post.discount) {
    return post.discount;
  }
  if (post.cashback) {
    return post.cashback;
  }
  if (post.couponCode) {
    return `CODE: ${post.couponCode}`;
  }
  return 'OFFER';
}

export function generateSEOTitle(rawTitle, merchant, discount, couponCode, text) {
  let productName = cleanProductTitle(rawTitle, text, merchant);
  
  if (merchant) {
    const onMerchantPattern = new RegExp(`\\s+on\\s+${merchant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    productName = productName.replace(onMerchantPattern, '').trim();
  }

  const priceM = (text || '').match(/(?:at|for|just|only|@)\s*(?:₹|rs\.?)\s*(\d[\d,]*)/i);
  const finalPrice = priceM ? `₹${priceM[1]}` : null;
  
  let title = '';
  const isFree = productName.toLowerCase().includes('free') || (discount && discount.toLowerCase().includes('free'));
  
  if (finalPrice && merchant) {
    title = `${productName} at ${finalPrice} on ${merchant}`;
  } else if (isFree && merchant) {
    title = `${productName} Offer on ${merchant}`;
  } else if (discount && merchant) {
    title = `${productName} at ${discount} on ${merchant}`;
  } else if (merchant) {
    title = `${productName} Offer on ${merchant}`;
  } else {
    title = productName;
  }
  
  // Cleanup formatting and trim
  title = title.trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  if (title.length > 80) {
    title = title.slice(0, 77).trim() + '...';
  }
  return title;
}

export function generateSlug(seoTitle, timestamp) {
  const base = seoTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 65);
  const suffix = Math.floor((timestamp || Date.now()) / 1000).toString(36);
  return `${base}-${suffix}`;
}

// ─── Badges & AI Context ──────────────────────────────────────────────────────

export function generateBadges(post) {
  const badges = ['LIVE'];
  if (post.isLoot)          badges.push('🔥 LOOT');
  if (post.couponCode)      badges.push('🎟️ COUPON');
  if (post.cashback)        badges.push('💰 CASHBACK');
  if (post.isExpiringToday) badges.push('⏰ TODAY ONLY');
  if (post.category === 'freebies')     badges.push('🆓 FREE');
  if (post.category === 'first-order')  badges.push('🆕 NEW USER');
  if (post.category === 'bank-offers')  badges.push('🏦 BANK DEAL');
  return badges;
}

export function generateAIContext(post) {
  const { merchant, discount, discountNum, category, cashback, couponCode } = post;
  if (category === 'freebies')     return '🆓 Freebie Alert: Grab this completely free offer before it expires!';
  if (category === 'first-order')  return '🆕 New User Bonus: First-order exclusive — max savings for new accounts.';
  if (discountNum >= 80)           return `🔥 Deep Discount: ${merchant || 'This deal'} rarely drops this low — act fast!`;
  if (cashback && merchant)        return `💰 Cashback King: ${cashback} back on your ${merchant} order — instant money back.`;
  if (couponCode)                  return `🎟️ Verified Code: Apply ${couponCode} at checkout for confirmed instant savings.`;
  if (discount === 'FREE DELIVERY') return '🚀 Zero Delivery Fee: Free delivery offer verified — no min order required.';
  if (discount)                    return `⚡ Smart Saver: ${discount}${merchant ? ` at ${merchant}` : ''} — verified and ready to claim.`;
  return '✨ Auto Imported: Hand-checked quick commerce offer with confirmed discount.';
}

export function calculateQualityScore(post, text) {
  let score = 0;
  if (post.merchant) score += 30;
  if (post.couponCode) score += 25;
  if (post.discount || post.finalPrice) score += 20;
  if (post.url && !post.url.includes('t.me') && !post.url.includes('telegram.org')) score += 15;
  
  const lower = (text || '').toLowerCase();
  const catKeywords = ['code', 'coupon', 'off', 'free', 'cashback', 'delivery', 'order', 'first', 'discount'];
  if (catKeywords.some(kw => lower.includes(kw))) {
    score += 10;
  }
  return score;
}

export function generateSEOKeywords(merchant, category) {
  if (!merchant) return [];
  const m = merchant.trim();
  const keywords = [
    `${m.toLowerCase()} coupon`,
    `${m.toLowerCase()} offer`,
    `${m.toLowerCase()} discount code`,
    `${m.toLowerCase()} promo code`,
    `${m.toLowerCase()} deals`
  ];
  if (category === 'grocery') {
    keywords.push(`${m.toLowerCase()} grocery`, `${m.toLowerCase()} instamart`, `grocery online ${m.toLowerCase()}`);
  } else if (category === 'food-delivery') {
    keywords.push(`${m.toLowerCase()} food delivery`, `${m.toLowerCase()} online food order`, `order food from ${m.toLowerCase()}`);
  } else if (category === 'cashback') {
    keywords.push(`${m.toLowerCase()} cashback`, `${m.toLowerCase()} wallet offer`);
  }
  return keywords;
}

// ─── Main Enrichment Entry Point ──────────────────────────────────────────────


// ─── Gemini AI & Ingestion Helpers ───────────────────────────────────────────

async function callNvidiaAPI(text, regexMerchant) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  const parts = [
    'You are a Quick Commerce Deal Extractor for Indian apps.',
    'Analyze the deal post and return ONLY valid JSON with no extra text.',
    '',
    'Text: ' + JSON.stringify(text || ''),
    'Merchant hint: ' + (regexMerchant || 'None'),
    '',
    'Allowed merchants: Swiggy, Swiggy Instamart, Blinkit, Zepto, Zomato, BigBasket, Dominos, KFC, McDonalds, Pizza Hut, Magicpin, Amazon Fresh, Flipkart Minutes.',
    'Set confidence 0 if merchant not in list.',
    'Allow all product types on listed QC platforms.',
    'Reject Myntra, Ajio, Meesho, standard Amazon, Flipkart, loans, insurance.',
    '',
    'Return JSON with keys: productName, merchant, price (can be text like \"Upto 50% Off\"), discount (nullable), originalPrice (nullable), minimumOrderValue (nullable), bankOffer (nullable, ignore generic footers), couponCode (nullable), category, confidence (integer 0-100), dealExplanation (short 2-line explanation), verdictTier (MUST_BUY, GOOD_DEAL, or SKIP), whatsappShareText, twitterShareText.'
  ];
  const prompt = parts.join('\n');
  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'meta/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      },
      {
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        timeout: 35000
      }
    );
    const cnt = response.data.choices[0].message.content;
    if (!cnt) throw new Error('Empty NVIDIA response');
    const parsed = JSON.parse(cnt.trim());
    parsed._aiSource = 'nvidia-llama-3.3-70b';
    return parsed;
  } catch (err) {
    console.error('[NVIDIA-API-ERROR]', err.message);
    return null;
  }
}

async function callAI(text, regexMerchant) {
  const nv = await callNvidiaAPI(text, regexMerchant);
  if (nv) { console.log('[AI] NVIDIA ok conf:' + nv.confidence); return nv; }
  console.warn('[AI] NVIDIA failed, using Gemini');
  return callGeminiAPI(text, regexMerchant);
}

async function callGeminiAPI(text, regexMerchant) {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDLGBRs4tveXVzQWqgvvQbr48LrEBpcWzk';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `
You are an expert Quick Commerce Deal Extractor. Your task is to analyze the following Telegram deal post and extract the product details.

Input:
- Telegram text: "${text.replace(/"/g, '\\"')}"
- Merchant detected by rules: "${regexMerchant || 'None'}"

Allowed Quick Commerce merchants are: Swiggy, Swiggy Instamart, Blinkit, Zepto, Zomato, BigBasket, Domino's, KFC, McDonald's, Pizza Hut, Magicpin.
If the merchant is one of these allowed merchants, ALLOW the deal regardless of the product category (even if it is electronics, fashion, or home appliances).
If the merchant is NOT one of these, set confidence to 0. Specifically reject deals from marketplaces (flipkart, amazon shopping, myntra, ajio, meesho), credit cards, loan promotions, insurance.

Your output MUST be a strict JSON object matching this schema (do NOT wrap in markdown or return anything else):
{
  "productName": "Clean Title-Cased Product Name (e.g. 'Del Monte Tomato Ketchup' or 'Amul Butter'). Never use generic text like 'Check Yours' or 'Sort by'. Max 40 chars.",
  "merchant": "One of the allowed merchant names",
  "price": "Final deal price in INR (integer or numeric string, e.g. '37')",
  "discount": "Discount percentage or amount (e.g. '82% off' or 'flat 100 off'). Null if missing.",
  "originalPrice": "Original MRP price as integer. Null if missing.",
  "minimumOrderValue": "Min order value needed for deal. Null if missing.",
  "bankOffer": "Specific bank/card offer tied to this product. IGNORE generic footers like '5% cashback on all transactions'. Null if missing.",
  "couponCode": "Coupon code if any, else null",
  "category": "grocery" | "food-delivery",
  "confidence": 0-100, // Set to high confidence if it's an allowed merchant. Set to 0 if it's a non-QC marketplace (Amazon, Flipkart, Myntra, etc) or spam.
  "dealExplanation": "A short, 2-line explanation of why it is a good deal (e.g., 'Lowest price since Diwali sale' or 'Slashed by 50% with free delivery'). Max 15 words."
}
`;

  try {
    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      throw new Error("Empty response from Gemini API");
    }
    
    return JSON.parse(contentText.trim());
  } catch (error) {
    console.error("[GEMINI-API-ERROR]", error.message);
    return null;
  }
}

function getMRP(priceNum, discountText, fullText) {
  let mrp = 0;
  const mrpMatch = fullText.match(/(?:mrp|original price|strike price|price|worth|rs\.?|₹)[:\s]+(?:₹|rs\.?)?\s*(\d[\d,]*)/i);
  if (mrpMatch) {
    mrp = parseInt(mrpMatch[1].replace(/,/g, ''));
  }
  
  if (mrp <= priceNum) {
    const pctMatch = (discountText || '').match(/(\d+)%/);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1]);
      if (pct > 0 && pct < 100) {
        mrp = Math.round((priceNum * 100) / (100 - pct));
      }
    }
  }
  return mrp || priceNum;
}

function getDiscountPercent(priceNum, mrpNum, discountText) {
  if (mrpNum > priceNum && mrpNum > 0) {
    return Math.round(((mrpNum - priceNum) / mrpNum) * 100);
  }
  const pctMatch = (discountText || '').match(/(\d+)%/);
  if (pctMatch) {
    return parseInt(pctMatch[1]);
  }
  return 0;
}
export async function enrichQCPost(rawPost) {
  if (!rawPost) return null;
  const { text = '', title: rawTitle = '', image, url, timestamp, id, source } = rawPost;
  const fullText = `${rawTitle}\n${text}`.trim();

  // Quality gates: Spam filter first
  if (isSpam(fullText)) {
    console.log(`[SPAM-REJECT] Rejected spam post: ${id}`);
    return null;
  }
  if (fullText.length < 15) {
    console.log(`[SHORT-REJECT] Rejected too short post: ${id}`);
    return null;
  }

  // Pre-filter reject keywords (Step 1)
  const lowerText = fullText.toLowerCase();
  const rejectKeywords = [
    'myntra', 'ajio', 'meesho', 'amazon shopping', 'flipkart',
    'credit card promotions', 'credit card promotion', 'insurance', 'loan offer', 'loan offers', 'trading', 'crypto'
  ];
  if (rejectKeywords.some(kw => lowerText.includes(kw))) {
    console.log(`[PRE-FILTER-REJECT] Rejected non-QC post: ${id}`);
    return null;
  }

  // Detect merchant via rules (text or URL)
  const merchantData = detectMerchant(fullText);
  const regexMerchant = merchantData?.name || detectMerchantFromUrl(url) || null;

  // Strict QC Merchant filter (only allow explicitly allowed merchants)
  const allowedQC = ['Swiggy Instamart', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'BigBasket', "Domino's", 'KFC', "McDonald's", 'Pizza Hut', 'Magicpin'];
  if (regexMerchant && !allowedQC.includes(regexMerchant)) {
    console.log(`[MERCHANT-REJECT] Rejected forbidden merchant ${regexMerchant}: ${id}`);
    return null;
  }

  // Parse fields via rules
  const category = detectCategory(fullText, regexMerchant);
  const couponCode = extractCouponCode(fullText);
  const { discount, discountNum } = extractDiscount(fullText);
  const cashback = extractCashback(fullText);
  const { finalPrice, minOrder } = extractPrice(fullText);
  const { validTill, isExpiringToday } = extractValidity(fullText);
  const productName = cleanProductTitle(rawTitle, fullText, regexMerchant);

  // Estimate product name confidence score for regex extraction
  const regexProductNameConfidence = productName ? 
    ((productName.length >= 8 && !/loot|deals?|fast|free|rs|off/i.test(productName.toLowerCase())) ? 85 : 50) 
    : 0;

  // Compute title quality score
  const tempPostForScore = { merchant: regexMerchant, couponCode, discount, finalPrice, url };
  const qualityScore = calculateQualityScore(tempPostForScore, fullText);

  // Determine if we need AI fallback
  const useAI = true; // Always use AI to generate 2-line deal explanations

  let finalMerchant = regexMerchant;
  let finalProductName = productName;
  let finalPriceVal = finalPrice;
  let finalDiscount = discount;
  let finalCouponCode = couponCode;
  let finalCategory = category;
  let finalConfidence = 100;
  let aiVersion = null;
  let finalExplanation = '';
  let finalVerdictTier = 'GOOD_DEAL';
  let finalWhatsappShareText = '';
  let finalTwitterShareText = '';

  if (useAI) {
    const aiResult = await callAI(fullText, regexMerchant);
    if (aiResult) {
      finalConfidence = aiResult.confidence || 0;
      finalExplanation = aiResult.dealExplanation || '';
      finalVerdictTier = aiResult.verdictTier || 'GOOD_DEAL';
      finalWhatsappShareText = aiResult.whatsappShareText || '';
      finalTwitterShareText = aiResult.twitterShareText || '';
      const isSearchLoot = /search\s*:/i.test(fullText) || /loot/i.test(fullText);
      if (isSearchLoot) {
        finalConfidence = Math.max(finalConfidence, 85);
      }
      if (finalConfidence < 70) {
        console.log(`[AI-REJECT] Rejected deal due to low confidence (${finalConfidence} < 70) for post ${id}`);
        return null;
      }

      // AI should never overwrite high-confidence regex results
      if (!finalMerchant && aiResult.merchant && allowedQC.includes(aiResult.merchant)) {
        finalMerchant = aiResult.merchant;
      } else if (!finalMerchant) {
        console.log(`[AI-REJECT] Invalid merchant ${aiResult.merchant} for post ${id}`);
        return null;
      }

      if (!finalPriceVal && aiResult.price) {
        // Removed numeric stripping
        if (cleanPrice) finalPriceVal = `₹${cleanPrice}`;
      }

      if (regexProductNameConfidence < 80 && aiResult.productName) {
        finalProductName = aiResult.productName;
      }

      if (!finalDiscount && aiResult.discount) {
        finalDiscount = aiResult.discount;
      }

      if (!finalCouponCode && aiResult.couponCode) {
        finalCouponCode = aiResult.couponCode || null;
      }

      if (aiResult.category) {
        finalCategory = aiResult.category;
      }
      aiVersion = (aiResult && aiResult._aiSource) || 'gemini-2.5-flash';
    } else {
      // If AI fails and we are missing critical fields, reject
      if (!finalMerchant || !finalProductName || (!finalPriceVal && !finalDiscount && !(aiResult && aiResult.bankOffer))) {
        const isSearchLoot = /search\s*:/i.test(fullText) || /loot/i.test(fullText);
        if (isSearchLoot && finalMerchant && finalProductName) {
          // Allow missing price
        } else {
          console.log(`[AI-FAIL-REJECT] AI failed and missing critical fields for post ${id}`);
          return null;
        }
      }
    }
  }

  // Reject garbage product titles
  const lowerProd = (finalProductName || '').toLowerCase();
  const garbageKeywords = ['sort by discount', 'high to low', 'click here', 'check availability', 'search first', 'check yours'];
  if (garbageKeywords.some(pat => lowerProd.includes(pat))) {
    console.log(`[GARBAGE-REJECT] Rejected garbage title: "${finalProductName}"`);
    return null;
  }

  const cleanPriceNum = finalPriceVal ? parseInt(finalPriceVal.replace(/[^0-9]/g, '')) : 0;
  if (!cleanPriceNum) {
    const isSearchLoot = /search\s*:/i.test(fullText) || /loot/i.test(fullText);
    const hasDiscountOrCoupon = finalDiscount || finalCouponCode;
    if (isSearchLoot || hasDiscountOrCoupon) {
      finalPriceVal = null;
    } else {
      console.log(`[PRICE-REJECT] Price missing/zero for post ${id}`);
      return null;
    }
  }

  // Enforce Title Generation V2: [Product] at ₹[Price] on [Merchant]
  let cleanProdForTitle = finalProductName || '';
  if (finalMerchant) {
    const onMerchantPattern = new RegExp(`\\s+on\\s+${finalMerchant.replace(/[-\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}\\s*$`, 'i');
    cleanProdForTitle = cleanProdForTitle.replace(onMerchantPattern, '').trim();
  }
  // Strip any trailing price/merchant suffixes that might be present
  cleanProdForTitle = cleanProdForTitle.replace(/\s+(?:at|for|just|@)\s*(?:Rs\.?|₹)?\s*\d+\s*$/i, '').trim();

  const suffix = cleanPriceNum ? ` at ₹${cleanPriceNum} on ${finalMerchant}` : ` on ${finalMerchant}`;
  if (cleanProdForTitle.length + suffix.length > 80) {
    cleanProdForTitle = cleanProdForTitle.slice(0, 80 - suffix.length - 3).trim() + '...';
  }
  const seoTitle = cleanProdForTitle + suffix;
  const shortTitle = cleanPriceNum ? `${cleanProdForTitle.slice(0, 30)} ₹${cleanPriceNum}` : `${cleanProdForTitle.slice(0, 30)}`;

  const slug = generateSlug(seoTitle, timestamp || Date.now());

  const finalMrp = getMRP(cleanPriceNum, finalDiscount, fullText);
  const finalDiscountPct = getDiscountPercent(cleanPriceNum, finalMrp, finalDiscount);

  const isLoot = finalDiscountPct >= 70 || (finalDiscount && finalDiscount.toUpperCase().includes('FREE') && finalCategory !== 'freebies');

  // Compute timeAgo
  const diffMs = Date.now() - (timestamp || Date.now());
  const mins   = Math.max(0, Math.floor(diffMs / 60000));
  let timeAgo  = 'Just now';
  if (mins >= 1 && mins < 60)   timeAgo = `${mins}m ago`;
  else if (mins < 1440)         timeAgo = `${Math.floor(mins / 60)}h ago`;
  else if (mins >= 1440)        timeAgo = `${Math.floor(mins / 1440)}d ago`;

  const post = {
    id,
    slug,
    source:         source || 'dealbeetricks',
    title:          seoTitle,
    rawTitle,
    productName:    finalProductName,
    merchant:       finalMerchant,
    merchantColor:  MERCHANTS[finalMerchant]?.color || '#22C55E',
    merchantEmoji:  MERCHANTS[finalMerchant]?.emoji || '🛍️',
    category:       finalCategory,
    couponCode:     finalCouponCode,
    discount:       finalDiscount,
    discountNum:    finalDiscount ? parseInt(finalDiscount.replace(/[^0-9]/g, '')) || 0 : 0,
    cashback,
    finalPrice:     finalPriceVal,
    minOrder,
    validTill,
    isExpiringToday,
    isExpired:      false,
    isLoot,
    isFreebie:      finalCategory === 'freebies',
    isFirstOrder:   finalCategory === 'first-order',
    text,
    image:          image || null,
    hasFallbackImage: !image,
    fallbackSvg:    null,
    url:            url || '',
    destinationType: 'merchant-url',
    routingQualityScore: 100,
    clickCount:     0,
    shareCount:     0,
    viewCount:      0,
    timestamp:      timestamp || Date.now(),
    timeAgo,
    badges:         [],
    aiContext:      '',
    explanation:    finalExplanation || '',
    verdictTier:    finalVerdictTier,
    whatsappShareText: finalWhatsappShareText,
    twitterShareText: finalTwitterShareText,
    // Step 9 fields
    price:          cleanPriceNum,
    mrp:            finalMrp,
    discountPercent: finalDiscountPct,
    seoTitle,
    shortTitle,
    confidence:     finalConfidence,
    finalUrl:       url || '',
    imageQuality:   image ? 'clean' : 'generic',
    aiVersion,
  };

  post.qualityScore = calculateQualityScore(post, fullText);
  post.strongestOffer = getStrongestOffer(post);
  post.seoKeywords = generateSEOKeywords(finalMerchant, finalCategory);
  post.badges = generateBadges(post);

  return post;
}








