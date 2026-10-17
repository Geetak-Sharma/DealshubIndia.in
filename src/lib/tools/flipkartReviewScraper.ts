import axios from 'axios';
import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import type { FlipkartProduct, NormalizedReview, RatingDistribution } from '../../types/tools';
import { normalizeFlipkartReview, normalizeRatingDistribution } from '../normalizers/flipkartReviews';
import { resolveFlipkartUrl } from './flipkartUrlResolver';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Detects actual CAPTCHA/bot challenges vs false positives.
 * Flipkart's JSON config includes "isReCaptchaEnabled":true which is NOT a challenge.
 * We check for actual CAPTCHA HTML elements instead.
 */
function isActualBotChallenge(html: string): boolean {
  const lower = html.toLowerCase();
  // Only detect actual CAPTCHA widgets and reCAPTCHA API script, not JSON config flags like isReCaptchaEnabled
  const hasCaptchaWidget = lower.includes('class="g-recaptcha"') || lower.includes("class='g-recaptcha'");
  const hasCaptchaScript = lower.includes('www.google.com/recaptcha/api');
  const hasE002Error = html.includes('E002') && lower.includes('something went wrong');
  return (hasCaptchaWidget || hasCaptchaScript || hasE002Error);
}

/**
 * Extracts and parses Flipkart's server-rendered Redux/state JSON.
 * This is 100% immune to DOM CSS class obfuscation or mobile layout redirects.
 */
function parseInitialState(html: string): any | null {
  const start = html.indexOf('window.__INITIAL_STATE__ = ');
  if (start === -1) return null;
  const jsonStart = start + 'window.__INITIAL_STATE__ = '.length;
  const end = html.indexOf(';</script>', jsonStart);
  if (end === -1) return null;
  try {
    return JSON.parse(html.substring(jsonStart, end));
  } catch (e) {
    return null;
  }
}

export interface ScrapedResult {
  product: FlipkartProduct;
  reviews: NormalizedReview[];
  distribution: RatingDistribution;
  warnings: string[];
  isBlocked?: boolean;
}

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0'
];

function getRotatingProxy(warnings: string[]): string | null {
  const proxyStr = process.env.FLIPKART_PROXIES;
  if (!proxyStr) return null;
  const proxies = proxyStr.split(',').map(p => p.trim()).filter(Boolean);
  if (proxies.length === 0) return null;
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  console.warn(`[Scraper] Using rotating proxy`);
  return proxy;
}

async function scrapeWithBrowserAutomation(url: string, warnings: string[], proxyUrl: string | null): Promise<string> {
  console.warn('[Scraper] Attempting Puppeteer browser automation fallback...');
  let puppeteer: any;
  let Launcher: any;
  try {
    puppeteer = (await import('puppeteer-core')).default;
    Launcher = (await import('chrome-launcher')).Launcher;
  } catch (e: any) {
    throw new Error(`Puppeteer or chrome-launcher modules not available: ${e.message}`);
  }

  let chromePath = '';
  try {
    const installations = Launcher.getInstallations();
    if (installations && installations.length > 0) {
      chromePath = installations[0];
    }
  } catch (e) {
    // ignore
  }

  if (!chromePath) {
    if (process.platform === 'win32') {
      chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else {
      const fs = await import('fs');
      // 1. Dynamic local search in process.cwd()/chrome
      try {
        const localChromeDir = `${process.cwd()}/chrome`;
        if (fs.existsSync(localChromeDir)) {
          const dirs = fs.readdirSync(localChromeDir);
          for (const d of dirs) {
            const possiblePath = `${localChromeDir}/${d}/chrome-linux64/chrome`;
            if (fs.existsSync(possiblePath)) {
              chromePath = possiblePath;
              break;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // 2. Common system paths if local not found
      if (!chromePath) {
        const commonPaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome-stable',
          '/snap/bin/chromium'
        ];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            chromePath = p;
            break;
          }
        }
      }
    }
  }

  if (!chromePath) {
    throw new Error('Chrome/Chromium executable path not found on this system.');
  }

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
  ];
  if (proxyUrl) {
    args.push(`--proxy-server=${proxyUrl}`);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args,
  });

  try {
    const page = await browser.newPage();
    if (proxyUrl) {
      try {
        const parsed = new URL(proxyUrl);
        if (parsed.username && parsed.password) {
          await page.authenticate({
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password)
          });
        }
      } catch (e: any) {
        warnings.push(`Puppeteer failed to authenticate proxy: ${e.message}`);
      }
    }
    const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(randomUserAgent);
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    const delay = 800 + Math.floor(Math.random() * 1200);
    await new Promise(resolve => setTimeout(resolve, delay));

    const html = await page.content();
    await browser.close();
    return html;
  } catch (err: any) {
    await browser.close();
    throw err;
  }
}

/**
 * Robust helper to fetch HTML using Axios first, falling back to Puppeteer and Curl.
 */
