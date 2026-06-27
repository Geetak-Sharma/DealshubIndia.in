
import type { ActionPayload, NormalizedQCDeal } from './types';

export function getPrimaryAction(deal: Omit<NormalizedQCDeal, 'primaryAction'>): ActionPayload {
  const v = deal.variant;
  switch (v.type) {
    case 'expired':
      return { copyText: null, redirectUrl: null, openDrawer: false };
    case 'direct_link':
      return { copyText: null, redirectUrl: v.checkoutUrl, openDrawer: false };
    case 'coupon_plus_link':
      return { copyText: v.couponCode, redirectUrl: v.checkoutUrl, openDrawer: false };
    case 'coupon_only':
      return { copyText: v.couponCode, redirectUrl: null, openDrawer: true };
    case 'app_search':
      return { copyText: v.productName, redirectUrl: null, openDrawer: true };
  }
}
