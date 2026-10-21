# DealsHub India (dealshubindia.in)

> Production loot deals & price-drop aggregation platform powered by Astro SSR, Telegram channels sync, Quick Commerce scrapers, and automated deployment to GCP.

---

## 📌 Architecture Overview

DealsHub is a full-stack e-commerce affiliate and deal aggregation portal built on **Astro 6** running in hybrid/SSR mode (@astrojs/node). Deals are ingested from Telegram channels and Quick Commerce partners, enriched, normalized, and displayed via ultra-fast server-rendered & interactive client pages.

### 🌐 Key Portals & Routes
- **/ (Homepage)**: Editorial grid with 2x4 featured deals, trending loot items, countdown loot ticker, category collections, and SEO buying guides.
- **/livedeals**: High-performance real-time deal feed with sticky store filters, instant client-side search, sort controls, and dynamic batch pagination ("Load More").
- **/quick-commerce**: Dedicated quick-commerce deals feed (Blinkit, Zepto, Instamart).
- **/blog**: Prerendered SEO guides, buying advice, and sale alerts.
- **/tools**: Flipkart Review Analyzer & Extractor tools for consumers.
- **/api/***:
  - /api/deals.json: JSON endpoint serving active deals list.
  - /api/tg-stream: SSE (Server-Sent Events) live deal event stream.
  - /api/image-proxy: Proxy server bypassing hotlink protection for Telegram CDN images (	elesco.pe).
  - /api/tools/flipkart-review-analyzer: Product review sentiment scraper.

---

## 🛠️ Tech Stack & Key Libraries

- **Framework**: Astro 6 (output: 'server' with @astrojs/node)
- **Styling**: Tailwind CSS + Custom Notion-card clean aesthetic + GSAP animations
- **Frontend Components**: Astro components (.astro), React (.tsx), and Svelte (.svelte)
- **State & Data Ingestion**:
  - src/lib/telegramStore.js: Persistent file store (src/data/telegram_posts.json) with multi-environment fallback paths.
  - src/lib/dealNormalizer.js: Regex engines extracting coupons, bank discount tags, variants, and budget tiers.
- **Server Environment**: Ubuntu 20.04 LTS (GCP Instance 161.118.177.252), Nginx Reverse Proxy, PM2 Process Manager (dealshub, 	g-forwarder, qc-forwarder).

---

## 🚀 Local Development

### 1. Requirements
- Node.js 20+ or 22+
- npm

### 2. Setup
`ash
git clone https://github.com/Geetak-Sharma/DealshubIndia.in.git
cd dealshub_project
npm install
`

### 3. Development Server
`ash
npm run dev
# Starts server at http://localhost:4321
`

### 4. Production Build & Local Preview
`ash
npm run build
npm run preview -- --host 0.0.0.0 --port 4321
`

---

## 🚢 Deployment Workflow (GCP Production)

Deployment is automated using sync.ps1 (PowerShell) which builds the Astro SSR bundle and pushes dist/ directly to the live GCP server.

### Prerequisites in .env:
`ini
REMOTE_HOST=161.118.177.252
REMOTE_USER=ubuntu
REMOTE_PATH=/var/www/dealshubindia.in/htdocs
SSH_KEY_PATH=<Path to SSH private key>
`

### Deployment Steps:
1. **Commit and push to GitHub**:
   `ash
   git add .
   git commit -m "your message"
   git push origin main
   `
2. **Build and Sync to GCP**:
   `powershell
   .\sync.ps1
   `
3. **Restart PM2 on Production Server** (via SSH):
   `ash
   ssh -i "" ubuntu@161.118.177.252 "pm2 restart dealshub"
   `

---

## 📁 Project Directory Structure

`	ext
dealshub_project/
├── .github/workflows/         # GitHub Actions (e.g., telegram-sync.yml)
├── dist/                      # Production build output
│   ├── client/                # Client static assets (CSS, JS, images, prerendered HTML)
│   └── server/                # Node SSR server entrypoint & chunks
├── public/                    # Static assets served at root (icons, robots.txt, sitemap)
├── scripts/                   # Bot runners and background forwarders
│   └── telegram-sync.cjs      # Telegram channel ingestion script
├── src/
│   ├── assets/                # Images and SVGs
│   ├── components/            # Reusable Astro, React, and Svelte components
│   │   ├── deals/             # Deal cards, badges, and meters
│   │   │   └── DealCard.astro # Prerendered deal card component
│   │   ├── EditorialDealCard.astro # Live stream deal card template
│   │   ├── FilterBar.astro    # Sticky filter bar with store selector
│   │   ├── LootTicker.astro   # Countdown ticker for loot drops
│   │   └── StoreRail.astro    # Store selection rail
│   ├── data/                  # Local data stores
│   │   ├── telegram_posts.json# Ingested Telegram posts & deals
│   │   └── deals_cache.json   # Secondary deals cache
│   ├── layouts/               # Page layouts (Layout.astro)
│   ├── lib/                   # Business logic, stores, scrapers, normalizers
│   │   ├── telegramStore.js   # Robust multi-path reader/writer for telegram_posts
│   │   ├── dealNormalizer.js  # Coupon, bank offer, and budget tier extractors
│   │   └── qcStore.js         # Quick Commerce deal store
│   └── pages/                 # Routing endpoints
│       ├── index.astro        # Homepage
│       ├── livedeals.astro    # Live Deals stream page
│       ├── quick-commerce.astro # Quick commerce drops
│       └── api/               # Server API routes (deals.json, stream, proxy)
├── sync.ps1                   # Production SCP deployment script
├── astro.config.mjs           # Astro SSR configuration
├── tailwind.config.mjs        # Tailwind styling rules
└── package.json
`

---

## ⚡ Key Gotchas & Implementation Notes

1. **Server Build Path Resolution (	elegramStore.js)**:
   - In Astro SSR mode (@astrojs/node), chunks run inside dist/server/chunks/. Always use getDbPath() candidate list (process.cwd()/src/data/telegram_posts.json) rather than raw __dirname to ensure runtime can locate JSON data stores.
2. **Deal Card Temporal Dead Zones**:
   - In Astro component frontmatter, avoid referencing variables before their sanitization functions are executed (e.g. sellingNum must be computed after or directly using cleanPriceString(rawPrice)).
3. **Live Deals Dual Rendering (EditorialDealCard vs createCardHtml)**:
   - The /livedeals page renders the first 24 deals on the server (EditorialDealCard.astro).
   - When users click **"Load More Deals"**, client-side JavaScript in <script is:inline> uses createCardHtml() to render cards from the embedded #all-deals-data JSON script tag.
   - Any layout, badge, or timestamp changes in EditorialDealCard.astro **MUST** be mirrored in createCardHtml() inside src/pages/livedeals.astro.
4. **Two-Step Production Deployment**:
   - Pushing to GitHub main records git history, but live server hosting is run via sync.ps1 (which uploads dist/ directly to GCP) followed by restarting PM2 (pm2 restart dealshub).
