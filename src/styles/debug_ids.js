import path from 'path';
import fs from 'fs';
import { TelegramDataStore } from '../lib/telegramStore.js';
import { fetchAndCacheDeals } from '../lib/scraper.js';

async function test() {
  console.log("CWD:", process.cwd());
  console.log("Testing scraper...");
  
  try {
    await fetchAndCacheDeals();
    const data = TelegramDataStore.load();
    console.log("Deals in store:", data.posts.length);
    if (data.posts.length > 0) {
      console.log("First deal:", data.posts[0].title);
    } else {
      console.log("STILL EMPTY. Scraper logic might be failing.");
    }
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
