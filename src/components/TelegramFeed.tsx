import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SubOffer {
  title: string;
  url: string;
  price?: string;
}

interface Deal {
  id: string;
  title: string;
  merchant: 'Amazon' | 'Flipkart' | 'Myntra' | 'Ajio' | 'Tata CLiQ' | 'Croma' | 'Meesho' | 'Nykaa' | 'JioMart' | 'Other';
  category: 'CPU' | 'GPU' | 'Storage' | 'Peripheral' | 'Laptop' | 'Fashion' | 'Home' | 'Electronics' | 'Loot' | 'Other';
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  offerHighlight?: string;
  url: string;
  image: string;
  timestamp: number;
  timeAgo: string;
  isLoot: boolean;
  badges: string[];
  isLive: boolean;
  cleanTextBody?: string;
  isMultiOffer?: boolean;
  subOffers?: SubOffer[];
}

interface TelegramFeedProps {
  hideSearch?: boolean;
  showTitle?: boolean;
  isHome?: boolean;
}

const logoMap: Record<string, string> = {
  Amazon: 'https://www.google.com/s2/favicons?sz=64&domain=amazon.in',
  Flipkart: 'https://www.google.com/s2/favicons?sz=64&domain=flipkart.com',
  Myntra: 'https://www.google.com/s2/favicons?sz=64&domain=myntra.com',
  Ajio: 'https://www.google.com/s2/favicons?sz=64&domain=ajio.com',
  'Tata CLiQ': 'https://www.google.com/s2/favicons?sz=64&domain=tatacliq.com',
  Croma: 'https://www.google.com/s2/favicons?sz=64&domain=croma.com',
  Meesho: 'https://www.google.com/s2/favicons?sz=64&domain=meesho.com',
  Nykaa: 'https://www.google.com/s2/favicons?sz=64&domain=nykaa.com',
  JioMart: 'https://www.google.com/s2/favicons?sz=64&domain=jiomart.com',
};

