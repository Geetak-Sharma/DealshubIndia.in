import React, { useState } from 'react';
import { useQCFeedController } from './quick-commerce/useQCFeedController';
import { FilterBar } from './quick-commerce/FilterBar';
import { MerchantDrawer } from './quick-commerce/MerchantDrawer';
import { DealsGrid } from './quick-commerce/DealsGrid';
import { CouponDrawer } from './quick-commerce/CouponDrawer';

import { executeDealAction } from '../lib/qc/executeDealAction';
import type { NormalizedQCDeal } from '../lib/qc/types';

export function SkeletonCard() {
  return (
    <div className="relative flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video w-full bg-slate-950/60" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-3 w-16 bg-slate-800 rounded" />
          <div className="h-3 w-12 bg-slate-800 rounded" />
        </div>
        <div className="h-4 w-5/6 bg-slate-800 rounded" />
        <div className="h-4 w-2/3 bg-slate-800 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-12 bg-slate-800 rounded-full" />
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
        </div>
        <div className="h-10 w-full bg-slate-800 rounded-xl mt-2" />
      </div>
    </div>
  );
}

interface QCFeedProps {
  isHome?: boolean;
}

export default function QCFeed({ isHome = false }: QCFeedProps) {
  const {
    deals,
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
  } = useQCFeedController(isHome);

  const [sharingDeal, setSharingDeal] = useState<NormalizedQCDeal | null>(null);

  const handleCardAction = async (deal: NormalizedQCDeal) => {
    // track click
    try {
      await fetch('/api/qc-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, merchant: deal.merchant, action: 'get-offer' }),
      });
    } catch { /* silent */ }

    await executeDealAction(
      deal,
      (d) => setActiveDrawerDeal(d),
      (msg, success) => showToast(msg, success)
    );
  };

  const handleShareTrigger = async (deal: NormalizedQCDeal) => {
    try {
      const { shareDealWithScreenshot } = await import('../lib/shareScreenshot');
      await shareDealWithScreenshot(
        {
          title: deal.title,
          image: deal.image,
          fallbackSvg: deal.fallbackSvg,
          price: deal.finalPrice,
          originalPrice: null,
          discount: deal.discount,
          platform: deal.merchant,
          isLoot: deal.isLoot,
          slug: deal.slug
        },
        (msg, isSuccess) => showToast(msg, isSuccess)
      );
      // Track share
      fetch('/api/qc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id })
      }).catch(() => {});
    } catch (err) {
      console.error("Screenshot sharing failed, falling back to simple share:", err);
      const shareUrl = `https://dealshubindia.in/quick-commerce/${deal.slug}`;
      const couponText = deal.couponCode ? `Use code ${deal.couponCode}` : '';
      const shareText = `ðŸ”¥ ${deal.title}\n\n${couponText ? couponText + '\n\n' : ''}Found on Dealshub India:\n${shareUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: deal.title,
            text: shareText,
            url: shareUrl
          });
        } catch {}
      } else {
        setSharingDeal(deal);
      }
    }
  };

  

  const handleShareTrack = async (dealId: string) => {
    try {
      await fetch('/api/qc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId })
      });
    } catch {}
  };

  return (
    <div className="space-y-6 w-full relative">
      {/* â”€â”€ Toast Notifications â”€â”€ */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[10000] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-bold tracking-wide border ${
            toast.isSuccess 
              ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' 
              : 'bg-red-950/90 text-red-400 border-red-500/30'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* â”€â”€ Live deals toast/banner â”€â”€ */}
      {liveCount > 0 && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLiveCount(0);
          }}
          className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest text-white text-center animate-bounce shadow-lg bg-gradient-to-r from-orange-500 to-rose-500 border border-orange-400/20"
        >
          ðŸ”¥ {liveCount} New Quick Commerce {liveCount === 1 ? 'Deal' : 'Deals'} Just In! Tap to View
        </button>
      )}

      {/* â”€â”€ Filter Bar â”€â”€ */}
      {!isHome && (
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onOpenFiltersDrawer={() => setIsFilterDrawerOpen(true)}
        />
      )}

      {/* â”€â”€ Filter & Merchant Drawer â”€â”€ */}
      {!isHome && (
        <MerchantDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => setIsFilterDrawerOpen(false)}
          selectedMerchant={selectedMerchant}
          onMerchantChange={setSelectedMerchant}
          hasCoupon={hasCoupon}
          onCouponToggle={setHasCoupon}
          hasCashback={hasCashback}
          onCashbackToggle={setHasCashback}
          isExpiring={isExpiring}
          onExpiringToggle={setIsExpiring}
          resultsCount={deals.length}
        />
      )}

      {/* â”€â”€ Deals Grid or Empty State â”€â”€ */}
      <div className="space-y-6">
        
                {deals.length > 0 ? (
          <DealsGrid
            deals={deals}
            loading={loading}
            onCardAction={handleCardAction}
            onShareAction={handleShareTrigger}
          />
        ) : !loading ? (
          <div className="py-16 text-center bg-slate-900/10 border border-slate-800/60 rounded-2xl space-y-3">
            <span className="text-4xl">ðŸ½ï¸</span>
            <h3 className="text-sm font-bold text-slate-400">No deals found</h3>
            <p className="text-xs text-slate-500">Try adjusting your filters or check back in a few minutes.</p>
          </div>
        ) : null}

        {/* Skeleton Loaders */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {hasMore && !loading && !isHome && <div ref={loaderRef} className="h-12 w-full" />}
      </div>

      {/* â”€â”€ Coupon & Instruction Drawer â”€â”€ */}
      {activeDrawerDeal && (
        <CouponDrawer
          deal={activeDrawerDeal}
          onClose={() => setActiveDrawerDeal(null)}
        />
      )}

      {/* â”€â”€ Share Deal Modal â”€â”€ */}
      {sharingDeal && (
        <div 
          className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSharingDeal(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">ðŸ“¢ Share Deal</h3>
              <button onClick={() => setSharingDeal(null)} className="text-slate-400 hover:text-white text-lg font-bold">âœ•</button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm font-bold text-slate-100 leading-snug">{sharingDeal.title}</p>
              
              <div className="flex flex-col gap-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `ðŸ”¥ ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                    `Found on Dealshub India:\nhttps://dealshubindia.in/quick-commerce/${sharingDeal.slug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="text-lg">ðŸ’¬</span>
                  <span>WhatsApp</span>
                </a>
                
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`https://dealshubindia.in/quick-commerce/${sharingDeal.slug}`)}&text=${encodeURIComponent(
                    `ðŸ”¥ ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="text-lg">ðŸ“²</span>
                  <span>Telegram</span>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `ðŸ”¥ ${sharingDeal.title}\n\n` +
                    (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
                    `https://dealshubindia.in/quick-commerce/${sharingDeal.slug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold bg-slate-950 border border-slate-800 text-white hover:bg-slate-900 transition-all"
                  onClick={() => { handleShareTrack(sharingDeal.id); setSharingDeal(null); }}
                >
                  <span className="text-lg">ð•</span>
                  <span>X / Twitter</span>
                </a>

                <button
                  type="button"
                  className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all w-full text-left"
                  onClick={async () => {
                    const textToCopy = `ðŸ”¥ ${sharingDeal.title}\n\n` +
                      (sharingDeal.couponCode ? `Use code ${sharingDeal.couponCode}\n\n` : '') +
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
                    showToast('Deal details copied to clipboard!', true);
                  }}
                >
                  <span className="text-lg">ðŸ”—</span>
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


