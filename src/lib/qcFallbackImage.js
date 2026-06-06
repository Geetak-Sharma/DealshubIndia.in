/**
 * Generates a branded SVG card for Quick Commerce posts.
 * Returns a data:image/svg+xml;base64,... URI ready for use in <img src>.
 * Caches SVGs in memory to prevent regeneration.
 */

import { getMerchantLogoRaw } from './qcMerchantLogos.js';

function escapeXML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CATEGORY_TINTS = {
  'food-delivery':  'rgba(252, 128, 25, 0.04)',
  'grocery':        'rgba(132, 190, 65, 0.04)',
  'cashback':       'rgba(0, 186, 242, 0.04)',
  'freebies':       'rgba(34, 197, 94, 0.06)',
  'first-order':    'rgba(139, 92, 246, 0.04)',
  'bank-offers':    'rgba(0, 76, 143, 0.04)',
};

const CATEGORY_LABELS = {
  'food-delivery': 'FOOD DELIVERY',
  'grocery':       'GROCERY',
  'cashback':      'CASHBACK',
  'freebies':      'FREEBIE',
  'first-order':   'NEW USER OFFER',
  'bank-offers':   'BANK OFFER',
};

const MERCHANT_THEMES = {
  'Swiggy Instamart': {
    bgGradient: ['#121620', '#1C0F05'],
    accentColor: '#FC8019',
    borderColor: '#FC801960',
    labelColor: '#FC8019',
  },
  'Swiggy': {
    bgGradient: ['#121620', '#1C0F05'],
    accentColor: '#FC8019',
    borderColor: '#FC801960',
    labelColor: '#FC8019',
  },
  'Zomato': {
    bgGradient: ['#121620', '#200A0C'],
    accentColor: '#E23744',
    borderColor: '#E2374460',
    labelColor: '#E23744',
  },
  'Blinkit': {
    bgGradient: ['#121620', '#1F1B05'],
    accentColor: '#F8D531',
    borderColor: '#F8D53160',
    labelColor: '#F8D531',
  },
  'Zepto': {
    bgGradient: ['#121620', '#140E20'],
    accentColor: '#8B5CF6',
    borderColor: '#8B5CF660',
    labelColor: '#a78bfa',
  },
  'BigBasket': {
    bgGradient: ['#121620', '#0E170A'],
    accentColor: '#84BE41',
    borderColor: '#84BE4160',
    labelColor: '#84BE41',
  },
  "Domino's": {
    bgGradient: ['#121620', '#07101E'],
    accentColor: '#00649C',
    borderColor: '#00649C60',
    labelColor: '#00649C',
  },
  'KFC': {
    bgGradient: ['#121620', '#200505'],
    accentColor: '#F40000',
    borderColor: '#F4000060',
    labelColor: '#F40000',
  },
  "McDonald's": {
    bgGradient: ['#121620', '#201A05'],
    accentColor: '#FFC72C',
    borderColor: '#FFC72C60',
    labelColor: '#FFC72C',
  },
  'Pizza Hut': {
    bgGradient: ['#121620', '#1F0B0D'],
    accentColor: '#E31937',
    borderColor: '#E3193760',
    labelColor: '#E31937',
  },
  'Magicpin': {
    bgGradient: ['#121620', '#170A1A'],
    accentColor: '#6C3483',
    borderColor: '#6C348360',
    labelColor: '#6C3483',
  },
  'Paytm': {
    bgGradient: ['#121620', '#051A20'],
    accentColor: '#00BAF2',
    borderColor: '#00BAF260',
    labelColor: '#00BAF2',
  },
  'PhonePe': {
    bgGradient: ['#121620', '#100520'],
    accentColor: '#5F259F',
    borderColor: '#5F259F60',
    labelColor: '#5F259F',
  },
  'Amazon Pay': {
    bgGradient: ['#121620', '#201505'],
    accentColor: '#FF9900',
    borderColor: '#FF990060',
    labelColor: '#FF9900',
  },
  'Mobikwik': {
    bgGradient: ['#121620', '#1C0A0A'],
    accentColor: '#A93226',
    borderColor: '#A9322660',
    labelColor: '#A93226',
  }
};

