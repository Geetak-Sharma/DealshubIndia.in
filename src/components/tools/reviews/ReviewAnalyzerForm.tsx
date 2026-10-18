import React, { useState, useRef, useCallback } from 'react';
import type { NormalizedReview } from '../../../types/tools';
import { BubuDuduLoader } from './BubuDuduLoader';
import { BubuDuduModal } from './BubuDuduModal';

interface ProductInfo {
  title: string;
  rating: number;
  ratingCount?: number;
  reviewCount?: number;
  image?: string;
  price?: string;
}

interface DistributionInfo {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
}

const PAGE_SIZE = 10;


// Extracts pure URL from noisy text and un-mangles nested /dl/http:// prefixes
function extractUrl(input: string): string {
  let cleaned = input.trim();
  const lastHttp = Math.max(cleaned.lastIndexOf('http://'), cleaned.lastIndexOf('https://'));
  if (lastHttp > 0) {
    cleaned = cleaned.substring(lastHttp);
  }
  cleaned = cleaned.replace('://m.flipkart.com', '://www.flipkart.com');
  const words = cleaned.split(/\s+/);
  const found = words.find(w => w.startsWith('http://') || w.startsWith('https://'));
  if (found) return found;
  const domainFound = words.find(w => w.includes('flipkart.com') || w.includes('fkrt.cc'));
  return domainFound || cleaned;
}



