export interface NormalizedDeal {
  id: string;
  title: string;
  merchant: 'Amazon' | 'Flipkart' | 'Myntra' | 'Ajio' | 'Tata CLiQ' | 'Croma' | 'Meesho' | 'Nykaa' | 'JioMart' | 'Other';
  category: 'CPU' | 'GPU' | 'Storage' | 'Peripheral' | 'Laptop' | 'Fashion' | 'Home' | 'Electronics' | 'Loot' | 'Other';
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  offerHighlight?: string; // e.g., "UPTO 75% OFF"
  url: string;
  image: string;
  timestamp: number;
  timeAgo: string;
  isLoot: boolean;
  badges: string[];
  isLive: boolean;
  cleanTextBody?: string;
  isMultiOffer?: boolean;
  subOffers?: { title: string; url: string; price?: string }[];
  explanation?: string;
  verdictTier?: string;
  whatsappShareText?: string;
  twitterShareText?: string;
}

export function cleanDealTitle(rawTitle: string): { title: string; offerHighlight?: string } {
  let title = rawTitle.trim();
  
  // 0. Remove any unicode emojis at the beginning of the title
  title = title.replace(/^[\p{Emoji}\s]+/gu, '');

  // 1. Strip starting store prefix (e.g. "Myntra Loot | ", "Amazon Offer : ", "Amazon | ")
  title = title.replace(/^(?:myntra|amazon|flipkart|ajio|tatacliq|croma|meesho|nykaa|jiomart)\s*(?:loot|offer|sale|deal)?\s*[\s|:|•-]\s*/gi, '');

  // Remove any remaining brand name + loot prefix at start, e.g. "Myntra Loot -"
  title = title.replace(/^(?:myntra|amazon|flipkart|ajio|tatacliq|croma|meesho|nykaa|jiomart)\s+(?:loot|offer|sale|deal)\s*/gi, '');

  // 2. Detect and extract offer/discount highlight (e.g. "UPTO 75% OFF", "up to 70% off", "Flat 50% Off")
  let offerHighlight: string | undefined = undefined;
  
  // Regex that matches UPTO 75% OFF, flat 50% off, 70% off, under 299, etc.
  // Note: we match it even if it's concatenated (e.g. OFFMen's) by matching till OFF and splitting it.
  const offerRegex = /(?:up\s*to|flat|under|upto|min\.?)\s*\d+%\s*off/gi;
  const match = title.match(offerRegex);
  if (match) {
    offerHighlight = match[0].toUpperCase();
    title = title.replace(offerRegex, ' ').trim();
  }

  // Also match plain percentage discount values (e.g. "75% OFF")
  if (!offerHighlight) {
    const pctRegex = /\b\d+%\s*off\b/gi;
    const pctMatch = title.match(pctRegex);
    if (pctMatch) {
      offerHighlight = pctMatch[0].toUpperCase();
      title = title.replace(pctRegex, ' ').trim();
    }
  }

  // Also match general rupees discount values (e.g. "Flat 500 Off", "Rs 4000 off")
  if (!offerHighlight) {
    const rsOfferRegex = /(?:flat|extra|rs\.?)\s*₹?\s*\d+\s*off/gi;
    const rsMatch = title.match(rsOfferRegex);
    if (rsMatch) {
      offerHighlight = rsMatch[0].toUpperCase();
      title = title.replace(rsOfferRegex, ' ').trim();
    }
  }

  // 3. Remove trailing junk: "Men's : Women", "Men: Women", "cashback card...", "Apply Coupon", etc.
  const junkPatterns = [
    /Men's\s*:\s*Women/gi,
    /Men\s*:\s*Women/gi,
    /Men's\s*&\s*Women/gi,
    /Men\s*&\s*Women/gi,
    /for Men and Women/gi,
    /cashback card on all online transactions.*/gi,
    /Apply.*Coupon.*/gi,
    /with\s+\w+\s+Bank.*/gi,
    /for Mobile & Electronics offer.*/gi,
    /_______________________________.*/gi,
    /[⏫⏬]+.*/gu, // emoji arrows
    /Shop Now\s*:.*/gi,
    /Deal Price\s*:.*/gi,
    /Buy Here\s*:.*/gi,
    /Buy Link\s*:.*/gi,
    /Link\s*:.*/gi,
    /https?:\/\/\S+/gi,
    /sbi-cashback-credit-card.*/gi,
    /-\s*$/ // Trailing dash
  ];

  junkPatterns.forEach(pat => {
    title = title.replace(pat, ' ').trim();
  });

  // 4. Let's handle the specific concatenation "OFFMen's"
  title = title.replace(/offmen's/gi, "Men's");
  title = title.replace(/offmen/gi, "Men");

  // If there is multiple deals concatenated (e.g. "Skechers Shoes up to 70% off New Balance Shoes up to 65% off")
  if (title.includes(' | ')) {
    const parts = title.split(' | ');
    if (parts[1] && (parts[1].toLowerCase().includes('off') || parts[1].toLowerCase().includes('@') || parts[1].toLowerCase().includes('₹') || parts[1].toLowerCase().includes('rs'))) {
      title = parts[0];
    }
  }
  if (title.includes(' – ')) {
    const parts = title.split(' – ');
    if (parts[1] && (parts[1].toLowerCase().includes('off') || parts[1].toLowerCase().includes('@') || parts[1].toLowerCase().includes('₹') || parts[1].toLowerCase().includes('rs'))) {
      title = parts[0];
    }
  }
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts[1] && (parts[1].toLowerCase().includes('off') || parts[1].toLowerCase().includes('@') || parts[1].toLowerCase().includes('₹') || parts[1].toLowerCase().includes('rs'))) {
      title = parts[0];
    }
  }

  // 5. Clean up duplicate words or extra separators
  title = title
    .replace(/\s*[|:•-]\s*$/g, '')
    .replace(/\s*[|:•-]\s*[|:•-]\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();

  // If the title still ends with a colon, dash, vertical bar, or has trailing space, strip it
  title = title.replace(/\s*[|:•-]\s*$/g, '').trim();

  // Capitalize nicely
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return { title, offerHighlight };
}

