import { DealEntity } from '../entities/types';
import { DealIntelligenceReport } from './DealIntelligenceReport';
import { PriceAnalyzer } from './PriceAnalyzer';
import { MerchantProfile } from './MerchantProfile';
import { DealQualityEngine } from './DealQualityEngine';
import { DuplicateDetector } from './DuplicateDetector';
import { TrendEngine } from './TrendEngine';
import { DealScoreEngine } from './DealScoreEngine';
import { RuleEngine } from './RuleEngine';
import { ConfidenceEngine } from './ConfidenceEngine';
import { ExplainabilityEngine } from './ExplainabilityEngine';
import { EventHooks } from './EventHooks';
import { CacheManager } from '../cache/CacheManager';
import { CachePolicies } from '../cache/CachePolicy';

export class DealIntelligencePipelineImpl {
  async execute(deal: DealEntity, context: { existingDeals: DealEntity[]; interactionsPerHour: number; baseTraffic: number }): Promise<DealIntelligenceReport> {
    const cacheKey = `intel:pipeline:v1:${deal.id}`;
    
    return CacheManager.getOrFetch(cacheKey, CachePolicies.Deals, async () => {
      // Stage 1: Validation / Quality
      const qualityScore = DealQualityEngine.evaluate(deal);

      // Stage 2: Price Analysis
      const currentPrice = deal.metadata?.currentPrice || 0;
      const originalPrice = deal.metadata?.originalPrice || 0;
      const priceAnalysis = PriceAnalyzer.analyze(currentPrice, originalPrice);

      // Stage 3: Merchant Analysis
      const merchantProfile = MerchantProfile.getProfile(deal.merchantId);

      // Stage 4: Duplicate Detection
      EventHooks.trigger('beforeDuplicateCheck', { deal });
      const isDuplicate = DuplicateDetector.isDuplicate(deal, context.existingDeals);
      EventHooks.trigger('afterDuplicateCheck', { deal, isDuplicate });

      // Stage 5: Trend Analysis
      EventHooks.trigger('beforeTrendCalculation', { deal });
      const velocity = TrendEngine.calculateVelocity(context.interactionsPerHour, context.baseTraffic);
      const momentum = TrendEngine.getMomentumScore(velocity, 0); // Assuming 0 historical for demo
      EventHooks.trigger('afterTrendCalculation', { deal, velocity, momentum });

      // Stage 6: Rule Engine
      const warnings = RuleEngine.execute(deal, { discountPercentage: priceAnalysis.discountPercentage });

      // Stage 7: Scoring
      EventHooks.trigger('beforeScore', { deal });
      const hoursSincePosted = deal.metadata?.publishedAt ? (Date.now() - new Date(deal.metadata.publishedAt).getTime()) / 3600000 : 0;
      const hasCoupons = !!deal.metadata?.couponCode;

      const scoreParams = {
        discountPercentage: priceAnalysis.discountPercentage,
        merchantTrustScore: merchantProfile.trustScore,
        hoursSincePosted,
        velocityScore: velocity,
        hasStackableCoupons: hasCoupons
      };

      const dealScore = DealScoreEngine.calculateScore(scoreParams);
      const explainability = ExplainabilityEngine.generateExplanation(scoreParams);
      EventHooks.trigger('afterScore', { deal, dealScore });

      // Stage 8: Confidence
      const confidenceScore = ConfidenceEngine.calculate(deal, qualityScore, isDuplicate);

      // Final Intelligence Report Assembly
      return {
        dealScore,
        qualityScore,
        merchantScore: merchantProfile.trustScore,
        priceAnalysis: {
          discountPercentage: priceAnalysis.discountPercentage,
          isSuspicious: priceAnalysis.isSuspicious
        },
        trendAnalysis: { velocity, momentum },
        duplicateStatus: { isDuplicate, confidence: confidenceScore },
        warnings,
        confidenceScore,
        explainability,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    });
  }
}

export const DealIntelligencePipeline = new DealIntelligencePipelineImpl();
