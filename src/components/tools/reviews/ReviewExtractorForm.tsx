import React, { useState, useRef, useCallback } from 'react';
import type { NormalizedReview } from '../../../types/tools';

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

export default function ReviewExtractorForm() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const response = await fetch('/api/tools/flipkart-extractor-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlStr, sort: sortVal }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        setError((errData as any).error || 'Failed to connect to analyzer.');
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
            setLoading(false);
            setFetchingMore(true);
          } else if (event.type === 'reviews') {
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
            setError(event.error || 'Error fetching reviews.');
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
    if (e) e.preventDefault();
    if (!urlInput.trim()) { setError('Please paste a valid Flipkart product URL.'); return; }
    startStream(urlInput, sortMode);
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
  };

  const hasPrevPage = safePage > 1;
  const hasNextPage = safePage < totalPages || (!streamDone && allReviews.length > 0);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-4 sm:px-6">

      {/* Input panel */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="flipkart-url" className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
                Flipkart Product URL
              </label>
              <span className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">
                Supported: product URLs, review URLs, short links (fkrt.cc / dl.flipkart.com), tracking-heavy links.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="flipkart-url"
                type="text"
                placeholder="Paste Flipkart product or review link..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm hover:shadow uppercase transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {loading ? 'Connecting...' : 'Get Reviews'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-md">
              <input
                id="search-reviews"
                type="text"
                placeholder="Search reviews or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm hover:shadow uppercase transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Search
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Sort:</label>
              <select
                id="sort-select"
                value={sortMode}
                onChange={(e) => handleSortChange(e.target.value)}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer min-h-[44px]"
              >
                <option value="helpful">Most Helpful</option>
                <option value="recent">Most Recent</option>
                <option value="positive">Positive First</option>
                <option value="negative">Negative First</option>
              </select>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-lg text-xs font-bold leading-relaxed">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Connecting skeleton */}
      {loading && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm animate-pulse">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto"></div>
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 mx-auto rounded"></div>
          <div className="h-3 w-72 bg-slate-100 dark:bg-slate-800 mx-auto rounded"></div>
          <p className="text-xs text-slate-400 font-medium">Connecting to Flipkart...</p>
        </div>
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

          {/* Review list */}
          {allReviews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
                          <a href={viewOnFkUrl} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] rounded transition-colors min-h-[36px] flex items-center">
                            View on Flipkart
                          </a>
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
    </div>
  );
}





