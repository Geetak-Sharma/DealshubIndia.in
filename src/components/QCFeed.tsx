import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QCDeal {
  id: string;
  slug: string;
  title: string;
  merchant: string | null;
  merchantColor: string;
  merchantEmoji: string;
  category: string;
  couponCode: string | null;
  discount: string | null;
  discountNum: number;
  cashback: string | null;
  finalPrice: string | null;
  minOrder: string | null;
  validTill: string | null;
  isExpiringToday: boolean;
  isExpired: boolean;
  isLoot: boolean;
  isFreebie: boolean;
  isFirstOrder: boolean;
  text: string;
  image: string | null;
  hasFallbackImage: boolean;
  fallbackSvg: string | null;
  url: string;
  clickCount: number;
  timestamp: number;
  timeAgo: string;
  badges: string[];
  aiContext: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',          label: 'All Deals',     icon: '🍽️' },
  { id: 'food-delivery', label: 'Food Delivery', icon: '🍕' },
  { id: 'grocery',      label: 'Grocery',        icon: '🛒' },
  { id: 'cashback',     label: 'Cashback',       icon: '💳' },
  { id: 'freebies',     label: 'Freebies',       icon: '🆓' },
  { id: 'first-order',  label: 'First Order',    icon: '🆕' },
  { id: 'bank-offers',  label: 'Bank Offers',    icon: '🏦' },
];

const MERCHANTS = [
  { id: 'all',         label: 'All',         color: '#22C55E', emoji: '🍽️' },
  { id: 'Swiggy',      label: 'Swiggy',      color: '#FC8019', emoji: '🧡' },
  { id: 'Zomato',      label: 'Zomato',      color: '#E23744', emoji: '❤️' },
  { id: 'Blinkit',     label: 'Blinkit',     color: '#F8D531', emoji: '⚡' },
  { id: 'Zepto',       label: 'Zepto',       color: '#8B5CF6', emoji: '💜' },
  { id: 'BigBasket',   label: 'BigBasket',   color: '#84BE41', emoji: '🛒' },
  { id: "Domino's",    label: "Domino's",    color: '#E31837', emoji: '🍕' },
  { id: 'KFC',         label: 'KFC',         color: '#F40000', emoji: '🍗' },
  { id: "McDonald's",  label: "McD's",       color: '#FFC72C', emoji: '🍔' },
  { id: 'Pizza Hut',   label: 'Pizza Hut',   color: '#E31937', emoji: '🍕' },
  { id: 'Magicpin',    label: 'Magicpin',    color: '#6C3483', emoji: '✨' },
];

// ─── Deal Card Component ──────────────────────────────────────────────────────

