
import { getMerchantSearchUrl } from './getMerchantSearchUrl';
import type { DealVariant } from './types';

export function getDealVariant(deal: {
  isExpired?: boolean;
  couponCode: string | null;
  url: string;
  destinationType?: 'merchant-url' | 'no-link';
  productName?: string;
  merchant: string | null;
}): DealVariant {
  if (deal.isExpired) {
    return { type: 'expired', ctaLabel: 'Expired' };
  }

  const hasCoupon = !!deal.couponCode && deal.couponCode.trim().length > 0;
  
  // NOTE: destinationType fallback to 'merchant-url' is a backward-compatibility 
  // assumption for legacy deals stored before metadata schema migrations.
  const isDirectLink = deal.destinationType === 'merchant-url' || !deal.destinationType;

  if (hasCoupon && isDirectLink && deal.url) {
    return {
      type: 'coupon_plus_link',
      ctaLabel: 'Get Offer',
      couponCode: deal.couponCode!,
      checkoutUrl: deal.url,
    };
  }

  if (!hasCoupon && isDirectLink && deal.url) {
    return {
      type: 'direct_link',
      ctaLabel: 'Get Offer →',
      checkoutUrl: deal.url,
    };
  }

  if (hasCoupon && (!isDirectLink || !deal.url)) {
    return {
      type: 'coupon_only',
      ctaLabel: 'Reveal Code',
      couponCode: deal.couponCode!,
    };
  }

  const prodName = deal.productName || 'product';
  const searchUrl = getMerchantSearchUrl(deal.merchant, prodName, deal.url);
  return {
    type: 'app_search',
    ctaLabel: 'Search in App',
    productName: prodName,
    searchUrl,
  };
}
