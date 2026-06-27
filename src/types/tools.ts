export interface FlipkartProduct {
  title: string;
  image?: string;
  rating: number;
  ratingCount: number;
  reviewCount: number;
  price?: string;
}

export interface NormalizedReview {
  id: string;
  title: string;
  body: string;
  rating: number;
  author: string;
  date: string;
  isVerified: boolean;
  helpfulCount: number;
  location?: string;
  permalink?: string;
  images?: string[];
}

export interface RatingDistribution {
  star5: number;
  star4: number;
  star3: number;
  star2: number;
  star1: number;
}

export interface ReviewTheme {
  theme: string;
  percentage: number;
  snippet: string;
}

export interface ReviewAnalysis {
  analyzedCount: number;
  verdict: {
    bestFor: string[];
    watchOutFor: string[];
    trend: 'Improving' | 'Stable' | 'Declining' | 'Mixed';
    consensus: string;
  };
  positives: ReviewTheme[];
  negatives: ReviewTheme[];
  mostRepeatedComplaint?: string;
  mostRepeatedPraise?: string;
}

export interface AnalyzerAPIResponse {
  ok: boolean;
  inputUrl?: string;
  canonicalUrl?: string;
  product?: FlipkartProduct;
  distribution?: RatingDistribution;
  analysis?: ReviewAnalysis;
  reviews?: NormalizedReview[];
  warnings?: string[];
  error?: string;
}
