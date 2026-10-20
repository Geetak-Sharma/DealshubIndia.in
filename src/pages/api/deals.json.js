import { getCollection } from 'astro:content';
import { TelegramDataStore } from '../../lib/telegramStore.js';
import { extractCoupon, extractBankOffer, extractVariants, getBudgetTier } from '../../lib/dealNormalizer.js';

export const prerender = false;

const isValidDealImage = (img) => {
  return Boolean(
    img &&
    typeof img === 'string' &&
    img.startsWith('http') &&
    !img.includes('example.com') &&
    !img.includes('Telegram_logo')
  );
};

export async function GET() {
  let contentDeals = [];
  try {
    const allCollection = await getCollection('deals');
    contentDeals = allCollection
      .filter(d => d.data.title && isValidDealImage(d.data.image))
      .map(d => {
        const numP = parseFloat(String(d.data.price).replace(/[^0-9.]/g, '')) || 0;
        return {
          id: d.id,
          title: d.data.title,
          price: d.data.price,
          numPrice: numP,
          originalPrice: d.data.originalPrice || '',
          discount: '',
          link: d.data.link,
          image: d.data.image,
          merchant: 'Amazon',
          category: d.data.category || 'Tech',
          isLoot: Boolean(d.data.isLoot),
          date: d.data.date,
          timestamp: new Date(d.data.date).getTime(),
          budgetTier: getBudgetTier(numP),
          couponText: undefined,
          bankOffer: undefined,
          variants: [],
        };
      });
  } catch (e) {
    console.warn('[API deals.json] contentDeals error:', e);
  }

  let tgDeals = [];
  try {
    const store = TelegramDataStore.load();
    if (store && Array.isArray(store.posts)) {
      tgDeals = store.posts
        .filter(item => item.title && isValidDealImage(item.image))
        .map(item => {
          let rawTitle = (item.title || "").replace(/[\u200e\u200f\u200b\uFEFF]/g, "").trim();
          let merchant = item.platform || "Amazon";

          // Clean title: remove emojis, hashtags, spam suffixes, store prefixes
          let title = rawTitle
            .replace(/^[\p{Emoji}\s]+/gu, "")
            .replace(/#\w+/gi, "")
            .replace(/^(?:amazon|flipkart|myntra|ajio|croma|meesho)\s*[:|\-–]\s*/i, "")
            .replace(/sale\s*-/gi, "")
            .replace(/cashback card on all online transactions-?/gi, "")
            .replace(/for under 99 deals join-?.*/gi, "")
            .replace(/under 99 deals join-?.*/gi, "")
            .replace(/_______________________________.*/gi, "")
            .replace(/Master Link\s*:?.*/gi, "")
            .replace(/\s*\.?\s*Apply\s*(?:₹\s*\d+|\d+%)\s*Off\s*Coupon.*$/i, "")
            .replace(/\s*(?:@|at\s*|Rs\.?\s*|₹)\s*[0-9,]+\s*$/i, "")
            .replace(/[:\.\-\s|–]+$/, "")
            .trim();

          if (title.includes("\n")) {
            title = title.split("\n")[0].trim();
          }

          // Smart merchant detection
          const fullText = `${item.checkoutUrl || ''} ${item.url || ''} ${rawTitle} ${item.text || ''}`.toLowerCase();
          if (fullText.includes("amazon") || fullText.includes("amazn") || fullText.includes("amzn")) merchant = "Amazon";
          else if (fullText.includes("flipkart") || fullText.includes("fkrt")) merchant = "Flipkart";
          else if (fullText.includes("myntra") || fullText.includes("myntr")) merchant = "Myntra";
          else if (fullText.includes("ajio") || fullText.includes("ajiio")) merchant = "Ajio";
          else if (fullText.includes("croma")) merchant = "Croma";
          else if (fullText.includes("meesho")) merchant = "Meesho";
          else if (fullText.includes("tatacliq")) merchant = "Tata CLiQ";
          else if (merchant === "Deal" || merchant === "Store") merchant = "Amazon";

          // Price extraction
          let price = item.price;
          const priceMatch = rawTitle.match(/(?:@|at\s*|₹|Rs\.?\s*)([0-9,]+)/i);
          if ((!price || price === "Check Price") && priceMatch) {
            price = priceMatch[1].replace(/,/g, "");
          } else if (!price || price === "Check Price") {
            price = item.priceNum && item.priceNum > 0 ? String(item.priceNum) : "Check Price";
          }

          const numPrice = parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0;

          // Discount extraction
          let discount = item.discount || "";
          if (!discount) {
            const discountMatch = rawTitle.match(/(\d+)%\s*(?:off|discount|coupon)/i) || (item.text || "").match(/(\d+)%\s*(?:off|discount|coupon)/i);
            if (discountMatch) {
              discount = `${discountMatch[1]}%`;
            }
          }

          // Category detection
          let category = item.category || "General";
          const lowerCheck = `${rawTitle} ${item.text || ''} ${category}`.toLowerCase();
          if (lowerCheck.match(/laptop|phone|smartphone|smartwatch|earbuds|headphones|mouse|keyboard|cpu|gpu|storage|ram|gadget|charger|geyser|fan|electronics|heater|cooler/)) {
            category = "Tech";
          } else if (lowerCheck.match(/shirt|jeans|clothing|shoes|t-shirt|kurta|dress|jacket|pants|sneakers|apparel|footwear/)) {
            category = "Fashion";
          } else if (lowerCheck.match(/bedsheet|cooker|bottle|kitchen|home|curtain|mop|light|decor|pillow|pan|induction/)) {
            category = "Home";
          } else if (item.isLoot) {
            category = "Loot";
          }

          const couponText = extractCoupon(rawTitle, item.text);
          const bankOffer = extractBankOffer(rawTitle, item.text);
          const variants = extractVariants(item, item.checkoutUrl || item.url);
          const budgetTier = getBudgetTier(numPrice);

          return {
            id: item.id || `deal-${Math.random().toString(36).substring(7)}`,
            title,
            price,
            numPrice,
            originalPrice: item.originalPrice || (item.originalPriceNum ? String(item.originalPriceNum) : ""),
            discount,
            link: item.checkoutUrl || item.url || "#",
            image: item.image,
            merchant,
            category,
            isLoot: Boolean(item.isLoot || lowerCheck.includes("loot") || (discount && parseInt(discount) >= 70) || budgetTier === 'under99'),
            date: item.timestamp ? new Date(item.timestamp) : new Date(),
            timestamp: item.timestamp || Date.now(),
            couponText,
            bankOffer,
            variants,
            budgetTier,
          };
        })
        .filter(d => d.title && d.title.length >= 6 && !d.title.toLowerCase().startsWith("apply ") && d.numPrice > 0);
    }
  } catch (e) {
    console.warn('[API deals.json] tgDeals error:', e);
  }

  const combined = [...tgDeals, ...contentDeals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return new Response(JSON.stringify(combined), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
    }
  });
}
