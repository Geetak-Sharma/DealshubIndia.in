/**
 * Affiliate link protection for QC posts.
 * Strips DealBee tracking params, redirect wrappers, and UTM pollution.
 * Returns both the original URL and the clean destination URL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let _config = null;
function getConfig() {
  if (!_config) {
    try {
      _config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/qc_config.json'), 'utf-8'));
    } catch {
      _config = { brand: { removeLinks: ['t.me/dealbee', 'dealbeetricks'] } };
    }
  }
  return _config;
}

// ─── Tracking params to strip ─────────────────────────────────────────────────

const STRIP_PARAMS = [
  // DealBee specific
  'ref', 'referral', 'dealbee', 'dbtrk', 'dbref', 'db_ref', 'db_src',
  // Generic affiliate/tracking
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'twclid',
  'affiliate', 'aff', 'aff_id', 'aff_sub', 'affid',
  'source', 'src', 'partner', 'partnerid',
  'tag', 'linkid', 'clickid', 'click_id',
];

// ─── DealBee redirect wrappers ────────────────────────────────────────────────
// These domains are known to be DealBee tracking redirectors

const DEALBEE_REDIRECT_HOSTS = [
  'dealbeetricks.com',
  'dealbeeofficial.com',
  'dealbee.link',
  'db.link',
];

/**
 * Detects if a URL is a DealBee redirect wrapper and extracts the destination.
 */
function unwrapRedirect(urlStr) {
  try {
    const u = new URL(urlStr);
    // Is it a known DealBee redirect host?
    if (DEALBEE_REDIRECT_HOSTS.some(h => u.hostname.endsWith(h))) {
      // Try common dest/url/link/href params
      for (const param of ['url', 'link', 'href', 'dest', 'destination', 'redirect', 'goto']) {
        const dest = u.searchParams.get(param);
        if (dest && dest.startsWith('http')) {
          return dest;
        }
      }
      // If no dest param found, just return the URL path as-is (better than blank)
      return urlStr;
    }
    return urlStr;
  } catch {
    return urlStr;
  }
}

/**
 * Strips all known tracking parameters from a URL.
 */
