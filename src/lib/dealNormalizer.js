/**
 * Shared Deal Normalization Utilities for DealsHub India.
 * Implements a single source of truth for programmatic title cleaning,
 * currency sanitization, and signature deduplication.
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
