
export interface RawQCPost {
  id: string;
  slug: string;
  title: string;
  merchant: string | null;
  category: string;
  couponCode: string | null;
  discount: string | null;
  discountNum?: number;
  cashback: string | null;
  finalPrice: string | null;
  minOrder: string | null;
  validTill: string | null;
  isExpiringToday?: boolean;
  isExpired?: boolean;
  isLoot?: boolean;
  isFreebie?: boolean;
  isFirstOrder?: boolean;
  text: string;
  image: string | null;
  fallbackSvg: string | null;
  url: string;
  destinationType?: 'merchant-url' | 'no-link';
  productName?: string;
  timeAgo?: string;
  timestamp: number;
}

export type DealVariant = 
  | { type: 'expired'; ctaLabel: 'Expired' }
  | { type: 'coupon_plus_link'; ctaLabel: 'Get Offer'; couponCode: string; checkoutUrl: string }
  | { type: 'direct_link'; ctaLabel: 'Get Offer →'; checkoutUrl: string }
  | { type: 'coupon_only'; ctaLabel: 'Reveal Code'; couponCode: string }
  | { type: 'app_search'; ctaLabel: 'Search in App'; productName: string; searchUrl: string };

export interface ActionPayload {
  copyText: string | null;
  redirectUrl: string | null;
  openDrawer: boolean;
}

export interface NormalizedQCDeal {
  id: string;
  slug: string;
  title: string;
  merchant: string;
  category: string;
  couponCode: string | null;
  discount: string | null;
  cashback: string | null;
  finalPrice: string | null;
  minOrder: string | null;
  isExpiringToday: boolean;
  isExpired: boolean;
  isLoot: boolean;
  isFreebie: boolean;
  isFirstOrder: boolean;
  image: string | null;
  fallbackSvg: string | null;
  timeAgo: string;
  timestamp: number;
  variant: DealVariant;
  merchantSearchUrl: string;
  primaryAction: ActionPayload;
}
