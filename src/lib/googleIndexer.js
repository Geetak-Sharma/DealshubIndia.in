import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_PATH = path.resolve(__dirname, '../../keys/google-indexing-key.json');

/**
 * Submits a URL to the Google Indexing API.
 * @param {string} targetUrl The URL of the deal page to index.
 * @param {string} type The action (URL_UPDATED or URL_DELETED). Default is 'URL_UPDATED'.
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise.
 */
export async function pingGoogleIndexing(targetUrl, type = 'URL_UPDATED') {
  try {
    if (!fs.existsSync(KEY_PATH)) {
      console.warn(`[GoogleIndexer] Credentials file not found at ${KEY_PATH}. Skipping Indexing API ping.`);
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const client = await auth.getClient();
    
    const indexing = google.indexing({
      version: 'v1',
      auth: client
    });

    console.log(`[GoogleIndexer] Submitting URL to Google Indexing API: ${targetUrl} (${type})`);
    
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: targetUrl,
        type: type,
      },
    });

    console.log(`[GoogleIndexer] Indexing API success for ${targetUrl}:`, res.data);
    return true;
  } catch (error) {
    console.error(`[GoogleIndexer] Failed to ping Indexing API for ${targetUrl}:`, error.message);
    return false;
  }
}
