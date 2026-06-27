
import { useState, useEffect, useCallback, useRef } from 'react';
import type { RawQCPost, NormalizedQCDeal } from '../../lib/qc/types';
import { normalizeQCDeal } from '../../lib/qc/normalizeDeal';

export function useQCFeedController(isHome = false) {
  const [rawDeals, setRawDeals] = useState<RawQCPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState('all');
  const [hasCoupon, setHasCoupon] = useState(false);
  const [hasCashback, setHasCashback] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [liveCount, setLiveCount] = useState(0);

  const [activeDrawerDeal, setActiveDrawerDeal] = useState<NormalizedQCDeal | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch deals from API
  const fetchDeals = useCallback(async (append: boolean) => {
    setLoading(true);
    try {
      const offset = append ? rawDeals.length : 0;
      const params = new URLSearchParams({
        q: searchQuery,
        cat: selectedCategory,
        merchant: selectedMerchant,
        coupon: hasCoupon ? 'true' : '',
        cashback: hasCashback ? 'true' : '',
        expiring: isExpiring ? 'true' : '',
        limit: isHome ? '6' : '20',
        offset: String(offset),
      });

      const res = await fetch(`/api/qc-search?${params}`);
      const data = await res.json();

      if (!data.deals || data.deals.length === 0) {
        setHasMore(false);
        if (!append) setRawDeals([]);
      } else {
        setRawDeals(prev => append ? [...prev, ...data.deals] : data.deals);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error('[QC Feed Controller] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedMerchant, hasCoupon, hasCashback, isExpiring, rawDeals.length, isHome]);

  // Initial load / reset hooks
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchDeals(false);
  }, [selectedCategory, selectedMerchant, hasCoupon, hasCashback, isExpiring]);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDeals(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // SSE Stream merge
  useEffect(() => {
    const sse = new EventSource('/api/qc-stream');
    sse.onmessage = (event) => {
      try {
        const newDeals: RawQCPost[] = JSON.parse(event.data);
        if (Array.isArray(newDeals) && newDeals.length > 0) {
          setRawDeals(prev => {
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

  // Infinite scroll hook
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

  // Normalize all raw deals for presentation
  const normalizedDeals = rawDeals.map(normalizeQCDeal);

  return {
    deals: normalizedDeals,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedMerchant,
    setSelectedMerchant,
    hasCoupon,
    setHasCoupon,
    hasCashback,
    setHasCashback,
    isExpiring,
    setIsExpiring,
    hasMore,
    liveCount,
    setLiveCount,
    activeDrawerDeal,
    setActiveDrawerDeal,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    toast,
    showToast,
    loaderRef
  };
}
