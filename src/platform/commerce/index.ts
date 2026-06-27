
export interface CommercePricing {
  currentPrice: number;
  originalPrice: number;
  currency: string;
  coupons: { code: string; discountAmount: number }[];
  bankOffers: { bank: string; discountAmount: number }[];
  cashback: { provider: string; amount: number }[];
}

export const getLivePricing = async (productId: string): Promise<CommercePricing> => {
  return {
    currentPrice: 18999,
    originalPrice: 24900,
    currency: "INR",
    coupons: [{ code: 'HDFCSALE', discountAmount: 1000 }],
    bankOffers: [{ bank: 'HDFC CC', discountAmount: 1000 }],
    cashback: [{ provider: 'Amazon Pay', amount: 500 }]
  };
};

export const getMerchantTrust = async (merchantId: string) => {
  return {
    name: "Amazon India",
    trustLevel: "High" as const,
    deliveryEstimate: "Tomorrow by 9 PM",
    returnPolicy: "7 Days Replacement"
  };
}
