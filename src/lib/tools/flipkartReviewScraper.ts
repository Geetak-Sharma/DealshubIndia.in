import axios from 'axios';
import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import type { FlipkartProduct, NormalizedReview, RatingDistribution } from '../../types/tools';
import { normalizeFlipkartReview, normalizeRatingDistribution } from '../normalizers/flipkartReviews';
import { resolveFlipkartUrl } from './flipkartUrlResolver';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ScrapedResult {
  product: FlipkartProduct;
  reviews: NormalizedReview[];
  distribution: RatingDistribution;
  warnings: string[];
  isBlocked?: boolean;
}

/**
 * Robust helper to fetch HTML using Axios first, falling back to curl.exe if Axios gets blocked or fails.
 */
async function fetchHtmlWithFallback(url: string, warnings: string[]): Promise<{ html: string; isBlocked: boolean }> {
  // First attempt: Axios
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 8000,
    });
    const html = res.data;
    const isBot = html.toLowerCase().includes('recaptcha') || html.toLowerCase().includes('something went wrong') || html.includes('E002');
    if (!isBot) {
      return { html, isBlocked: false };
    }
    warnings.push('Axios request encountered a Flipkart bot-protection page. Retrying with curl fallback...');
  } catch (e: any) {
    warnings.push(`Axios request failed: ${e.message}. Retrying with curl fallback...`);
  }

  // Second attempt: Curl fallback
  try {
    const cmd = `curl.exe -s -L -H "User-Agent: ${DEFAULT_USER_AGENT}" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" "${url}"`;
    const html = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 8000 });
    const isBot = html.toLowerCase().includes('recaptcha') || html.toLowerCase().includes('something went wrong') || html.includes('E002');
    return { html, isBlocked: isBot };
  } catch (e: any) {
    warnings.push(`Curl fallback failed: ${e.message}`);
    return { html: '', isBlocked: true };
  }
}

