export class PriceAnalyzer {
  static analyze(currentPrice: number, originalPrice: number, historicalLowestPrice?: number) {
    if (originalPrice <= 0) return { discountPercentage: 0, isSuspicious: false, confidence: 50 };

    const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    const isSuspicious = discountPercentage > 90 || currentPrice < 0;
    
    // Confidence drops if we don't have historical tracking
    let confidence = historicalLowestPrice ? 90 : 50;
    if (isSuspicious) confidence = 20;

    return {
      currentPrice,
      originalPrice,
      discountPercentage,
      isSuspicious,
      confidence,
      atHistoricalLow: historicalLowestPrice ? currentPrice <= historicalLowestPrice : false,
      priceTrendPlaceholder: 'STABLE'
    };
  }
}
