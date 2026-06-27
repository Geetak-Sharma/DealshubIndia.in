
import { getLivePricing, getMerchantTrust } from "@/platform/commerce";
import { getAIRecommendation } from "@/platform/ai";
import { getFeatureFlags } from "@/platform/flags";
import { logger } from "@/platform/logger";
import type { DealCardDTO } from "../dtos/DealCard.dto";

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const measureLatency = async <T>(name: string, fn: Promise<T>): Promise<{data: T | null, error: any, latencyMs: number}> => {
  const start = performance.now();
  try {
    const data = await fn;
    return { data, error: null, latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return { data: null, error, latencyMs: Math.round(performance.now() - start) };
  }
};

const productVariations: Record<string, { title: string, image: string, basePrice: number, currentPrice: number }> = {
  'p_1': {
    title: "Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)",
    image: "https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&q=80&w=600",
    basePrice: 24900,
    currentPrice: 18999
  },
  'p_2': {
    title: "Sony PlayStation 5 Console (Disc Edition)",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=600",
    basePrice: 54990,
    currentPrice: 42990
  },
  'p_3': {
    title: "Samsung Galaxy S24 Ultra (256GB, Titanium Gray)",
    image: "https://images.unsplash.com/photo-1706606991536-e39841f5f543?auto=format&fit=crop&q=80&w=600",
    basePrice: 129999,
    currentPrice: 114999
  }
};

export const buildDealCardData = async (productId: string): Promise<DealCardDTO> => {
  const [pricingRes, merchantRes, aiRes, flagsRes] = await Promise.all([
    measureLatency('LivePricing', getLivePricing(productId)),
    measureLatency('MerchantTrust', getMerchantTrust('m_1')),
    measureLatency('AIRecommendation', getAIRecommendation(productId)),
    measureLatency('FeatureFlags', getFeatureFlags())
  ]);

  const pricing = pricingRes.data;
  const merchant = merchantRes.data;
  const ai = aiRes.data;
  const flags = flagsRes.data || { enableAiSummary: true, enableRecommendations: true, enableCoupons: true, enableCashback: true, enableMerchantTrust: true, enableAlternatives: true };

  if (!pricing) {
    throw new Error('Core Pricing Platform unavailable. Cannot render deal card.');
  }

  const variant = productVariations[productId] || productVariations['p_1'];
  
  const couponDiscount = flags.enableCoupons ? (pricing.coupons?.[0]?.discountAmount || 0) : 0;
  const bankDiscount = flags.enableCoupons ? (pricing.bankOffers?.[0]?.discountAmount || 0) : 0;
  const cashbackAmount = flags.enableCashback ? (pricing.cashback?.[0]?.amount || 0) : 0;
  
  // Use variant specific pricing for UI
  const effective = variant.currentPrice - couponDiscount - bankDiscount;
  const savingsAmount = variant.basePrice - effective;

  return {
    id: productId,
    title: variant.title,
    image: variant.image,
    flags: {
      showAi: flags.enableAiSummary && !!ai,
      showCoupons: flags.enableCoupons && (couponDiscount > 0 || bankDiscount > 0),
      showAlternatives: flags.enableAlternatives,
      showMerchant: flags.enableMerchantTrust && !!merchant
    },
    merchant: merchant ? {
      id: "m_1",
      ...merchant
    } : null,
    pricing: {
      currentPriceFormatted: formatINR(variant.currentPrice),
      originalPriceFormatted: variant.basePrice ? formatINR(variant.basePrice) : undefined,
      savingsFormatted: variant.basePrice ? `${Math.round((savingsAmount / variant.basePrice) * 100)}% OFF` : undefined,
      basePriceFormatted: formatINR(variant.currentPrice),
      effectivePriceFormatted: formatINR(effective),
      couponFormatted: couponDiscount > 0 ? `- ${formatINR(couponDiscount)}` : undefined,
      bankOfferFormatted: bankDiscount > 0 ? `- ${formatINR(bankDiscount)}` : undefined,
      cashbackFormatted: cashbackAmount > 0 ? `+ ${formatINR(cashbackAmount)}` : undefined
    },
    ai: flags.enableRecommendations ? ai : null,
    state: 'normal',
    alternatives: []
  };
};