export default function ReviewAnalyzerForm() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShortUrlBlocked, setIsShortUrlBlocked] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [distribution, setDistribution] = useState<DistributionInfo | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState<string>('');
  const [allReviews, setAllReviews] = useState<NormalizedReview[]>([]);
  const [streamDone, setStreamDone] = useState(false);
  const [totalFetched, setTotalFetched] = useState(0);
  const [sortMode, setSortMode] = useState('helpful');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'copy' | 'view'>('copy');
  const [modalTargetUrl, setModalTargetUrl] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // Client-side filter + sort (applied to all accumulated reviews)
  const filteredReviews = searchQuery.trim()
    ? allReviews.filter(r =>
        (r.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.author || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allReviews;

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortMode === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
    if (sortMode === 'positive') return b.rating - a.rating;
    if (sortMode === 'negative') return a.rating - b.rating;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedReviews.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageReviews = sortedReviews.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const startStream = useCallback(async (urlStr: string, sortVal: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setIsShortUrlBlocked(false);
    setLoading(true);
    setFetchingMore(false);
    setProduct(null);
    setDistribution(null);
    setCanonicalUrl('');
    setAllReviews([]);
    setStreamDone(false);
    setTotalFetched(0);
    setCurrentPage(1);
    setWarnings([]);

    try {
      const response = await fetch('/api/tools/flipkart-review-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlStr, sort: sortVal }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        const rawErr: string = (errData as any).error || 'Failed to connect to analyzer.';
        if (rawErr.includes('SHORT_URL_BLOCKED')) {
          setIsShortUrlBlocked(true);
          setError(null);
        } else {
          setError(rawErr);
        }
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstReviewsReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: any;
          try { event = JSON.parse(line.slice(6)); } catch (_) { continue; }

          if (event.type === 'product') {
            setProduct(event.product);
            setDistribution(event.distribution);
            setCanonicalUrl(event.canonicalUrl || '');
            if (event.warnings?.length) setWarnings(w => [...w, ...event.warnings]);
            if (event.isBlocked) {
              setError('Flipkart is blocking requests right now. Please try again in a few minutes.');
              setLoading(false);
              return;
            }
            // Keep loading active until first batch of reviews arrives so user actually sees the Bubu Dudu animation
            setFetchingMore(true);
          } else if (event.type === 'reviews') {
            setLoading(false);
            if (event.reviews?.length > 0) {
              setAllReviews(prev => [...prev, ...event.reviews]);
              setTotalFetched(prev => prev + event.reviews.length);
              if (!firstReviewsReceived) {
                firstReviewsReceived = true;
                setFetchingMore(false);
              }
            }
            if (!event.hasMore) {
              setFetchingMore(false);
              setStreamDone(true);
            }
          } else if (event.type === 'done') {
            setStreamDone(true);
            setFetchingMore(false);
          } else if (event.type === 'error') {
            const errMsg: string = event.error || 'Error fetching reviews.';
            if (errMsg.startsWith('SHORT_URL_BLOCKED')) {
              setIsShortUrlBlocked(true);
              setError(null);
            } else {
              setError(errMsg);
            }
            setLoading(false);
            setFetchingMore(false);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const raw = urlInput.trim();
    if (!raw) {
      setError('Please paste a valid Flipkart product URL.');
      return;
    }
    startStream(raw, sortMode);
  };

  const handleSortChange = (newSort: string) => {
    setSortMode(newSort);
    setCurrentPage(1);
    if (urlInput.trim() && (product || allReviews.length > 0)) {
      startStream(urlInput, newSort);
    }
  };

  const handleCopyLink = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    // Open Bubu Dudu WhatsApp invite overlay
    setModalAction('copy');
    setModalTargetUrl(text);
    setModalOpen(true);
  };

  const handleViewOnFlipkart = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    // Open Bubu Dudu WhatsApp invite overlay before visiting Flipkart
    setModalAction('view');
    setModalTargetUrl(url);
    setModalOpen(true);
  };

  const hasPrevPage = safePage > 1;
  const hasNextPage = safePage < totalPages || (!streamDone && allReviews.length > 0);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-4 sm:px-6">

      {/* Input panel */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="flipkart-url" className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
                Flipkart Product URL
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Paste any product, review, or short link (e.g. fkrt.cc / dl.flipkart.com).
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="flipkart-url"
                type="text"
                placeholder="https://www.flipkart.com/... or https://dl.flipkart.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:bg-emerald-600/60 disabled:cursor-not-allowed text-white font-black text-xs tracking-wider rounded-xl shadow-md hover:shadow-emerald-500/10 uppercase transition-all whitespace-nowrap min-h-[46px] flex items-center justify-center cursor-pointer gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Get Reviews</span>
                    <span className="text-emerald-200">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {isShortUrlBlocked && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-amber-500/40 bg-[#161a23] shadow-xl text-left animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-5 py-3.5 bg-amber-500/15 border-b border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📱</span>
                <span className="text-sm font-black text-amber-300 tracking-wide uppercase">
                  Mobile App Link Detected
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Action Required
              </span>
            </div>

            {/* Explanation & Steps */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed">
                Flipkart short links (<code className="text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded text-xs font-mono font-bold">dl.flipkart.com/s/...</code>) only open inside the Flipkart phone app and show an error page on computers.
              </p>

              {/* Step by step cards */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-100">Open this link on your phone</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tap the shared link inside <strong className="text-slate-300">WhatsApp or Telegram on your smartphone</strong>. It will open the real product page inside the Flipkart app.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-100">Tap "Share" & copy the full link or text</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      On the product page in the Flipkart app, tap the <strong className="text-slate-300">Share icon</strong> (top right) and choose <strong className="text-emerald-400">Copy Link</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-100">Paste it here & click "Get Reviews"</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Paste either the full product URL (<code className="text-emerald-400 font-mono">flipkart.com/.../p/itm...</code>) or the entire shared message with the product name — DealsHub will load all reviews instantly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Desktop Search Fallback */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">💻</span>
                  <div>
                    <p className="font-bold text-emerald-400">On a computer right now?</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Search the product directly on Flipkart web, then paste the URL from your browser address bar.</p>
                  </div>
                </div>
                <a
                  href="https://www.flipkart.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 whitespace-nowrap transition-colors flex items-center gap-1.5 shadow"
                >
                  <span>Go to Flipkart Web</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        )}
                {error && !isShortUrlBlocked && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-lg text-xs font-bold leading-relaxed">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Bubu & Dudu Animated Loader */}
      {loading && (
        <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading...</div>}>
          <BubuDuduLoader telegramUrl='https://t.me/DealsHubIndiaa' whatsappUrl='https://whatsapp.com/channel/0029Va8sOrp4SpkEQKVElV1i' />
        </React.Suspense>
      )}

      {/* Results */}
      {product && !loading && (
        <div className="space-y-6 fade-in">

          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-lg text-[10px] font-bold">
              ℹ️ {warnings[0]}
            </div>
          )}

          {/* Product Header + Distribution */}
          {product.title !== "Flipkart Product" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {product.image && (
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <img src={product.image} alt={product.title} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">{product.title}</h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5 flex-wrap">
                  {product.rating > 0 && <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10.5px] font-black rounded">★ {product.rating}</span>}
                  {product.ratingCount > 0 && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{product.ratingCount.toLocaleString()} Ratings &amp; {product.reviewCount?.toLocaleString() || 0} Reviews</span>}
                </div>
                {product.price && <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{product.price}</div>}
              </div>
            </div>

            {distribution && (distribution.star5 > 0 || distribution.star4 > 0 || distribution.star3 > 0 || distribution.star2 > 0 || distribution.star1 > 0) && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-center">
                <div className="space-y-1.5">
                  {([5,4,3,2,1] as const).map((stars) => {
                    const count = distribution![`star${stars}` as keyof DistributionInfo];
                    const total = (distribution!.star5 + distribution!.star4 + distribution!.star3 + distribution!.star2 + distribution!.star1) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={stars} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="w-6 text-right">{stars}★</span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-950 rounded overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Background fetch status */}
          {(fetchingMore || (!streamDone && allReviews.length > 0)) && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Fetching more reviews in background... ({totalFetched} loaded so far)
              </span>
            </div>
          )}
          {streamDone && allReviews.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500">✅ All done — {totalFetched} reviews loaded</span>
            </div>
          )}

          {/* Skeleton while waiting for first reviews after product header */}
          {fetchingMore && allReviews.length === 0 && (
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-4/5 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
              ))}
              <p className="text-center text-xs text-slate-400 font-medium">Fetching reviews from Flipkart...</p>
            </div>
          )}

          {/* Review list & In-place Toolbar */}
          {allReviews.length > 0 && (
            <div className="space-y-4">
              {/* Search & Sort toolbar: only visible once reviews exist */}
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Filter reviews by keyword, author..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <label htmlFor="sort-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    Sort:
                  </label>
                  <select
                    id="sort-select"
                    value={sortMode}
                    onChange={(e) => handleSortChange(e.target.value)}
                    disabled={loading}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="helpful">Most Helpful</option>
                    <option value="recent">Most Recent</option>
                    <option value="positive">Positive First</option>
                    <option value="negative">Negative First</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <h3 className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-600 uppercase">
                  Product Reviews ({sortedReviews.length}{!streamDone ? '+' : ''})
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Page {safePage} of {totalPages}{!streamDone ? '+' : ''}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {pageReviews.map((rev: NormalizedReview, idx: number) => {
                  const viewOnFkUrl = rev.permalink
                    ? (rev.permalink.startsWith('http') ? rev.permalink : `https://www.flipkart.com${rev.permalink}`)
                    : (canonicalUrl || 'https://www.flipkart.com');
                  return (
                    <div key={`${rev.id}-${idx}`} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded">★ {rev.rating}</span>
                        {rev.isVerified && (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded font-black text-[9px] uppercase tracking-wider">
                            ✓ Verified Buyer
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug">{rev.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{rev.body}</p>
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 my-2.5">
                          {rev.images.map((imgUrl, imgIdx) => (
                            <a key={imgIdx} href={imgUrl} target="_blank" rel="noopener noreferrer"
                              className="block w-12 h-12 rounded border border-slate-200 dark:border-slate-800/80 overflow-hidden hover:opacity-90 transition-opacity">
                              <img src={imgUrl} alt={`Review image ${imgIdx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                        <span>By {rev.author}</span>
                        <span>&bull;</span>
                        <span>{rev.date}</span>
                        {rev.location && <><span>&bull;</span><span>{rev.location}</span></>}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-400 font-black">👍 {rev.helpfulCount} people found this helpful</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCopyLink(viewOnFkUrl, idx)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold text-[10px] rounded border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors min-h-[36px]">
                            {copiedIndex === idx ? 'Copied!' : 'Copy URL'}
                          </button>
                          <button onClick={(e) => handleViewOnFlipkart(e, viewOnFkUrl)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] rounded transition-colors min-h-[36px] flex items-center cursor-pointer">
                            View on Flipkart
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="pt-4 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!hasPrevPage}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900 disabled:opacity-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300 min-h-[44px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    ← Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500">Page {safePage}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={!hasNextPage}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900 disabled:opacity-50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300 min-h-[44px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Next →
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {streamDone ? `${totalFetched} total reviews` : `${totalFetched} reviews loaded so far...`}
                </span>
              </div>
            </div>
          )}

        </div>
      )}
      {/* Bubu & Dudu WhatsApp Invite Overlay Modal */}
      <BubuDuduModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetActionName={modalAction}
        targetUrl={modalTargetUrl}
        mainChannelUrl="https://whatsapp.com/channel/0029Va8sOrp4SpkEQKVElV1i"
        deals99Url="https://whatsapp.com/channel/0029Vb81sJqGk1FxL7t9lW0h"
      />
    </div>
  );
}





