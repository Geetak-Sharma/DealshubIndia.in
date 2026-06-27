import React, { useState, useEffect } from 'react';
import type { NormalizedQCDeal } from '../../lib/qc/types';
import { QCDealCard } from './QCDealCard';

const MERCHANTS = [
  { id: 'swiggy', name: 'Swiggy Instamart', logo: '🛒', color: '#FC8019' },
  { id: 'blinkit', name: 'Blinkit', logo: '⚡', color: '#F8CB46' },
  { id: 'zepto', name: 'Zepto', logo: '🚀', color: '#441473' },
  { id: 'bigbasket', name: 'BigBasket', logo: '🧺', color: '#8DC63F' }
];

interface StoreSectionProps {
  merchant: typeof MERCHANTS[0];
  onCardAction: (deal: NormalizedQCDeal) => void;
  onShareAction: (deal: NormalizedQCDeal) => void;
}

function StoreSection({ merchant, onCardAction, onShareAction }: StoreSectionProps) {
  const [deals, setDeals] = useState<NormalizedQCDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchDeals() {
      try {
        setLoading(true);
        const res = await fetch(`/api/qc-search?merchant=${encodeURIComponent(merchant.name)}&limit=6`);
        const data = await res.json();
        
        if (!mounted) return;
        
        // Normalize
        const { normalizeQCDeal } = await import('../../lib/qc/normalizeDeal');
        setDeals(data.deals ? data.deals.map(normalizeQCDeal) : []);
      } catch (e) {
        console.error('Failed to fetch store section deals', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDeals();
    return () => { mounted = false; };
  }, [merchant.name]);

  if (loading) {
    return (
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
          <h3 className="text-lg font-black tracking-wide text-slate-100 flex items-center gap-2" style={{ color: merchant.color }}>
            <span>{merchant.logo}</span> Top {merchant.name} Deals
          </h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="min-w-[280px] h-[360px] bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-10">
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
        <h3 className="text-lg font-black tracking-wide text-slate-100 flex items-center gap-2" style={{ color: merchant.color }}>
          <span>{merchant.logo}</span> Top {merchant.name} Deals
        </h3>
        <a href={`/quick-commerce?merchant=${merchant.name}`} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
          View All →
        </a>
      </div>
      
      {deals.length === 0 ? (
        <div className="py-8 text-center bg-slate-900/10 border border-slate-800/60 rounded-2xl">
          <p className="text-sm text-slate-500">No live deals for {merchant.name} right now.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar items-stretch" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {deals.map(deal => (
            <div key={deal.id} className="min-w-[280px] max-w-[320px] snap-start flex-shrink-0 flex flex-col">
              <div className="h-full">
                <QCDealCard
                  deal={deal}
                  variant={deal.variant}
                  onPrimaryAction={() => onCardAction(deal)}
                  onShare={() => onShareAction(deal)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QCStoreSections({ onCardAction, onShareAction }: { onCardAction: any, onShareAction: any }) {
  return (
    <div className="qc-store-sections-container">
      {MERCHANTS.map(m => (
        <StoreSection
          key={m.id}
          merchant={m}
          onCardAction={onCardAction}
          onShareAction={onShareAction}
        />
      ))}
    </div>
  );
}