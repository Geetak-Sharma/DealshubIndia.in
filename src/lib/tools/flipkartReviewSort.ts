import type { NormalizedReview } from '../../types/tools';

export type SortMode = 'recent' | 'helpful' | 'positive' | 'negative';

export function sortFlipkartReviews(reviews: NormalizedReview[], mode: SortMode): NormalizedReview[] {
  const sorted = [...reviews];
  
  switch (mode) {
    case 'recent':
      // The reviews scraped are already ordered mostly by recent on Flipkart's recent sorting,
      // or we can keep it as is if dates are strings like "1 day ago". We'll treat default or recent as original order.
      break;
    case 'helpful':
      sorted.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      break;
    case 'positive':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'negative':
      sorted.sort((a, b) => a.rating - b.rating);
      break;
  }
  
  return sorted;
}
