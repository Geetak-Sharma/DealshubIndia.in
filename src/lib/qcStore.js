import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QCLogger } from './qcLogger.js';
import { generateFallbackSVG } from './qcFallbackImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DB_PATH         = path.resolve(__dirname, '../data/qc_posts.json');
const CHECKPOINT_PATH = path.resolve(__dirname, '../data/qc_checkpoint.json');
const CONFIG_PATH     = path.resolve(__dirname, '../data/qc_config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { maxPosts: 3000, deduplicationWindowHours: 24 };
  }
}

export class QCDataStore {
  // ─── Core I/O (atomic write) ──────────────────────────────────────────────

  static load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const data = JSON.parse(raw);
        
        // Ensure all loaded posts have a valid fallbackSvg generated
        let modified = false;
        if (data.posts && Array.isArray(data.posts)) {
          for (const post of data.posts) {
            if (!post.fallbackSvg) {
              post.fallbackSvg = generateFallbackSVG({ ...post, image: null });
              modified = true;
            }
          }
        }
        
        if (modified) {
          const tmp = `${DB_PATH}.tmp`;
          fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
          fs.renameSync(tmp, DB_PATH);
        }

        QCLogger.storeLoaded(data.posts?.length || 0);
        return data;
      }
    } catch (e) {
      console.error('[QCStore] Load failed:', e);
    }
    return {
      posts:          [],
      lastUpdated:    0,
      totalRejected:  0,
      totalPublished: 0,
    };
  }

  static save(data) {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${DB_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, DB_PATH);
      QCLogger.storeSaved(data.posts?.length || 0);
    } catch (e) {
      console.error('[QCStore] Save failed:', e);
    }
  }

  // ─── Checkpoint (last processed Telegram message ID) ─────────────────────
  // Survives restart, deployment, and crash — stored separately from posts.

  static loadCheckpoint() {
    try {
      if (fs.existsSync(CHECKPOINT_PATH)) {
        return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      }
    } catch { /* ignore */ }
    return {};
  }

  static saveCheckpoint(channelId, lastMsgId) {
    try {
      const checkpoints = this.loadCheckpoint();
      checkpoints[channelId] = {
        lastMsgId,
        savedAt: new Date().toISOString(),
      };
      const tmp = `${CHECKPOINT_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(checkpoints, null, 2));
      fs.renameSync(tmp, CHECKPOINT_PATH);
      QCLogger.storeCheckpoint(channelId, lastMsgId);
    } catch (e) {
      console.error('[QCStore] Checkpoint save failed:', e);
    }
  }

  static getLastMsgId(channelId) {
    const checkpoints = this.loadCheckpoint();
    return checkpoints[channelId]?.lastMsgId || null;
  }

  // ─── Deduplication (multi-signal) ─────────────────────────────────────────
  // Signals: ID, slug, Telegram msgId, merchant+coupon, merchant+URL, merchant+price+title

  static isDuplicate(post, existingPosts) {
    const config = loadConfig();
    const windowMs = (config.deduplicationWindowHours || 24) * 3600 * 1000;

    return existingPosts.some(p => {
      // 1. Exact ID (most reliable)
      if (p.id === post.id) return true;

      // 2. Same Telegram message ID on same channel
      if (post.telegramMsgId && p.telegramMsgId === post.telegramMsgId && p.source === post.source) return true;

      // 3. Same slug
      if (p.slug && post.slug && p.slug === post.slug) return true;

      const sameWindow = Math.abs((p.timestamp || 0) - (post.timestamp || 0)) < windowMs;

      // 4. Same merchant + same coupon code (within window)
      if (
        p.merchant && p.merchant === post.merchant &&
        post.couponCode && p.couponCode === post.couponCode &&
        sameWindow
      ) return true;

      // 5. Same clean destination URL (affiliate-stripped)
      if (
        post.cleanUrl && p.cleanUrl &&
        post.cleanUrl === p.cleanUrl &&
        sameWindow
      ) return true;

      // 6. Same merchant + same final price + very similar title
      if (
        p.merchant && p.merchant === post.merchant &&
        post.finalPrice && p.finalPrice === post.finalPrice &&
        sameWindow &&
        post.title && p.title &&
        p.title.slice(0, 45) === post.title.slice(0, 45)
      ) return true;

      // 7. Same merchant + same discount + same source + very close timestamp (5 min)
      if (
        p.merchant && p.merchant === post.merchant &&
        p.discount === post.discount &&
        p.source === post.source &&
        Math.abs((p.timestamp || 0) - (post.timestamp || 0)) < 5 * 60 * 1000
      ) return true;

      return false;
    });
  }

  // ─── Upsert ───────────────────────────────────────────────────────────────

  static upsert(newPosts) {
    if (!newPosts || newPosts.length === 0) return { added: 0, rejected: 0 };

    const data   = this.load();
    const config = loadConfig();
    let added    = 0;
    let rejected = 0;

    for (const post of newPosts) {
      if (!post || !post.id) { rejected++; continue; }

      if (this.isDuplicate(post, data.posts)) {
        QCLogger.postDuplicate(post.id);
        rejected++;
        continue;
      }

      // Ensure all fields are present (Step 9)
      const enriched = {
        ...post,
        merchant:        post.merchant         || null,
        productName:     post.productName      || null,
        price: post.price || 0,
        mrp:             parseInt(post.mrp)    || 0,
        discountPercent: parseInt(post.discountPercent) || 0,
        seoTitle:        post.seoTitle         || post.title || '',
        shortTitle:      post.shortTitle       || '',
        explanation:       post.explanation       || '',
        verdictTier:       post.verdictTier       || 'GOOD_DEAL',
        whatsappShareText: post.whatsappShareText || '',
        twitterShareText:  post.twitterShareText  || '',
        confidence:      parseInt(post.confidence) || 100,
        destinationType: post.destinationType  || 'merchant-url',
        finalUrl:        post.finalUrl         || post.url || '',
        imageQuality:    post.imageQuality     || 'clean',
        aiVersion:       post.aiVersion        || 'gemini-2.5-flash',
        couponCode:      post.couponCode       || null,
        cashbackAmount:  post.cashback         || null,
        category:        post.category         || 'food-delivery',
        sourceChannel:   post.source           || 'dealbeetricks',
        clickCount:      post.clickCount       || 0,
        shareCount:      post.shareCount       || 0,
        viewCount:       post.viewCount        || 0,
        importedAt:      post.importedAt       || new Date().toISOString(),
        lastUpdatedAt:   new Date().toISOString(),
      };

      data.posts.unshift(enriched);
      QCLogger.postPublished(post.id, post.merchant);
      added++;

      // Trigger Google Indexing API ping
      import('./googleIndexer.js').then(({ pingGoogleIndexing }) => {
        pingGoogleIndexing(`https://dealshubindia.in/quick-commerce/${enriched.slug}`).catch(err => {
          console.error('[QCStore] Indexing ping failed:', err);
        });
      }).catch(err => {
        console.error('[QCStore] Failed to load googleIndexer:', err);
      });
    }

    if (added > 0) {
      data.posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const maxPosts = config.maxPosts || 3000;
      if (data.posts.length > maxPosts) {
        data.posts = data.posts.slice(0, maxPosts);
      }
      data.lastUpdated    = Date.now();
      data.totalRejected  = (data.totalRejected  || 0) + rejected;
      data.totalPublished = (data.totalPublished || 0) + added;
      this.save(data);

      // Trigger Web Push Notifications for the newest deal
      const newestPost = data.posts[0];
      if (newestPost) {
        import('./qcNotifier.js').then(({ QCNotifier }) => {
          QCNotifier.sendNotificationToAll(newestPost).catch(err => {
            console.error('[QCStore] Notification dispatch failed:', err);
          });
        }).catch(err => {
          console.error('[QCStore] Failed to load QCNotifier:', err);
        });
      }
    }

    return { added, rejected };
  }

  // ─── Expiry Archival ──────────────────────────────────────────────────────

  static archiveExpired() {
    const data = this.load();
    let changed = 0;
    const now = Date.now();
    for (const p of data.posts) {
      if (!p.isExpired && p.validTill) {
        if (new Date(p.validTill).getTime() < now) {
          p.isExpired    = true;
          p.lastUpdatedAt = new Date().toISOString();
          changed++;
        }
      }
    }
    if (changed > 0) this.save(data);
    return changed;
  }

  // ─── Click Tracking ───────────────────────────────────────────────────────

  static incrementClick(id) {
    if (!id) return false;
    const data = this.load();
    const post = data.posts.find(p => p.id === id);
    if (!post) return false;
    post.clickCount    = (post.clickCount || 0) + 1;
    post.lastUpdatedAt = new Date().toISOString();
    this.save(data);
    return true;
  }

  static incrementShare(id) {
    if (!id) return false;
    const data = this.load();
    const post = data.posts.find(p => p.id === id);
    if (!post) return false;
    post.shareCount    = (post.shareCount || 0) + 1;
    post.lastUpdatedAt = new Date().toISOString();
    this.save(data);
    return true;
  }

  static incrementView(id) {
    if (!id) return false;
    const data = this.load();
    const post = data.posts.find(p => p.id === id);
    if (!post) return false;
    post.viewCount     = (post.viewCount || 0) + 1;
    post.lastUpdatedAt = new Date().toISOString();
    this.save(data);
    return true;
  }

  // ─── Lookups ──────────────────────────────────────────────────────────────

  static getBySlug(slug) {
    if (!slug) return null;
    const data = this.load();
    return data.posts.find(p => p.slug === slug) || null;
  }

  static getById(id) {
    if (!id) return null;
    const data = this.load();
    return data.posts.find(p => p.id === id) || null;
  }

  static getLatest(limit = 10) {
    const data = this.load();
    return data.posts.filter(p => !p.isExpired).slice(0, limit);
  }

  static getRelated(dealId, merchant, limit = 4) {
    const data = this.load();
    return data.posts
      .filter(p => !p.isExpired && p.id !== dealId && p.merchant === merchant)
      .slice(0, limit);
  }

  static getAllSlugs() {
    const data = this.load();
    return data.posts
      .filter(p => !p.isExpired && p.slug)
      .map(p => ({ slug: p.slug, timestamp: p.timestamp }));
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  static search(query = '', limit = 20, offset = 0, filters = {}) {
    const data = this.load();
    let results = data.posts.filter(p => !p.isExpired);

    if (filters.category && filters.category !== 'all') {
      results = results.filter(p => p.category === filters.category);
    } else {
      results = results.filter(p => p.category !== 'bank-offers');
    }
    if (filters.merchant && filters.merchant !== 'all') {
      const m = filters.merchant.toLowerCase();
      results = results.filter(p => p.merchant && p.merchant.toLowerCase() === m);
    }
    if (filters.hasCoupon === 'true')    results = results.filter(p => !!p.couponCode);
    if (filters.hasCashback === 'true')  results = results.filter(p => !!p.cashback);
    if (filters.expiringToday === 'true') {
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const now = Date.now();
      results = results.filter(p => {
        if (!p.validTill) return false;
        const exp = new Date(p.validTill).getTime();
        return exp > now && exp <= endOfDay.getTime();
      });
    }
    if (filters.minDiscount) {
      const min = parseInt(filters.minDiscount, 10);
      if (!isNaN(min)) results = results.filter(p => (p.discountNum || 0) >= min);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(p =>
        (p.title      && p.title.toLowerCase().includes(q)) ||
        (p.text       && p.text.toLowerCase().includes(q))  ||
        (p.merchant   && p.merchant.toLowerCase().includes(q)) ||
        (p.couponCode && p.couponCode.toLowerCase().includes(q))
      );
    }

    return {
      total:   results.length,
      deals:   results.slice(offset, offset + limit),
      hasMore: offset + limit < results.length,
    };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  static getStats() {
    const data   = this.load();
    const active = data.posts.filter(p => !p.isExpired);
    const merchantCounts = {};
    for (const p of active) {
      if (p.merchant) merchantCounts[p.merchant] = (merchantCounts[p.merchant] || 0) + 1;
    }
    return {
      total:          data.posts.length,
      active:         active.length,
      expired:        data.posts.length - active.length,
      totalRejected:  data.totalRejected  || 0,
      totalPublished: data.totalPublished || 0,
      lastUpdated:    data.lastUpdated,
      topMerchants:   Object.entries(merchantCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([merchant, count]) => ({ merchant, count })),
      sourceMetrics:  data.sourceMetrics || {},
    };
  }

  static incrementSourceMetrics(sourceId, scannedIncrement, acceptedIncrement) {
    if (!sourceId) return;
    const data = this.load();
    if (!data.sourceMetrics) data.sourceMetrics = {};
    if (!data.sourceMetrics[sourceId]) {
      data.sourceMetrics[sourceId] = {
        scanned: 0,
        accepted: 0,
        dailyStats: {},
        lowQualityFlagged: false,
        lastScraped: null
      };
    }
    
    const stats = data.sourceMetrics[sourceId];
    stats.scanned += scannedIncrement;
    stats.accepted += acceptedIncrement;
    stats.lastScraped = new Date().toISOString();
    
    // Add to dailyStats
    const today = new Date().toISOString().slice(0, 10);
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { scanned: 0, accepted: 0 };
    }
    stats.dailyStats[today].scanned += scannedIncrement;
    stats.dailyStats[today].accepted += acceptedIncrement;
    
    // Auto disable logic: Check last 30 days of stats
    const dailyKeys = Object.keys(stats.dailyStats).sort();
    if (dailyKeys.length >= 30) {
      let consecutiveLowQuality = true;
      const last30Days = dailyKeys.slice(-30);
      for (const dateStr of last30Days) {
        const day = stats.dailyStats[dateStr];
        const rate = day.scanned > 0 ? (day.accepted / day.scanned) * 100 : 0;
        if (rate >= 2.0) {
          consecutiveLowQuality = false;
          break;
        }
      }
      if (consecutiveLowQuality) {
        stats.lowQualityFlagged = true;
      }
    }
    
    this.save(data);
  }
}

