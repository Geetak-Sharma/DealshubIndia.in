
import React, { useState } from 'react';
import type { NormalizedQCDeal } from '../../lib/qc/types';

export interface CouponDrawerProps {
  deal: NormalizedQCDeal | null;
  onClose: () => void;
}

export const CouponDrawer: React.FC<CouponDrawerProps> = ({ deal, onClose }) => {
  if (!deal) return null;

  const [copied, setCopied] = useState(false);

  const isSearch = deal.variant.type === 'app_search';
  
  const handleCopy = async () => {
    const textToCopy = isSearch ? (deal.productName || deal.title) : (deal.couponCode || deal.title);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const displayCode = deal.couponCode || '';

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
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            {isSearch ? '🔍 Search Instructions' : '🎟️ Copy Coupon Code'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <h4 className="text-sm font-bold text-slate-100 leading-snug">{deal.title}</h4>

          {isSearch ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Open the <strong>{deal.merchant}</strong> app or website on your phone.<br/>
                2. Search for the product name below (copied to clipboard):
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl gap-2">
                <code className="text-xs font-mono font-bold text-orange-400 select-all break-all flex-1">{deal.productName || deal.title}</code>
                <button 
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Copy this coupon code and paste it on the checkout screen inside the <strong>{deal.merchant}</strong> app:
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl gap-2">
                <code className="text-sm font-mono font-black text-emerald-400 tracking-wider select-all break-all flex-1">{displayCode}</code>
                <button 
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <a
              href={deal.merchantSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white text-center rounded-xl text-xs font-extrabold uppercase tracking-widest text-decoration-none transition-colors"
            >
              Open {deal.merchant}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
