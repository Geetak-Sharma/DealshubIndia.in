/**
 * Merchant Logo System
 * Returns SVG data-URI logos for all Quick Commerce merchants.
 * Falls back to generic Dealshub logo if merchant not found.
 * Used in QCFeed cards, fallback images, and OG previews.
 */

// ─── Merchant SVG Logos (flat, square, viewBox 100x100) ──────────────────────

const LOGOS = {
  // Swiggy — orange mapping drop with custom swirl S
  'Swiggy': (c = '#FC8019') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M50 15C32.5 15 28 29.5 28 42.5C28 58.5 50 85 50 85S72 58.5 72 42.5C72 29.5 67.5 15 50 15ZM50 56C42.5 56 38 50.5 38 43.5C38 34.5 45.5 32 50 32C54.5 32 62 34.5 62 43.5C62 50.5 57.5 56 50 56Z" fill="white"/><circle cx="50" cy="43.5" r="7.5" fill="${c}"/></svg>`,

  // Swiggy Instamart — orange with shopping cart
  'Swiggy Instamart': (c = '#FC8019') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M25 30H32L38 60H75L82 35H35" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44" cy="72" r="6" fill="white"/><circle cx="68" cy="72" r="6" fill="white"/></svg>`,

  // Zomato — red card with white heart
  'Zomato': (c = '#E23744') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M50 78.5C50 78.5 18 53.5 18 35.5C18 22.5 28.5 16.5 37 16.5C43 16.5 47.5 20 50 23.5C52.5 20 57 16.5 63 16.5C71.5 16.5 82 22.5 82 35.5C82 53.5 50 78.5 50 78.5Z" fill="white"/></svg>`,

  // Blinkit — yellow with dark lightning bolt
  'Blinkit': (c = '#F8D531') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M58 15L30 50H48L42 85L70 42H52L58 15Z" fill="#131720"/></svg>`,

  // Zepto — purple with stopwatch
  'Zepto': (c = '#8B5CF6') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><circle cx="50" cy="55" r="24" fill="none" stroke="white" stroke-width="6"/><path d="M50 18V26M38 22L42 27M62 22L58 27" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="M50 55V39L60 49" stroke="#FF5C00" stroke-width="5" stroke-linecap="round"/></svg>`,

  // BigBasket — green with vector basket
  'BigBasket': (c = '#84BE41') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M25 42H75V70C75 75.5 70.5 80 65 80H35C29.5 80 25 75.5 25 70V42Z" fill="none" stroke="white" stroke-width="6"/><path d="M35 42C35 28 65 28 65 42" fill="none" stroke="white" stroke-width="6"/><path d="M48 50C53 45 60 45 65 50" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="M35 50C40 45 47 45 52 50" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/></svg>`,

  // Domino's — blue with tilted domino tile
  "Domino's": (c = '#E31837') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#00649C"/><g transform="rotate(-15 50 50)"><rect x="25" y="15" width="50" height="34" rx="4" fill="#E31837"/><rect x="25" y="51" width="50" height="34" rx="4" fill="#00649C"/><circle cx="50" cy="32" r="5" fill="white"/><circle cx="38" cy="68" r="5" fill="white"/><circle cx="62" cy="68" r="5" fill="white"/><line x1="25" y1="50" x2="75" y2="50" stroke="white" stroke-width="2"/></g></svg>`,

  // KFC — red with chicken bucket shield
  'KFC': (c = '#F40000') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M25 15H75V45C75 62 50 85 50 85C50 85 25 62 25 45V15Z" fill="white"/><rect x="33" y="15" width="8" height="50" fill="${c}"/><rect x="58" y="15" width="8" height="50" fill="${c}"/><rect x="25" y="32" width="50" height="22" fill="${c}"/><text x="50" y="48" font-family="Impact, Arial Black, sans-serif" font-weight="900" font-size="16" fill="white" text-anchor="middle" letter-spacing="1">KFC</text></svg>`,

  // McDonald's — red with Golden Arches M
  "McDonald's": (c = '#FFC72C') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#DA291C"/><path d="M20 75V48C20 34 33 25 43 35C45 37 47 40 50 45C53 40 55 37 57 35C67 25 80 34 80 48V75H68V48C68 42 62 36 56 42V75H44V42C38 36 32 42 32 48V75H20Z" fill="${c}"/></svg>`,

  // Pizza Hut — red with Pizza Hut white roof
  'Pizza Hut': (c = '#E31937') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M15 62C25 57 40 52 50 37C60 52 75 57 85 62C85 62 90 65 90 68C90 70 85 74 80 74H20C15 74 10 70 10 68C10 65 15 62 15 62Z" fill="white"/><rect x="42" y="70" width="16" height="5" fill="${c}"/></svg>`,

  // EatSure — orange with dome cloche
  'EatSure': (c = '#FF6B00') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M25 62C25 45 36 32 50 32C64 32 75 45 75 62H25Z" fill="white"/><rect x="20" y="65" width="60" height="6" rx="3" fill="white"/><circle cx="50" cy="27" r="5" fill="white"/></svg>`,

  // Magicpin — purple with vector star
  'Magicpin': (c = '#6C3483') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M50 15L62 38L88 42L68 60L74 85L50 72L26 85L32 60L12 42L38 38L50 15Z" fill="white"/></svg>`,

  // Paytm — two tone blue corporate logo style
  'Paytm': (c = '#00BAF2') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#002E6E"/><text x="50" y="48" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#00BAF2" text-anchor="middle">pay</text><text x="50" y="78" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#0082C5" text-anchor="middle">tm</text></svg>`,

  // PhonePe — purple with stylized white device container
  'PhonePe': (c = '#5F259F') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><rect x="30" y="25" width="40" height="50" rx="8" fill="white"/><path d="M50 35V65M40 45H60M42 55L50 63L58 55" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Amazon Pay — dark charcoal with Amazon smile
  'Amazon Pay': (c = '#FF9900') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#131A22"/><path d="M25 45C35 45 38 30 50 30C62 30 65 45 75 45" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M30 60C40 68 60 68 70 60" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M66 57L72 63L78 57" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`,

  // Mobikwik — blue wallet icon
  'Mobikwik': (c = '#A93226') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${c}"/><path d="M30 30H70V42H30V30Z" fill="white"/><path d="M30 46H70V70C70 73.3 67.3 76 64 76H36C32.7 76 30 73.3 30 70V46Z" fill="white" fill-opacity="0.3"/><circle cx="50" cy="58" r="8" fill="white"/></svg>`
};