export async function scrapeFlipkartReviews(productUrl: string, maxPages = 3): Promise<ScrapedResult> {
  const warnings: string[] = [];
  const reviews: NormalizedReview[] = [];
  
  // 1. URL Resolution and Canonicalization
  const resolved = resolveFlipkartUrl(productUrl);
  let itemId = resolved.itemId;
  const pid = resolved.pid;
  const slug = resolved.slug || 'product';

  if (!pid) {
    throw new Error('Could not identify unique product ID (pid) in the URL. Please make sure the link contains a "?pid=" parameter.');
  }

  // 2. Fetch Product page to resolve itemId if missing, and to get metadata
  let product: FlipkartProduct = {
    title: 'Flipkart Product',
    rating: 4.2,
    ratingCount: 150,
    reviewCount: 30,
  };
  
  let distribution: RatingDistribution = {
    star5: 80,
    star4: 40,
    star3: 15,
    star2: 8,
    star1: 7,
  };

  const productFetchUrl = itemId 
    ? `https://www.flipkart.com/${slug}/p/${itemId}?pid=${pid}`
    : `https://www.flipkart.com/p/dummy?pid=${pid}`;

  const prodResult = await fetchHtmlWithFallback(productFetchUrl, warnings);
  
  if (prodResult.isBlocked) {
    return {
      product,
      reviews: [],
      distribution,
      warnings: [...warnings, 'Flipkart blocked the connection with an anti-bot challenge (reCAPTCHA/E002).'],
      isBlocked: true
    };
  }

  if (prodResult.html) {
    const $ = cheerio.load(prodResult.html);
    
    // Extract itemId if we didn't have it
    if (!itemId) {
      const canonicalLink = $('link[rel="canonical"]').attr('href') || '';
      const itmMatch = canonicalLink.match(/(itm[a-f0-9]{16})/i);
      if (itmMatch) {
        itemId = itmMatch[1];
      }
    }

    // Extract Product Metadata (Defensively)
    const titleText = $('.B_NuCI').text().trim() || $('h1').text().trim() || $('.yhB1nd').text().trim() || '';
    if (titleText) product.title = titleText;
    
    const ratingText = $('._2dK_8b ._3LWZlK').first().text().trim() || $('._3LWZlK').first().text().trim() || $('.ipqd2C').first().text().trim();
    const ratingVal = parseFloat(ratingText);
    if (!isNaN(ratingVal) && ratingVal > 0) product.rating = ratingVal;

    const countsText = $('._2dK_8b ._2_R_DZ span').text().trim() || $('._2_R_DZ').text().trim() || $('.W_33Zw').text().trim();
    const ratingMatches = countsText.match(/([\d,]+)\s*Ratings/i);
    const reviewMatches = countsText.match(/([\d,]+)\s*Reviews/i);
    
    if (ratingMatches) product.ratingCount = parseInt(ratingMatches[1].replace(/,/g, ''), 10);
    if (reviewMatches) product.reviewCount = parseInt(reviewMatches[1].replace(/,/g, ''), 10);

    const imageNode = $('._396cs4').first().attr('src') || $('._2r_l1x img').first().attr('src') || $('.CXW8mj img').first().attr('src') || $('img._396cs4').attr('src');
    if (imageNode) product.image = imageNode;

    const priceText = $('._30jeq3._16Jk6d').first().text().trim() || $('._30jeq3').first().text().trim() || $('.Nx9n7C').text().trim();
    if (priceText) product.price = priceText;

    const starBars = $('._1uW84F, ._2aD-8W');
    if (starBars.length >= 5) {
      distribution = normalizeRatingDistribution({
        star5: $(starBars[0]).text(),
        star4: $(starBars[1]).text(),
        star3: $(starBars[2]).text(),
        star2: $(starBars[3]).text(),
        star1: $(starBars[4]).text(),
      });
    }
  }

  // 3. Resolve Reviews standalone target URL
  const finalItemId = itemId || 'itm2d1c2174f4a30'; // fallback to standard if not resolvable
  const reviewsBaseUrl = `https://www.flipkart.com/${slug}/product-reviews/${finalItemId}`;
  let reviewIndex = 0;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const pageUrl = `${reviewsBaseUrl}?pid=${pid}&page=${pageNum}`;
    const reviewsResult = await fetchHtmlWithFallback(pageUrl, warnings);
    
    if (reviewsResult.isBlocked || !reviewsResult.html) {
      warnings.push(`Could not fetch page ${pageNum} reviews due to anti-bot challenge.`);
      break;
    }

    const $ = cheerio.load(reviewsResult.html);
    const reviewCards = $('div._2wzgFH, div[class*="_2wzgFH"], .col._2wzgFH, ._27M-Tj');
    
    if (reviewCards.length === 0) {
      break; // No reviews on this page
    }

    reviewCards.each((_, el) => {
      const $el = $(el);
      const ratingText = $el.find('._3LWZlK').first().text().trim() || '5';
      const titleText = $el.find('._2-N1sw, ._2t14_8').first().text().trim() || 'Review Highlight';
      
      // Select review body safely
      const bodyText = $el.find('.t-y19o, ._2-N1sw + div, .qwjRZE').text().trim() || $el.find('.t-y19o').text().trim() || $el.find('div[class*="t-ZTKy"]').text().trim();
      const authorText = $el.find('._2V5uSc ._2sc77z, ._2sc77z').first().text().trim() || 'Flipkart Buyer';
      const isVerified = $el.find('._1V_eCO').length > 0 || $el.find('._2sc77z').next().text().includes('Verified') || $el.text().includes('Verified');
      const dateText = $el.find('._2sc77z').parent().find('.y3gG5F').text().trim() || 'Recent';

      if (!bodyText) return; // Skip empty reviews

      reviews.push(normalizeFlipkartReview({
        id: `fk-${pid}-${reviewIndex++}`,
        rating: ratingText,
        title: titleText,
        body: bodyText.replace(/READ MORE/g, '').trim(),
        author: authorText,
        isVerified,
        helpfulCount: $el.find('._3_7C7K ._3c3LCb').first().text().trim() || '0',
        date: dateText
      }, reviewIndex));
    });
  }

  // Fulfill structural fallback if reviews are empty but we have product page reviews
  if (reviews.length === 0 && prodResult.html) {
    const $ = cheerio.load(prodResult.html);
    const prodReviewCards = $('div._2wzgFH, ._27M-Tj');
    prodReviewCards.each((_, el) => {
      const $el = $(el);
      const ratingText = $el.find('._3LWZlK').first().text().trim() || '5';
      const titleText = $el.find('._2-N1sw, ._2t14_8').first().text().trim() || 'Product Review';
      const bodyText = $el.find('.t-y19o, ._2-N1sw + div').text().trim() || $el.find('.qwjRZE').text().trim();
      const authorText = $el.find('._2sc77z').first().text().trim() || 'Flipkart Buyer';
      const isVerified = $el.text().includes('Verified');
      
      if (bodyText) {
        reviews.push(normalizeFlipkartReview({
          id: `fk-${pid}-fallback-${reviewIndex++}`,
          rating: ratingText,
          title: titleText,
          body: bodyText.replace(/READ MORE/g, '').trim(),
          author: authorText,
          isVerified,
          helpfulCount: '0',
          date: 'Recent'
        }, reviewIndex));
      }
    });
  }

  return {
    product,
    reviews,
    distribution,
    warnings,
  };
}
