import * as cheerio from 'cheerio';
import axios from 'axios';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QCDataStore } from './qcStore.js';
import { enrichQCPost, isQCRelevant, isSpam } from './qcEnricher.js';
import { rebrand, rebrandTitle } from './qcRebrand.js';
import { generateFallbackSVG } from './qcFallbackImage.js';
import { resolveRouting } from './qcAffiliate.js';
import { isImageCleanOCR } from './qcOcr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, '../data/qc_config.json');

// ─── Emitter ─────────────────────────────────────────────────────────────────
export const qcDealEmitter = new EventEmitter();
qcDealEmitter.setMaxListeners(50);

// ─── State ───────────────────────────────────────────────────────────────────
let mainInterval = null;

// ─── Config loader ───────────────────────────────────────────────────────────
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { channels: [], qcKeywords: [] };
  }
}

// ─── Platform detector (from URL) ────────────────────────────────────────────
function detectPlatformFromUrl(url) {
  if (!url) return 'Other';
  const u = url.toLowerCase();
  if (u.includes('swiggy'))                   return 'Swiggy';
  if (u.includes('zomato'))                   return 'Zomato';
  if (u.includes('blinkit') || u.includes('grofers')) return 'Blinkit';
  if (u.includes('zepto'))                    return 'Zepto';
  if (u.includes('bigbasket') || u.includes('bb.com')) return 'BigBasket';
  if (u.includes('dominos') || u.includes('domino')) return "Domino's";
  if (u.includes('kfc'))                      return 'KFC';
  if (u.includes('mcdonalds') || u.includes('mcd.')) return "McDonald's";
  if (u.includes('pizzahut'))                 return 'Pizza Hut';
  if (u.includes('magicpin'))                 return 'Magicpin';
  return 'Other';
}

// ─── Single channel scraper ───────────────────────────────────────────────────
async function scrapeChannel(channel) {
  console.log(`[QC Scraper] Fetching channel: ${channel.id}`);
  let scannedInBatch = 0;
  try {
    const response = await axios.get(channel.url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 20000,
    });

    const hasMessages = response.data.includes('tgme_widget_message');
    const responseUrl = response.request?.res?.responseUrl || '';
    const isRedirected = responseUrl.includes('https://t.me/') && !responseUrl.includes('/s/');

    if (response.status !== 200 || !hasMessages || isRedirected) {
      console.error(`[QC-BLOCKED] Error: Channel @${channel.id} is blocked or public preview is unavailable (status: ${response.status}, redirected: ${isRedirected}). Scraper is disabled for this channel.`);
      return { rawPosts: [], scannedCount: 0 };
    }

    const $ = cheerio.load(response.data);
    const rawPosts = [];

    $('.tgme_widget_message').each((_, element) => {
      const $elem   = $(element);
      const msgText = $elem.find('.tgme_widget_message_text').text();
      if (!msgText.trim()) return;

      scannedInBatch++;

      // ── URL extraction early so we can detect merchant from URL ──
      const rawHrefs = [];
      $elem.find('a').each((_2, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('t.me/') && !href.includes('telegram.org') && href.startsWith('http')) {
          rawHrefs.push(href);
        }
      });

      // Separate image CDN URLs from deal redirect URLs
      const imageCdnUrls = rawHrefs.filter(h => {
        const u = h.toLowerCase();
        return u.includes('hcti.io') || u.includes('cdn.dealshub') || u.includes('i.imgur.com');
      });
      const dealHrefs = rawHrefs.filter(h => !imageCdnUrls.includes(h));

      // Primary deal URL: prefer known merchant URLs, then short-link redirectors, then first href
      const merchantUrl = dealHrefs.find(h => {
        const u = h.toLowerCase();
        return u.includes('swiggy') || u.includes('zomato') || u.includes('blinkit') ||
               u.includes('zepto')  || u.includes('bigbasket') || u.includes('dominos') ||
               u.includes('kfc')    || u.includes('mcdonalds') || u.includes('pizzahut') ||
               u.includes('magicpin');
      });
      const shortLink = dealHrefs.find(h => {
        const u = h.toLowerCase();
        return u.includes('ddime.in') || u.includes('bit.ly') || u.includes('bittli.in') ||
               u.includes('tiny.cc') || u.includes('go.') || u.includes('ow.ly');
      });
      const primaryUrl = merchantUrl || shortLink || dealHrefs[0] || `https://t.me/s/${channel.id}`;

      // ── Early quality gates ──
      if (isSpam(msgText))         return;
      if (!isQCRelevant(msgText, primaryUrl))  return;
      if (msgText.trim().length < 15) return;

      // ── Image extraction (optional — text-only posts are accepted) ──
      let image = null;
      // 1. Try message photo wrap
      const photoWrap = $elem.find('.tgme_widget_message_photo_wrap');
      if (photoWrap.length > 0) {
        const style    = photoWrap.attr('style') || '';
        const bgMatch  = style.match(/background-image:url\('([^']+)'\)/);
        if (bgMatch && bgMatch[1] && !bgMatch[1].includes('Telegram_logo') && bgMatch[1].includes('telesco.pe')) {
          image = bgMatch[1];
        }
      }
      // 2. Try link preview image
      if (!image) {
        const previewImg = $elem.find('.link_preview_image');
        if (previewImg.length > 0) {
          const style = previewImg.attr('style') || '';
          const bgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgMatch && bgMatch[1] && !bgMatch[1].includes('Telegram_logo') && bgMatch[1].includes('telesco.pe')) {
            image = bgMatch[1];
          }
        }
      }

      // If Telegram photo_wrap or preview image is available, prefer it over CDN thumbnails
      if (!image && imageCdnUrls.length > 0) {
        image = imageCdnUrls[0];
      }

      // ── Timestamp ──
      const datetimeAttr = $elem.find('.tgme_widget_message_date time').attr('datetime');
      const timestamp    = datetimeAttr ? new Date(datetimeAttr).getTime() : Date.now();

      // ── Unique ID ──
      const msgLink    = $elem.find('.tgme_widget_message_date').attr('href') || '';
      const msgIdMatch = msgLink.match(/\/(\d+)$/);
      const msgId      = msgIdMatch ? msgIdMatch[1] : `${channel.id}-${timestamp}`;
      const id         = `qc-${channel.id}-${msgId}`;

      // ── Rebrand ──
      const rebrandedText  = rebrand(msgText);
      const textLines      = msgText.split('\n').map(l => l.trim()).filter(Boolean);
      const rebrandedTitle = rebrandTitle(textLines[0] || 'Quick Commerce Offer');

      rawPosts.push({
        id,
        title: rebrandedTitle,
        text:  rebrandedText,
        image,
        url:   primaryUrl,
        urls:  dealHrefs,
        timestamp,
        source: channel.id,
      });
    });

    console.log(`[QC Scraper] ${channel.id}: scanned ${scannedInBatch} posts, found ${rawPosts.length} candidate posts`);
    return { rawPosts, scannedCount: scannedInBatch };

  } catch (error) {
    console.error(`[QC Scraper] ${channel.id} scrape failed:`, error.message);
    return { rawPosts: [], scannedCount: 0 };
  }
}