function QCDealCard({ deal, onShare, onSearchClick, onNoLinkClick }: { deal: QCDeal; onShare: (deal: QCDeal) => void; onSearchClick?: (query: string) => void; onNoLinkClick?: (deal: QCDeal) => void }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalWidth === 0) {
        setImgError(true);
      }
    }
  }, []);

  // Show product image if present (fallback to empty if load error). Banner card is strictly for no-image posts.
  const imgSrc = deal.image 
    ? (!imgError ? deal.image : '') 
    : (deal.fallbackSvg || '');

  const trackClick = useCallback(async (action: string) => {
    try {
      await fetch('/api/qc-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, merchant: deal.merchant, action }),
      });
    } catch { /* silent */ }
  }, [deal.id, deal.merchant]);

  const dealUrl = `/go/qc?id=${encodeURIComponent(deal.id)}&action=get-offer`;

  const handleCopy = useCallback(async () => {
    if (!deal.couponCode) return;
    try {
      await navigator.clipboard.writeText(deal.couponCode);
      setCopied(true);
      trackClick('copy-code');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = deal.couponCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [deal.couponCode, trackClick]);  const accentColor = deal.merchantColor || '#22C55E';

  return (
    <article
      className={`qc-card ${deal.isLoot ? 'qc-card--loot' : ''}`}
      style={{ '--merchant-color': accentColor } as React.CSSProperties}
    >
      {/* Left accent bar */}
      <div className="qc-card__accent-bar" />

      {/* Image panel */}
      <div className="qc-card__image-wrap">
        {imgSrc ? (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={deal.title}
            className="qc-card__image"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="qc-card__image-placeholder">
            <span className="qc-card__placeholder-emoji">{deal.merchantEmoji || '🛍️'}</span>
          </div>
        )}

        {/* Expiry urgent badge */}
        {deal.isExpiringToday && (
          <div className="qc-card__expiry-badge">⏰ Expires Today</div>
        )}

        {/* Loot badge */}
        {deal.isLoot && (
          <div className="qc-card__loot-badge">🔥 LOOT</div>
        )}
      </div>

      {/* Content panel */}
      <div className="qc-card__content">

        {/* Row 1: Merchant + Time */}
        <div className="qc-card__meta-row">
          <div className="qc-card__merchant-badge" style={{ background: `${accentColor}18`, borderColor: `${accentColor}40`, color: accentColor }}>
            <span>{deal.merchantEmoji}</span>
            <span>{deal.merchant || 'Quick Commerce'}</span>
          </div>
          <span className="qc-card__time">🕒 {deal.timeAgo}</span>
        </div>

        {/* Row 2: Title */}
        <h3 className="qc-card__title">{deal.title}</h3>

        {/* Row 3: Discount + Cashback badges */}
        <div className="qc-card__badges-row">
          {deal.discount && (
            <span className="qc-badge qc-badge--discount">{deal.discount}</span>
          )}
          {deal.cashback && (
            <span className="qc-badge qc-badge--cashback">💰 {deal.cashback}</span>
          )}
          {deal.isFreebie && (
            <span className="qc-badge qc-badge--free">🆓 FREE</span>
          )}
          {deal.isFirstOrder && (
            <span className="qc-badge qc-badge--new">🆕 NEW USER</span>
          )}
          {deal.minOrder && (
            <span className="qc-badge qc-badge--min">Min {deal.minOrder}</span>
          )}
        </div>

        {/* Row 4: Coupon code chip */}
        {deal.couponCode && (
          <button
            className={`qc-coupon-chip ${copied ? 'qc-coupon-chip--copied' : ''}`}
            onClick={handleCopy}
            title="Click to copy coupon code"
          >
            <span className="qc-coupon-chip__icon">{copied ? '✓' : '🎟️'}</span>
            <span className="qc-coupon-chip__code">{deal.couponCode}</span>
            <span className="qc-coupon-chip__action">{copied ? 'Copied!' : 'Tap to Copy'}</span>
          </button>
        )}


        {/* Row 6: CTA Buttons */}
        <div className="qc-card__cta-row">
          {deal.destinationType === 'no-link' ? (
            <button
              type="button"
              className="qc-btn qc-btn--primary"
              onClick={() => onNoLinkClick && onNoLinkClick(deal)}
              style={{ background: accentColor }}
            >
              Open App & Search
            </button>
          ) : (
            <a
              href={dealUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="qc-btn qc-btn--primary"
              onClick={(e) => {
                if (deal.url && deal.url.startsWith('/quick-commerce') && onSearchClick) {
                  e.preventDefault();
                  onSearchClick(deal.productName || deal.title);
                } else {
                  trackClick('get-offer');
                }
              }}
              style={{ background: accentColor }}
            >
              Get Offer →
            </a>
          )}
          {deal.couponCode && (
            <button
              className={`qc-btn qc-btn--copy ${copied ? 'qc-btn--copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied' : '🎟️ Copy Code'}
            </button>
          )}
          <button
            type="button"
            className="qc-btn qc-btn--share"
            onClick={() => onShare(deal)}
          >
            📢 Share Deal
          </button>
        </div>

        {/* Auto Imported watermark — subtle, non-duplicate */}
        <div className="qc-card__verified">
          ✓ Auto Imported
        </div>
      </div>

      <style>{`
        .qc-card {
          position: relative;
          display: flex;
          flex-direction: row;
          background: rgba(19, 23, 32, 0.85);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.3s ease;
          gap: 0;
          height: 240px;
        }
        .qc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--merchant-color, #22C55E) 40;
          border-color: rgba(var(--merchant-color, 34 197 94), 0.3);
        }
        .qc-card--loot {
          border-color: rgba(239,68,68,0.3);
          box-shadow: 0 0 20px rgba(239,68,68,0.1);
          animation: qcLootPulse 2.5s ease-in-out infinite;
        }
        @keyframes qcLootPulse {
          0%,100% { box-shadow: 0 0 0px rgba(239,68,68,0.15); }
          50%      { box-shadow: 0 0 20px rgba(239,68,68,0.4); }
        }
        .qc-card__accent-bar {
          width: 4px;
          background: linear-gradient(180deg, var(--merchant-color, #22C55E) 0%, rgba(var(--merchant-color, 34 197 94), 0.2) 100%);
          flex-shrink: 0;
          min-height: 100%;
        }
        .qc-card__image-wrap {
          width: 45%;
          min-width: 200px;
          height: 100%;
          overflow: hidden;
          position: relative;
          background: rgba(255,255,255,0.03);
          flex-shrink: 0;
          align-self: stretch;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media(max-width:640px){
          .qc-card { flex-direction: column; height: auto; }
          .qc-card__image-wrap { width: 100%; min-width: unset; height: 220px; }
          .qc-card__accent-bar { width: 100%; height: 4px; }
        }
        .qc-card__image { width:100%; height:100%; object-fit:contain; background:rgba(0,0,0,0.15); transition:transform 0.3s ease; }
        .qc-card:hover .qc-card__image { transform: scale(1.04); }
        .qc-card__image-placeholder {
          display:flex; align-items:center; justify-content:center;
          width:100%; height:100%; background:rgba(255,255,255,0.02);
        }
        .qc-card__placeholder-emoji { font-size: 3rem; }
        .qc-card__expiry-badge {
          position:absolute; top:8px; left:8px;
          background: rgba(239,68,68,0.9); color:white;
          font-size:9px; font-weight:800; letter-spacing:0.5px;
          padding:3px 8px; border-radius:99px;
          animation: expiryPulse 1.5s ease-in-out infinite;
        }
        @keyframes expiryPulse {
          0%,100%{opacity:1;} 50%{opacity:0.7;}
        }
        .qc-card__loot-badge {
          position:absolute; bottom:8px; left:8px;
          background:rgba(239,68,68,0.85); color:white;
          font-size:8px; font-weight:800; letter-spacing:0.8px;
          padding:2px 7px; border-radius:4px; text-transform:uppercase;
        }
        .qc-card__content {
          flex:1; padding:12px 18px; display:flex; flex-direction:column;
          gap:8px; min-width:0;
          justify-content: space-between;
        }
        .qc-card__meta-row {
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .qc-card__merchant-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:8px; border:1px solid;
          font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;
          white-space:nowrap;
        }
        .qc-card__time {
          font-size:10px; font-weight:600; color:rgba(255,255,255,0.35); white-space:nowrap;
        }
        .qc-card__title {
          font-size:14px; font-weight:700; color:#f0f2f5; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
        }
        .qc-card__badges-row {
          display:flex; flex-wrap:wrap; gap:6px;
        }
        .qc-badge {
          display:inline-flex; align-items:center; gap:3px;
          padding:3px 9px; border-radius:99px;
          font-size:10px; font-weight:800; letter-spacing:0.3px; white-space:nowrap;
        }
        .qc-badge--discount {
          background:rgba(251,146,60,0.12); color:#fb923c; border:1px solid rgba(251,146,60,0.25);
        }
        .qc-badge--cashback {
          background:rgba(34,197,94,0.10); color:#22C55E; border:1px solid rgba(34,197,94,0.25);
        }
        .qc-badge--free {
          background:rgba(52,211,153,0.10); color:#34d399; border:1px solid rgba(52,211,153,0.25);
        }
        .qc-badge--new {
          background:rgba(139,92,246,0.10); color:#a78bfa; border:1px solid rgba(139,92,246,0.25);
        }
        .qc-badge--min {
          background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.1);
        }
        .qc-coupon-chip {
          display:inline-flex; align-items:center; gap:8px;
          padding:8px 14px; border-radius:10px; cursor:pointer;
          background:rgba(34,197,94,0.06); border:1px dashed rgba(34,197,94,0.35);
          transition:all 0.2s ease; width:fit-content; max-width:100%;
        }
        .qc-coupon-chip:hover { background:rgba(34,197,94,0.12); border-color:rgba(34,197,94,0.6); }
        .qc-coupon-chip--copied { background:rgba(34,197,94,0.18); border-color:#22C55E; border-style:solid; }
        .qc-coupon-chip__icon { font-size:13px; }
        .qc-coupon-chip__code {
          font-family:'Courier New',monospace; font-size:13px; font-weight:800;
          color:#22C55E; letter-spacing:2px;
        }
        .qc-coupon-chip__action {
          font-size:9px; font-weight:700; color:rgba(34,197,94,0.6); text-transform:uppercase;
          letter-spacing:0.5px; white-space:nowrap;
        }
        .qc-card__ai-context {
          font-size:11px; color:rgba(34,197,94,0.7); font-weight:500; line-height:1.5;
          background:rgba(34,197,94,0.05); border:1px dashed rgba(34,197,94,0.15);
          border-radius:8px; padding:8px 10px; margin:0;
        }
        .qc-card__cta-row {
          display:flex; gap:8px; flex-wrap:wrap; margin-top:auto; padding-top:4px;
          border-top:1px solid rgba(255,255,255,0.05);
        }
        .qc-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          padding:9px 16px; border-radius:10px; font-size:11px; font-weight:800;
          letter-spacing:0.8px; text-transform:uppercase; text-decoration:none;
          transition:all 0.2s ease; cursor:pointer; border:none; white-space:nowrap;
        }
        .qc-btn--primary {
          color:white; box-shadow:0 4px 12px rgba(0,0,0,0.3);
        }
        .qc-btn--primary:hover { filter:brightness(1.15); transform:translateY(-1px); }
        .qc-btn--copy {
          background:rgba(34,197,94,0.08); color:#22C55E;
          border:1px solid rgba(34,197,94,0.25);
        }
        .qc-btn--copy:hover { background:rgba(34,197,94,0.18); }
        .qc-btn--copied { background:rgba(34,197,94,0.2); border-color:#22C55E; }
        .qc-btn--share {
          background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6);
          border:1px solid rgba(255,255,255,0.1);
        }
        .qc-btn--share:hover { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.9); }
        .qc-card__verified {
          font-size:9px; color:rgba(255,255,255,0.2); font-weight:600; letter-spacing:0.5px;
          text-transform:uppercase;
        }
      `}</style>
    </article>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col sm:flex-row gap-0 bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden animate-pulse">
      <div className="w-1 bg-white/[0.05] flex-shrink-0" />
      <div className="w-full sm:w-40 h-40 bg-white/[0.04] flex-shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="h-3 w-24 bg-white/[0.06] rounded-full" />
        <div className="h-4 w-4/5 bg-white/[0.06] rounded" />
        <div className="h-4 w-3/5 bg-white/[0.06] rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
          <div className="h-5 w-24 bg-white/[0.06] rounded-full" />
        </div>
        <div className="h-9 w-28 bg-white/[0.06] rounded-xl mt-auto" />
      </div>
    </div>
  );
}

// ─── Main Feed Component ──────────────────────────────────────────────────────

interface QCFeedProps {
  isHome?: boolean;
}

export default function QCFeed({ isHome = false }: QCFeedProps) {
  const [deals, setDeals]                   = useState<QCDeal[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState('all');
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(true);
  const [liveCount, setLiveCount]           = useState(0);
  const [hasCouponFilter, setHasCouponFilter] = useState(false);
  const [hasCashbackFilter, setHasCashbackFilter] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [sharingDeal, setSharingDeal]       = useState<QCDeal | null>(null);
  const [noLinkDeal, setNoLinkDeal]         = useState<QCDeal | null>(null);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      if (selectedCategory !== 'bank-offers' && d.category === 'bank-offers') {
        return false;
      }
      return true;
    });
  }, [deals, selectedCategory]);

  const handleShare = useCallback(async (deal: QCDeal) => {
    const shareUrl = `https://dealshubindia.in/quick-commerce/${deal.slug}`;
    const couponText = deal.couponCode ? `Use code ${deal.couponCode}` : '';
    const summaryText = deal.aiContext ? deal.aiContext.replace(/^✨\s*Auto Imported:\s*/, '') : '';
    const shareText = `🔥 ${deal.title}\n\n${couponText ? couponText + '\n\n' : ''}${summaryText ? summaryText + '\n\n' : ''}Found on Dealshub India:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: shareText,
          url: shareUrl
        });
        fetch('/api/qc-share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId: deal.id })
        }).catch(() => {});
      } catch (err) {
        setSharingDeal(deal);
      }
    } else {
      setSharingDeal(deal);
    }
  }, []);

  const handleShareTrack = useCallback(async (dealId: string) => {
    try {
      await fetch('/api/qc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId })
      });
    } catch {}
  }, []);

  const loaderRef = useRef<HTMLDivElement>(null);

  // ── Fetch deals ──────────────────────────────────────────────────────────
  const fetchDeals = useCallback(async (append: boolean) => {
    setLoading(true);
    try {
      const offset = append ? deals.length : 0;
      const params = new URLSearchParams({
        q:           searchQuery,
        cat:         selectedCategory,
        merchant:    selectedMerchant,
        coupon:      hasCouponFilter   ? 'true' : '',
        cashback:    hasCashbackFilter ? 'true' : '',
        expiring:    expiringFilter    ? 'true' : '',
        limit:       isHome ? '6' : '20',
        offset:      String(offset),
      });

      const res  = await fetch(`/api/qc-search?${params}`);
      const data = await res.json();

      if (!data.deals || data.deals.length === 0) {
        setHasMore(false);
        if (!append) setDeals([]);
      } else {
        setDeals(prev => append ? [...prev, ...data.deals] : data.deals);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error('[QCFeed] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedMerchant, hasCouponFilter, hasCashbackFilter, expiringFilter, deals.length, isHome]);

  // ── Initial load & filter resets ─────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchDeals(false);
  }, [selectedCategory, selectedMerchant, hasCouponFilter, hasCashbackFilter, expiringFilter]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDeals(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── SSE live injection ────────────────────────────────────────────────────
  useEffect(() => {
    const sse = new EventSource('/api/qc-stream');
    sse.onmessage = (event) => {
      try {
        const newDeals: QCDeal[] = JSON.parse(event.data);
        if (Array.isArray(newDeals) && newDeals.length > 0) {
          setDeals(prev => {
            const existingIds = new Set(prev.map(d => d.id));
            const unique = newDeals.filter(d => !existingIds.has(d.id));
            return [...unique, ...prev];
          });
          setLiveCount(prev => prev + newDeals.length);
        }
      } catch { /* ignore */ }
    };
    return () => sse.close();
  }, []);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isHome) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, isHome]);

  useEffect(() => {
    if (page > 1) fetchDeals(true);
  }, [page]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">

      {/* ── Live deals toast ── */}
      {liveCount > 0 && (
        <button
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setLiveCount(0); }}
          className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest text-white text-center animate-bounce shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FC8019, #E23744)' }}
        >
          🔥 {liveCount} New Quick Commerce {liveCount === 1 ? 'Deal' : 'Deals'} Just In! Tap to View
        </button>
      )}

      {/* ── Filter panel ── */}
      {!isHome && (
        <div className="p-5 bg-white/[0.03] border border-white/[0.07] rounded-2xl space-y-5 backdrop-blur-sm">

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border tracking-wide uppercase transition-all ${
                  selectedCategory === cat.id
                    ? 'border-orange-500/40 text-orange-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/70'
                }`}
                style={selectedCategory === cat.id ? { background: 'rgba(251,146,60,0.10)' } : {}}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Merchant pills */}
          <div className="flex flex-wrap gap-2">
            {MERCHANTS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMerchant(m.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                  selectedMerchant === m.id ? 'border-current' : 'border-white/[0.08] text-white/30 hover:text-white/60'
                }`}
                style={selectedMerchant === m.id ? {
                  color: m.color,
                  background: `${m.color}18`,
                  borderColor: `${m.color}40`,
                } : {}}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom row: smart filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'coupon',   label: '🎟️ With Coupon',   state: hasCouponFilter,    set: setHasCouponFilter },
                { key: 'cashback', label: '💰 Cashback',        state: hasCashbackFilter,  set: setHasCashbackFilter },
                { key: 'expiring', label: '⏰ Expiring Today',  state: expiringFilter,     set: setExpiringFilter },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => f.set(!f.state)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                    f.state
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/35 hover:text-white/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search deals, coupons, merchants…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-semibold text-white/70 placeholder-white/25 focus:outline-none focus:border-orange-500/40 transition-colors"
              />
              <span className="absolute left-3 top-3 text-white/25 text-sm">🔍</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Deal cards ── */}
      <div className="space-y-4">
        {filteredDeals.length > 0 ? (
          filteredDeals.map(deal => (
            <QCDealCard 
              key={deal.id} 
              deal={deal} 
              onShare={handleShare} 
              onNoLinkClick={(d) => setNoLinkDeal(d)}
              onSearchClick={(query) => {
                setSearchQuery(query);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }} 
            />
          ))
        ) : !loading ? (
          <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
            <span className="text-4xl">🍽️</span>
            <h3 className="text-sm font-bold text-white/70">No deals found</h3>
            <p className="text-xs text-white/30">Try adjusting your filters or check back in a few minutes.</p>
          </div>
        ) : null}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {hasMore && !loading && !isHome && <div ref={loaderRef} className="h-12" />}
      </div>

      {/* ── App Search Instructions Modal ── */}
      {noLinkDeal && (
        <div className="qc-modal-overlay" onClick={() => setNoLinkDeal(null)}>
          <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qc-modal-header">
              <h3 className="qc-modal-title">🔍 Open App & Search</h3>
              <button className="qc-modal-close" onClick={() => setNoLinkDeal(null)}>✕</button>
            </div>
            
            <div className="qc-modal-body" style={{ textAlign: 'center', gap: '16px' }}>
              <div style={{ margin: '0 auto', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                📱
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', uppercase: 'true', letterSpacing: '1px' }}>How to redeem this offer</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>This deal was shared without a direct link.</p>
              </div>
              
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  1. Open the <strong>{noLinkDeal.merchant}</strong> app on your mobile phone.<br/>
                  2. Search for this exact product name:
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#fb923c', userSelect: 'all', wordBreak: 'break-all', flex: 1 }}>
                    {noLinkDeal.productName || noLinkDeal.title}
                  </span>
                  <button
                    onClick={async () => {
                      const text = noLinkDeal.productName || noLinkDeal.title;
                      try {
                        await navigator.clipboard.writeText(text);
                        alert('Copied product name to clipboard!');
                      } catch {
                        const el = document.createElement('textarea');
                        el.value = text;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        alert('Copied product name to clipboard!');
                      }
                    }}
                    style={{ padding: '4px 10px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '4px', background: 'rgba(251,146,60,0.05)', cursor: 'pointer' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  onClick={() => setNoLinkDeal(null)}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  Cancel
                </button>
                <a
                  href={noLinkDeal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={async () => {
                    const text = noLinkDeal.productName || noLinkDeal.title;
                    try {
                      await navigator.clipboard.writeText(text);
                    } catch {}
                    setNoLinkDeal(null);
                  }}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, border: 'none', background: '#FC8019', color: 'white', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase' }}
                >
                  Launch App
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Deal Modal ── */}
      {sharingDeal && (
        <div className="qc-modal-overlay" onClick={() => setSharingDeal(null)}>
          <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qc-modal-header">
              <h3 className="qc-modal-title">📢 Share Deal</h3>
              <button className="qc-modal-close" onClick={() => setSharingDeal(null)}>✕</button>
            </div>
            
            <div className="qc-modal-body">
              <p className="qc-modal-deal-title">{sharingDeal.title}</p>
              
              <div className="qc-share-grid">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🔥 ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                    (sharingDeal.aiContext ? `${sharingDeal.aiContext.replace(/^✨\s*Auto Imported:\s*/, '')}\n\n` : '') +
                    `Found on Dealshub India:\nhttps://dealshubindia.in/quick-commerce/${sharingDeal.slug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-share-item qc-share-item--whatsapp"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="qc-share-icon">💬</span>
                  <span>WhatsApp</span>
                </a>
                
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`https://dealshubindia.in/quick-commerce/${sharingDeal.slug}`)}&text=${encodeURIComponent(
                    `🔥 ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                    (sharingDeal.aiContext ? `${sharingDeal.aiContext.replace(/^✨\s*Auto Imported:\s*/, '')}\n\n` : '')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-share-item qc-share-item--telegram"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="qc-share-icon">📲</span>
                  <span>Telegram</span>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `🔥 ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                    `https://dealshubindia.in/quick-commerce/${sharingDeal.slug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-share-item qc-share-item--x"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="qc-share-icon">𝕏</span>
                  <span>X / Twitter</span>
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://dealshubindia.in/quick-commerce/${sharingDeal.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-share-item qc-share-item--facebook"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="qc-share-icon">👥</span>
                  <span>Facebook</span>
                </a>

                <button
                  type="button"
                  className="qc-share-item qc-share-item--copy"
                  onClick={async () => {
                    const textToCopy = `🔥 ${sharingDeal.title}\n\n` +
                      (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                      (sharingDeal.aiContext ? `${sharingDeal.aiContext.replace(/^✨\s*Auto Imported:\s*/, '')}\n\n` : '') +
                      `Found on Dealshub India:\nhttps://dealshubindia.in/quick-commerce/${sharingDeal.slug}`;
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                    } catch {
                      const el = document.createElement('textarea');
                      el.value = textToCopy;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                    }
                    handleShareTrack(sharingDeal.id);
                    setSharingDeal(null);
                    alert('Deal details copied to clipboard!');
                  }}
                >
                  <span className="qc-share-icon">🔗</span>
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .qc-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; backdrop-filter: blur(4px);
        }
        .qc-modal-content {
          background: #131720; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; width: 90%; max-width: 440px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.5);
          overflow: hidden; animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .qc-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .qc-modal-title { font-size: 14px; font-weight: 800; color: #f0f2f5; text-transform: uppercase; margin: 0; }
        .qc-modal-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 16px; cursor: pointer; }
        .qc-modal-close:hover { color: white; }
        .qc-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .qc-modal-deal-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); line-height: 1.4; margin: 0; }
        .qc-share-grid { display: flex; flex-direction: column; gap: 8px; }
        .qc-share-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          border-radius: 10px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85);
          text-decoration: none; border: none; cursor: pointer; text-align: left;
          transition: background 0.2s, transform 0.1s;
        }
        .qc-share-item:active { transform: scale(0.98); }
        .qc-share-item--whatsapp { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15); color: #22C55E; }
        .qc-share-item--whatsapp:hover { background: rgba(34,197,94,0.15); }
        .qc-share-item--telegram { background: rgba(0,136,204,0.08); border: 1px solid rgba(0,136,204,0.15); color: #0088cc; }
        .qc-share-item--telegram:hover { background: rgba(0,136,204,0.15); }
        .qc-share-item--x { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
        .qc-share-item--x:hover { background: rgba(255,255,255,0.08); }
        .qc-share-item--facebook { background: rgba(24,119,242,0.08); border: 1px solid rgba(24,119,242,0.15); color: #1877f2; }
        .qc-share-item--facebook:hover { background: rgba(24,119,242,0.15); }
        .qc-share-item--copy { background: rgba(252,128,25,0.08); border: 1px solid rgba(252,128,25,0.15); color: #FC8019; }
        .qc-share-item--copy:hover { background: rgba(252,128,25,0.15); }
        .qc-share-icon { font-size: 16px; }
      `}</style>
    </div>
  );
}
