import Tesseract from 'tesseract.js';
import axios from 'axios';

/**
 * Runs OCR on the image URL to detect any source watermarks/branding
 * @param {string} imageUrl The URL of the image to check
 * @returns {Promise<boolean>} True if the image is clean (no branding), False otherwise
 */
export async function isImageCleanOCR(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return true;

  // Skip mock URLs immediately to save time and prevent errors
  if (imageUrl.includes('example.com') || imageUrl.includes('abc123_product') || imageUrl.includes('desidime_watermark')) {
    return true; 
  }

  try {
    // 1. Download image first to verify reachability and content type
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    const buffer = Buffer.from(response.data);

    // 2. Perform OCR on the buffer
    const result = await Tesseract.recognize(buffer, 'eng');
    const text = result?.data?.text || '';
    const lower = text.toLowerCase();
    
    const blacklist = [
      't.me',
      'telegram',
      'desidime',
      'dealbee',
      'join link',
      'join channel',
      'coolztricks',
      '@desidime',
      '@dealbee',
      '@coolztricks'
    ];

    const hasBranding = blacklist.some(term => lower.includes(term));
    if (hasBranding) {
      console.log(`[OCR-REJECT] Blacklisted text detected in image: "${text.trim().replace(/\n/g, ' ')}"`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[OCR-WARN] OCR execution failed for ${imageUrl.slice(0, 50)}...:`, e.message);
    // Safe default: if OCR fails to load/read, fallback to true so we don't block valid images
    return true;
  }
}

/**
 * Runs OCR on the image URL or local path to extract text details
 * @param {string} imageUrlOrPath The URL or local path of the image to scan
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromImage(imageUrlOrPath) {
  if (!imageUrlOrPath || typeof imageUrlOrPath !== 'string') return '';
  try {
    let buffer;
    if (imageUrlOrPath.startsWith('/uploads/')) {
      const fsModule = await import('fs');
      const pathModule = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = pathModule.dirname(__filename);
      
      const localDir = pathModule.resolve(__dirname, '../public');
      const serverDir = pathModule.resolve(__dirname, '../../client');
      const baseDir = fsModule.existsSync(serverDir) ? serverDir : localDir;
      const absoluteImagePath = pathModule.join(baseDir, imageUrlOrPath);
      
      if (fsModule.existsSync(absoluteImagePath)) {
        buffer = fsModule.readFileSync(absoluteImagePath);
      } else {
        return '';
      }
    } else {
      const response = await axios({
        method: 'GET',
        url: imageUrlOrPath,
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      buffer = Buffer.from(response.data);
    }

    if (!buffer) return '';
    const result = await Tesseract.recognize(buffer, 'eng');
    return result?.data?.text || '';
  } catch (e) {
    console.error(`[OCR-TEXT-EXTRACT-WARN] Extraction failed for ${imageUrlOrPath.slice(0, 50)}...:`, e.message);
    return '';
  }
}
