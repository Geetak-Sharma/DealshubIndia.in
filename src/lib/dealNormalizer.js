/**
 * Shared Deal Normalization Utilities for DealsHub India.
 * Implements a single source of truth for programmatic title cleaning,
 * currency sanitization, signature deduplication, coupon extraction,
 * bank offer detection, and variant drawer mapping.
 */

/**
 * Programmatic clean helper for deal titles.
 * Removes raw hashtags, "sale -" suffixes, and collapses white space.
 */
export function cleanTitle(str) {
  if (!str) return "";
  let val = str;
  // Remove hashtags (e.g. #amazon, #flipkart)
  val = val.replace(/#\w+/gi, "");
  // Remove "sale -" suffixes and variations
  val = val.replace(/sale\s*-/gi, "");
  // Collapse excessive white spaces
  val = val.replace(/\s+/g, " ").trim();
  return val;
}

/**
 * Price normalizer.
 * Removes duplicate Rupee symbols, spaces, and formatting flags.
 */
export function cleanPriceString(pStr) {
  if (!pStr) return "";
  let cleaned = String(pStr).replace(/[₹\s]/g, "").trim();
  if (cleaned.startsWith("₹")) {
    cleaned = cleaned.substring(1).trim();
  }
  return cleaned;
}

/**
 * Normalizes Telegram URLs.
 * Replaces the bad alias DealsHubIndiaa with DealsHubIndia.
 */
export function cleanUrl(url) {
  if (!url) return "";
  let val = String(url).trim();
  val = val.replace(/t\.me\/DealsHubIndiaa/gi, "t.me/DealsHubIndia");
  return val;
}

/**
 * Programmatic deduplication helper.
 * Filters out duplicate items based on normalized titles and URL configurations.
 */
export function deduplicateDeals(dealsList) {
  if (!Array.isArray(dealsList)) return [];
  const seen = new Set();
  return dealsList.filter(item => {
    const rawTitleText = item.title || "";
    const rawLinkText = item.link || item.url || "";
    
    // Normalize keys
    const titleKey = cleanTitle(rawTitleText).toLowerCase().replace(/\s+/g, "");
    const linkKey = cleanUrl(rawLinkText).trim();
    const dedupeKey = `${titleKey}|${linkKey}`;
    
    if (seen.has(dedupeKey)) {
      return false;
    }
    seen.add(dedupeKey);
    return true;
  });
}

/**
 * Extract Coupon text from deal title and body text.
 * e.g. "Apply 34% Off Coupon" or "Apply ₹490 Coupon"
 */
export function extractCoupon(rawTitle, text) {
  const combined = `${rawTitle || ''} ${text || ''}`.replace(/[\u200e\u200f\u200b\uFEFF]/g, ' ');
  const couponMatch = combined.match(/apply\s*(?:₹\s*(\d+)(?:\s*off)?|\s*(\d+)%\s*off)\s*coupon/i)
    || combined.match(/(\d+)%\s*off\s*coupon/i);
  if (couponMatch) {
    if (couponMatch[1]) {
      return `Apply ₹${couponMatch[1]} Coupon`;
    } else if (couponMatch[2]) {
      return `Apply ${couponMatch[2]}% Off Coupon`;
    } else {
      return couponMatch[0].trim();
    }
  }
  return undefined;
}

/**
 * Detect Bank Card Offers: HDFC, SBI, ICICI, Axis, Federal, Kotak, Cashback Card
 * e.g. "₹17,500 Off with HDFC Bank Credit Card" or "5% Cashback with SBI Card"
 */
export function extractBankOffer(rawTitle, text) {
  const cleanSource = `${rawTitle || ''} ${text || ''}`
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/cashback card on all online transactions/gi, '')
    .replace(/for under 99 deals join[^\n]*/gi, '')
    .replace(/for mobile & electronics offer[^\n]*/gi, '')
    .replace(/mobile & electronics offer[^\n]*/gi, '')
    .replace(/[\u200e\u200f\u200b\uFEFF]/g, ' ');

  const bankPatterns = [
    /(?:(?:flat|extra|get|upto|up\s*to)?\s*(?:₹\s*[\d,]+|\d+%\s*(?:instant\s*discount|cashback|off))(?:\s*(?:off|cashback|discount))?\s*(?:with|on|using)?\s*(?:hdfc|sbi|icici|axis|federal|kotak|onecard|bob|idfc)\s*(?:bank|credit\s*card|debit\s*card|card|cards)?)/i,
    /(?:(?:hdfc|sbi|icici|axis|federal|kotak|onecard)\s*(?:bank|credit\s*card|debit\s*card|card|cards)?\s*(?:offer|discount)?\s*[:\-–]?\s*(?:flat|extra|upto|up\s*to)?\s*(?:₹\s*[\d,]+|\d+%\s*(?:off|cashback|discount))(?:\s*(?:off|cashback|discount))?)/i,
    /(?:(?:with|using)\s*(?:hdfc|sbi|icici|axis|federal|kotak)\s*(?:bank|credit\s*card|debit\s*card|card|cards)?)/i
  ];

  for (const bp of bankPatterns) {
    const bm = cleanSource.match(bp);
    if (bm) {
      let candidate = bm[0].trim().replace(/\s+/g, ' ').replace(/[:\-–,\.]+$/, '').trim();
      candidate = candidate.replace(/\s+(?:for|offer|join|and|&)+$/i, '').trim();
      if (candidate.length >= 6) {
        return candidate;
      }
    }
  }
  return undefined;
}

