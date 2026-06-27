import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure path is always relative to the src/data directory
const DB_PATH = path.resolve(__dirname, '../data/telegram_posts.json');

export class TelegramDataStore {
  static load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("[DB] Load failed:", e);
    }
    return { posts: [], lastBotOffset: 0, lastUpdated: 0 };
  }

  static save(data) {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
      fs.renameSync(tempPath, DB_PATH);
    } catch (e) {
      console.error("[DB] Save failed:", e);
    }
  }

  static upsertPosts(newPosts) {
    const data = this.load();
    const existingMap = new Map(data.posts.map(p => [p.id, p]));
    
    let addedCount = 0;
    let updatedCount = 0;

    for (const post of newPosts) {
      if (!existingMap.has(post.id)) {
        data.posts.push(post);
        existingMap.set(post.id, post);
        addedCount++;

        // Trigger Google Indexing API ping for the newly added deal
        import('./googleIndexer.js').then(({ pingGoogleIndexing }) => {
          pingGoogleIndexing(`https://dealshubindia.in/deal/${post.id}`).catch(err => {
            console.error('[TelegramStore] Indexing ping failed:', err);
          });
        }).catch(err => {
          console.error('[TelegramStore] Failed to load googleIndexer:', err);
        });
      } else {
        const existing = existingMap.get(post.id);
        const existingTitleClean = (existing.title || "").trim();
        const postTitleClean = (post.title || "").trim();
        
        let changed = false;
        if (existingTitleClean === "View Deal" && postTitleClean !== "View Deal") {
          existing.title = post.title;
          changed = true;
        }
        if (!existing.checkoutUrl && post.checkoutUrl) {
          existing.checkoutUrl = post.checkoutUrl;
          changed = true;
        }
        if ((!existing.image || existing.image.includes('Telegram_logo')) && post.image && !post.image.includes('Telegram_logo')) {
          existing.image = post.image;
          changed = true;
        }

        if (changed) updatedCount++;
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      data.posts.sort((a, b) => b.timestamp - a.timestamp);
      if (data.posts.length > 2000) data.posts = data.posts.slice(0, 2000);
      data.lastUpdated = Date.now();
      this.save(data);
    }
    return addedCount + updatedCount;
  }

  static search(query, limit = 20, offset = 0, category = 'all') {
    const data = this.load();
    let results = data.posts;

    // First filter by category if specified
    if (category && category !== 'all') {
      const cat = category.toLowerCase();
      results = results.filter(p => p.category === cat);
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) || 
        (p.text && p.text.toLowerCase().includes(q)) ||
        (p.msgHtml && p.msgHtml.toLowerCase().includes(q))
      );
    }

    return {
      total: results.length,
      deals: results.slice(offset, offset + limit),
      hasMore: offset + limit < results.length
    };
  }
}