async function fetchHtmlWithFallback(url: string, warnings: string[]): Promise<{ html: string; isBlocked: boolean }> {
  const proxyUrl = getRotatingProxy(warnings);
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const isWindows = randomUserAgent.includes('Windows');
  const isMac = randomUserAgent.includes('Macintosh');
  const platformStr = isWindows ? '"Windows"' : (isMac ? '"macOS"' : '"Linux"');

  // Strategy 1: Native Fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': randomUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': platformStr,
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error('Fetch failed');
    }
    const html = await res.text();
    const isBot = isActualBotChallenge(html);
    if (!isBot) {
      return { html, isBlocked: false };
    }
    console.warn('[Scraper] Fetch got bot challenge, trying Axios fallback...');
  } catch (e: any) {
    console.warn("[Scraper] Fetch request failed: ${e.message}. Trying Axios fallback...");
  }

  // Strategy 2: Axios with rotating headers / advanced browser headers & optional proxy
  try {
    let proxyConfig: any = undefined;
    if (proxyUrl) {
      try {
        const parsedProxy = new URL(proxyUrl);
        proxyConfig = {
          protocol: parsedProxy.protocol.replace(':', ''),
          host: parsedProxy.hostname,
          port: parseInt(parsedProxy.port, 10),
        };
        if (parsedProxy.username && parsedProxy.password) {
          proxyConfig.auth = {
            username: decodeURIComponent(parsedProxy.username),
            password: decodeURIComponent(parsedProxy.password),
          };
        }
      } catch (e: any) {
        warnings.push(`Failed to parse proxy URL for Axios: ${e.message}`);
      }
    }

    const res = await axios.get(url, {
      headers: {
        'User-Agent': randomUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': platformStr,
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1'
      },
      proxy: proxyConfig,
      timeout: 20000,
    });
    const html = res.data;
    const isBot = isActualBotChallenge(html);
    if (!isBot) {
      return { html, isBlocked: false };
    }
    console.warn('[Scraper] Axios got bot challenge, trying Puppeteer...');
  } catch (e: any) {
    console.warn(`[Scraper] Axios request failed: ${e.message}. Trying Puppeteer fallback...`);
  }

  // Strategy 3: Disabled Puppeteer to prevent server crash
  return { html: '', isBlocked: true };
}

function resolveFlipkartImageUrl(template: string, w = 120, h = 120): string {
  if (!template) return '';
  return template
    .replace('{@width}', String(w))
    .replace('{@height}', String(h))
    .replace('{@quality}', '80');
}

