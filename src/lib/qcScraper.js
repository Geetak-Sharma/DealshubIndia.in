import * as cheerio from 'cheerio';
import axios from 'axios';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { QCDataStore } from './qcStore.js';
import { enrichQCPost, isQCRelevant, isSpam } from './qcEnricher.js';
import { rebrand, rebrandTitle } from './qcRebrand.js';
import { generateFallbackSVG } from './qcFallbackImage.js';
import { resolveRouting } from './qcAffiliate.js';
import { isImageCleanOCR, extractTextFromImage } from './qcOcr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, '../data/qc_config.json');

// ─── Emitter ─────────────────────────────────────────────────────────────────
export const qcDealEmitter = new EventEmitter();
qcDealEmitter.setMaxListeners(50);

// ─── State ───────────────────────────────────────────────────────────────────
let mainInterval = null;
let tgClient = null;

// ─── GramJS Client Singleton ──────────────────────────────────────────────────
let isInitializing = false;

async function getTelegramClient() {
  if (tgClient && tgClient.connected) return tgClient;
  if (isInitializing) return null;
  isInitializing = true;
  
  const apiId = Number(process.env.TELEGRAM_API_ID || 22801451);
  const apiHash = process.env.TELEGRAM_API_HASH || "2b807ef041e175b4d7f794331743c0dc";
  const sessionString = process.env.TELEGRAM_USER_SESSION;
  
  if (!sessionString) {
    isInitializing = false;
    return null;
  }
  
  try {
    if (!tgClient) {
      console.log("[QC Scraper] Initializing GramJS Telegram client with user session...");
      const stringSession = new StringSession(sessionString);
      const proxyHost = process.env.TELEGRAM_PROXY_HOST;
      const proxyPort = Number(process.env.TELEGRAM_PROXY_PORT);
      const proxySecret = process.env.TELEGRAM_PROXY_SECRET;
      const clientOptions = { connectionRetries: 5 };
      if (proxyHost && proxyPort && proxySecret) {
        clientOptions.proxy = {
          ip: proxyHost,
          port: proxyPort,
          MTProxy: true,
          secret: proxySecret
        };
      }
      tgClient = new TelegramClient(stringSession, apiId, apiHash, clientOptions);
    }
    
    if (!tgClient.connected) {
      await tgClient.connect();
      console.log("[QC Scraper] GramJS Telegram client connected successfully!");
    }
    isInitializing = false;
    return tgClient;
  } catch (err) {
    console.error("[QC Scraper] Failed to connect GramJS Telegram client:", err.message);
    isInitializing = false;
    try {
      await tgClient.disconnect();
    } catch (e) {}
    tgClient = null;
    return null;
  }
}

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

// ─── Single channel scraper (Public Embed Fallback) ───────────────────────────

async function checkPostExists(channelId, postId) {
  try {
    const url = `https://t.me/${channelId}/${postId}?embed=1`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 8000
    });
    return response.status === 200 && !response.data.includes('tgme_widget_message_error') && response.data.includes('tgme_widget_message');
  } catch (err) {
    return false;
  }
}

async function findLatestPostId(channelId) {
  let low = 1000;
  let high = 15000;
  
  let boundAttempts = 0;
  while (boundAttempts < 10) {
    boundAttempts++;
    const exists = await checkPostExists(channelId, high);
    if (exists) {
      low = high;
      high *= 2;
    } else {
      break;
    }
  }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const exists = await checkPostExists(channelId, mid);
    if (exists) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low - 1;
}