// SVG In-Memory Cache
const svgCache = new Map();

/**
 * Generates a branded, native-looking merchant offer card as an SVG.
 * @param {Object} post The enriched post object containing metadata
 * @returns {string} data:image/svg+xml;base64,...
 */
export function generateFallbackSVG(post) {
  if (!post) return '';

  const {
    merchant = 'Quick Commerce',
    merchantColor = '#22C55E',
    couponCode = null,
    category = 'food-delivery',
    productName = 'Special Offer',
    strongestOffer = 'OFFER',
    image = null
  } = post;

  const cacheKey = `${merchant}|${couponCode}|${category}|${productName}|${strongestOffer}|${image}`;
  if (svgCache.has(cacheKey)) {
    return svgCache.get(cacheKey);
  }

  // Load template styling based on merchant name
  const theme = MERCHANT_THEMES[merchant] || {
    bgGradient: ['#121620', '#0A140F'],
    accentColor: merchantColor || '#22C55E',
    borderColor: `${merchantColor || '#22C55E'}60`,
    labelColor: merchantColor || '#22C55E'
  };

  const accent = theme.accentColor;
  const name = escapeXML(merchant);
  const tint = CATEGORY_TINTS[category] || 'rgba(34, 197, 94, 0.04)';
  const categoryLabel = escapeXML(CATEGORY_LABELS[category] || 'DEAL');
  const heroOffer = escapeXML(strongestOffer);

  const logoRaw = getMerchantLogoRaw(merchant, accent);
  const logoContent = logoRaw.replace(/<svg[^>]*>/i, '').replace(/<\/svg>/i, '');

  let svgContent = '';

  if (image) {
    // Split title into two lines dynamically
    const words = (productName || '').split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + ' ' + word).trim().length <= 20) {
        line1 = (line1 + ' ' + word).trim();
      } else if ((line2 + ' ' + word).trim().length <= 20) {
        line2 = (line2 + ' ' + word).trim();
      } else {
        if (line2 && !line2.endsWith('…')) {
          line2 += '…';
        }
      }
    }
    if (!line1) line1 = productName;

    svgContent = `
    <!-- Split Layout with Product Image -->
    <!-- Left Column: Deal Details -->
    <text x="24" y="70" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="900" fill="${accent}" letter-spacing="1">${name.toUpperCase()}</text>
    
    <text x="24" y="105" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="800" fill="#FFFFFF">
      <tspan x="24" dy="0">${escapeXML(line1)}</tspan>
      ${line2 ? `<tspan x="24" dy="20">${escapeXML(line2)}</tspan>` : ''}
    </text>

    <!-- Strongest Offer Display -->
    <rect x="24" y="${line2 ? 160 : 140}" width="160" height="42" rx="8" fill="${accent}12" stroke="${accent}30" stroke-width="1"/>
    <text x="36" y="${line2 ? 190 : 170}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="900" fill="${accent}">${heroOffer}</text>

    ${couponCode ? `
    <!-- Coupon code chip -->
    <rect x="24" y="${line2 ? 212 : 192}" width="160" height="22" rx="6" fill="rgba(255,255,255,0.03)" stroke="${accent}" stroke-width="0.8" stroke-opacity="0.3"/>
    <text x="104" y="${line2 ? 227 : 207}" font-family="Courier New, monospace" font-size="9" font-weight="900" fill="${accent}" text-anchor="middle" letter-spacing="0.5">CODE: ${escapeXML(couponCode)}</text>
    ` : ''}

    <!-- Right Column: Product Image -->
    <g transform="translate(235, 50)">
      <rect width="140" height="180" rx="16" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      <image href="${escapeXML(image)}" x="0" y="0" width="140" height="180" clip-path="url(#imgClip)" preserveAspectRatio="xMidYMid slice" />
      <!-- Small Merchant Stamp on Image -->
      <circle cx="24" cy="24" r="14" fill="#121620" opacity="0.9" />
      <g transform="translate(14, 14)">
        <svg width="20" height="20" viewBox="0 0 100 100">
          ${logoContent}
        </svg>
      </g>
    </g>
    `;
  } else {
    // Text-only Layout: Premium Merchant Promotional Banner
    svgContent = `
    <!-- Centered Promotional Banner -->
    <!-- Large decorative ambient glow in center -->
    <circle cx="200" cy="140" r="120" fill="${accent}" opacity="0.12" filter="blur(24px)" />

    <!-- Sleek Merchant Logo Badge in center-top -->
    <g transform="translate(160, 48)">
      <circle cx="40" cy="40" r="38" fill="#121620" stroke="${accent}" stroke-width="2" />
      <g transform="translate(15, 15)">
        <svg width="50" height="50" viewBox="0 0 100 100">
          ${logoContent}
        </svg>
      </g>
    </g>

    <!-- Merchant name text -->
    <text x="200" y="148" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="900" fill="${accent}" text-anchor="middle" letter-spacing="2">${name.toUpperCase()}</text>

    <!-- Massive Offer Value in Center -->
    <text x="200" y="202" font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5">${heroOffer}</text>

    <!-- Sub-badge indicating Deal Category or Coupon Status -->
    <rect x="120" y="218" width="160" height="22" rx="11" fill="${accent}18" stroke="${accent}40" stroke-width="0.8"/>
    <text x="200" y="232" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1">
      ${couponCode ? `USE COUPON: ${escapeXML(couponCode)}` : `${categoryLabel}`}
    </text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgGradient[0]}"/>
      <stop offset="100%" stop-color="${theme.bgGradient[1]}"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.3"/>
    </linearGradient>
    <clipPath id="imgClip">
      <rect width="140" height="180" rx="16"/>
    </clipPath>
  </defs>

  <!-- Base background -->
  <rect width="400" height="280" fill="url(#bg)"/>

  <!-- Category tint overlay -->
  <rect width="400" height="280" fill="${tint}"/>

  <!-- Ambient light glow -->
  <circle cx="300" cy="140" r="180" fill="${accent}" opacity="0.06" filter="blur(20px)" />

  <!-- Subtle grid lines -->
  <line x1="80" y1="0" x2="80" y2="280" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="160" y1="0" x2="160" y2="280" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="240" y1="0" x2="240" y2="280" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="320" y1="0" x2="320" y2="280" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="0" y1="140" x2="400" y2="140" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>
  <line x1="0" y1="210" x2="400" y2="210" stroke="rgba(255,255,255,0.012)" stroke-width="1"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="5" height="280" fill="url(#accentBar)"/>

  <!-- Top Left: Dealshub branding -->
  <rect x="18" y="14" width="105" height="18" rx="4" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" stroke-width="0.8"/>
  <text x="70" y="26" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="900" fill="#22C55E" text-anchor="middle" letter-spacing="1">DEALSHUB INDIA</text>

  <!-- Top right: category label -->
  <rect x="278" y="14" width="105" height="18" rx="4" fill="rgba(255,255,255,0.05)"/>
  <text x="330" y="26" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="700" fill="rgba(255,255,255,0.35)" text-anchor="middle" letter-spacing="0.5">${categoryLabel}</text>

  <!-- Main content injected dynamically -->
  ${svgContent}

  <!-- Bottom watermark -->
  <text x="384" y="268" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="400" fill="rgba(255,255,255,0.18)" text-anchor="end">dealshubindia.in</text>
</svg>`;

  // Encode to base64 data URI safely
  const encoded = typeof Buffer !== 'undefined'
    ? Buffer.from(svg, 'utf-8').toString('base64')
    : btoa(unescape(encodeURIComponent(svg)));

  const result = `data:image/svg+xml;base64,${encoded}`;
  svgCache.set(cacheKey, result);
  return result;
}
