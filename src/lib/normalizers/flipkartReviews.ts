import type { NormalizedReview, RatingDistribution } from '../../types/tools';

export function normalizeFlipkartReview(raw: any, index: number): NormalizedReview {
  const trimOrEmpty = (s: any) => (s ? String(s).trim() : '');
  
  const title = trimOrEmpty(raw.title) || 'Review';
  let body = trimOrEmpty(raw.body || raw.text || '');
  
  // De-duplicate title from body if it is repeated
  if (body.startsWith(title)) {
    body = body.slice(title.length).trim();
  }

  // Fallback rating parsing
  let rating = parseInt(raw.rating, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    rating = 5; // Default safe rating fallback
  }

  const date = trimOrEmpty(raw.date) || 'Recent';
  const author = trimOrEmpty(raw.author) || 'Flipkart Customer';
  const isVerified = !!raw.isVerified;
  const helpfulCount = parseInt(raw.helpfulCount, 10) || 0;

  return {
    id: raw.id || `review-${index}-${Date.now()}`,
    title,
    body,
    rating,
    author,
    date,
    isVerified,
    helpfulCount,
  };
}

export function normalizeRatingDistribution(rawDist: any): RatingDistribution {
  const parseNum = (val: any) => {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').trim();
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  };

  return {
    star5: parseNum(rawDist.star5),
    star4: parseNum(rawDist.star4),
    star3: parseNum(rawDist.star3),
    star2: parseNum(rawDist.star2),
    star1: parseNum(rawDist.star1),
  };
}
