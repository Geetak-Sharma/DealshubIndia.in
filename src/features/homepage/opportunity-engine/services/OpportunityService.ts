
import type { DealCardDTO } from "@/features/living-deal-card/dtos/DealCard.dto";
import { buildDealCardData } from "@/features/living-deal-card/services/DealCardService";

export interface OpportunityGroupDTO {
  id: string;
  title: string;
  description: string;
  icon: string;
  deals: (DealCardDTO & { opportunityInsight: string })[];
}

// Wrapping DealCardData to inject specific opportunity insights without mutating the core service yet
const getDealWithInsight = async (id: string, insight: string, waitMode?: boolean): Promise<DealCardDTO & { opportunityInsight: string }> => {
  const deal = await buildDealCardData(id);
  
  if (waitMode) {
    // Override the AI decision badge to demonstrate the "Wait" behavior
    deal.ai = deal.ai ? { ...deal.ai, decision: 'Wait' } : null;
    deal.state = 'normal'; 
  }
  
  return { ...deal, opportunityInsight: insight };
};

export const getOpportunities = async (): Promise<OpportunityGroupDTO[]> => {
  // Fetching deals for groups
  return [
    {
      id: "exceptional-value",
      title: "Exceptional Value",
      description: "Unusually high buying confidence based on historic data.",
      icon: "Star",
      deals: [
        await getDealWithInsight("p_1", "Lowest price in 11 months across all platforms.")
      ]
    },
    {
      id: "wait-before-buying",
      title: "Wait Before Buying",
      description: "AI predicts these will become cheaper soon.",
      icon: "Clock",
      deals: [
        await getDealWithInsight("p_2", "Expected ₹3,000 cheaper within 9 days due to upcoming publisher sale.", true)
      ]
    },
    {
      id: "ending-soon",
      title: "Ending Soon",
      description: "High-value deals losing valid coupons or inventory.",
      icon: "Timer",
      deals: [
        await getDealWithInsight("p_3", "HDFC 10% Cashback expires tonight at 11:59 PM.")
      ]
    },
    {
      id: "hidden-gems",
      title: "Hidden Gems",
      description: "Excellent value with low current visibility.",
      icon: "Gem",
      deals: [
        await getDealWithInsight("p_1", "Underrated merchant offering aggressive bundled discounts.")
      ]
    },
    {
      id: "rising-prices",
      title: "Rising Prices",
      description: "Trend suggests imminent price hikes. Buy now.",
      icon: "TrendingUp",
      deals: [
        await getDealWithInsight("p_2", "Average price increased 7% this week across 3 merchants.")
      ]
    }
  ];
};
