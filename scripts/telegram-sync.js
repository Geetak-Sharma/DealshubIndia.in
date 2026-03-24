const { Octokit } = require("@octokit/rest");
const axios = require("axios");

// QA LOG
console.log("🚀 Starting Telegram Sync for DealsHub India...");

// CONFIGURATION (Hardcoded for Force-Sync Protocol)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
const OWNER = "Geetak-Sharma";
const REPO = "DealshubIndia.in";
const CHANNEL_ID = "@DealsHubIndiaa";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function syncDeals() {
  console.log(`[SYNC] Polling ${CHANNEL_ID} for latest Loot...`);
  
  try {
    // 1. Fetch latest updates from Telegram
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=10&allowed_updates=["channel_post"]`;
    const response = await axios.get(url);
    const updates = response.data.result || [];

    for (const update of updates) {
      const post = update.channel_post;
      if (!post) continue;

      // Filtering for targeted channel (Case-Insensitive)
      const chatUsername = post.chat?.username || "";
      console.log(`[DEBUG] Processing post from: ${chatUsername}`);
      if (chatUsername.toLowerCase() !== 'dealshubindiaa') continue;

      const text = post.text || post.caption || "";
      if (!text) continue;

      const updateId = update.update_id;
      const fileName = `deal-${updateId}.md`;
      const filePath = `src/content/deals/${fileName}`;

      // 2. CHECK IDEMPOTENCY (repos.getContent)
      try {
        await octokit.rest.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: filePath,
        });
        console.log(`[SYNC] ℹ️ Skip: ${fileName} already exists in ${REPO}.`);
        continue; 
      } catch (err) {
        if (err.status !== 404) {
          console.error(`[SYNC] ❌ Error checking ${fileName}:`, err.message);
          continue;
        }
      }

      // 3. SMART PARSING (Regex & 60-char title)
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const firstUrl = text.match(urlRegex)?.[0] || "https://dealshubindia.in";
      const title = text.substring(0, 60).replace(/[\n\r]/g, ' ').trim();
      const date = new Date((post.date || Date.now() / 1000) * 1000).toISOString().split('T')[0];

      // 4. GENERATE ZOD-COMPLIANT MARKDOWN
      const markdownContent = `---
title: "${title}"
price: "Check Link"
link: "${firstUrl}"
category: "Other"
date: ${date}
isLoot: true
---

${text}`;

      // 5. COMMIT TO REPOSITORY
      try {
        console.log(`[SYNC] Force-Syncing ${fileName} to ${OWNER}/${REPO}...`);
        await octokit.repos.createOrUpdateFileContents({
          owner: OWNER,
          repo: REPO,
          path: filePath,
          message: `build: force-register telegram-sync workflow v1.1 [${updateId}]`,
          content: Buffer.from(markdownContent).toString("base64"),
        });
        console.log(`[SYNC] ✅ Force-Sync SUCCESS: ${fileName}`);
      } catch (commitErr) {
        console.error(`[SYNC] ❌ Commit failed for ${fileName}:`, commitErr.message);
      }
    }
  } catch (error) {
    console.error("[SYNC FATAL]:", error.response?.data || error.message);
    process.exit(1);
  }
}

syncDeals();
