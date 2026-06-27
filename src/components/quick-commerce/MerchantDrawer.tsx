
import React from 'react';

export interface MerchantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMerchant: string;
  onMerchantChange: (merchant: string) => void;
  hasCoupon: boolean;
  onCouponToggle: (val: boolean) => void;
  hasCashback: boolean;
  onCashbackToggle: (val: boolean) => void;
  isExpiring: boolean;
  onExpiringToggle: (val: boolean) => void;
  resultsCount: number;
}

const MERCHANTS = [
  { id: 'all', label: 'All Merchants', emoji: '🍽️', color: '#22C55E' },
  { id: 'Swiggy', label: 'Swiggy', emoji: '🧡', color: '#FC8019' },
  { id: 'Zomato', label: 'Zomato', emoji: '❤️', color: '#E23744' },
  { id: 'Blinkit', label: 'Blinkit', emoji: '⚡', color: '#F8D531' },
  { id: 'Zepto', label: 'Zepto', emoji: '💜', color: '#8B5CF6' },
  { id: 'BigBasket', label: 'BigBasket', emoji: '🛒', color: '#84BE41' },
  { id: "Domino's", label: "Domino's", emoji: '🍕', color: '#E31837' },
  { id: 'KFC', label: 'KFC', emoji: '🍗', color: '#F40000' },
  { id: "McDonald's", label: "McD's", emoji: '🍔', color: '#FFC72C' },
  { id: 'Pizza Hut', label: 'Pizza Hut', emoji: '🍕', color: '#E31937' },
  { id: 'Magicpin', label: 'Magicpin', emoji: '✨', color: '#6C3483' },
];

export const MerchantDrawer: React.FC<MerchantDrawerProps> = ({
  isOpen,
  onClose,
  selectedMerchant,
  onMerchantChange,
  hasCoupon,
  onCouponToggle,
  hasCashback,
  onCashbackToggle,
  isExpiring,
  onExpiringToggle,
  resultsCount
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">⚙️ Filter & Merchants</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {/* Smart Toggles */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Filters</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '🎟️ With Coupon', state: hasCoupon, set: onCouponToggle },
                { label: '💰 Cashback', state: hasCashback, set: onCashbackToggle },
                { label: '⏰ Expiring Today', state: isExpiring, set: onExpiringToggle }
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => f.set(!f.state)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-bold tracking-wide transition-all ${
                    f.state 
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                      : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Merchants list */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filter by Merchant</h4>
            <div className="grid grid-cols-2 gap-2">
              {MERCHANTS.map(m => (
                <button
                  key={m.id}
                  onClick={() => onMerchantChange(m.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedMerchant === m.id 
                      ? 'border-current' 
                      : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/70'
                  }`}
                  style={selectedMerchant === m.id ? {
                    color: m.color,
                    backgroundColor: `${m.color}15`,
                    borderColor: `${m.color}35`
                  } : {}}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sticky CTA */}
          <button
            onClick={onClose}
            className="w-full py-3 mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-colors"
          >
            Show {resultsCount} Deals
          </button>
        </div>
      </div>
    </div>
  );
};