// Generic Dealshub fallback logo
const DEALSHUB_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#22C55E"/><text x="50" y="38" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="white" text-anchor="middle" letter-spacing="0.5">DEALSHUB</text><text x="50" y="72" font-size="36" text-anchor="middle" fill="white">🛍️</text></svg>`;

/**
 * Returns a CSS-safe data:image/svg+xml,... URI for the merchant logo.
 * @param {string|null} merchantName
 * @param {string|null} merchantColor
 * @returns {string} data URI
 */
export function getMerchantLogoSvg(merchantName, merchantColor) {
  if (merchantName && LOGOS[merchantName]) {
    const svgStr = LOGOS[merchantName](merchantColor || undefined);
    return `data:image/svg+xml,${encodeURIComponent(svgStr)}`;
  }
  return `data:image/svg+xml,${encodeURIComponent(DEALSHUB_LOGO)}`;
}

/**
 * Returns raw SVG string for embedding in HTML.
 */
export function getMerchantLogoRaw(merchantName, merchantColor) {
  if (merchantName && LOGOS[merchantName]) {
    return LOGOS[merchantName](merchantColor || undefined);
  }
  return DEALSHUB_LOGO;
}

// Export the full merchant list for iteration
export const MERCHANT_NAMES = Object.keys(LOGOS);
