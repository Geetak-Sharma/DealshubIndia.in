# DealsHub Engineering & Architecture Reference

This document details the critical internal subsystems, data flows, and gotchas of DealsHub India.

---

## 1. Deal Ingestion & Pipeline

Telegram Channels / Webhooks -> scripts/telegram-sync.cjs -> src/data/telegram_posts.json -> src/lib/telegramStore.js -> src/lib/dealNormalizer.js -> Astro SSR & /api/deals.json

---

## 2. Dynamic Pagination & Dual-Template Sync

- **SSR Initial Render**: src/pages/livedeals.astro calls src/components/EditorialDealCard.astro for the first 24 deals.
- **Client-side Render (Load More)**: src/pages/livedeals.astro contains an inline script engine with createCardHtml(deal).
- **Golden Rule**: Any visual or metadata changes to deal cards (such as timestamp format, budget tags, coupon pills, store badges, button alignments) must be applied in **both** src/components/EditorialDealCard.astro and createCardHtml() in src/pages/livedeals.astro.

---

## 3. Data Store Resolution in Production

In Astro SSR (@astrojs/node), running files exist in dist/server/chunks/. Relative paths like ../data/telegram_posts.json fail because data is not copied into dist/server/.
src/lib/telegramStore.js implements getDbPath() with fallback paths:
1. path.resolve(process.cwd(), 'src/data/telegram_posts.json') (Production server cwd)
2. path.resolve(__dirname, '../data/telegram_posts.json') (Local dev)
3. path.resolve(__dirname, '../../src/data/telegram_posts.json') (Nested chunks)

---

## 4. Production Deployment Checklist

1. Test local build: 
pm run build
2. Push git: git add . && git commit -m '...' && git push origin main
3. Upload bundle: Run .\sync.ps1 in PowerShell to SCP dist/ to GCP /var/www/dealshubindia.in/htdocs
4. Restart PM2 service: Run via SSH ssh -i <key> ubuntu@161.118.177.252 'pm2 restart dealshub'
