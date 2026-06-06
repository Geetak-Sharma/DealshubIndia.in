import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import axios from 'axios';
import { TelegramDataStore } from './telegramStore.js';

// Singleton Emitter
export const dealEmitter = new EventEmitter();
dealEmitter.setMaxListeners(50);

let isFetching = false;
let scraperInterval = null;

function generateAIContext(deal) {
  const dNum = deal.discountNum || 0;
  const pNum = deal.priceNum || 0;
  const cat = deal.category || 'other';
  if (dNum >= 85) return "🔥 Price Error Hunter: This drop looks like a pricing error. Grab it immediately!";
  if (cat === 'tech' && dNum >= 60) return "💻 Tech Theft: Premium electronics rarely drop this low. High value detected.";
  if (pNum > 0 && pNum < 50) return "🪙 Value King: Verified product for less than ₹50. Zero-regret loot.";
  if (cat === 'fashion' && dNum >= 75) return "🎒 Style Steal: 75%+ off verified branded apparel. Refresh your wardrobe now.";
  if (cat === 'under-99' && dNum >= 50) return "🪄 Pocket Loot: Perfect filler item at a significantly deflated price.";
  if (deal.isLoot) return "🏆 Verified Loot: Significant price deviation detected from market average.";
  return "✨ Smart Value: Scanned and verified by our AI as a top-tier deal.";
}

export async function fetchAndCacheDeals() {
  if (isFetching) return;
  isFetching = true;
  try {
    const detectPlatform = (url) => {
      if (!url) return "Deal";
      const u = url.toLowerCase();
      if (u.includes("amazon") || u.includes("amzn.to") || u.includes("amzn.in") || u.includes("amzn")) return "Amazon";
      if (u.includes("flipkart") || u.includes("fkrt.in") || u.includes("fkrt") || u.includes("dl.flipkart")) return "Flipkart";
      if (u.includes("myntra") || u.includes("myntr.in") || u.includes("myntr")) return "Myntra";
      if (u.includes("ajio")) return "Ajio";
      if (u.includes("croma")) return "Croma";
      if (u.includes("meesho")) return "Meesho";
      if (u.includes("nykaa")) return "Nykaa";
      if (u.includes("jiomart")) return "JioMart";
      if (u.includes("tatacliq")) return "Tata CLiQ";
      return "Deal";
    };

    const categorizeDeal = (title) => {
      const t = title.toLowerCase();
      const techKeywords = ["mobile", "laptop", "watch", "earbuds", "ssd", "keyboard", "mouse", "monitor", "iphone", "samsung", "oneplus", "xiaomi", "realme", "redmi", "boat", "noise", "boult", "sony", "jbl", "hp", "dell", "lenovo", "asus", "acer", "logitech", "sandisk", "tp-link", "storage", "magsafe", "charger", "powerbank", "processor", "ram", "graphics card", "gpu", "case", "smps", "motherboard"];
      const fashionKeywords = ["shirt", "shoe", "tshirt", "dress", "kurta", "jeans", "top", "saree", "watch", "bag", "backpack", "wallet", "nike", "adidas", "puma", "reebok", "levis", "flying machine", "allen solly", "peter england", "louis philippe", "van heusen", "biba", "only", "vero moda", "roadster", "hrx", "zara", "h&m", "fossil", "titan", "fastrack", "casio"];
      const homeKeywords = ["home", "kitchen", "bottle", "mop", "lamp", "curtain", "towel", "bedsheet", "pillow", "cooker", "pan", "prestige", "pigeon", "butterfly", "bajaj", "havells", "macho", "philips", "lifelong", "milton", "cello", "solimo", "bosch", "lg", "whirlpool", "haier", "voltas", "daikin", "godrej", "carpet", "furniture", "sofa", "table", "chair", "bookshelf", "wardrobe", "container", "chopper", "grinder", "mixer", "induction", "kettle"];
      if (techKeywords.some(k => t.includes(k))) return "tech";
      if (fashionKeywords.some(k => t.includes(k))) return "fashion";
      if (homeKeywords.some(k => t.includes(k))) return "home";
      return "other";
    };

    const sanitizeLine = (text) => {
      let clean = text.replace(/https?:\/\/[^\s]+/g, "").trim();
      clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
      return clean;
    };

    // --- Source 1: Official Bot API ---
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetchFromBot(botToken, chatId);
    }

    // --- Source 2: Web Scraper ---
    const url = "https://t.me/s/DealsHubIndiaa";
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);
      const parsedDeals = [];

      $(".tgme_widget_message").each((_, element) => {
        const $elem = $(element);
        const msgText = $elem.find(".tgme_widget_message_text").text();
        const msgHtml = $elem.find(".tgme_widget_message_text").html() || "";
        if (!msgText.trim()) return;

        // Strict Image Check
        const photoWrap = $elem.find(".tgme_widget_message_photo_wrap");
        let image = null;
        if (photoWrap.length > 0) {
          const style = photoWrap.attr("style") || "";
          const bgImgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgImgMatch) {
            const potentialImg = bgImgMatch[1];
            if (potentialImg && !potentialImg.includes('Telegram_logo') && potentialImg.includes('telesco.pe')) {
              image = potentialImg;
            }
          }
        }

        // --- USER REQUIREMENT: SKIP NO-IMAGE DEALS ---
        if (!image) return;

        const textLines = msgText.split("\n").map((l) => l.trim()).filter(Boolean);
        const headline = sanitizeLine(textLines[0]) || "Exclusive Deal";
        const rawHrefs = [];
        $elem.find(".tgme_widget_message_text a").each((_2, el) => {
          const href = $(el).attr("href");
          if (href && !href.includes("t.me/") && !href.includes("telegram.org") && href.startsWith("http")) {
            rawHrefs.push(href);
          }
        });

        const uniqueHrefs = [...new Set(rawHrefs)];
        if (uniqueHrefs.length === 0) return;

        const structuredLinks = [];
        const usedUrls = new Set();
        for (let i = 0; i < textLines.length; i++) {
          const line = textLines[i];
          if (line.startsWith("http") && !line.includes("t.me/")) {
             const prevLine = textLines[i-1];
             const label = (prevLine && !prevLine.startsWith("http")) ? sanitizeLine(prevLine) : "View Deal";
             structuredLinks.push({ title: label, url: line, platform: detectPlatform(line) });
             usedUrls.add(line);
          }
        }
        for (const href of uniqueHrefs) {
          if (!usedUrls.has(href)) {
             structuredLinks.push({ title: "View Deal", url: href, platform: detectPlatform(href) });
             usedUrls.add(href);
          }
        }

        const priceMatch = msgText.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
        const price = priceMatch ? `₹${priceMatch[1]}` : 'Check Price';
        const priceNum = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
        const timestamp = $elem.find(".tgme_widget_message_date time").attr("datetime") 
                        ? new Date($elem.find(".tgme_widget_message_date time").attr("datetime")).getTime() 
                        : Date.now();

        // Find checkout link
        const checkoutLink = structuredLinks.find(l => ["Amazon", "Flipkart", "Myntra", "Ajio"].includes(l.platform)) 
                          || structuredLinks[0] 
                          || { url: uniqueHrefs[0], platform: "Telegram" };

        const dealId = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + "-" + timestamp;
        const dealData = {
          id: dealId, title: headline, text: msgText,
          url: checkoutLink.url, 
          checkoutUrl: checkoutLink.url, 
          platform: checkoutLink.platform,
          price: price, priceNum: priceNum, category: categorizeDeal(headline),
          image: image, timestamp: timestamp, msgHtml: msgHtml
        };
        dealData.aiContext = generateAIContext(dealData);
        parsedDeals.push(dealData);
      });

      const addedCount = TelegramDataStore.upsertPosts(parsedDeals);
      if (addedCount > 0) {
        dealEmitter.emit('tg_new_deals', parsedDeals.slice(0, addedCount));
      }
    }
  } catch (error) {
    console.error("[Scraper] failure:", error);
  } finally {
    isFetching = false;
  }
}

