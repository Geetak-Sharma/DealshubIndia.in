import React, { useState, useEffect, useRef } from 'react';
import type { NormalizedQCDeal, DealVariant } from '../../lib/qc/types';
import { ShareButton } from './ShareButton';

export interface QCDealCardProps {
  deal: NormalizedQCDeal;
  variant: DealVariant;
  onPrimaryAction: () => void;
  onShare: () => void;
}

export const QCDealCard: React.FC<QCDealCardProps> = React.memo(({
  deal,
  variant,
  onPrimaryAction,
  onShare
}) => {
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setImgError(true);
    }
  }, []);

  const imgSrc = deal.image ? (!imgError ? deal.image : '') : '';
  
  // Neon Platform Colors
  let brandColor = '#8B5CF6'; // Default Purple Glow
  const m = (deal.merchant || '').toLowerCase();
  if (m.includes('swiggy')) brandColor = '#FC8019';
  else if (m.includes('blinkit')) brandColor = '#F8CB46';
  else if (m.includes('zepto')) brandColor = '#FF00A0'; // Neon Pink for Zepto
  else if (m.includes('bigbasket')) brandColor = '#8DC63F';

  if (deal.variant.type === 'expired') brandColor = '#6B7280'; // Grayed out if expired

  return (
    <article 
      className="qc-cyber-card relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300"
      style={{ '--qc-brand-color': brandColor } as any}
    >
      {/* ── 1. DEDICATED STORE HEADER SECTION ── */}
      <div className="qc-cyber-header">
        <div className="flex items-center gap-2">
          {deal.merchantEmoji ? (
            <span className="text-sm drop-shadow-md">{deal.merchantEmoji}</span>
          ) : (
             <span className="text-sm drop-shadow-md">🛒</span>
          )}
          <span className="qc-cyber-store-name">{deal.merchant}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/50 font-semibold tracking-wider">
          <span>🕒</span>
          <span>{deal.timeAgo}</span>
        </div>
      </div>

      {/* ── 2. HOLOGRAPHIC IMAGE CONTAINER ── */}
      <div className="qc-cyber-img-wrapper cursor-pointer" onClick={onPrimaryAction}>
        {imgSrc ? (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={deal.title}
            className="qc-cyber-img"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <span className="text-4xl mb-2">🛍️</span>
          </div>
        )}

        {/* Floating Badges */}
        {deal.isExpiringToday && (
          <div className="qc-neon-badge bg-red-500/20 text-red-400 border-red-500 top-2 left-2 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            <span className="animate-pulse mr-1">⏳</span> Expiring
          </div>
        )}
        {deal.isLoot && !deal.isExpiringToday && (
          <div className="qc-neon-badge bg-red-500/20 text-red-400 border-red-500 top-2 left-2 shadow-[0_0_15px_rgba(239,68,68,0.8)]">
            <span className="animate-pulse mr-1">🔥</span> LOOT
          </div>
        )}

        <div className="absolute top-2 right-2">
          <ShareButton 
            url={deal.url} 
            title={deal.title} 
            variant="icon" 
            onShare={onShare} 
            className="bg-black/50 backdrop-blur-md border border-white/10 hover:border-white/30 text-white rounded-full p-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all hover:scale-110" 
          />
        </div>
      </div>

      {/* ── 3. BODY & DETAILS ── */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-4 z-10">
        <div>
          <h3 
            className="text-[15px] font-bold text-white/90 leading-snug line-clamp-2 cursor-pointer hover:text-white transition-colors qc-cyber-title" 
            onClick={onPrimaryAction}
          >
            {deal.title}
          </h3>
          
          {deal.discount && (
            <div className="mt-2 inline-block px-2 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-wider shadow-[0_0_8px_rgba(34,197,94,0.2)]">
              {deal.discount}
            </div>
          )}
        </div>

        {/* Footer actions depending on variant */}
        <div className="mt-auto">
          {variant.type === 'coupon_plus_link' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border border-white/10 bg-black/40 rounded-lg p-2 px-3">
                <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Coupon:</span>
                <span className="font-mono text-sm font-bold tracking-wider text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{variant.couponCode}</span>
              </div>
              <button 
                onClick={onPrimaryAction} 
                className="w-full qc-cyber-btn"
              >
                Reveal Code
              </button>
            </div>
          )}

          {variant.type === 'direct_link' && (
            <button 
              onClick={onPrimaryAction} 
              className="w-full qc-cyber-btn"
            >
              Search in App
            </button>
          )}

          {variant.type === 'expired' && (
            <button disabled className="w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase bg-white/5 text-white/30 cursor-not-allowed border border-white/5">
              Expired
            </button>
          )}
        </div>
      </div>
      
      {/* GLOBAL CSS STYLES FOR 2026 OVERHAUL */}
      <style dangerouslySetInnerHTML={{__html: `
        .qc-cyber-card {
          background: rgba(22, 22, 28, 0.65);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .qc-cyber-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(135deg, var(--qc-brand-color), transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: 20;
        }

        .qc-cyber-card:hover {
          transform: translateY(-4px) scale(1.01);
        }

        .qc-cyber-card:hover::before {
          opacity: 1;
        }

        .qc-cyber-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: linear-gradient(90deg, rgba(255,255,255,0.03), transparent);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }

        .qc-cyber-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 40%;
          height: 1px;
          background: var(--qc-brand-color);
          box-shadow: 0 0 10px var(--qc-brand-color);
        }

        .qc-cyber-store-name {
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 0 8px rgba(255,255,255,0.4);
        }

        .qc-cyber-img-wrapper {
          width: 100%;
          height: 180px;
          position: relative;
          background: rgba(0,0,0,0.3);
          box-shadow: inset 0 -10px 30px rgba(0,0,0,0.5);
          overflow: hidden;
          padding: 12px;
        }

        .qc-cyber-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
        }

        .qc-cyber-card:hover .qc-cyber-img {
          transform: scale(1.08) rotate(1deg);
        }

        .qc-neon-badge {
          position: absolute;
          backdrop-filter: blur(8px);
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 900;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          border-width: 1px;
        }

        .qc-cyber-btn {
          display: flex;
          justify-content: center;
          align-items: center;
          background: var(--qc-brand-color);
          color: #fff;
          padding: 10px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3), 0 0 12px rgba(var(--qc-brand-color), 0.4);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .qc-cyber-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg);
        }

        .qc-cyber-card:hover .qc-cyber-btn::after {
          animation: shine-qc 0.6s ease-out;
        }

        @keyframes shine-qc {
          100% { left: 200%; }
        }
      `}} />
    </article>
  );
});
