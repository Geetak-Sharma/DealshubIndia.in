import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { enrichQCPost } from "./qcEnricher.js";

const apiId = 22801451;
const apiHash = "2b807ef041e175b4d7f794331743c0dc";
const sessionString = "1BQANOTEuMTA4LjU2LjEzNwG7JDTJCu/NMgljC/HzCaIJFUqhso4tnw4J11cOISLYuf6wF9SkUVCXx4dWBthNa0RZgwdLDGS1G60bcGwhgkyv3Sf3nY8UTuC9t4tsBEZ9SCFQD/JdVQV1aCMHRMrSenTK74blxxFhoELBs+YAJg+o922qw8Nq/SS2V6cso/vsnjZP6qe8Bk+uGwCtaIB7pTGMEtU3cjd2+amTyVYa3fkGcZxI1gMIvVi212lY2FHe1EGQPUN/i31sV/0Pcf/PvQWIi+VhbX1ogwljxgbl6Q6N3qogu5HuoVCje232rvWOVLcTJq+bWXh7qGTIZJ/fklXGbZILfCpr/zPf0noVYlMToA==";

async function run() {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  console.log("Connected to Telegram");

  const channelId = "-1001782814661";
  const entity = await client.getEntity(channelId);
  const messages = await client.getMessages(entity, { limit: 15 });

  console.log(`Fetched ${messages.length} messages.`);
  for (const msg of messages) {
    const text = msg.message || "";
    if (!text.trim()) continue;

    console.log(`\n--- Message ID: ${msg.id} ---`);
    console.log("Raw Text:", JSON.stringify(text));

    const dealHrefs = [];
    const inlineUrls = text.match(/https?:\/\/[^\s]+(?:\b|$)/gi) || [];
    for (const rawUrl of inlineUrls) {
      if (!rawUrl.includes('t.me/') && !rawUrl.includes('telegram.org')) {
        dealHrefs.push(rawUrl);
      }
    }
    const primaryUrl = dealHrefs[0] || "";

    const rawPost = {
      id: `qc-test-${msg.id}`,
      title: text.split('\n')[0] || "",
      text: text,
      image: null,
      url: primaryUrl,
      urls: dealHrefs,
      timestamp: msg.date * 1000,
      source: "test",
    };

    try {
      const enriched = await enrichQCPost(rawPost);
      if (enriched) {
        console.log("SUCCESSFULLY ENRICHED:", JSON.stringify(enriched, null, 2));
      } else {
        console.log("REJECTED by enrichQCPost");
      }
    } catch (err) {
      console.error("Enrichment error:", err.message);
    }
  }

  await client.disconnect();
}

run().catch(console.error);