async function fetchTelegramFile(token, fileId) {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    if (res.data.ok && res.data.result.file_path) {
      return `https://api.telegram.org/file/bot${token}/${res.data.result.file_path}`;
    }
  } catch (e) {
    console.error("[Telegram File] fetch failed:", e);
  }
  return null;
}

async function fetchFromBot(token, chatId) {
  try {
    const store = TelegramDataStore.load();
    const offset = store.lastBotOffset || 0;
    const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}`);
    const updates = res.data.result;
    
    if (updates && updates.length > 0) {
      const newPosts = [];
      
      for (const u of updates) {
        const msg = u.message || u.channel_post;
        if (!msg) continue;
        
        // Skip messages without photos for now as they are harder to format for the feed
        if (!msg.photo || msg.photo.length === 0) continue;
        
        // Get the highest resolution photo
        const bestPhoto = msg.photo[msg.photo.length - 1];
        const imageUrl = await fetchTelegramFile(token, bestPhoto.file_id) || "https://cdn5.telesco.pe/file/dummy-bot-photo.jpg";

        const text = msg.text || msg.caption || "";
        const title = (text.split("\n")[0] || "Exclusive Deal").slice(0, 100);
        const uniqueHrefs = [...new Set(text.match(/https?:\/\/[^\s]+/g) || [])].filter(h => !h.includes("t.me/"));
        
        // Helper to detect platform
        const detectPlatform = (url) => {
          const u = url.toLowerCase();
          if (u.includes("amazon") || u.includes("amzn")) return "Amazon";
          if (u.includes("flipkart") || u.includes("fkrt")) return "Flipkart";
          if (u.includes("myntra")) return "Myntra";
          if (u.includes("ajio")) return "Ajio";
          return "Deal";
        };

        const platform = uniqueHrefs.length > 0 ? detectPlatform(uniqueHrefs[0]) : "Telegram";
        
        newPosts.push({
          id: `bot-${msg.message_id}`,
          title: title, 
          text: text,
          url: `https://t.me/c/${chatId.replace("-100", "")}/${msg.message_id}`,
          checkoutUrl: uniqueHrefs[0] || "",
          platform: platform,
          price: "Check Price", 
          category: "other", // Could be improved with categorizeDeal(title)
          image: imageUrl, 
          timestamp: msg.date * 1000,
          msgHtml: text.replace(/\n/g, "<br/>")
        });
      }

      if (newPosts.length > 0) {
        const addedCount = TelegramDataStore.upsertPosts(newPosts);
        if (addedCount > 0) {
          dealEmitter.emit('tg_new_deals', newPosts.slice(0, addedCount));
        }
      }
      const lastId = updates[updates.length - 1].update_id;
      store.lastBotOffset = lastId + 1;
      TelegramDataStore.save(store);
    }
  } catch (e) { console.error("[Bot API] failed:", e); }
}

export function startScraper() {
  if (scraperInterval) return;
  scraperInterval = true; // Instant concurrency lock
  fetchAndCacheDeals();
  scraperInterval = setInterval(fetchAndCacheDeals, 60 * 1000);
}

export function getCachedDeals() { return TelegramDataStore.load().posts; }
export function getCacheMeta() { return { lastUpdated: TelegramDataStore.load().lastUpdated }; }