export function normalizeDeal(raw: any): NormalizedDeal | null {
  if (!raw || !raw.id || !raw.url) return null;

  // 1. Merchant Detection
  const detectMerchant = (url: string, platform: string): NormalizedDeal['merchant'] => {
    const u = url.toLowerCase();
    const p = (platform || '').toLowerCase();
    if (u.includes('amazon') || u.includes('amzn.to') || u.includes('amzn.in') || p.includes('amazon')) return 'Amazon';
    if (u.includes('flipkart') || u.includes('fkrt.co') || u.includes('fkrt') || p.includes('flipkart')) return 'Flipkart';
    if (u.includes('myntra') || u.includes('myntr') || p.includes('myntra')) return 'Myntra';
    if (u.includes('ajio') || p.includes('ajio')) return 'Ajio';
    if (u.includes('tatacliq') || p.includes('cliq')) return 'Tata CLiQ';
    if (u.includes('croma') || p.includes('croma')) return 'Croma';
    if (u.includes('meesho') || p.includes('meesho')) return 'Meesho';
    if (u.includes('nykaa') || p.includes('nykaa')) return 'Nykaa';
    if (u.includes('jiomart') || p.includes('jiomart')) return 'JioMart';
    return 'Other';
  };

  const merchant = detectMerchant(raw.url, raw.platform);

  // 2. Title & Body De-duplication & Cleaning
  const msgText = raw.text || '';
  const lines = msgText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  
  const rawTitle = raw.title || lines[0] || 'Exclusive Deal';
  
  // Apply our highly advanced title cleaner & offer extractor
  const cleanedResult = cleanDealTitle(rawTitle);
  const title = cleanedResult.title;
  const offerHighlight = cleanedResult.offerHighlight;

  // Extract multiple links / products cleanly (e.g. multi-link posts)
  const subOffers: { title: string; url: string; price?: string }[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const urlMatch = line.match(urlRegex);
    if (urlMatch) {
      const foundUrl = urlMatch[0];
      // Look backwards to find the nearest preceding text line that isn't a URL
      let desc = '';
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim();
        if (!prevLine.match(urlRegex) && prevLine.length > 4 && !prevLine.includes('___')) {
          desc = prevLine;
          break;
        }
      }
      
      if (desc) {
        let cleanDesc = desc.replace(/^[\p{Emoji}\s]+/gu, '').trim();
        let subPrice: string | undefined = undefined;
        // Parse price like @185 or ₹574
        const priceMatch = cleanDesc.match(/(?:@|₹|Rs\.?)\s*([\d,]+)/i);
        if (priceMatch) {
          subPrice = `₹${priceMatch[1]}`;
          cleanDesc = cleanDesc.replace(/(?:@|₹|Rs\.?)\s*[\d,]+/gi, '').trim();
        }
        
        cleanDesc = cleanDesc.replace(/\s*[|:•–-]\s*$/g, '').trim();
        
        if (cleanDesc.length > 0) {
          cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
        }
        
        if (cleanDesc && foundUrl && !subOffers.some(o => o.url === foundUrl)) {
          subOffers.push({
            title: cleanDesc,
            url: foundUrl,
            price: subPrice
          });
        }
      }
    }
  }

  const isMultiOffer = subOffers.length > 1;

  // De-duplicate the first line from the rest of the body text
  const bodyLines = lines.length > 1 ? lines.slice(1) : [];
  const cleanBody = bodyLines
    .map((l: string) => l.replace(/https?:\/\/[^\s]+/g, '').trim())
    .filter((l: string) => l.length > 0 && !l.includes('___________________'))
    .filter((l: string) => !l.includes('http'))
    .join('\n');

  // 3. Category Detection
  const categorizeDeal = (t: string): NormalizedDeal['category'] => {
    const lower = t.toLowerCase();
    const tech = ["mobile", "laptop", "watch", "earbuds", "ssd", "keyboard", "mouse", "monitor", "iphone", "samsung", "oneplus", "xiaomi", "realme", "redmi", "boat", "noise", "boult", "sony", "jbl", "hp", "dell", "lenovo", "asus", "acer", "logitech", "sandisk", "tp-link", "storage", "magsafe", "charger", "powerbank", "processor", "ram", "gpu", "graphics card", "motherboard"];
    const fashion = ["shirt", "shoe", "tshirt", "dress", "kurta", "jeans", "top", "saree", "watch", "bag", "backpack", "wallet", "nike", "adidas", "puma", "reebok", "levis", "flying machine", "allen solly", "peter england", "louis philippe", "van heusen", "biba", "only", "vero moda", "roadster", "hrx", "zara", "h&m", "fossil", "titan", "fastrack", "casio"];
    const home = ["home", "kitchen", "bottle", "mop", "lamp", "curtain", "towel", "bedsheet", "pillow", "cooker", "pan", "prestige", "pigeon", "butterfly", "bajaj", "havells", "macho", "philips", "lifelong", "milton", "cello", "solimo", "bosch", "lg", "whirlpool", "haier", "voltas", "daikin", "godrej", "carpet", "furniture", "sofa", "table", "chair", "bookshelf", "wardrobe", "container", "chopper", "grinder", "mixer", "induction", "kettle"];
    if (tech.some(k => lower.includes(k))) return 'Electronics';
    if (fashion.some(k => lower.includes(k))) return 'Fashion';
    if (home.some(k => lower.includes(k))) return 'Home';
    return 'Other';
  };

  const category = categorizeDeal(title);

  // 4. Safe Price Extraction & Parsing
  const cleanPriceString = (str: string) => {
    if (!str || str === 'Check Price') return 'Check Price';
    const m = str.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
    return m ? `₹${m[1]}` : 'Check Price';
  };

  const parseNumericPrice = (str: string) => {
    const m = str.match(/[\d,]+/);
    if (!m) return 0;
    return parseInt(m[0].replace(/,/g, ''), 10);
  };

  const price = cleanPriceString(raw.price || '');
  const sellingNum = parseNumericPrice(price);

  let originalPrice = raw.originalPrice ? cleanPriceString(raw.originalPrice) : undefined;
  if (originalPrice === 'Check Price') originalPrice = undefined;
  
  const originalNum = originalPrice ? parseNumericPrice(originalPrice) : 0;

  // Calculate dynamic discount percentage
  let discountPercent = 0;
  if (originalNum > 0 && sellingNum > 0 && originalNum > sellingNum) {
    discountPercent = Math.round(((originalNum - sellingNum) / originalNum) * 100);
  }

  // Fallback: extract discount percentage from offerHighlight or msgText
  if (discountPercent === 0 && offerHighlight) {
    const pctMatch = offerHighlight.match(/(\d+)%\s*OFF/i);
    if (pctMatch) {
      discountPercent = parseInt(pctMatch[1], 10);
    }
  }
  if (discountPercent === 0) {
    const textMatch = msgText.match(/(?:Min\.?\s*|\b|Upto\s*)(\d+)%\s*OFF/i);
    if (textMatch) {
      discountPercent = parseInt(textMatch[1], 10);
    }
  }

  // 5. Freshness Time Formatting
  const timestamp = raw.timestamp || Date.now();
  const diffMs = Date.now() - timestamp;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  let timeAgo = 'Just now';
  if (mins >= 1 && mins < 60) timeAgo = `${mins}m ago`;
  else if (mins >= 60 && mins < 1440) timeAgo = `${Math.floor(mins / 60)}h ago`;
  else if (mins >= 1440) timeAgo = `${Math.floor(mins / 1440)}d ago`;

  const hasLootKeyword = /\bloot\b/i.test(rawTitle) || /\bloot\b/i.test(msgText);
  const isLoot = !!raw.isLoot || discountPercent >= 70 || hasLootKeyword;

  // 6. Badges
  const badges: string[] = ['LIVE'];
  if (isLoot) badges.push('LOOT');
  if (merchant !== 'Other') badges.push(merchant.toUpperCase());
  if (category !== 'Other') badges.push(category.toUpperCase());

  // 7. Image Fallback Check
  const fallbackImages: Record<NormalizedDeal['category'], string> = {
    Electronics: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Electronics+Deal',
    Fashion: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Fashion+Steal',
    Home: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Home+Loot',
    CPU: 'https://dummyimage.com/600x400/0f172a/ffffff&text=CPU+Offer',
    GPU: 'https://dummyimage.com/600x400/0f172a/ffffff&text=GPU+Offer',
    Storage: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Storage+Loot',
    Peripheral: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Peripherals',
    Laptop: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Laptop+Loot',
    Loot: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Mega+Loot',
    Other: 'https://dummyimage.com/600x400/0f172a/ffffff&text=Smart+Deal',
  };

  const image = raw.image && !raw.image.includes('Telegram_logo') ? raw.image : fallbackImages[category];

  return {
    id: raw.id,
    title,
    merchant,
    category,
    price,
    originalPrice,
    discountPercent: discountPercent > 0 ? discountPercent : undefined,
    offerHighlight,
    url: raw.checkoutUrl || raw.url,
    image,
    timestamp,
    timeAgo,
    isLoot,
    badges,
    isLive: true,
    cleanTextBody: cleanBody || undefined,
    isMultiOffer,
    subOffers: subOffers.length > 0 ? subOffers : undefined,
    explanation: raw.explanation || raw.aiContext || undefined,
    verdictTier: raw.verdictTier || 'GOOD_DEAL',
    whatsappShareText: raw.whatsappShareText || undefined,
    twitterShareText: raw.twitterShareText || undefined,
  };
}