export function cleanExtractedUrl(rawUrl) {
  if (!rawUrl) return '';
  let u = String(rawUrl).trim();
  u = u.split(/[\p{Extended_Pictographic}\u200d\uFE0F\u200e\u200f\u200b\uFEFF]/u)[0].trim();
  u = u.split(/_{3,}/)[0].trim();
  u = u.replace(/[\.,:;]+$/, '').trim();
  return u;
}

/**
 * Multi-Link Variant Extraction:
 * Extracts secondary links with labels and prices from msgHtml or text.
 * Returns array of { title: string, url: string, price?: string }
 */
export function extractVariants(item, primaryUrl) {
  const isExcludedUrl = (u) => !u || !u.startsWith('http') || /whatsapp|t\.me|telegram|\?q=/i.test(u);
  const variants = [];
  const targetPrimary = cleanExtractedUrl(primaryUrl || item.checkoutUrl || item.url || '');

  // 1. Try msgHtml first if available
  if (item.msgHtml) {
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    const matches = [...item.msgHtml.matchAll(linkRegex)];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const url = cleanExtractedUrl(match[1]);
      if (isExcludedUrl(url) || url === targetPrimary || variants.some(v => v.url === url)) continue;

      const prevEnd = i > 0 ? matches[i-1].index + matches[i-1][0].length : 0;
      const textBetween = item.msgHtml.substring(prevEnd, match.index);

      const lines = textBetween
        .split(/<br\s*\/?>|\n/i)
        .map(l => l.replace(/<[^>]+>/g, '').replace(/[\u200e\u200f\u200b\uFEFF]/g, '').trim())
        .filter(l => l && !l.startsWith('#') && !l.includes('____') && !/under\s*99\s*deals/i.test(l));

      let candidateTitle = '';
      for (const line of lines) {
        if (!candidateTitle && !line.toLowerCase().startsWith('apply ') && !line.toLowerCase().startsWith('coupon') && line.length > 3) {
          candidateTitle = line;
        }
      }
      if (!candidateTitle && lines.length > 0) candidateTitle = lines[0];

      candidateTitle = candidateTitle
        .replace(/^[\p{Extended_Pictographic}\s]+/gu, '')
        .replace(/#\w+/gi, '')
        .replace(/^(?:amazon|flipkart|myntra|ajio|croma|meesho)\s*[:|\-–]\s*/i, '')
        .replace(/sale\s*-/gi, '')
        .replace(/\s*\.?\s*Apply\s*(?:₹\s*\d+|\d+%)\s*Off\s*Coupon.*$/i, '')
        .replace(/[:|\-–\.]+$/, '')
        .trim();

      const pMatch = candidateTitle.match(/(?:@|at\s*|₹|Rs\.?\s*)([0-9,]+)/i);
      const price = pMatch ? pMatch[1].replace(/,/g, '') : undefined;

      if (candidateTitle && candidateTitle.length >= 3 && !candidateTitle.toLowerCase().startsWith('apply ')) {
        variants.push({
          title: candidateTitle,
          url,
          ...(price ? { price } : {})
        });
      }
    }
  }

  // 2. Fallback to text if no variants found from HTML
  if (variants.length === 0 && item.text) {
    const urlMatches = [...item.text.matchAll(/https?:\/\/[^\s#<>"']+/gi)];
    for (let i = 0; i < urlMatches.length; i++) {
      const url = cleanExtractedUrl(urlMatches[i][0]);
      if (isExcludedUrl(url) || url === targetPrimary || variants.some(v => v.url === url)) continue;

      const prevEnd = i > 0 ? urlMatches[i-1].index + urlMatches[i-1][0].length : 0;
      const textBetween = item.text.substring(prevEnd, urlMatches[i].index);
      const lines = textBetween.split('\n')
        .map(l => l.replace(/[\u200e\u200f\u200b\uFEFF]/g, '').trim())
        .filter(l => l && !l.startsWith('#') && !l.includes('____') && !/under\s*99\s*deals/i.test(l));

      let candidateTitle = lines[lines.length - 1] || '';
      candidateTitle = candidateTitle
        .replace(/^[\p{Extended_Pictographic}\s]+/gu, '')
        .replace(/#\w+/gi, '')
        .replace(/^(?:amazon|flipkart|myntra|ajio|croma|meesho)\s*[:|\-–]\s*/i, '')
        .replace(/sale\s*-/gi, '')
        .replace(/\s*\.?\s*Apply\s*(?:₹\s*\d+|\d+%)\s*Off\s*Coupon.*$/i, '')
        .replace(/[:|\-–\.]+$/, '')
        .trim();

      const pMatch = candidateTitle.match(/(?:@|at\s*|₹|Rs\.?\s*)([0-9,]+)/i);
      const price = pMatch ? pMatch[1].replace(/,/g, '') : undefined;

      if (candidateTitle && candidateTitle.length >= 3 && !candidateTitle.toLowerCase().startsWith('apply ')) {
        variants.push({
          title: candidateTitle,
          url,
          ...(price ? { price } : {})
        });
      }
    }
  }

  return variants;
}

/**
 * Budget Tagging:
 * numPrice <= 99 && numPrice > 0 -> "under99"
 * numPrice <= 499 && numPrice > 0 -> "under499"
 */
export function getBudgetTier(numPrice) {
  if (numPrice <= 99 && numPrice > 0) return "under99";
  if (numPrice <= 499 && numPrice > 0) return "under499";
  return undefined;
}
