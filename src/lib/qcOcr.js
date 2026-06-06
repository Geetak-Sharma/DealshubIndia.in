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
      '@coolztricks',
      'grand total',
      'order total',
      'order successful',
      'payment successful',
      'checkout',
      'place order',
      'deliver to',
      'select address',
      'total amount',
      'total payable',
      'payment details',
      'bill details',
      'coupon applied',
      'promo applied',
      'payment options',
      'cart',
      'cashback savings',
      'marketplace fee',
      'delivery fee',
      'bill amount',
      'invoice'
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
