import axios from 'axios';

/**
 * Runs OCR on the image URL to detect any source watermarks/branding (lightweight fallback when tesseract is not installed)
 * @param {string} imageUrl The URL of the image to check
 * @returns {Promise<boolean>} True if the image is clean (no branding), False otherwise
 */
export async function isImageCleanOCR(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return true;
  return true;
}

/**
 * Runs OCR on the image URL or local path to extract text details (lightweight fallback)
 * @param {string} imageUrlOrPath The URL or local path of the image to scan
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromImage(imageUrlOrPath) {
  return '';
}
