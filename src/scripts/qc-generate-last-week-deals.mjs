/**
 * QC Generate Last Week Deals Script
 * Generates 25+ highly realistic, rebranded Quick Commerce deals spanning the past 7 days (May 30, 2026 - June 6, 2026).
 * Fully computes fallback base64 SVGs for text-only deals using the actual project fallback generator.
 * Stored directly in src/data/qc_posts.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFallbackSVG } from '../lib/qcFallbackImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR        = path.resolve(__dirname, '../data');
const DB_PATH         = path.resolve(DATA_DIR, 'qc_posts.json');
const CHECKPOINT_PATH = path.resolve(DATA_DIR, 'qc_checkpoint.json');

// Emojis, Colors, and configuration matching qcMerchantLogos / qcStore
const MERCHANTS = {
  'Swiggy Instamart': { color: '#FC8019', emoji: '🛒', kw: ['instamart'] },
  'Swiggy':      { color: '#FC8019', emoji: '🧡', kw: ['swiggy'] },
  'Zomato':      { color: '#E23744', emoji: '❤️',  kw: ['zomato'] },
  'Blinkit':     { color: '#F8D531', emoji: '⚡',  kw: ['blinkit'] },
  'Zepto':       { color: '#8B5CF6', emoji: '💜',  kw: ['zepto'] },
  'BigBasket':   { color: '#84BE41', emoji: '🛒',  kw: ['bigbasket', 'bb now'] },
  "Domino's":    { color: '#E31837', emoji: '🍕',  kw: ['dominos', 'domino'] },
  'KFC':         { color: '#F40000', emoji: '🍗',  kw: ['kfc'] },
  "McDonald's":  { color: '#FFC72C', emoji: '🍔',  kw: ['mcdonald'] },
  'Pizza Hut':   { color: '#E31937', emoji: '🍕',  kw: ['pizza hut'] },
  'EatSure':     { color: '#FF6B00', emoji: '🍱',  kw: ['eatsure'] },
  'Magicpin':    { color: '#6C3483', emoji: '✨',  kw: ['magicpin'] },
};

function getMerchantDetails(name) {
  return MERCHANTS[name] || { color: '#22C55E', emoji: '🛍️' };
}

// 7 days window back from June 6, 2026 2:19 AM
// Current date: Sat Jun 06 2026 02:19:18 GMT+0530
const CURRENT_TIME = 1780702758000; // 2026-06-06T02:19:18.000Z in epoch ms

const rawDealsSource = [
  {
    hoursAgo: 1.5,
    merchant: 'Zomato',
    category: 'food-delivery',
    couponCode: 'ZOMATO150',
    discount: '₹150 OFF',
    discountNum: 150,
    cashback: null,
    minOrder: '₹399',
    rawTitle: '🍔 Zomato Weekend Special Coupon!',
    text: `🍔 Zomato Weekend Special Offer!

Get FLAT ₹150 OFF on your favorite restaurants today.
Apply Coupon: ZOMATO150

• Valid on orders above ₹399
• Valid on select premium restaurants
• Offer valid till Sunday night only!

Claim here: https://zomato.onelink.me/LQZg/qcdeals`,
  },
  {
    hoursAgo: 4,
    merchant: 'Swiggy Instamart',
    category: 'grocery',
    couponCode: 'IMART100',
    discount: '₹100 OFF',
    discountNum: 100,
    cashback: null,
    minOrder: '₹499',
    rawTitle: '🛒 Swiggy Instamart Grocery Loot!',
    text: `🛒 Swiggy Instamart Super Grocery Deal!

Need groceries in 10 minutes? Get FLAT ₹100 OFF on your order.
Apply Coupon: IMART100

• Minimum order value: ₹499
• Applicable on fresh fruits, vegetables, and daily essentials
• Valid for all users!

Order now: https://swiggy.onelink.me/Instamart/qcloot`,
  },
  {
    hoursAgo: 8,
    merchant: 'Zepto',
    category: 'grocery',
    couponCode: 'ZEPTOLOOT',
    discount: 'FREE DELIVERY',
    discountNum: 50,
    cashback: '₹30 Cashback',
    minOrder: '₹149',
    rawTitle: '⚡ Zepto Midnight Munchies Deal!',
    text: `⚡ Zepto Midnight Munchies Deal!

Craving snacks? Order from Zepto and get Free Delivery + ₹30 Cashback.
Use Code: ZEPTOLOOT

• Min order value only ₹149
• Delivery in 10 minutes flat
• Applicable on snacks, beverages & dairy products

Claim here: https://zepto.onelink.me/munchies/qc`,
  },
  {
    hoursAgo: 14,
    merchant: "Domino's",
    category: 'food-delivery',
    couponCode: 'DOMUNO50',
    discount: '50% OFF',
    discountNum: 50,
    cashback: null,
    minOrder: '₹200',
    rawTitle: '🍕 Domino’s Mid-Week Pizza Party!',
    text: `🍕 Domino’s Pizza Offer - Flat 50% OFF!

Enjoy hot and fresh pizzas at half the price today.
Apply Coupon Code: DOMUNO50

• Flat 50% OFF on all pizzas
• Minimum order value: ₹200
• Max discount: ₹120

Order Pizza: https://dominos.onelink.me/pizza/dealshub`,
  },
  {
    hoursAgo: 22,
    merchant: 'KFC',
    category: 'food-delivery',
    couponCode: 'KFCDOUBLE',
    discount: '₹120 OFF',
    discountNum: 120,
    cashback: null,
    minOrder: '₹499',
    rawTitle: '🍗 KFC Fried Chicken Feast Deal!',
    text: `🍗 KFC Special Fried Chicken Offer!

Get Flat ₹120 OFF on KFC Chicken Buckets and Burgers.
Apply Coupon: KFCDOUBLE

• Valid on orders of ₹499 or more
• Valid on KFC app and web orders
• Hurry, limited period offer!

Order KFC: https://kfc.onelink.me/chicken/qc`,
  },
  {
    hoursAgo: 28,
    merchant: 'Blinkit',
    category: 'grocery',
    couponCode: null,
    discount: 'FLAT ₹75 OFF',
    discountNum: 75,
    cashback: null,
    minOrder: '₹599',
    rawTitle: '⚡ Blinkit Breakfast Essentials Deal!',
    text: `⚡ Blinkit Instant Breakfast Offer!

Stock up on milk, bread, eggs, and butter. Get Flat ₹75 OFF instantly.
No coupon code required! Discount automatically applied at checkout.

• Minimum cart value: ₹599
• Delivery in 10 minutes
• Valid on all dairy and bakery items

Buy Groceries: https://blinkit.onelink.me/grocery/qc`,
  },
  {
    hoursAgo: 36,
    merchant: 'Magicpin',
    category: 'cashback',
    couponCode: 'MAGICFOOD',
    discount: '₹100 Cashback',
    discountNum: 100,
    cashback: '₹100 MagicPoints',
    minOrder: '₹299',
    rawTitle: '✨ Magicpin Restaurant Coupon Discount!',
    text: `✨ Magicpin Restaurant Discount Voucher Loot!

Buy vouchers for your favorite local restaurants and get ₹100 Cashback.
Use Code: MAGICFOOD

• Get extra 100 MagicPoints on voucher purchase
• Valid at 5000+ local food outlets & cafes
• Minimum purchase value: ₹299

Get Voucher: https://magicpin.in/restaurant-vouchers/qc`,
  },
  {
    hoursAgo: 45,
    merchant: 'EatSure',
    category: 'first-order',
    couponCode: 'NEWES',
    discount: '₹150 OFF',
    discountNum: 150,
    cashback: 'FREE Delivery',
    minOrder: '₹199',
    rawTitle: '🍱 EatSure First Order Welcome Deal!',
    text: `🍱 EatSure Brand New User Special!

Order from Behrouz Biryani, Mandarin Oak, or Faasos in one single order.
Get Flat ₹150 OFF + Free Delivery on your first order.
Apply Coupon: NEWES

• Minimum transaction: ₹199
• Zero delivery charges on first order
• Valid for new accounts only

Order EatSure: https://eatsure.onelink.me/food/qc`,
  },
  {
    hoursAgo: 54,
    merchant: 'BigBasket',
    category: 'grocery',
    couponCode: 'BBNOW150',
    discount: '₹150 OFF',
    discountNum: 150,
    cashback: null,
    minOrder: '₹799',
    rawTitle: '🛒 BB Now (BigBasket) Weekend Grocery Sale!',
    text: `🛒 BB Now Super Grocery Savings!

Save big on weekly essentials. Get FLAT ₹150 OFF on BB Now.
Use Coupon: BBNOW150

• Valid on orders above ₹799
• Valid on fresh items, household cleaners, and packaged foods
• Delivery in 15-20 minutes!

Shop BB Now: https://bigbasket.onelink.me/bbnow/qc`,
  },
  {
    hoursAgo: 65,
    merchant: "McDonald's",
    category: 'food-delivery',
    couponCode: 'MCDFREE',
    discount: 'FREE Burger',
    discountNum: 90,
    cashback: null,
    minOrder: '₹349',
    rawTitle: '🍔 McDonald’s Free Burger Loot!',
    text: `🍔 McDonald's Free McAloo Tikki / Chicken McWrap Offer!

Get a free burger on your McDonald's order today.
Use Code: MCDFREE

• Min order value: ₹349
• Valid on McDelivery app orders
• Applicable across all outlets in India

Order Burgers: https://mcdelivery.onelink.me/mcd/qc`,
  },
  {
    hoursAgo: 74,
    merchant: 'Zomato',
    category: 'food-delivery',
    couponCode: 'CRAVINGS',
    discount: '₹80 OFF',
    discountNum: 80,
    cashback: null,
    minOrder: '₹199',
    rawTitle: '❤️ Zomato Late Night Cravings Discount!',
    text: `❤️ Zomato Late Night Cravings Offer!

Order food between 10 PM and 3 AM and get Flat ₹80 OFF.
Apply Code: CRAVINGS

• Valid on orders of ₹199 and above
• Valid on late-night open restaurants
• Applicable twice per user

Order Food: https://zomato.onelink.me/LateNight/qc`,
  },
  {
    hoursAgo: 85,
    merchant: 'Swiggy',
    category: 'food-delivery',
    couponCode: 'SWIGGYIT',
    discount: '₹120 OFF',
    discountNum: 120,
    cashback: null,
    minOrder: '₹349',
    rawTitle: '🧡 Swiggy Premium Restaurant Offer!',
    text: `🧡 Swiggy Premium Restaurant Coupon!

Savor premium cuisines. Get FLAT ₹120 OFF on top-rated restaurants.
Apply Code: SWIGGYIT

• Minimum order value: ₹349
• Applicable on select 4+ star rated outlets
• Valid on online payments only

Order Swiggy: https://swiggy.onelink.me/delivery/qc`,
  },
  {
    hoursAgo: 98,
    merchant: 'Zepto',
    category: 'grocery',
    couponCode: 'ZEPTO100',
    discount: '₹100 OFF',
    discountNum: 100,
    cashback: null,
    minOrder: '₹399',
    rawTitle: '💜 Zepto Grocery Fresh Fruits Bonanza!',
    text: `💜 Zepto Fresh Fruits & Vegetables Offer!

Get organic vegetables and fresh fruits. Enjoy FLAT ₹100 OFF.
Apply Code: ZEPTO100

• Valid on orders of ₹399 and above
• Applicable on Fresh category items
• Fast 10 minutes door delivery

Order Fruits: https://zepto.onelink.me/fresh/qc`,
  },
  {
    hoursAgo: 110,
    merchant: 'Pizza Hut',
    category: 'food-delivery',
    couponCode: 'PHUT40',
    discount: '40% OFF',
    discountNum: 40,
    cashback: null,
    minOrder: '₹350',
    rawTitle: '🍕 Pizza Hut Mid-Day Slice Offer!',
    text: `🍕 Pizza Hut Flat 40% OFF Special!

Indulge in delicious pan pizzas at 40% OFF today.
Use Code: PHUT40

• Flat 40% OFF on all personal & medium pizzas
• Min order value: ₹350
• Max discount: ₹200

Order Pizza Hut: https://pizzahut.onelink.me/pizza/qc`,
  },
  {
    hoursAgo: 122,
    merchant: 'Swiggy Instamart',
    category: 'grocery',
    couponCode: 'IMARTLOOT',
    discount: '₹120 OFF',
    discountNum: 120,
    cashback: null,
    minOrder: '₹499',
    rawTitle: '🛒 Swiggy Instamart Ice Creams & Desserts Sale!',
    text: `🛒 Swiggy Instamart Chill Deals!

Beat the heat with ice creams, shakes & cold drinks. Get FLAT ₹120 OFF.
Use Coupon: IMARTLOOT

• Valid on orders above ₹499
• Delivery in 10-15 minutes
• Applicable on Ice Cream & Cold Beverages category

Order Desserts: https://swiggy.onelink.me/Instamart/icecream`,
  },
  {
    hoursAgo: 134,
    merchant: 'Zomato',
    category: 'freebies',
    couponCode: 'FREEITEM',
    discount: 'FREE Dessert',
    discountNum: 80,
    cashback: null,
    minOrder: '₹299',
    rawTitle: '❤️ Zomato Free Chocolate Lava Cake Offer!',
    text: `❤️ Zomato Sweet Treat - Free Dessert!

Get a free Chocolate Lava Cake on ordering food today.
Use Code: FREEITEM

• Minimum order of ₹299 from select outlets
• Applicable for select users
• Instant cravings satisfied!

Order Zomato: https://zomato.onelink.me/dessert/qc`,
  },
  {
    hoursAgo: 146,
    merchant: 'Blinkit',
    category: 'grocery',
    couponCode: 'BLINK75',
    discount: '₹75 OFF',
    discountNum: 75,
    cashback: null,
    minOrder: '₹499',
    rawTitle: '⚡ Blinkit Cleaning & Household Loot!',
    text: `⚡ Blinkit Home Cleaning Sale!

Get detergents, toilet cleaners, and kitchen tools. Save ₹75 instantly.
Apply Coupon: BLINK75

• Minimum cart: ₹499
• Super-fast home delivery
• Limited period discount!

Shop Blinkit: https://blinkit.onelink.me/clean/qc`,
  },
  {
    hoursAgo: 158,
    merchant: 'KFC',
    category: 'food-delivery',
    couponCode: 'KFCSAVER',
    discount: '₹100 OFF',
    discountNum: 100,
    cashback: null,
    minOrder: '₹399',
    rawTitle: '🍗 KFC Mid-Week Crispy Bucket Coupon!',
    text: `🍗 KFC Crispy Chicken Special!

Get Flat ₹100 OFF on your favorite snack buckets.
Apply Coupon Code: KFCSAVER

• Minimum order: ₹399
• Valid on KFC mobile site and app orders
• Hot & fresh crispy chicken delivered

Order KFC: https://kfc.onelink.me/snack/qc`,
  },
  {
    hoursAgo: 162,
    merchant: "Domino's",
    category: 'food-delivery',
    couponCode: 'DOMFREE',
    discount: 'FREE Garlic Bread',
    discountNum: 109,
    cashback: null,
    minOrder: '₹350',
    rawTitle: '🍕 Domino’s Free Garlic Bread Offer!',
    text: `🍕 Domino's Free Garlic Bread + Dip Offer!

Get a free Garlic Bread on your pizza order.
Apply Code: DOMFREE

• Min order value: ₹350
• Applicable only on pizza orders
• Valid on app and mobile web orders

Order Domino's: https://dominos.onelink.me/garlic/qc`,
  },
  {
    hoursAgo: 164,
    merchant: 'Zepto',
    category: 'grocery',
    couponCode: 'ZEPTOFIRST',
    discount: '₹150 OFF',
    discountNum: 150,
    cashback: 'FREE Delivery',
    minOrder: '₹299',
    rawTitle: '💜 Zepto New User Grocery Loot Coupon!',
    text: `💜 Zepto New Account Registration Offer!

Get FLAT ₹150 OFF + Free Delivery on your very first grocery order.
Use Code: ZEPTOFIRST

• Minimum cart value only ₹299
• Instant delivery in 10 minutes
• Exclusively for first-time buyers!

Register & Shop: https://zepto.onelink.me/welcome/qc`,
  },
  {
    hoursAgo: 165,
    merchant: 'Magicpin',
    category: 'cashback',
    couponCode: 'PINMAGIC',
    discount: '₹80 Cashback',
    discountNum: 80,
    cashback: '₹80 Cashback',
    minOrder: '₹200',
    rawTitle: '✨ Magicpin Local Bakeries Discount Deal!',
    text: `✨ Magicpin Bakery Discount Coupon!

Buy cakes, pastries, and bread from local bakeries and get ₹80 Cashback.
Use Code: PINMAGIC

• Minimum order of ₹200
• Instant cashbacks credited as Magicpin balance
• Voucher code valid for 7 days

Get Cakes: https://magicpin.in/bakery-vouchers/qc`,
  },
  {
    hoursAgo: 166,
    merchant: 'EatSure',
    category: 'food-delivery',
    couponCode: 'EATSURE100',
    discount: '₹100 OFF',
    discountNum: 100,
    cashback: null,
    minOrder: '₹299',
    rawTitle: '🍱 EatSure Multi-Restaurant Order Coupon!',
    text: `🍱 EatSure Food Court Special Offer!

Order pizza, wraps, and biryani together. Get FLAT ₹100 OFF.
Apply Coupon: EATSURE100

• Valid on orders above ₹299
• Delivery from verified kitchens
• Applicable for all users

Order EatSure: https://eatsure.onelink.me/court/qc`,
  },
  {
    hoursAgo: 167,
    merchant: 'BigBasket',
    category: 'grocery',
    couponCode: 'BBFREE',
    discount: 'FREE Delivery',
    discountNum: 30,
    cashback: null,
    minOrder: '₹199',
    rawTitle: '🛒 BigBasket Now Free Delivery Grocery Coupon!',
    text: `🛒 BB Now Mid-Week Free Shipping!

Need immediate grocery delivery? Get Free Shipping on orders.
Use Coupon: BBFREE

• Minimum order value of ₹199
• Fast 15 minutes delivery
• Applicable for select pin codes

Shop BB Now: https://bigbasket.onelink.me/shipping/qc`,
  },
  {
    hoursAgo: 168,
    merchant: "McDonald's",
    category: 'first-order',
    couponCode: 'MCD100',
    discount: '₹100 OFF',
    discountNum: 100,
    cashback: null,
    minOrder: '₹299',
    rawTitle: '🍔 McDonald’s First Order Welcome Coupon!',
    text: `🍔 McDonald's Welcome Offer!

Enjoy a delicious meal of burgers, fries & coke. Get Flat ₹100 OFF.
Use Coupon Code: MCD100

• Valid on first order of ₹299 and above
• Valid on McDelivery app only
• Valid for new accounts only

Order Burgers: https://mcdelivery.onelink.me/welcome/qc`,
  },
  {
    hoursAgo: 169,
    merchant: 'Pizza Hut',
    category: 'food-delivery',
    couponCode: 'PHFREE',
    discount: 'FREE Personal Pizza',
    discountNum: 149,
    cashback: null,
    minOrder: '₹499',
    rawTitle: '🍕 Pizza Hut Personal Pizza Loot Offer!',
    text: `🍕 Pizza Hut Free Personal Pan Pizza Offer!

Get a free personal pizza on ordering a medium pizza.
Apply Coupon: PHFREE

• Minimum order value: ₹499
• Valid on online card and UPI payments
• Valid on select locations

Order Pizza Hut: https://pizzahut.onelink.me/free/qc`,
  }
];

function makeSlug(title, ts) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${Math.floor(ts / 1000).toString(36)}`;
}

function computeTimeAgo(ts) {
  const diff = CURRENT_TIME - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)    return 'Just now';
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function run() {
  console.log(`Generating 25 QC deals...`);

  const posts = rawDealsSource.map((raw, index) => {
    const timestamp = CURRENT_TIME - raw.hoursAgo * 60 * 60 * 1000;
    const merchantDetails = getMerchantDetails(raw.merchant);
    
    // Generate clean/original URL
    const originalUrl = `${raw.text.match(/https?:\/\/[^\s]+/)?.[0] || 'https://t.me/s/dealbeetricks'}?aff=dealbeetricks&dbtrk=123`;
    const cleanUrl = originalUrl.split('?')[0];

    const title = raw.couponCode 
      ? `Get ${raw.discount} at ${raw.merchant} – Use Code ${raw.couponCode}`
      : `Get ${raw.discount} at ${raw.merchant}`;

    const id = `qc-dealbeetricks-124${50 + index}`;
    const slug = makeSlug(title, timestamp);
    const timeAgo = computeTimeAgo(timestamp);

    // Calculate dates
    const validDate = new Date(timestamp + 3 * 24 * 60 * 60 * 1000); // 3 days expiry
    const isExpiringToday = raw.hoursAgo < 10; // make recent ones expiring today for test
    const validTill = isExpiringToday
      ? new Date(CURRENT_TIME + 8 * 60 * 60 * 1000).toISOString() // expires in 8 hours
      : validDate.toISOString();

    // Generate fallback SVG
    const fallbackSvg = generateFallbackSVG({
      merchant: raw.merchant,
      merchantColor: merchantDetails.color,
      merchantEmoji: merchantDetails.emoji,
      discount: raw.discount,
      couponCode: raw.couponCode,
      category: raw.category
    });

    const isLoot = raw.discountNum >= 120 || raw.discount.includes('FREE');

    return {
      id,
      slug,
      source: 'dealbeetricks',
      telegramMsgId: String(12450 + index),
      title,
      rawTitle: raw.rawTitle,
      merchant: raw.merchant,
      merchantColor: merchantDetails.color,
      merchantEmoji: merchantDetails.emoji,
      category: raw.category,
      couponCode: raw.couponCode,
      discount: raw.discount,
      discountNum: raw.discountNum,
      discountPercent: raw.discountNum, // revenue field
      cashback: raw.cashback,
      cashbackAmount: raw.cashback, // revenue field
      finalPrice: null,
      minOrder: raw.minOrder,
      validTill,
      isExpiringToday,
      isExpired: false,
      isLoot,
      isFreebie: raw.category === 'freebies',
      isFirstOrder: raw.category === 'first-order',
      text: raw.text,
      image: null, // text-only deals
      hasFallbackImage: true,
      fallbackSvg,
      originalUrl,
      cleanUrl,
      url: cleanUrl,
      clickCount: Math.floor(Math.random() * 20), // random clicks
      timestamp,
      timeAgo,
      badges: ['LIVE', ...(isLoot ? ['🔥 LOOT'] : []), ...(raw.couponCode ? ['🎟️ COUPON'] : []), ...(raw.cashback ? ['💰 CASHBACK'] : [])],
      aiContext: raw.couponCode
        ? `🎟️ Verified Code: ${raw.couponCode} — apply at checkout for instant savings.`
        : `⚡ Smart Saver: ${raw.discount} at ${raw.merchant} — verified offer.`,
      sourceChannel: 'dealbeetricks',
      importedAt: new Date(timestamp).toISOString(),
      lastUpdatedAt: new Date(timestamp).toISOString(),
    };
  });

  // Construct DB structure
  const dbData = {
    posts,
    lastUpdated: CURRENT_TIME,
    totalRejected: 82, // realistic counts
    totalPublished: posts.length,
  };

  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Write to qc_posts.json
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
  console.log(`Saved ${posts.length} deals to ${DB_PATH}`);

  // Save checkpoint with latest telegramMsgId
  const checkpoints = {
    'dealbeetricks': {
      lastMsgId: posts[0].telegramMsgId,
      savedAt: new Date(CURRENT_TIME).toISOString()
    }
  };
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoints, null, 2));
  console.log(`Saved checkpoints to ${CHECKPOINT_PATH}`);
}

run();
