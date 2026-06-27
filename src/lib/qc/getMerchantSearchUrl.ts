
const MERCHANT_SEARCH_ROUTING: Record<string, { base: string; search?: string }> = {
  swiggy: { base: 'https://www.swiggy.com', search: 'https://www.swiggy.com/search?query=' },
  instamart: { base: 'https://www.swiggy.com/instamart', search: 'https://www.swiggy.com/instamart/search?query=' },
  zomato: { base: 'https://www.zomato.com', search: 'https://www.zomato.com/search?q=' },
  blinkit: { base: 'https://blinkit.com', search: 'https://blinkit.com/s/?q=' },
  zepto: { base: 'https://www.zeptonow.com', search: 'https://www.zeptonow.com/search?query=' },
  bigbasket: { base: 'https://www.bigbasket.com', search: 'https://www.bigbasket.com/ps/?q=' },
  dominos: { base: 'https://pizzaonline.dominos.co.in' },
  kfc: { base: 'https://online.kfc.co.in' },
  mcdonalds: { base: 'https://www.mcdelivery.co.in' },
  pizzahut: { base: 'https://www.pizzahut.co.in' }
};

export function getMerchantSearchUrl(
  merchant: string | null,
  productName: string | undefined,
  fallbackRawUrl?: string
): string {
  if (merchant) {
    const key = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
    const config = MERCHANT_SEARCH_ROUTING[key];

    if (config) {
      // 1. Known Merchant Search URL
      if (productName && config.search) {
        return `${config.search}${encodeURIComponent(productName)}`;
      }
      // 2. Known Merchant Base URL
      return config.base;
    }
  }

  // 3. Raw Deal URL
  if (fallbackRawUrl) {
    return fallbackRawUrl;
  }

  // 4. Generic Fallback
  return 'https://www.google.com';
}
