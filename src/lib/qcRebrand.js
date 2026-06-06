import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _config = null;

function getConfig() {
  if (!_config) {
    try {
      const configPath = path.resolve(__dirname, '../data/qc_config.json');
      _config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      _config = {
        brand: {
          remove: ['DealBee', 'dealbee'],
          removeLinks: ['t.me/dealbee'],
          siteName: 'Dealshub India',
          siteUrl: 'https://dealshubindia.in',
        },
      };
    }
  }
  return _config;
}

/**
 * Rebrand full post body text:
 * - Removes DealBee brand mentions
 * - Removes all @channel mentions
 * - Removes DealBee URLs
 * - Replaces with Dealshub India references
 */
export function rebrand(text) {
  if (!text) return text;
  const config = getConfig();
  const brand = config.brand || {};
  let result = text;

  // 1. Remove URLs containing DealBee domain patterns
  const removeLinks = brand.removeLinks || [];
  for (const link of removeLinks) {
    const escaped = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`https?:\\/\\/[^\\s]*${escaped}[^\\s]*`, 'gi'),
      ''
    );
  }

  // 2. Remove DealBee brand words (whole or partial match)
  const removeWords = brand.remove || [];
  for (const word of removeWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '');
  }

  // 3. Remove all @mentions (Telegram channel references)
  result = result.replace(/@[A-Za-z0-9_]{3,}/g, '');

  // 4. Remove join/follow/share call-to-actions
  result = result.replace(/join\s+(?:our\s+)?(?:channel|group|community)[^.!?\n]*/gi, '');
  result = result.replace(/follow\s+us\s+(?:on|at|for)[^.!?\n]*/gi, '');
  result = result.replace(/share\s+(?:this\s+)?(?:with\s+)?(?:your\s+)?friends?[^.!?\n]*/gi, '');

  // 5. Replace t.me links with Dealshub link
  result = result.replace(/https?:\/\/t\.me\/[^\s]*/gi, brand.affiliateLink || 'https://dealshub.bio.link/');

  // 6. Normalize whitespace — remove excess blank lines
  result = result
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // Keep non-empty lines and single blank lines (not consecutive)
      if (line !== '') return true;
      return arr[i - 1] !== '';
    })
    .join('\n')
    .trim();

  return result;
}

/**
 * Rebrand a single title string — lighter version for titles only
 */
export function rebrandTitle(title) {
  if (!title) return title;
  const config = getConfig();
  const brand = config.brand || {};
  let result = title;

  const removeWords = brand.remove || [];
  for (const word of removeWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // For titles: remove whole word boundaries
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '').trim();
  }

  // Remove @mentions from title
  result = result.replace(/@[A-Za-z0-9_]{3,}/g, '').trim();

  // Clean up leftover artifacts
  result = result
    .replace(/\s+/g, ' ')
    .replace(/^[\s|:–\-•]+|[\s|:–\-•]+$/g, '')
    .trim();

  return result;
}
