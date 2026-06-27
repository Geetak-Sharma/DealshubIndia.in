
import type { AIRecommendation } from "@/platform/ai";

export interface DealCardDTO {
  id: string;
  title: string;
  image: string;
  flags: {
    showAi: boolean;
    showCoupons: boolean;
    showAlternatives: boolean;
    showMerchant: boolean;
  };
  merchant: {
    id: string;
    name: string;
    trustLevel: 'High' | 'Medium' | 'Low' | null;
    deliveryEstimate: string | null;
    returnPolicy: string | null;
  } | null;
  pricing: {
    currentPriceFormatted: string;
    originalPriceFormatted?: string;
    savingsFormatted?: string;
    basePriceFormatted?: string;
    effectivePriceFormatted: string;
    couponFormatted?: string;
    bankOfferFormatted?: string;
    cashbackFormatted?: string;
  };
  ai: AIRecommendation | null;
  state: 'normal' | 'expired' | 'out_of_stock' | 'coupon' | 'cashback';
  stateLabel?: string;
  alternatives: {
    id: string;
    title: string;
    image: string;
    priceFormatted: string;
    reason: string;
  }[];
}