export default function TelegramFeed({ hideSearch = false, showTitle = false, isHome = false }: TelegramFeedProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || params.get('store') || '';
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('cat') || params.get('category') || 'all';
    }
    return 'all';
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [liveDealsCount, setLiveDealsCount] = useState(0);

  const loaderRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = [
    { id: 'all', label: 'All Deals', icon: '💎', desc: 'Latest updates' },
    { id: 'tech', label: 'Tech', icon: '💻', desc: 'Laptops & gadgets' },
    { id: 'fashion', label: 'Fashion', icon: '👕', desc: 'Clothing & shoes' },
    { id: 'home', label: 'Home', icon: '🏠', desc: 'Decor & appliances' },
    { id: 'other', label: 'Others', icon: '📦', desc: 'More loot offers' },
  ];

  // 1. Fetch Deals Core Handler
  const fetchDeals = async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const offset = append ? deals.length : 0;
      const res = await fetch(`/api/tg-search?q=${encodeURIComponent(searchQuery)}&cat=${selectedCategory}&limit=12&offset=${offset}`);
      const data = await res.json();
      
      if (!data.deals || data.deals.length === 0) {
        setHasMore(false);
        if (!append) setDeals([]);
      } else {
        setDeals(prev => append ? [...prev, ...data.deals] : data.deals);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("[TelegramFeed] fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Initial & Filter Load Listeners
  useEffect(() => {
    fetchDeals(1, false);
  }, [selectedCategory]);

  // Listen for navigation changes and URL search params changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || params.get('store') || '';
      const cat = params.get('cat') || params.get('category') || 'all';
      setSearchQuery(q);
      setSelectedCategory(cat);
    };

    window.addEventListener('popstate', handleUrlChange);
    // Listen for custom location/hash updates if client-side routing triggers it
    window.addEventListener('locationchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('locationchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchDeals(1, false);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. SSE Stream Realtime Feed Injector
  useEffect(() => {
    const sse = new EventSource('/api/tg-stream');
    sse.onmessage = (event) => {
      try {
        const newDeals = JSON.parse(event.data);
        if (Array.isArray(newDeals) && newDeals.length > 0) {
          setDeals(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueLive = newDeals.filter((d: Deal) => !existingIds.has(d.id));
            return [...uniqueLive, ...prev];
          });
          setLiveDealsCount(prev => prev + newDeals.length);
        }
      } catch (e) {
        console.error("[SSE Stream] error:", e);
      }
    };
    return () => sse.close();
  }, []);

  // 4. Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchDeals(page, true);
    }
  }, [page]);

  // 5. Client Rendering Logic
  const cleanTitle = (str: string) => { if (!str) return ""; let val = str.replace(/#\w+/gi, ""); val = val.replace(/sale\s*-/gi, ""); return val.replace(/\s+/g, " ").trim(); }; const cleanPriceString = (pStr: string) => { if (!pStr) return ""; let cleaned = String(pStr).replace(/[₹\s]/g, "").trim(); if (cleaned.startsWith("₹")) { cleaned = cleaned.substring(1).trim(); } return cleaned; }; const filteredDeals = useMemo(() => { const seen = new Set(); const unique = deals.filter(item => { const titleKey = cleanTitle(item.title || "").toLowerCase().replace(/\s+/g, ""); const linkKey = (item.url || "").trim(); const dedupeKey = titleKey + "|" + linkKey; if (seen.has(dedupeKey)) { return false; } seen.add(dedupeKey); return true; }); return unique.map(item => { const cleanPrice = cleanPriceString(item.price); const cleanOriginal = item.originalPrice ? cleanPriceString(item.originalPrice) : undefined; return { ...item, title: cleanTitle(item.title), price: cleanPrice ? "₹" + cleanPrice : "Check Price", originalPrice: cleanOriginal ? "₹" + cleanOriginal : undefined }; }); }, [deals]);

  const SkeletonCard = () => (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 animate-pulse">
      <div className="w-full md:w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
      <div className="flex-1 space-y-4 py-2">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="h-6 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
        <div className="h-10 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 w-full">
      {/* 1. Category Tabs & Search Panel */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Categories Grid list */}
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border tracking-wide uppercase transition-all ${selectedCategory === cat.id ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search field */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search live loots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <span className="absolute left-3 top-3.5 text-slate-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* 2. New Deals Banner Toast Alert */}
      {liveDealsCount > 0 && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLiveDealsCount(0);
          }}
          className="w-full p-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md animate-bounce text-center block"
        >
          🔥 {liveDealsCount} New Loot Deals Just In! Click to View 👇
        </button>
      )}

      {/* 3. Deal Feed List */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredDeals.length > 0 ? (
          filteredDeals.map((deal) => {
            const hasImage = deal.image && !deal.image.includes('dummyimage') && !deal.image.includes('placehold');
            const showDiscount = deal.discountPercent && deal.discountPercent > 10;
            const smartDiscount = deal.discountPercent || 0;
            const isDealLoot = deal.isLoot || smartDiscount > 90;
            const platformColor = deal.merchant === 'Amazon' ? '#ff9900' : deal.merchant === 'Flipkart' ? '#2874f0' : deal.merchant === 'Myntra' ? '#ff3f6c' : deal.merchant === 'Ajio' ? '#d4a015' : '#22C55E';
            const storeLogo = logoMap[deal.merchant] || '';
            const storeName = deal.merchant === 'Deal' ? 'DEAL' : deal.merchant;

            return (
              <div 
                key={deal.id} 
                className={`m3-vcard ${isDealLoot ? 'm3-vcard--loot' : ''}`}
                style={{ '--acc': platformColor } as React.CSSProperties}
              >
                <div className="m3-vcard__state-layer" aria-hidden="true"></div>

                <div className="m3-vcard__header">
                  <div className="m3-vcard__store-chip">
                    {storeLogo ? (
                      <img src={storeLogo} alt={storeName} className="m3-vcard__store-logo" width="16" height="16" loading="lazy" />
                    ) : (
                      <span className="material-symbols-outlined" style={{fontSize:'14px', fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20"}}>store</span>
                    )}
                    <span className="m3-vcard__store-name" style={{color: platformColor}}>{storeName}</span>
                  </div>
                  <div className="m3-vcard__live-badge">
                    <span className="m3-vcard__live-dot" aria-hidden="true"></span>
                    <span className="m3-vcard__live-label">LIVE</span>
                  </div>
                </div>

                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-vcard__img-wrap"
                >
                  {hasImage ? (
                    <img
                      src={deal.image}
                      alt={deal.title}
                      loading="lazy"
                      className="m3-vcard__img"
                    />
                  ) : (
                    <div className="m3-vcard__img-fallback">
                      <span className="material-symbols-outlined" style={{fontSize:'32px', opacity:0.35}}>local_offer</span>
                    </div>
                  )}
                </a>

                <div className="m3-vcard__meta-row">
                  <span className="m3-vcard__meta-chip m3-vcard__meta-chip--time">
                    <span className="material-symbols-outlined" style={{fontSize:'12px', fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24"}}>schedule</span>
                    {deal.timeAgo}
                  </span>
                  {showDiscount && (
                    <span className="m3-vcard__meta-chip m3-vcard__meta-chip--discount">
                      {smartDiscount}% OFF
                    </span>
                  )}
                </div>

                <div className="m3-vcard__body">
                  <h3 className="m3-vcard__title">
                    <a href={deal.url} target="_blank" rel="noopener noreferrer">{deal.title}</a>
                  </h3>

                  {deal.offerHighlight && (
                    <div className="m3-vcard__offer-chip">
                      <span className="material-symbols-outlined" style={{fontSize:'12px', fontVariationSettings:"'FILL' 0,'wght' 500,'GRAD' 0,'opsz' 20"}}>sell</span>
                      <span>{deal.offerHighlight.toUpperCase()}</span>
                    </div>
                  )}

                  <div className="m3-vcard__price-row">
                    {isDealLoot && (
                      <span className="material-symbols-outlined" style={{fontSize:'16px', fontVariationSettings:"'FILL' 1,'wght' 700,'GRAD' 0,'opsz' 20", color:'#F2B8B5'}}>local_fire_department</span>
                    )}
                    <span className="m3-vcard__price">{deal.price}</span>
                    {deal.originalPrice && deal.originalPrice !== deal.price && (
                      <span className="m3-vcard__orig">{deal.originalPrice}</span>
                    )}
                  </div>

                  <div className="m3-vcard__cta-row">
                    <a href={deal.url} target="_blank" rel="noopener noreferrer" className="m3-vcard__cta" style={{'--m3-btn-color': platformColor} as React.CSSProperties}>
                      <span className="material-symbols-outlined" style={{fontSize:'14px', fontVariationSettings:"'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 20"}}>shopping_cart</span>
                      View Deal
                    </a>
                    <button
                      className="m3-vcard__share deal-share-btn"
                      data-title={deal.title}
                      data-image={deal.image}
                      data-price={deal.price}
                      data-original-price={deal.originalPrice}
                      data-discount={smartDiscount}
                      data-url={deal.url}
                      data-platform={deal.merchant}
                      data-loot={isDealLoot ? "true" : "false"}
                      data-slug={deal.id}
                      data-share-text={deal.whatsappShareText || deal.explanation || ''}
                      aria-label="Share deal"
                      type="button"
                    >
                      <span className="material-symbols-outlined" style={{fontSize:'16px', fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20"}}>share</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          !loading && (
            <div className="py-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-sm">
              <span className="text-2xl">⏳</span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No deals match your search...</h3>
              <p className="text-xs text-slate-400 dark:text-slate-600">Try adjusting your filters or query to find live loots.</p>
            </div>
          )
        )}

        {/* Load More Trigger Loader */}
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {hasMore && !loading && <div ref={loaderRef} className="h-10"></div>}
      </div>
    </div>
  );
}