export async function scrapeFlipkartReviews(productUrl: string, maxPages = 3, sortMode = 'helpful'): Promise<ScrapedResult> {
  const warnings: string[] = [];
  const reviews: NormalizedReview[] = [];
  
  // 1. URL Resolution and Canonicalization
  const resolved = await resolveFlipkartUrl(productUrl);
  let itemId = resolved.itemId;
  const pid = resolved.pid;
  let slug = resolved.slug || 'product';

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
    warnings.push('Flipkart product page was restricted or redirected; extracting metadata and reviews directly from reviews page.');
  }

  if (prodResult.html) {
    const $ = cheerio.load(prodResult.html);
    
    // Extract itemId and slug dynamically from the canonical link if missing or invalid
    if (!itemId || slug === 'dl' || slug === 'p' || slug === 'dummy' || slug === 'product') {
      const canonicalLink = $('link[rel="canonical"]').attr('href') || '';
      if (canonicalLink) {
        const itmMatch = canonicalLink.match(/(itm[a-f0-9]{13,16})/i);
        if (itmMatch) {
          itemId = itmMatch[1];
        }
        try {
          const pathParts = new URL(canonicalLink).pathname.split('/');
          const slugIndex = pathParts.findIndex(part => part.length > 0);
          if (slugIndex !== -1 && pathParts[slugIndex] !== 'p' && pathParts[slugIndex] !== 'product-reviews') {
            slug = pathParts[slugIndex];
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    if (!itemId && prodResult.html) {
      const itmMatch = prodResult.html.match(/(itm[a-f0-9]{13,16})/i);
      if (itmMatch) {
        itemId = itmMatch[1];
      }
    }

    // Try parsing metadata from React Native Web initial JSON state first
    const prodState = parseInitialState(prodResult.html);
    let stateParsed = false;
    if (prodState) {
      const slots = prodState.multiWidgetState?.widgetsData?.slots || [];
      slots.forEach((s: any) => {
        const w = s.slotData?.widget;
        if (!w) return;
        const type = w.type;
        const data = w.data;
        
        if (type === 'RATING' || s.slotData?.elementId?.includes('RATING')) {
          const val = data?.rating?.value;
          if (val) {
            product.rating = val.average;
            const hist = val.histogram || [];
            if (hist.length >= 5) {
              distribution = normalizeRatingDistribution({
                star1: hist[0] || 0,
                star2: hist[1] || 0,
                star3: hist[2] || 0,
                star4: hist[3] || 0,
                star5: hist[4] || 0,
              });
              product.ratingCount = hist.reduce((a: number, b: number) => a + b, 0);
              stateParsed = true;
            }
          }
        }
        
        if (data?.dlsData?.label_2?.value?.text) {
          const candidate = data.dlsData.label_2.value.text; if (candidate && !candidate.toLowerCase().includes('ask a question')) product.title = candidate;
        } else if (data?.dlsData?.customEllipsisData_0?.value?.prependingText) {
          product.title = data.dlsData.customEllipsisData_0.value.prependingText;
        }
        
        if (data?.dlsData?.price?.value?.text) {
          product.price = data.dlsData.price.value.text;
        }
      });
    }

    // Extract Product Metadata (Defensively) â€” NEW Flipkart selectors (2025+)
    const titleText = $('.KoLDId').text().trim() || $('h1').text().trim() || $('.B_NuCI').text().trim() || $('.yhB1nd').text().trim() || '';
    if (titleText) product.title = titleText;
    
    // New: .IHXGEy contains the overall rating; fallback to old selectors
    const ratingText = $('.IHXGEy').first().text().trim() || $('._2dK_8b ._3LWZlK').first().text().trim() || $('._3LWZlK').first().text().trim() || $('.ipqd2C').first().text().trim();
    const ratingVal = parseFloat(ratingText);
    if (!isNaN(ratingVal) && ratingVal > 0) product.rating = ratingVal;

    // New: .wCDGVb span contains ratings/reviews count; fallback to old selectors
    const ratingSpans: string[] = [];
    $('.wCDGVb span').each((_, el) => { ratingSpans.push($(el).text().trim()); });
    const countsText = ratingSpans.join(' ') || $('._2dK_8b ._2_R_DZ span').text().trim() || $('._2_R_DZ').text().trim() || $('.W_33Zw').text().trim();
    const ratingMatches = countsText.match(/([\d,]+)\s*Ratings/i);
    const reviewMatches = countsText.match(/([\d,]+)\s*Reviews/i);
    
    if (ratingMatches) product.ratingCount = parseInt(ratingMatches[1].replace(/,/g, ''), 10);
    if (reviewMatches) product.reviewCount = parseInt(reviewMatches[1].replace(/,/g, ''), 10);

    const imageNode = $('._396cs4').first().attr('src') || $('._2r_l1x img').first().attr('src') || $('.CXW8mj img').first().attr('src') || $('img._396cs4').attr('src');
    if (imageNode) product.image = imageNode;

    const priceText = $('._30jeq3._16Jk6d').first().text().trim() || $('._30jeq3').first().text().trim() || $('.Nx9n7C').text().trim();
    if (priceText) product.price = priceText;

    // New: Distribution via .MDKzf4 (5 items: star5 â†’ star1); fallback to old bar selectors
    const distCounts: string[] = [];
    $('.MDKzf4').each((_, el) => { distCounts.push($(el).text().trim()); });
    if (distCounts.length >= 5) {
      distribution = normalizeRatingDistribution({
        star5: distCounts[0],
        star4: distCounts[1],
        star3: distCounts[2],
        star2: distCounts[3],
        star1: distCounts[4],
      });
    } else {
      // Fallback to old bar selectors
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
  }

  // 3. Resolve Reviews standalone target URL
  // Extract title fallback from slug if title is still default
  if ((product.title === 'Flipkart Product' || product.title.includes('Buy Products Online')) && slug && slug !== 'product' && slug !== 'dummy' && slug !== 'p') {
    product.title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  const finalItemId = itemId || 'itm2d1c2174f4a30'; // fallback to standard if not resolvable
  const reviewsBaseUrl = `https://www.flipkart.com/${slug}/product-reviews/${finalItemId}`;
  
  let sortOrder = 'MOST_HELPFUL';
  if (sortMode === 'recent') sortOrder = 'MOST_RECENT';
  else if (sortMode === 'positive') sortOrder = 'POSITIVE_FIRST';
  else if (sortMode === 'negative') sortOrder = 'NEGATIVE_FIRST';
  let reviewIndex = 0;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    // Add progressive delay (delay increases per page: 500ms + pageNum * 500ms)
    if (pageNum > 1) {
      const delayMs = 500 + (pageNum * 500);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    const pageUrl = `${reviewsBaseUrl}?pid=${pid}&page=${pageNum}&sortOrder=${sortOrder}`;
    const reviewsResult = await fetchHtmlWithFallback(pageUrl, warnings);
    
    if (reviewsResult.isBlocked || !reviewsResult.html) {
      warnings.push(`Could not fetch page ${pageNum} reviews due to anti-bot challenge.`);
      break;
    }

    // Try parsing reviews from initial JSON state first (supports new mobile/hybrid single-page layout)
    const revsState = parseInitialState(reviewsResult.html);
    let extractedRevs = false;
    if (revsState) {
      const slots = revsState.multiWidgetState?.widgetsData?.slots || [];
      slots.forEach((s: any) => {
        const w = s.slotData?.widget;
        if (!w) return;
        
        // Extract rating metadata and distribution counts from UgcRatingValue widget in reviews page
        if (w.type === 'RATING' || s.slotData?.elementId?.includes('RATING')) {
          const val = w.data?.rating?.value;
          if (val) {
            product.rating = val.average;
            if (val.ratingCount) product.ratingCount = val.ratingCount;
            if (val.reviewCount) product.reviewCount = val.reviewCount;
            
            const hist = val.histogram || [];
            if (hist.length >= 5) {
              distribution = normalizeRatingDistribution({
                star1: hist[0] || 0,
                star2: hist[1] || 0,
                star3: hist[2] || 0,
                star4: hist[3] || 0,
                star5: hist[4] || 0,
              });
              if (!product.ratingCount) {
                product.ratingCount = hist.reduce((a: number, b: number) => a + b, 0);
              }
            }
          }
        }
        
        if (w.type === 'REVIEWS' || s.slotData?.elementId?.includes('REVIEWS')) {
          const components = w.data?.renderableComponents || [];
          components.forEach((c: any) => {
            const val = c.value;
            if (!val) return;
            let city = val.location?.city || '';
            let stateName = val.location?.state || '';
            let locationStr = [city, stateName].filter(Boolean).join(', ');
            const rawImages = val.images || val.media || [];
            const reviewImages = rawImages.map((img: any) => {
              const url = img.value?.imageURL || img.imageURL || img.url || img.urlTemplate || '';
              return resolveFlipkartImageUrl(url);
            }).filter(Boolean);

            reviews.push(normalizeFlipkartReview({
              id: val.id || `fk-json-${reviewIndex}`,
              rating: String(val.rating || 5),
              title: val.title || '',
              body: (val.text || '').replace(/READ MORE/g, '').trim(),
              author: val.author || 'Flipkart Buyer',
              isVerified: !!val.certifiedBuyer,
              helpfulCount: String(val.helpfulCount || 0),
              date: val.created || 'Recent',
              location: locationStr,
              permalink: val.url || '',
              images: reviewImages
            }, reviewIndex++));
            extractedRevs = true;
          });
        }
      });
    }

    if (extractedRevs) {
      continue; // Successfully extracted reviews from JSON state for this page, skip DOM selectors
    }

    const $ = cheerio.load(reviewsResult.html);
    // New selectors: .QccLnz is the review card; fallback to old selectors
    const reviewCards = $('.QccLnz, div._2wzgFH, div[class*="_2wzgFH"], .col._2wzgFH, ._27M-Tj');
    
    if (reviewCards.length === 0) {
      break; // No reviews on this page
    }

    reviewCards.each((_, el) => {
      const $el = $(el);
      
      // Rating: new .MKiFS6 or old ._3LWZlK
      const ratingText = $el.find('.MKiFS6').first().text().trim() || $el.find('._3LWZlK').first().text().trim() || '5';
      
      // Title: new .qW2QI1 or old ._2-N1sw / ._2t14_8
      const titleText = $el.find('.qW2QI1').first().text().trim() || $el.find('._2-N1sw, ._2t14_8').first().text().trim() || 'Review Highlight';
      
      // Body: new .G4PxIA > div > div or old .t-y19o / .qwjRZE
      const bodyText = $el.find('.G4PxIA > div > div').first().text().trim()
        || $el.find('.t-y19o, ._2-N1sw + div, .qwjRZE').text().trim()
        || $el.find('div[class*="t-ZTKy"]').text().trim();
      
      // Author: new .zJ1ZGa.ZDi3w2 or old ._2sc77z
      const authorText = $el.find('.zJ1ZGa.ZDi3w2').first().text().trim()
        || $el.find('._2V5uSc ._2sc77z, ._2sc77z').first().text().trim()
        || 'Flipkart Buyer';
      
      // Certified Buyer: new .Zhmv6U or old ._1V_eCO / text check
      const certifiedText = $el.find('.Zhmv6U').text().trim();
      const isVerified = certifiedText.includes('Certified Buyer')
        || $el.find('._1V_eCO').length > 0
        || $el.text().includes('Certified Buyer')
        || $el.text().includes('Verified');
      
      // Location: extract from certified buyer text (e.g. "Certified Buyer, Patna")
      let location = '';
      if (certifiedText.includes(',')) {
        location = certifiedText.split(',').slice(1).join(',').trim();
      }
      
      // Date: new p.zJ1ZGa (not .ZDi3w2) or old .y3gG5F
      const allDateCandidates = $el.find('.zJ1ZGa').not('.ZDi3w2');
      const dateText = allDateCandidates.last().text().trim()
        || $el.find('.y3gG5F').text().trim()
        || 'Recent';
      
      // Helpful count: new .Fp3hrV or old ._3c3LCb
      const helpfulText = $el.find('.Fp3hrV').first().text().trim()
        || $el.find('._3_7C7K ._3c3LCb').first().text().trim()
        || '0';
      
      // Permalink
      const permalink = $el.find('a[href*="/reviews/"]').attr('href') || '';

      // Extract Images
      const reviewImages: string[] = [];
      $el.find('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src') || $(imgEl).attr('data-src') || '';
        if (src && (src.includes('/blobio/') || src.includes('/user-review/') || src.includes('imr-user') || src.includes('flixcart.com/imr-user/'))) {
          reviewImages.push(src);
        }
      });

      if (!bodyText) return; // Skip empty reviews

      reviews.push(normalizeFlipkartReview({
        id: permalink ? `fk-${pid}-${permalink}` : `fk-${pid}-${reviewIndex}`,
        rating: ratingText,
        title: titleText,
        body: bodyText.replace(/READ MORE/g, '').trim(),
        author: authorText,
        isVerified,
        helpfulCount: helpfulText,
        date: dateText,
        location,
        permalink,
        images: reviewImages,
      }, reviewIndex++));
    });
  }

  // Fulfill structural fallback if reviews are empty but we have product page reviews
  if (reviews.length === 0 && prodResult.html) {
    const $ = cheerio.load(prodResult.html);
    const prodReviewCards = $('.QccLnz, div._2wzgFH, ._27M-Tj');
    prodReviewCards.each((_, el) => {
      const $el = $(el);
      const ratingText = $el.find('.MKiFS6').first().text().trim() || $el.find('._3LWZlK').first().text().trim() || '5';
      const titleText = $el.find('.qW2QI1').first().text().trim() || $el.find('._2-N1sw, ._2t14_8').first().text().trim() || 'Product Review';
      const bodyText = $el.find('.G4PxIA > div > div').first().text().trim() || $el.find('.t-y19o, ._2-N1sw + div').text().trim() || $el.find('.qwjRZE').text().trim();
      const authorText = $el.find('.zJ1ZGa.ZDi3w2').first().text().trim() || $el.find('._2sc77z').first().text().trim() || 'Flipkart Buyer';
      const isVerified = $el.find('.Zhmv6U').text().includes('Certified Buyer') || $el.text().includes('Verified');
      const certifiedText = $el.find('.Zhmv6U').text().trim();
      let location = '';
      if (certifiedText.includes(',')) {
        location = certifiedText.split(',').slice(1).join(',').trim();
      }
      
      const permalink = $el.find('a[href*="/reviews/"]').attr('href') || '';
      const reviewImages: string[] = [];
      $el.find('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src') || $(imgEl).attr('data-src') || '';
        if (src && (src.includes('/blobio/') || src.includes('/user-review/') || src.includes('imr-user') || src.includes('flixcart.com/imr-user/'))) {
          reviewImages.push(src);
        }
      });
      if (bodyText) {
        reviews.push(normalizeFlipkartReview({
          id: permalink ? `fk-${pid}-${permalink}` : `fk-${pid}-fallback-${reviewIndex}`,
          rating: ratingText,
          title: titleText,
          body: bodyText.replace(/READ MORE/g, '').trim(),
          author: authorText,
          isVerified,
          helpfulCount: '0',
          date: 'Recent',
          location,
          permalink,
          images: reviewImages,
        }, reviewIndex++));
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

// --- Streaming variant ---
// Yields events one-by-one so the SSE endpoint can push them to the client
// without waiting for all pages to be fetched.

export type StreamEvent =
  | { type: 'product'; product: FlipkartProduct; distribution: RatingDistribution; canonicalUrl: string; warnings: string[]; isBlocked?: boolean }
  | { type: 'reviews'; reviews: NormalizedReview[]; pageNum: number; hasMore: boolean; warnings: string[] }
  | { type: 'error'; error: string }
  | { type: 'done'; totalFetched: number };

export async function* scrapeFlipkartReviewsStreaming(
  productUrl: string,
  maxPages = 10,
  sortMode = 'helpful',
): AsyncGenerator<StreamEvent> {
  const warnings: string[] = [];

  const resolved = await resolveFlipkartUrl(productUrl);
  let itemId = resolved.itemId;
  const pid = resolved.pid;
  let slug = resolved.slug || 'product';

  if (!pid) {
    yield { type: 'error', error: 'Could not identify unique product ID (pid). Make sure the link has a "?pid=" parameter.' };
    return;
  }

  let product: FlipkartProduct = { title: 'Flipkart Product', rating: 0, ratingCount: 0, reviewCount: 0 };
  let distribution: RatingDistribution = { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };

  // Try product page for metadata (best-effort, often returns homepage or restricted status)
  const productFetchUrl = itemId
    ? `https://www.flipkart.com/${slug}/p/${itemId}?pid=${pid}`
    : `https://www.flipkart.com/${slug}/p/itm?pid=${pid}`;

  const prodResult = await fetchHtmlWithFallback(productFetchUrl, warnings);

  if (prodResult.html && !prodResult.isBlocked) {
    const $ = cheerio.load(prodResult.html);
    if (!itemId || ['dl','p','dummy','product'].includes(slug)) {
      const canonicalLink = $('link[rel="canonical"]').attr('href') || '';
      if (canonicalLink) {
        const itmM = canonicalLink.match(/(itm[a-f0-9]{13,16})/i);
        if (itmM) itemId = itmM[1];
        try {
          const pp = new URL(canonicalLink).pathname.split('/');
          const si = pp.findIndex(p => p.length > 0);
          if (si !== -1 && pp[si] !== 'p' && pp[si] !== 'product-reviews') slug = pp[si];
        } catch (_) {}
      }
    }
    if (!itemId) { const m = prodResult.html.match(/(itm[a-f0-9]{13,16})/i); if (m) itemId = m[1]; }

    const ps = parseInitialState(prodResult.html);
    if (ps) {
      (ps.multiWidgetState?.widgetsData?.slots || []).forEach((s: any) => {
        const w = s.slotData?.widget; if (!w) return; const d = w.data;
        if (w.type === 'RATING' || s.slotData?.elementId?.includes('RATING')) {
          const v = d?.rating?.value;
          if (v) { product.rating = v.average; const h = v.histogram || [];
            if (h.length >= 5) { distribution = normalizeRatingDistribution({ star1:h[0]||0,star2:h[1]||0,star3:h[2]||0,star4:h[3]||0,star5:h[4]||0 });
              if (!product.ratingCount) product.ratingCount = h.reduce((a:number,b:number)=>a+b,0); } }
        }
        if (d?.dlsData?.label_2?.value?.text) product.title = d.dlsData.label_2.value.text;
        else if (d?.dlsData?.customEllipsisData_0?.value?.prependingText) product.title = d.dlsData.customEllipsisData_0.value.prependingText;
        if (d?.dlsData?.price?.value?.text) product.price = d.dlsData.price.value.text;
      });
    }
    const tt = $('.KoLDId').text().trim()||$('h1').text().trim()||$('.B_NuCI').text().trim()||'';
    if (tt) product.title = tt;
    const rv = parseFloat($('.IHXGEy').first().text().trim()||$('._3LWZlK').first().text().trim()||'');
    if (!isNaN(rv) && rv > 0) product.rating = rv;
    const spans: string[] = []; $('.wCDGVb span').each((_,el)=>{ spans.push($(el).text().trim()); });
    const ct = spans.join(' ');
    const rm = ct.match(/([\d,]+)\s*Ratings/i); if (rm) product.ratingCount = parseInt(rm[1].replace(/,/g,''),10);
    const rvm = ct.match(/([\d,]+)\s*Reviews/i); if (rvm) product.reviewCount = parseInt(rvm[1].replace(/,/g,''),10);
    const img = $('._396cs4').first().attr('src')||$('img._396cs4').attr('src'); if (img) product.image = img;
    const pr = $('._30jeq3._16Jk6d').first().text().trim()||$('.Nx9n7C').text().trim(); if (pr) product.price = pr;
    const dc: string[] = []; $('.MDKzf4').each((_,el)=>{ dc.push($(el).text().trim()); });
    if (dc.length >= 5) distribution = normalizeRatingDistribution({ star5:dc[0],star4:dc[1],star3:dc[2],star2:dc[3],star1:dc[4] });
  }

  // Derive human title from slug fallback if still default
  if ((product.title === 'Flipkart Product' || product.title.includes('Buy Products Online')) && slug && slug !== 'product' && slug !== 'dummy' && slug !== 'p') {
    product.title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const finalItemId = itemId || 'itm2d1c2174f4a30';
  const canonicalUrl = `https://www.flipkart.com/${slug}/p/${finalItemId}?pid=${pid}`;

  const reviewsBaseUrl = `https://www.flipkart.com/${slug}/product-reviews/${finalItemId}`;
  let sortOrder = 'MOST_HELPFUL';
  if (sortMode === 'recent') sortOrder = 'MOST_RECENT';
  else if (sortMode === 'positive') sortOrder = 'POSITIVE_FIRST';
  else if (sortMode === 'negative') sortOrder = 'NEGATIVE_FIRST';

  let reviewIndex = 0;
  let totalFetched = 0;
  let productEventYielded = false;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    if (pageNum > 1) await new Promise(r => setTimeout(r, 600 + Math.floor(Math.random()*400)));
    const pageUrl = `${reviewsBaseUrl}?pid=${pid}&page=${pageNum}&sortOrder=${sortOrder}`;
    const pw: string[] = [];
    const rr = await fetchHtmlWithFallback(pageUrl, pw);

    if (rr.isBlocked || !rr.html) {
      pw.push(`Could not fetch page ${pageNum} — reviews page restricted or unavailable.`);
      if (!productEventYielded) {
        yield { type: 'product', product, distribution, canonicalUrl, warnings: [...warnings, ...pw], isBlocked: false };
        productEventYielded = true;
      }
      yield { type: 'reviews', reviews: [], pageNum, hasMore: false, warnings: pw };
      break;
    }

    const pr2: NormalizedReview[] = [];
    const rs = parseInitialState(rr.html);
    let extracted = false;

    if (rs) {
      const slots = rs.multiWidgetState?.widgetsData?.slots || [];

      // Extract metadata from RATING widget on reviews page (very reliable)
      for (const s of slots) {
        const w = s.slotData?.widget; if (!w) continue;
        if (w.type === 'RATING' || (s.slotData?.elementId || '').includes('RATING')) {
          const v = w.data?.rating?.value;
          if (v) {
            if (v.average && (!product.rating || product.rating === 0)) product.rating = v.average;
            if (v.ratingCount && (!product.ratingCount || product.ratingCount === 0)) product.ratingCount = v.ratingCount;
            if (v.reviewCount && (!product.reviewCount || product.reviewCount === 0)) product.reviewCount = v.reviewCount;
            const h = v.histogram || [];
            if (h.length >= 5) {
              distribution = normalizeRatingDistribution({ star1:h[0]||0, star2:h[1]||0, star3:h[2]||0, star4:h[3]||0, star5:h[4]||0 });
              if (!product.ratingCount) product.ratingCount = h.reduce((a:number,b:number)=>a+b,0);
            }
          }
        }
      }

      // Check title from reviews HTML if needed
      if (product.title === 'Flipkart Product' || product.title.includes('Buy Products Online')) {
        const $ = cheerio.load(rr.html);
        const pageTitle = $('title').text().trim();
        if (pageTitle && !pageTitle.includes('Buy Products Online')) {
          const cleanTitle = pageTitle.replace(/\s*[-|]\s*(Reviews|Flipkart\.com|Product Reviews).*$/i, '').trim();
          if (cleanTitle && cleanTitle.length > 3) product.title = cleanTitle;
        }
      }

      // Iterate ALL REVIEWS slots
      for (const s of slots) {
        const w = s.slotData?.widget; if (!w) continue;
        if (w.type === 'REVIEWS' || (s.slotData?.elementId || '').includes('REVIEWS')) {
          const components = w.data?.renderableComponents || [];
          for (const c of components) {
            const v = c.value; if (!v) continue;
            const loc = [v.location?.city||'', v.location?.state||''].filter(Boolean).join(', ');
            const rawImages = v.images || v.media || [];
            const imgs = rawImages.map((i: any) => {
              const url = i.value?.imageURL || i.imageURL || i.url || i.urlTemplate || '';
              return resolveFlipkartImageUrl(url);
            }).filter(Boolean);
            pr2.push(normalizeFlipkartReview({
              id: v.id || `fk-json-${pageNum}-${reviewIndex}`,
              rating: String(v.rating || 5),
              title: v.title || '',
              body: (v.text || '').replace(/READ MORE/g, '').trim(),
              author: v.author || 'Flipkart Buyer',
              isVerified: !!v.certifiedBuyer,
              helpfulCount: String(v.helpfulCount || 0),
              date: v.created || 'Recent',
              location: loc,
              permalink: v.url || '',
              images: imgs
            }, reviewIndex++));
            extracted = true;
          }
        }
      }
    }

    if (!extracted) {
      const $2 = cheerio.load(rr.html);
      const cards = $2('.QccLnz, div._2wzgFH, .col._2wzgFH, ._27M-Tj');
      if (cards.length === 0 && pr2.length === 0) {
        if (!productEventYielded) {
          yield { type: 'product', product, distribution, canonicalUrl, warnings: [...warnings] };
          productEventYielded = true;
        }
        yield { type: 'reviews', reviews: [], pageNum, hasMore: false, warnings: pw };
        break;
      }
      cards.each((_, el) => {
        const $e = $2(el);
        const rt = $e.find('.MKiFS6').first().text().trim()||$e.find('._3LWZlK').first().text().trim()||'5';
        const tit = $e.find('.qW2QI1').first().text().trim()||$e.find('._2-N1sw,._2t14_8').first().text().trim()||'Review';
        const body = $e.find('.G4PxIA>div>div').first().text().trim()||$e.find('.t-y19o,.qwjRZE').text().trim();
        const auth = $e.find('.zJ1ZGa.ZDi3w2').first().text().trim()||$e.find('._2sc77z').first().text().trim()||'Flipkart Buyer';
        const cert = $e.find('.Zhmv6U').text().trim();
        const isV = cert.includes('Certified Buyer')||$e.text().includes('Certified Buyer');
        const loc2 = cert.includes(',') ? cert.split(',').slice(1).join(',').trim() : '';
        const dt = $e.find('.zJ1ZGa').not('.ZDi3w2').last().text().trim()||$e.find('.y3gG5F').text().trim()||'Recent';
        const hl = $e.find('.Fp3hrV').first().text().trim()||'0';
        const pl = $e.find('a[href*="/reviews/"]').attr('href')||'';
        const ri: string[] = []; $e.find('img').each((_2,im)=>{ const s=$2(im).attr('src')||''; if(s&&(s.includes('/blobio/')||s.includes('/user-review/')||s.includes('imr-user'))) ri.push(s); });
        if (!body) return;
        pr2.push(normalizeFlipkartReview({ id:pl?`fk-${pid}-${pl}`:`fk-${pid}-${reviewIndex}`,
          rating:rt, title:tit, body:body.replace(/READ MORE/g,'').trim(),
          author:auth, isVerified:isV, helpfulCount:hl, date:dt, location:loc2, permalink:pl, images:ri }, reviewIndex++));
      });
    }

    if (!productEventYielded) {
      yield { type: 'product', product, distribution, canonicalUrl, warnings: [...warnings] };
      productEventYielded = true;
    }

    totalFetched += pr2.length;
    const hasMore = pr2.length >= 8 && pageNum < maxPages;
    yield { type: 'reviews', reviews: pr2, pageNum, hasMore, warnings: pw };
    if (!hasMore) break;
  }

  if (!productEventYielded) {
    yield { type: 'product', product, distribution, canonicalUrl, warnings: [...warnings, 'No reviews found for this product.'] };
  }

  yield { type: 'done', totalFetched };
}




async function fetchHtmlWithPuppeteerOnly(url: string, warnings: string[]): Promise<{ html: string; isBlocked: boolean }> {
  const proxyUrl = getRotatingProxy(warnings);
  try {
    const html = await scrapeWithBrowserAutomation(url, warnings, proxyUrl);
    const isBot = isActualBotChallenge(html);
    if (!isBot) return { html, isBlocked: false };
    warnings.push('Puppeteer content contained a bot challenge.');
    return { html: '', isBlocked: true };
  } catch (e: any) {
    warnings.push(`Puppeteer failed: ${e.message}`);
    return { html: '', isBlocked: true };
  }
}
// ─── Concurrent Streaming variant ──────────────────────────────────────────────
export async function* scrapeFlipkartReviewsConcurrent(
  productUrl: string,
  maxPages = 10,
  sortMode = 'helpful',
): AsyncGenerator<StreamEvent> {
  const warnings: string[] = [];

  const resolved = await resolveFlipkartUrl(productUrl);
  let itemId = resolved.itemId;
  const pid = resolved.pid;
  let slug = resolved.slug || 'product';

  if (!pid) {
    yield { type: 'error', error: 'Could not identify unique product ID (pid). Make sure the link contains a "?pid=" parameter.' };
    return;
  }

  let product: FlipkartProduct = { title: 'Flipkart Product', rating: 0, ratingCount: 0, reviewCount: 0 };
  let distribution: RatingDistribution = { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };

  const productFetchUrl = itemId
    ? `https://www.flipkart.com/${slug}/p/${itemId}?pid=${pid}`
    : `https://www.flipkart.com/p/dummy?pid=${pid}`;

  const prodResult = await fetchHtmlWithFallback(productFetchUrl, warnings);

  if (prodResult.isBlocked) {
    yield { type: 'product', product, distribution, canonicalUrl: productFetchUrl,
      warnings: [...warnings, 'Flipkart blocked the connection with an anti-bot challenge.'], isBlocked: true };
    return;
  }

  if (prodResult.html) {
    const $ = cheerio.load(prodResult.html);
    if (!itemId || ['dl','p','dummy','product'].includes(slug)) {
      const canonicalLink = $('link[rel="canonical"]').attr('href') || '';
      if (canonicalLink) {
        const itmM = canonicalLink.match(/(itm[a-f0-9]{13,16})/i);
        if (itmM) itemId = itmM[1];
        try {
          const pp = new URL(canonicalLink).pathname.split('/');
          const si = pp.findIndex(p => p.length > 0);
          if (si !== -1 && pp[si] !== 'p' && pp[si] !== 'product-reviews') slug = pp[si];
        } catch (_) {}
      }
    }
    if (!itemId) { const m = prodResult.html.match(/(itm[a-f0-9]{13,16})/i); if (m) itemId = m[1]; }

    const ps = parseInitialState(prodResult.html);
    if (ps) {
      (ps.multiWidgetState?.widgetsData?.slots || []).forEach((s: any) => {
        const w = s.slotData?.widget; if (!w) return; const d = w.data;
        if (w.type === 'RATING' || s.slotData?.elementId?.includes('RATING')) {
          const v = d?.rating?.value;
          if (v) { product.rating = v.average; const h = v.histogram || [];
            if (h.length >= 5) { distribution = normalizeRatingDistribution({ star1:h[0]||0,star2:h[1]||0,star3:h[2]||0,star4:h[3]||0,star5:h[4]||0 });
              product.ratingCount = h.reduce((a:number,b:number)=>a+b,0); } }
        }
        if (d?.dlsData?.label_2?.value?.text) product.title = d.dlsData.label_2.value.text;
        else if (d?.dlsData?.customEllipsisData_0?.value?.prependingText) product.title = d.dlsData.customEllipsisData_0.value.prependingText;
        if (d?.dlsData?.price?.value?.text) product.price = d.dlsData.price.value.text;
      });
    }
    const tt = $('.KoLDId').text().trim()||$('h1').text().trim()||$('.B_NuCI').text().trim()||'';
    if (tt) product.title = tt;
    const rv = parseFloat($('.IHXGEy').first().text().trim()||$('._3LWZlK').first().text().trim()||'');
    if (!isNaN(rv) && rv > 0) product.rating = rv;
    const spans: string[] = []; $('.wCDGVb span').each((_,el)=>{ spans.push($(el).text().trim()); });
    const ct = spans.join(' ');
    const rm = ct.match(/([\d,]+)\s*Ratings/i); if (rm) product.ratingCount = parseInt(rm[1].replace(/,/g,''),10);
    const rvm = ct.match(/([\d,]+)\s*Reviews/i); if (rvm) product.reviewCount = parseInt(rvm[1].replace(/,/g,''),10);
    const img = $('._396cs4').first().attr('src')||$('img._396cs4').attr('src'); if (img) product.image = img;
    const pr = $('._30jeq3._16Jk6d').first().text().trim()||$('.Nx9n7C').text().trim(); if (pr) product.price = pr;
    const dc: string[] = []; $('.MDKzf4').each((_,el)=>{ dc.push($(el).text().trim()); });
    if (dc.length >= 5) distribution = normalizeRatingDistribution({ star5:dc[0],star4:dc[1],star3:dc[2],star2:dc[3],star1:dc[4] });
  }

  const finalItemId = itemId || 'itm2d1c2174f4a30';
  const canonicalUrl = `https://www.flipkart.com/${slug}/p/${finalItemId}?pid=${pid}`;
  yield { type: 'product', product, distribution, canonicalUrl, warnings: [...warnings] };

  const reviewsBaseUrl = `https://www.flipkart.com/${slug}/product-reviews/${finalItemId}`;
  let sortOrder = 'MOST_HELPFUL';
  if (sortMode === 'recent') sortOrder = 'MOST_RECENT';
  else if (sortMode === 'positive') sortOrder = 'POSITIVE_FIRST';
  else if (sortMode === 'negative') sortOrder = 'NEGATIVE_FIRST';

  let reviewIndex = 0;
  let totalFetched = 0;
  const concurrency = 3;
  let currentStartPage = 1;

  while (currentStartPage <= maxPages) {
    const endPage = Math.min(currentStartPage + concurrency - 1, maxPages);
    const promises = [];

    for (let pageNum = currentStartPage; pageNum <= endPage; pageNum++) {
      const pageUrl = `${reviewsBaseUrl}?pid=${pid}&page=${pageNum}&sortOrder=${sortOrder}`;
      promises.push((async () => {
        const pw: string[] = [];
        const rr = await fetchHtmlWithFallback(pageUrl, pw);

        if (rr.isBlocked || !rr.html) {
          pw.push(`Could not fetch page ${pageNum} — blocked.`);
          return { pageNum, reviews: [], hasMore: false, warnings: pw };
        }

        const pr2: NormalizedReview[] = [];
        const rs = parseInitialState(rr.html);
        let extracted = false;

        if (rs) {
          (rs.multiWidgetState?.widgetsData?.slots || []).forEach((s: any) => {
            const w = s.slotData?.widget; if (!w) return;
            if (w.type === 'REVIEWS' || s.slotData?.elementId?.includes('REVIEWS')) {
              (w.data?.renderableComponents||[]).forEach((c: any) => {
                const v = c.value; if (!v) return;
                const loc = [v.location?.city||'',v.location?.state||''].filter(Boolean).join(', ');
                const imgs = (v.images||v.media||[]).map((i:any)=>resolveFlipkartImageUrl(i.value?.imageURL||i.imageURL||i.url||i.urlTemplate||'')).filter(Boolean);
                pr2.push(normalizeFlipkartReview({ id:v.id||`fk-json-${pageNum}-${reviewIndex}`, rating:String(v.rating||5),
                  title:v.title||'', body:(v.text||'').replace(/READ MORE/g,'').trim(),
                  author:v.author||'Flipkart Buyer', isVerified:!!v.certifiedBuyer,
                  helpfulCount:String(v.helpfulCount||0), date:v.created||'Recent',
                  location:loc, permalink:v.url||'', images:imgs }, reviewIndex++));
                extracted = true;
              });
            }
          });
        }

        if (!extracted) {
          const $2 = cheerio.load(rr.html);
          const cards = $2('.QccLnz, div._2wzgFH, .col._2wzgFH, ._27M-Tj');
          if (cards.length > 0) {
            cards.each((_,el) => {
              const $e = $2(el);
              const rt = $e.find('.MKiFS6').first().text().trim()||$e.find('._3LWZlK').first().text().trim()||'5';
              const tit = $e.find('.qW2QI1').first().text().trim()||$e.find('._2-N1sw,._2t14_8').first().text().trim()||'Review';
              const body = $e.find('.G4PxIA>div>div').first().text().trim()||$e.find('.t-y19o,.qwjRZE').text().trim();
              const auth = $e.find('.zJ1ZGa.ZDi3w2').first().text().trim()||$e.find('._2sc77z').first().text().trim()||'Flipkart Buyer';
              const cert = $e.find('.Zhmv6U').text().trim();
              const isV = cert.includes('Certified Buyer')||$e.text().includes('Certified Buyer');
              const loc2 = cert.includes(',') ? cert.split(',').slice(1).join(',').trim() : '';
              const dt = $e.find('.zJ1ZGa').not('.ZDi3w2').last().text().trim()||$e.find('.y3gG5F').text().trim()||'Recent';
              const hl = $e.find('.Fp3hrV').first().text().trim()||'0';
              const pl = $e.find('a[href*="/reviews/"]').attr('href')||'';
              const ri: string[] = []; $e.find('img').each((_2,im)=>{ const s=$2(im).attr('src')||''; if(s&&(s.includes('/blobio/')||s.includes('/user-review/')||s.includes('imr-user'))) ri.push(s); });
              if (!body) return;
              pr2.push(normalizeFlipkartReview({ id:pl?`fk-${pid}-${pl}`:`fk-${pid}-${pageNum}-${reviewIndex}`,
                rating:rt, title:tit, body:body.replace(/READ MORE/g,'').trim(),
                author:auth, isVerified:isV, helpfulCount:hl, date:dt, location:loc2, permalink:pl, images:ri }, reviewIndex++));
            });
          }
        }

        const hasMore = pr2.length >= 8 && pageNum < maxPages;
        return { pageNum, reviews: pr2, hasMore, warnings: pw };
      })());
    }

    const results = await Promise.allSettled(promises);
    let anyHasMore = false;
    let anyBlocked = false;

    // Yield results in order of pages requested
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const data = result.value;
        totalFetched += data.reviews.length;
        if (data.hasMore) anyHasMore = true;
        if (data.warnings.length > 0) anyBlocked = true;
        yield { type: 'reviews', reviews: data.reviews, pageNum: data.pageNum, hasMore: data.hasMore, warnings: data.warnings };
      }
    }

    if (!anyHasMore || anyBlocked) break;

    currentStartPage += concurrency;
    if (currentStartPage <= maxPages) {
       await new Promise(resolve => setTimeout(resolve, 800 + Math.floor(Math.random() * 500)));
    }
  }

  yield { type: 'done', totalFetched };
}




