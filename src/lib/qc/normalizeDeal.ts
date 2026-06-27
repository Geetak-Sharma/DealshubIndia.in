export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - (timestamp || Date.now());
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}


import type { RawQCPost, NormalizedQCDeal } from './types';
import { getDealVariant } from './getDealVariant';
import { getMerchantSearchUrl } from './getMerchantSearchUrl';
import { getPrimaryAction } from './getPrimaryAction';

export function normalizeQCDeal(raw: RawQCPost): NormalizedQCDeal {
  const isExpired = !!raw.isExpired;
  const normalizedMerchant = raw.merchant || 'Quick Commerce';
  
  const variant = getDealVariant({
    isExpired,
    couponCode: raw.couponCode,
    url: raw.url,
    destinationType: raw.destinationType,
    productName: raw.productName,
    merchant: normalizedMerchant
  });

  const merchantSearchUrl = getMerchantSearchUrl(normalizedMerchant, raw.productName || raw.title, raw.url);

  const baseNormalized = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    merchant: normalizedMerchant,
    category: raw.category,
    couponCode: raw.couponCode,
    discount: raw.discount,
    cashback: raw.cashback,
    finalPrice: raw.finalPrice,
    minOrder: raw.minOrder,
    isExpiringToday: !!raw.isExpiringToday,
    isExpired,
    isLoot: !!raw.isLoot,
    isFreebie: !!raw.isFreebie,
    isFirstOrder: !!raw.isFirstOrder,
    image: raw.image,
    fallbackSvg: raw.fallbackSvg,
    timeAgo: formatTimeAgo(raw.timestamp),
    timestamp: raw.timestamp,
    variant,
    merchantSearchUrl
  };

  const primaryAction = getPrimaryAction(baseNormalized as any);

  return {
    ...baseNormalized,
    primaryAction
  } as NormalizedQCDeal;
}
