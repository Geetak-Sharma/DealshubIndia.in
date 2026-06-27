import type { NormalizedReview } from '../../types/tools';

export type SortMode = 'recent' | 'helpful' | 'positive' | 'negative';

function parseRelativeDateToMs(dateStr: string): number {
  const clean = dateStr.toLowerCase().trim();
  if (clean.includes('second') || clean.includes('just now')) return Date.now();
  const numMatch = clean.match(/(\d+)/);
  if (!numMatch) return 0;
  const num = parseInt(numMatch[1], 10);
  let multiplier = 1000;
  if (clean.includes('minute')) multiplier = 60 * 1000;
  else if (clean.includes('hour')) multiplier = 60 * 60 * 1000;
  else if (clean.includes('day')) multiplier = 24 * 60 * 60 * 1000;
  else if (clean.includes('week')) multiplier = 7 * 24 * 60 * 60 * 1000;
  else if (clean.includes('month')) multiplier = 30 * 24 * 60 * 60 * 1000;
  else if (clean.includes('year')) multiplier = 365 * 24 * 60 * 60 * 1000;
  return Date.now() - (num * multiplier);
}

export function sortFlipkartReviews(reviews: NormalizedReview[], mode: SortMode): NormalizedReview[] {
  const sorted = [...reviews];
  
  switch (mode) {
    case 'recent':
      sorted.sort((a, b) => parseRelativeDateToMs(b.date) - parseRelativeDateToMs(a.date));
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