async function scrapeChannelPublicEmbed(channel) {
  console.log(`[QC Scraper] Fetching channel: ${channel.id} via embed sequential crawling (24h back-pagination)`);
  const rawPosts = [];
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

  try {
    const latestId = await findLatestPostId(channel.id);
    if (latestId <= 0) {
      console.error(`[QC Scraper] Could not find any valid posts for ${channel.id}`);
      return { rawPosts: [], scannedCount: 0 };
    }

    let currentId = latestId;
    let reachedCutoff = false;
    let scannedCount = 0;
    
    while (!reachedCutoff && currentId > 0 && scannedCount < 100) {
      const url = `https://t.me/${channel.id}/${currentId}?embed=1`;
      
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 8000
        });

        if (response.status !== 200 || response.data.includes('tgme_widget_message_error') || !response.data.includes('tgme_widget_message')) {
          currentId--;
          continue;
        }

        const $ = cheerio.load(response.data);
        const $elem = $('.tgme_widget_message').first();
        if ($elem.length === 0) {
          currentId--;
          continue;
        }

        const msgText = $elem.find('.tgme_widget_message_text').text();
        const datetimeAttr = $elem.find('.tgme_widget_message_date time').attr('datetime');
        const timestamp = datetimeAttr ? new Date(datetimeAttr).getTime() : Date.now();

        if (timestamp < cutoffTime) {
          reachedCutoff = true;
          break;
        }

        scannedCount++;

        if (!msgText.trim()) {
          currentId--;
          continue;
        }

        const rawHrefs = [];
        $elem.find('a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !href.includes('t.me/') && !href.includes('telegram.org') && href.startsWith('http')) {
            rawHrefs.push(href);
          }
        });

        const imageCdnUrls = rawHrefs.filter(h => {
          const u = h.toLowerCase();
          return u.includes('hcti.io') || u.includes('cdn.dealshub') || u.includes('i.imgur.com');
        });
        const dealHrefs = rawHrefs.filter(h => !imageCdnUrls.includes(h));

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

        if (isSpam(msgText) || !isQCRelevant(msgText, primaryUrl) || msgText.trim().length < 15) {
          currentId--;
          continue;
        }

        let image = null;
        const photoWrap = $elem.find('.tgme_widget_message_photo_wrap');
        if (photoWrap.length > 0) {
          const style = photoWrap.attr('style') || '';
          const bgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgMatch && bgMatch[1] && !bgMatch[1].includes('Telegram_logo') && bgMatch[1].includes('telesco.pe')) {
            image = bgMatch[1];
          }
        }
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
        if (!image && imageCdnUrls.length > 0) {
          image = imageCdnUrls[0];
        }

        const rebrandedText = rebrand(msgText);
        const textLines = msgText.split('\n').map(l => l.trim()).filter(Boolean);
        const rebrandedTitleText = rebrandTitle(textLines[0] || 'Quick Commerce Offer');

        rawPosts.push({
          id: `qc-${channel.id}-${currentId}`,
          telegramMsgId: currentId,
          title: rebrandedTitleText,
          text: rebrandedText,
          image,
          url: primaryUrl,
          urls: dealHrefs,
          timestamp,
          source: channel.id,
        });

      } catch (err) {
        // skip index
      }

      currentId--;
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[QC Scraper] ${channel.id}: crawled ${scannedCount} posts, found ${rawPosts.length} candidate posts in 24h window`);
    return { rawPosts, scannedCount };

  } catch (err) {
    console.error(`[QC Scraper] ${channel.id} crawl failed:`, err.message);
    return { rawPosts: [], scannedCount: 0 };
  }
}

// ─── GramJS User Client Scraper ───────────────────────────────────────────────
async function scrapeChannelGramJS(client, channel) {
  console.log(`[QC Scraper] Fetching channel ${channel.name} (@${channel.id}) via GramJS API...`);
  const rawPosts = [];
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  
  try {
    let targetPeer = null;
    
    // 1. Try resolving directly by numeric ID or username first (highly robust)
    try {
      targetPeer = await client.getEntity(channel.id);
    } catch (e) {
      // ignore
    }
    
    // 2. Fallback to Exact Dialog Title Matching (prevents matching "DealzTrendz" when we want "DealzTrendz 2.0")
    if (!targetPeer) {
      const dialogs = await client.getDialogs({});
      for (const dialog of dialogs) {
        if (dialog.title && dialog.title.toLowerCase().trim() === channel.name.toLowerCase().trim()) {
          targetPeer = dialog.entity;
          break;
        }
      }
    }
    
    // 3. Fallback to Invite Link Resolution
    if (!targetPeer && (String(channel.id || '').length > 15 || (channel.url && channel.url.includes('/+')))) {
      try {
        const inviteHash = channel.url.split('/').pop().replace('+', '');
        console.log(`[QC Scraper] Attempting to join invite link hash: ${inviteHash}`);
        await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteHash }));
        
        // Re-fetch dialogs and match exactly
        const updatedDialogs = await client.getDialogs({});
        for (const dialog of updatedDialogs) {
          if (dialog.title && dialog.title.toLowerCase().trim() === channel.name.toLowerCase().trim()) {
            targetPeer = dialog.entity;
            break;
          }
        }
      } catch (err) {
        console.warn(`[QC Scraper] Invite join fallback failed: ${err.message}`);
      }
    }
    
    if (!targetPeer) {
      console.error(`[QC Scraper] Could not resolve entity for GramJS scraping: ${channel.id}`);
      return { rawPosts: [], scannedCount: 0 };
    }
    
    // Load checkpoint
    const lastCheckpointId = QCDataStore.getLastMsgId(channel.id) || 0;

    // Fetch recent messages
    const messages = await client.getMessages(targetPeer, {
      limit: 60,
    });
    
    let scannedCount = 0;
    for (const msg of messages) {
      if (msg.id <= lastCheckpointId) {
        continue;
      }
      
      const timestamp = msg.date * 1000;
      if (timestamp < cutoffTime) {
        continue;
      }
      
      scannedCount++;
      const msgText = msg.message || "";
      if (!msgText.trim()) {
        continue;
      }
      
      const dealHrefs = [];
      const imageCdnUrls = [];
      
      // Extract links from message entities
      if (msg.entities) {
        for (const ent of msg.entities) {
          if (ent.className === 'MessageEntityTextUrl' && ent.url) {
            const u = ent.url.toLowerCase();
            if (u.includes('hcti.io') || u.includes('cdn.dealshub') || u.includes('i.imgur.com')) {
              imageCdnUrls.push(ent.url);
            } else if (!u.includes('t.me/') && !u.includes('telegram.org') && u.startsWith('http')) {
              dealHrefs.push(ent.url);
            }
          }
        }
      }
      
      // Extract inline links
      const inlineUrls = msgText.match(/https?:\/\/[^\s]+(?:\b|$)/gi) || [];
      for (const rawUrl of inlineUrls) {
        const u = rawUrl.toLowerCase();
        if (!dealHrefs.includes(rawUrl) && !imageCdnUrls.includes(rawUrl)) {
          if (u.includes('hcti.io') || u.includes('cdn.dealshub') || u.includes('i.imgur.com')) {
            imageCdnUrls.push(rawUrl);
          } else if (!u.includes('t.me/') && !u.includes('telegram.org') && u.startsWith('http')) {
            dealHrefs.push(rawUrl);
          }
        }
      }
      
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
      const primaryUrl = merchantUrl || shortLink || dealHrefs[0] || channel.url;
      
      if (isSpam(msgText) || !isQCRelevant(msgText, primaryUrl) || msgText.trim().length < 15) {
        continue;
      }
      
      // Save media locally if present (bypasses broken telegram hotlinks completely)
      let image = null;
      if (msg.media && msg.media.className === 'MessageMediaPhoto') {
        try {
          const clientRoot = path.resolve(__dirname, '../../client');
          const localDir = path.resolve(__dirname, '../public/uploads/qc');
          const serverDir = path.resolve(__dirname, '../../client/uploads/qc');
          const uploadDir = fs.existsSync(clientRoot) ? serverDir : localDir;
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const cleanId = channel.id.replace(/[^a-zA-Z0-9]/g, '_');
          const imgFilename = `${cleanId}-${msg.id}.jpg`;
          const imagePath = path.join(uploadDir, imgFilename);
          
          // Download photo buffer
          const buffer = await client.downloadMedia(msg.media, {
            workers: 1
          });
          
          if (buffer) {
            fs.writeFileSync(imagePath, buffer);
            image = `/uploads/qc/${imgFilename}`;
            console.log(`[QC Scraper] Saved media for msg ${msg.id} to ${image}`);
          }
        } catch (mediaErr) {
          console.error(`[QC Scraper] Error downloading media for ${msg.id}:`, mediaErr.message);
        }
      }
      
      if (!image && imageCdnUrls.length > 0) {
        image = imageCdnUrls[0];
      }
      
      const rebrandedText = rebrand(msgText);
      const textLines = msgText.split('\n').map(l => l.trim()).filter(Boolean);
      const rebrandedTitleText = rebrandTitle(textLines[0] || 'Quick Commerce Offer');
      
      rawPosts.push({
        id: `qc-${channel.id}-${msg.id}`,
        telegramMsgId: msg.id,
        title: rebrandedTitleText,
        text: rebrandedText,
        image,
        url: primaryUrl,
        urls: dealHrefs,
        timestamp,
        source: channel.id,
      });
    }
    
    console.log(`[QC Scraper] GramJS ${channel.id}: scanned ${scannedCount} posts, found ${rawPosts.length} candidate posts in 24h window`);
    return { rawPosts, scannedCount };
  } catch (err) {
    console.error(`[QC Scraper] GramJS ${channel.id} crawl failed:`, err.message);
    return { rawPosts: [], scannedCount: 0 };
  }
}

async function scrapeChannel(channel) {
  const client = await getTelegramClient();
  if (client) {
    return scrapeChannelGramJS(client, channel);
  } else {
    return scrapeChannelPublicEmbed(channel);
  }
}

// ─── Process Channel ──────────────────────────────────────────────────────────

async function processChannel(channel) {
  const { rawPosts, scannedCount } = await scrapeChannel(channel);
  if (scannedCount === 0) return;

  const enriched = [];
  const failedIds = new Set();
  for (const raw of rawPosts) {
    try {
      // Skip if already exists in store to prevent wasteful Gemini calls
      if (QCDataStore.getById(raw.id)) {
        continue;
      }
      // 1. OCR Image Sanitization Check (only if external image)
      if (raw.image && !raw.image.startsWith('/uploads/')) {
        const clean = await isImageCleanOCR(raw.image);
        if (!clean) {
          raw.image = null;
        }
      }

      // 2. Perform OCR Text Extraction to find extra details from image (payment screenshots, details, etc.)
      if (raw.image) {
        console.log(`[QC Scraper] Extracting text from image for post ${raw.id}...`);
        const imageText = await extractTextFromImage(raw.image);
        if (imageText && imageText.trim()) {
          console.log(`[QC Scraper] OCR text extracted for post ${raw.id} (${imageText.length} chars)`);
          raw.text = `${raw.text}\n\n[Image Text]: ${imageText}`;
        }
      }

      // 3. Initial Enrichment
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
      if (e.message === 'TRANSIENT_API_ERROR') {
        console.warn(`[QC Scraper] Post ${raw.id} failed transiently (AI error/rate-limit). Will retry.`);
        failedIds.add(raw.telegramMsgId);
      } else {
        console.error(`[QC Enricher] Post ${raw.id} failed:`, e.message);
      }
    }
  }

  // Record metrics
  const { added, rejected } = QCDataStore.upsert(enriched);
  QCDataStore.incrementSourceMetrics(channel.id, scannedCount, added);

  if (added > 0) {
    console.log(`[QC Store] ${channel.id}: +${added} new, ${rejected} deduped`);
    qcDealEmitter.emit('qc_new_deals', enriched.slice(0, added));
  }
  
  // Save checkpoint to avoid reprocessing these messages
  if (rawPosts.length > 0) {
    const lastCheckpointId = QCDataStore.getLastMsgId(channel.id) || 0;
    const sortedRaw = [...rawPosts].sort((a, b) => a.telegramMsgId - b.telegramMsgId);
    let safeMsgId = lastCheckpointId;

    for (const raw of sortedRaw) {
      if (failedIds.has(raw.telegramMsgId)) {
        break;
      }
      safeMsgId = raw.telegramMsgId;
    }

    if (safeMsgId > lastCheckpointId) {
      QCDataStore.saveCheckpoint(channel.id, safeMsgId);
    }
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