function stripTrackingParams(urlStr) {
  try {
    const u = new URL(urlStr);
    for (const param of STRIP_PARAMS) {
      u.searchParams.delete(param);
    }
    // Also strip any param that starts with utm_ or db_
    const toDelete = [];
    for (const [key] of u.searchParams.entries()) {
      if (key.startsWith('utm_') || key.startsWith('db_') || key.startsWith('aff')) {
        toDelete.push(key);
      }
    }
    toDelete.forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Clean a Telegram-sourced deal URL.
 * @param {string} rawUrl  - Raw URL from Telegram post
 * @param {string} postId  - For logging
 * @returns {{ originalUrl: string, cleanUrl: string }}
 */
export function cleanAffiliateUrl(rawUrl, postId = '') {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { originalUrl: rawUrl, cleanUrl: rawUrl };
  }

  const config = getConfig();
  const brand  = config.brand || {};

  // 1. Check if URL contains DealBee link domains (from config)
  const removeLinks = brand.removeLinks || [];
  const isDealbeeLink = removeLinks.some(link => rawUrl.includes(link));

  // 2. Try to unwrap redirect wrapper
  let url = isDealbeeLink ? unwrapRedirect(rawUrl) : rawUrl;

  // 3. Strip tracking parameters
  url = stripTrackingParams(url);

  if (url.toLowerCase().includes('zepto')) {
    try {
      const u = new URL(url);
      let deepLink = u.searchParams.get('deep_link_value');
      if (deepLink) {
        deepLink = decodeURIComponent(deepLink);
        if (deepLink.startsWith('http')) {
          url = deepLink;
        }
      }
    } catch {}
    url = url.replace(/zepto\.co\.in/gi, 'zepto.com');
  }

  // Log if we changed the URL
  if (url !== rawUrl && postId) {
    console.log(`[QC-AFFILIATE] Cleaned URL for ${postId}: ${rawUrl.slice(0, 60)} → ${url.slice(0, 60)}`);
  }

  return {
    originalUrl: rawUrl,
    cleanUrl:    url,
  };
}

/**
 * Checks if a URL is a known DealBee affiliate/redirect URL.
 */
export function isDealbeeUrl(urlStr) {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  return DEALBEE_REDIRECT_HOSTS.some(h => lower.includes(h));
}

/**
 * Validates if the destination URL is NOT an image asset, Telegram file, or competitor/source domain.
 */
export function isValidDestinationUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const u = urlStr.toLowerCase().split(/[?#]/)[0];
  
  // Reject images
  if (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp') || u.endsWith('.gif')) {
    return false;
  }
  
  // Reject Telegram files/CDNs, image hosting APIs, and competitor/source forums/sites
  if (
    u.includes('cdn4.telesco.pe') || 
    u.includes('cdn.telesco.pe') || 
    u.includes('t.me') || 
    u.includes('telegram.me') || 
    u.includes('telegram.org') || 
    u.includes('hcti.io') || 
    u.includes('imgur.com') ||
    u.includes('desidime.com') ||
    u.includes('desidime') ||
    u.includes('ddime.in') ||
    u.includes('ddime') ||
    u.includes('dealbee') ||
    u.includes('coolztricks') ||
    u.includes('decathlon') ||
    u.includes('affiliate') ||
    u.includes('blog') ||
    u.includes('onelink.me') ||
    u.includes('appsflyer')
  ) {
    return false;
  }
  
  return true;
}

/**
 * Validates if a URL is reachable (returns non-404 status).
 * Direct merchant URLs are trusted to bypass Cloudflare scraping block.
 */
export async function isReachable(urlStr) {
  if (!urlStr) return false;
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    
    // Direct trusted merchants bypass CF/auth blocks
    const trusted = ['swiggy.com', 'blinkit.com', 'zepto.com', 'bigbasket.com', 'magicpin.in', 'zomato.com'];
    if (trusted.some(t => host.endsWith(t))) {
      return true;
    }

    // Fast HEAD check
    const headRes = await axios({
      method: 'HEAD',
      url: urlStr,
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      validateStatus: (status) => status !== 404 && status < 500
    });
    return true;
  } catch {
    try {
      // Fallback to fast GET
      const getRes = await axios({
        method: 'GET',
        url: urlStr,
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        responseType: 'stream',
        validateStatus: (status) => status !== 404 && status < 500
      });
      if (getRes.data && typeof getRes.data.destroy === 'function') {
        getRes.data.destroy();
      }
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Follows redirect headers for shortened URLs (amzn.to, bittli.in, tinyurl, etc.)
 * to resolve the final destination URL.
 */
export async function resolveFinalUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return urlStr || '';

  const domainsToResolve = [
    'bit.ly', 'tinyurl.com', 'amzn.to', 'bittli.in', 'fkrt.cc', 'fkrt.co', 
    't.co', 'tr.ee', 'rebrand.ly', 'shorturl.at', 'is.gd', 'buff.ly', 
    'ady.io', 'v.ht', 'ow.ly', 't.ly', 'bitly.com', 'tiny.cc', 'ddime.in',
    'onelink.me'
  ];

  try {
    const u = new URL(urlStr);
    const isShortened = domainsToResolve.some(d => u.hostname.endsWith(d)) || u.hostname.includes('onelink.me');
    if (!isShortened) return urlStr;

    const response = await axios({
      method: 'GET',
      url: urlStr,
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      responseType: 'stream',
      validateStatus: () => true
    });

    const finalUrl = response.request?.res?.responseUrl || response.headers?.location || urlStr;
    if (response.data && typeof response.data.destroy === 'function') {
      response.data.destroy();
    }
    return finalUrl;
  } catch (e) {
    return urlStr;
  }
}

/**
 * Helper to build the merchant search URL dynamically from qc_routing.json
 */
export function buildMerchantSearchUrl(merchantName, productName, routingConfig) {
  const merchantConfig = routingConfig[merchantName];
  if (!merchantConfig) return null;
  const domain = merchantConfig.domain;
  const path = merchantConfig.searchPath;
  const param = merchantConfig.queryParam;
  return `${domain}${path}?${param}=${encodeURIComponent(productName)}`;
}

/**
 * Checks if a URL points to a generic merchant homepage instead of a specific deal/product.
 */
export function isGenericHomepage(urlStr) {
  if (!urlStr) return false;
  try {
    const u = new URL(urlStr);
    const path = u.pathname.replace(/^\/+|\/+$/g, '');
    if (path.length > 2) {
      return false;
    }
    
    // Load config dynamically
    const routingConfigPath = path.resolve(__dirname, '../data/qc_routing.json');
    let routingConfig = {};
    if (fs.existsSync(routingConfigPath)) {
      routingConfig = JSON.parse(fs.readFileSync(routingConfigPath, 'utf-8'));
    }
    
    const host = u.hostname.toLowerCase();
    const genericHosts = Object.values(routingConfig).map(cfg => {
      try {
        return new URL(cfg.domain).hostname.toLowerCase();
      } catch {
        return '';
      }
    }).filter(Boolean);

    // Fallbacks
    genericHosts.push('swiggy.com', 'blinkit.com', 'zepto.co.in', 'zepto.com', 'bigbasket.com', 'zomato.com', 'magicpin.in');
    
    return genericHosts.some(h => host === h || host === `www.${h}`);
  } catch {
    return false;
  }
}

/**
 * Generates route properties using strict fallback priority routing
 */

/**
 * Resolves a Zepto URL to its canonical web product page.
 * If canonical product page cannot be generated (e.g. uncl/buy-now or home page), returns null.
 */
export function resolveZeptoUrl(urlStr, productName, routingConfig) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  
  const zeptoConfig = routingConfig['Zepto'] || { domain: 'https://www.zepto.com' };
  const baseDomain = zeptoConfig.domain;

  try {
    let currentUrl = urlStr;
    const u = new URL(urlStr);

    // Extract deep_link_value if present
    let deepLink = u.searchParams.get('deep_link_value');
    if (deepLink) {
      deepLink = decodeURIComponent(deepLink);
      if (deepLink.startsWith('http')) {
        currentUrl = deepLink;
      } else if (deepLink.startsWith('zepto://')) {
        const match = deepLink.match(/zepto:\/\/products\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `${baseDomain}/pn/${match[1]}`;
        }
      }
    }

    const cleanU = new URL(currentUrl);
    const host = cleanU.hostname.toLowerCase();
    
    // Convert domains like zepto.co.in to zepto.com
    if (host.includes('zepto')) {
      cleanU.hostname = new URL(baseDomain).hostname;
    }

    const pathVal = cleanU.pathname;
    if (host.includes('zepto') && !host.includes('onelink.me') && !host.includes('appsflyer')) {
      if ((pathVal.includes('/pn/') || pathVal.includes('/p/')) && !pathVal.includes('/uncl/') && !pathVal.includes('/buy-now/')) {
        return `${baseDomain}${pathVal}`;
      }
    }
  } catch (e) {
    console.error('[ZEPTO-RESOLVE-ERROR]', e.message);
  }

  return null;
}

export async function resolveRouting(rawUrlOrUrls, productName, merchantName) {
  // Load dynamic qc_routing.json
  const routingConfigPath = path.resolve(__dirname, '../data/qc_routing.json');
  let routingConfig = {};
  try {
    if (fs.existsSync(routingConfigPath)) {
      routingConfig = JSON.parse(fs.readFileSync(routingConfigPath, 'utf-8'));
    }
  } catch (err) {
    console.error('[QC-ROUTING] Failed to load qc_routing.json:', err.message);
  }

  let finalUrl = '';
  let destinationType = 'google-search';
  let routingQualityScore = 40;

  const productNameClean = productName ? productName.trim() : '';
  const merchantClean = merchantName || 'Quick Commerce';

  // Build merchant search fallback immediately
  const buildSearchFallback = () => {
    const merchantConfig = routingConfig[merchantClean];
    if (merchantConfig) {
      const domain = merchantConfig.domain;
      const pathVal = merchantConfig.searchPath;
      const param = merchantConfig.queryParam;
      return `${domain}${pathVal}?${param}=${encodeURIComponent(productNameClean)}`;
    }
    return `https://www.google.com/search?q=${productNameClean.replace(/\s+/g, '+')}+site:${merchantClean.toLowerCase().replace(/\s+/g, '')}.com`;
  };

  const urlsToTry = Array.isArray(rawUrlOrUrls) 
    ? rawUrlOrUrls 
    : (rawUrlOrUrls ? [rawUrlOrUrls] : []);

  // Filter out Telegram URLs and empty candidate links
  const externalUrls = urlsToTry.filter(u => u && typeof u === 'string' && u.startsWith('http') && !u.includes('t.me/') && !u.includes('telegram.org'));

  // If no external deal link was present in the Telegram post, fallback to merchant base URL and flag as no-link
  if (externalUrls.length === 0) {
    const merchantConfig = routingConfig[merchantClean];
    const baseDomain = merchantConfig ? merchantConfig.domain : 'https://www.google.com';
    return {
      finalUrl: baseDomain,
      destinationType: 'no-link',
      routingQualityScore: 50
    };
  }

  // Domain Health Validation logic
  const isMerchantDomainHealthy = async (mName) => {
    const mCfg = routingConfig[mName];
    if (!mCfg) return false;
    if (mCfg.healthStatus === 'healthy') {
      try {
        const headRes = await axios({
          method: 'HEAD',
          url: mCfg.domain,
          timeout: 2000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
          validateStatus: (status) => status < 500
        });
        mCfg.healthStatus = 'healthy';
        mCfg.lastChecked = new Date().toISOString();
        fs.writeFileSync(routingConfigPath, JSON.stringify(routingConfig, null, 2));
        return true;
      } catch {
        console.warn(`[QC-HEALTH-WARN] Merchant ${mName} domain health validation check timed out.`);
        return true;
      }
    }
    return false;
  };

  // Helper for Search URL Fallbacks using buildMerchantSearchUrl
  const generateSearchUrl = async () => {
    const isHealthy = await isMerchantDomainHealthy(merchantClean);
    const searchUrl = isHealthy ? buildMerchantSearchUrl(merchantClean, productNameClean, routingConfig) : null;
    
    if (searchUrl) {
      finalUrl = searchUrl;
      destinationType = 'merchant-search';
      routingQualityScore = 70;
    } else {
      let siteDomain = '';
      if (routingConfig[merchantClean]) {
        try {
          const u = new URL(routingConfig[merchantClean].domain);
          siteDomain = u.hostname.replace('www.', '');
        } catch {}
      }
      if (siteDomain) {
        // Replace spaces with + to match required format
        const query = productNameClean.replace(/\s+/g, '+');
        finalUrl = `https://www.google.com/search?q=${query}+site:${siteDomain}`;
      } else {
        const query = (productNameClean + ' ' + merchantClean).trim().replace(/\s+/g, '+');
        finalUrl = `https://www.google.com/search?q=${query}`;
      }
      destinationType = 'google-search';
      routingQualityScore = 40;
    }
  };

  let resolvedSuccessfully = false;

  for (const urlCandidate of urlsToTry) {
    if (urlCandidate && typeof urlCandidate === 'string' && urlCandidate.startsWith('http')) {
      try {
        const u = new URL(urlCandidate);
        const host = u.hostname.toLowerCase();
        
        // Follow redirects to get final destination
        let resolved = await resolveFinalUrl(urlCandidate);
        
        // If Zepto link, run custom Zepto resolution
        if (resolved.toLowerCase().includes('zepto') || urlCandidate.toLowerCase().includes('zepto')) {
          const canonicalZepto = resolveZeptoUrl(resolved, productNameClean, routingConfig);
          if (canonicalZepto) {
            finalUrl = canonicalZepto;
            destinationType = 'merchant-url';
            routingQualityScore = 100;
            resolvedSuccessfully = true;
            break;
          } else {
            // Cannot generate canonical, fallback to merchant search
            const searchUrl = buildMerchantSearchUrl('Zepto', productNameClean, routingConfig);
            if (searchUrl) {
              finalUrl = searchUrl;
              destinationType = 'merchant-search';
              routingQualityScore = 70;
              resolvedSuccessfully = true;
              break;
            }
          }
        }

        const { cleanUrl } = cleanAffiliateUrl(resolved);

        if (isValidDestinationUrl(cleanUrl) && !isGenericHomepage(cleanUrl) && await isReachable(cleanUrl)) {
          finalUrl = cleanUrl;
          const shortlinkDomains = [
            'bit.ly', 'tinyurl.com', 'amzn.to', 'bittli.in', 'fkrt.cc', 'fkrt.co', 
            't.co', 'tr.ee', 'rebrand.ly', 'shorturl.at', 'is.gd', 'buff.ly', 
            'ady.io', 'v.ht', 'ow.ly', 't.ly', 'bitly.com', 'tiny.cc', 'ddime.in'
          ];
          const isOriginallyShortlink = shortlinkDomains.some(d => host.endsWith(d)) || urlCandidate !== resolved;

          if (isOriginallyShortlink) {
            destinationType = 'resolved-shortlink';
            routingQualityScore = 90;
          } else {
            destinationType = 'merchant-url';
            routingQualityScore = 100;
          }
          resolvedSuccessfully = true;
          break;
        }
      } catch (err) {
        // Continue to next candidate
      }
    }
  }

  if (!resolvedSuccessfully) {
    await generateSearchUrl();
  }

  return {
    finalUrl,
    destinationType,
    routingQualityScore
  };
}