// ─── Enrich & store one channel's posts ───────────────────────────────────────
async function processChannel(channel) {
  const { rawPosts, scannedCount } = await scrapeChannel(channel);
  if (scannedCount === 0) return;

  const enriched = [];
  for (const raw of rawPosts) {
    try {
      // 1. OCR Image Sanitization Check
      if (raw.image) {
        const clean = await isImageCleanOCR(raw.image);
        if (!clean) {
          raw.image = null;
        }
      }

      // 2. Initial Enrichment
      const post = await enrichQCPost(raw);
      if (!post) continue; // Failed quality check

      // 3. Routing Quality & Reachability Resolution
      const routing = await resolveRouting(raw.urls || [raw.url], post.productName, post.merchant);
      post.url = routing.finalUrl;
      post.destinationType = routing.destinationType;
      post.routingQualityScore = routing.routingQualityScore;
      post.originalUrl = raw.url || '';
      post.finalUrl = routing.finalUrl;

      // 4. Always generate SVG branded card (text-only layout for maximum robustness)
      post.fallbackSvg = generateFallbackSVG({ ...post, image: null });

      enriched.push(post);
    } catch (e) {
      console.error(`[QC Enricher] Post ${raw.id} failed:`, e.message);
    }
  }

  // Record metrics
  const { added, rejected } = QCDataStore.upsert(enriched);
  QCDataStore.incrementSourceMetrics(channel.id, scannedCount, added);

  if (added > 0) {
    console.log(`[QC Store] ${channel.id}: +${added} new, ${rejected} deduped`);
    qcDealEmitter.emit('qc_new_deals', enriched.slice(0, added));
  }
}

// ─── Main scraper cycle (all enabled channels) ─────────────────────────────────
async function runScraperCycle() {
  const config   = loadConfig();
  const channels = (config.channels || []).filter(c => c.enabled);

  if (channels.length === 0) {
    console.warn('[QC Scraper] No enabled channels in qc_config.json');
    return;
  }

  const stats = QCDataStore.getStats();
  const sourceMetrics = stats.sourceMetrics || {};

  // Process channels sequentially to avoid hammering Telegram
  for (const channel of channels) {
    if (sourceMetrics[channel.id]?.lowQualityFlagged) {
      console.log(`[QC Scraper] Skipping channel @${channel.id} - auto-disabled (flagged as low-quality)`);
      continue;
    }
    await processChannel(channel);
  }

  // Archive expired deals after each cycle
  const archived = QCDataStore.archiveExpired();
  if (archived > 0) {
    console.log(`[QC Store] Archived ${archived} expired deals`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function startQCScraper() {
  if (mainInterval) return; // Already running

  // Load config to determine poll interval
  const config    = loadConfig();
  const channels  = (config.channels || []).filter(c => c.enabled);
  const intervals = channels.map(c => c.intervalSeconds || 120);
  const minInterval = intervals.length > 0 ? Math.min(...intervals) : 120;

  // Fire immediately
  runScraperCycle();

  // Then on a recurring schedule
  mainInterval = setInterval(runScraperCycle, minInterval * 1000);

  console.log(`[QC Scraper] Started — ${channels.length} channel(s), polling every ${minInterval}s`);
}
