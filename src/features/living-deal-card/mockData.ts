
export interface DealMock {
  id: string;
  title: string;
  image: string;
  merchant: string;
  currentPrice: string;
  originalPrice?: string;
  savings?: string;
  aiRecommendation: string;
  evidenceChips: string[];
  state: 'normal' | 'expired' | 'out_of_stock' | 'coupon' | 'cashback';
  stateLabel?: string;
}

export interface AlternativeMock {
  id: string;
  title: string;
  image: string;
  price: string;
  reason: string;
}

export interface AnalysisMock {
  aiSummary: string;
  priceHistory: {
    lowest: string;
    highest: string;
    currentPositionPercentage: number; // 0 to 100
  };
  couponBreakdown?: {
    basePrice: string;
    coupon?: string;
    bankOffer?: string;
    cashback?: string;
    finalPrice: string;
  };
  alternatives: AlternativeMock[];
  merchantTrust: {
    name: string;
    trustLevel: 'High' | 'Medium' | 'Low';
    deliveryEstimate: string;
    returnPolicy: string;
  };
}

export const mockDeals: DealMock[] = [
  {
    id: '1',
    title: 'Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)',
    image: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&q=80&w=600',
    merchant: 'Amazon India',
    currentPrice: '₹18,999',
    originalPrice: '₹24,900',
    savings: '23% OFF',
    aiRecommendation: 'Buy Now',
    evidenceChips: ['Lowest in 30 days', 'High Demand'],
    state: 'normal'
  },
  {
    id: '2',
    title: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB, 256GB)',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=600',
    merchant: 'Samsung Shop',
    currentPrice: '₹1,29,999',
    originalPrice: '₹1,34,999',
    savings: '₹5,000 OFF',
    aiRecommendation: 'Wait for Sale',
    evidenceChips: ['Historically cheaper', 'New model arriving'],
    state: 'cashback',
    stateLabel: '10% HDFC Cashback'
  },
  {
    id: '3',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600',
    merchant: 'Flipkart',
    currentPrice: '₹22,990',
    originalPrice: '₹34,990',
    savings: '34% OFF',
    aiRecommendation: 'Great Deal',
    evidenceChips: ['Price drop alert', 'Top rated'],
    state: 'coupon',
    stateLabel: 'Apply Code: SONY10'
  },
  {
    id: '4',
    title: 'Dyson V12 Detect Slim Absolute Vacuum Cleaner',
    image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=600',
    merchant: 'Dyson India',
    currentPrice: '₹44,900',
    originalPrice: '₹55,900',
    savings: '19% OFF',
    aiRecommendation: 'Skip',
    evidenceChips: ['Frequent sales', 'Price inflated'],
    state: 'expired'
  },
  {
    id: '5',
    title: 'LG 27 inch 4K Monitor',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600',
    merchant: 'Amazon',
    currentPrice: '₹24,499',
    originalPrice: '₹35,000',
    savings: '30% OFF',
    aiRecommendation: 'Buy Now',
    evidenceChips: ['Rare discount', 'Selling fast'],
    state: 'out_of_stock'
  },
  {
    id: '6', // Long Title, Large Price
    title: 'Apple 2023 MacBook Pro (16-inch, M3 Max chip with 16‑core CPU and 40‑core GPU, 48GB Unified Memory, 1TB) - Space Black',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    merchant: 'Croma',
    currentPrice: '₹3,99,900',
    originalPrice: '₹4,49,900',
    savings: '11% OFF',
    aiRecommendation: 'Great Deal',
    evidenceChips: ['Bank offer active', 'Limited stock'],
    state: 'normal'
  },
  {
    id: '7', // Tiny Price, Short Title
    title: 'Type C Cable',
    image: 'https://images.unsplash.com/photo-1588610537482-628d0023a1a6?auto=format&fit=crop&q=80&w=600',
    merchant: 'Flipkart',
    currentPrice: '₹99',
    originalPrice: '₹399',
    savings: '75% OFF',
    aiRecommendation: 'Buy Now',
    evidenceChips: ['Free delivery'],
    state: 'normal'
  }
];

export const mockAnalysis: AnalysisMock = {
  aiSummary: "This is an exceptional deal for the AirPods Pro 2nd Gen. The current price of ₹18,999 is the lowest seen this month. Given the high demand and limited stock, buying now is highly recommended before the offer expires.",
  priceHistory: {
    lowest: "₹17,499",
    highest: "₹24,900",
    currentPositionPercentage: 20
  },
  couponBreakdown: {
    basePrice: "₹20,999",
    coupon: "- ₹1,000 (HDFCSALE)",
    bankOffer: "- ₹1,000 (HDFC CC)",
    cashback: "+ ₹500 (Amazon Pay)",
    finalPrice: "₹18,999"
  },
  alternatives: [
    {
      id: "a1",
      title: "Sony WF-1000XM5 Wireless Earbuds",
      image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=200",
      price: "₹24,990",
      reason: "Better noise cancellation, but more expensive."
    },
    {
      id: "a2",
      title: "Bose QuietComfort Earbuds II",
      image: "https://images.unsplash.com/photo-1608223651876-00331003666d?auto=format&fit=crop&q=80&w=200",
      price: "₹19,999",
      reason: "Comparable audio quality with a bulkier case."
    }
  ],
  merchantTrust: {
    name: "Amazon India (Appario Retail)",
    trustLevel: "High",
    deliveryEstimate: "Tomorrow by 9 PM",
    returnPolicy: "7 Days Replacement"
  }
};
