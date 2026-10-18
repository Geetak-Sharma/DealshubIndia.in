import React, { useState } from 'react';

export interface BubuDuduModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetActionName: 'copy' | 'view';
  targetUrl?: string;
  mainChannelUrl?: string;
  deals99Url?: string;
}

export const BubuDuduModal: React.FC<BubuDuduModalProps> = ({
  isOpen,
  onClose,
  targetActionName,
  targetUrl = '',
  mainChannelUrl = 'https://whatsapp.com/channel/0029Va8sOrp4SpkEQKVElV1i',
  deals99Url = 'https://whatsapp.com/channel/0029Vb81sJqGk1FxL7t9lW0h'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleContinue = () => {
    onClose();
    if (targetActionName === 'view' && targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
          aria-label="Close modal"
        >
          ✕
        </button>

        <style>{`
          @keyframes duduHop {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(-2deg); }
          }
          @keyframes bubuHop {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-12px) rotate(2deg); }
          }
          @keyframes duduWave {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(25deg); }
          }
          @keyframes bubuWave {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-15deg); }
          }
          @keyframes shadowPulse {
            0%, 100% { transform: scaleX(1); opacity: 0.2; }
            50% { transform: scaleX(0.75); opacity: 0.1; }
          }
          .anim-dudu {
            animation: duduHop 0.9s ease-in-out infinite;
            transform-origin: bottom center;
          }
          .anim-bubu {
            animation: bubuHop 0.85s ease-in-out infinite 0.15s;
            transform-origin: bottom center;
          }
          .anim-dudu-arm {
            animation: duduWave 0.45s ease-in-out infinite alternate;
            transform-origin: 74px 148px;
          }
          .anim-bubu-arm {
            animation: bubuWave 0.5s ease-in-out infinite alternate;
            transform-origin: 256px 148px;
          }
          .anim-shadow-dudu {
            animation: shadowPulse 0.9s ease-in-out infinite;
            transform-origin: 110px 198px;
          }
          .anim-shadow-bubu {
            animation: shadowPulse 0.85s ease-in-out infinite 0.15s;
            transform-origin: 225px 198px;
          }
        `}</style>

        {/* BUBU & DUDU ANIMATED CARTOON */}
        <div className="relative w-64 h-36 mx-auto flex items-end justify-center">
          <div className="absolute top-0 left-16 text-rose-500 text-base animate-bounce">❤️</div>
          <div className="absolute top-1 right-16 text-pink-400 text-xs animate-pulse">✨</div>

          <svg className="w-full h-full drop-shadow-md overflow-visible" viewBox="0 0 340 210" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse className="anim-shadow-dudu" cx="110" cy="198" rx="38" ry="9" fill="#000000"/>
            <ellipse className="anim-shadow-bubu" cx="225" cy="198" rx="38" ry="9" fill="#000000"/>

            {/* DUDU (CARAMEL BROWN BEAR) */}
            <g className="anim-dudu">
              <circle cx="82" cy="88" r="15" fill="#B27A52"/>
              <circle cx="82" cy="88" r="8" fill="#D4A37C"/>
              <circle cx="138" cy="88" r="15" fill="#B27A52"/>
              <circle cx="138" cy="88" r="8" fill="#D4A37C"/>
              <ellipse cx="110" cy="162" rx="36" ry="32" fill="#B27A52"/>
              <ellipse cx="110" cy="164" rx="22" ry="19" fill="#E8C3A4"/>
              <ellipse cx="90" cy="192" rx="11" ry="8" fill="#9E6741"/>
              <ellipse cx="130" cy="192" rx="11" ry="8" fill="#9E6741"/>
              <ellipse cx="110" cy="116" rx="42" ry="35" fill="#B27A52"/>
              <circle cx="84" cy="128" r="8" fill="#FB7185" opacity="0.6"/>
              <circle cx="136" cy="128" r="8" fill="#FB7185" opacity="0.6"/>
              <ellipse cx="110" cy="125" rx="15" ry="11" fill="#E8C3A4"/>
              <ellipse cx="110" cy="121" rx="5" ry="3.5" fill="#3E2211"/>
              <path d="M105 127 Q110 131 115 127" stroke="#3E2211" strokeWidth="2.2" strokeLinecap="round"/>
              <ellipse cx="95" cy="113" rx="4" ry="5.5" fill="#26150B"/>
              <ellipse cx="125" cy="113" rx="4" ry="5.5" fill="#26150B"/>
              <circle cx="94" cy="111" r="1.8" fill="#FFFFFF"/>
              <circle cx="124" cy="111" r="1.8" fill="#FFFFFF"/>
              <g className="anim-dudu-arm">
                <path d="M74 148 Q55 136 60 120" stroke="#B27A52" strokeWidth="13" strokeLinecap="round"/>
                <circle cx="60" cy="118" r="7" fill="#9E6741"/>
              </g>
              <path d="M144 150 Q160 148 172 154" stroke="#B27A52" strokeWidth="12" strokeLinecap="round"/>
            </g>

            {/* BUBU (SNOW-WHITE PANDA) */}
            <g className="anim-bubu">
              <circle cx="198" cy="86" r="15" fill="#1E2022"/>
              <circle cx="252" cy="86" r="15" fill="#1E2022"/>
              <ellipse cx="225" cy="162" rx="36" ry="32" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1"/>
              <ellipse cx="205" cy="192" rx="11" ry="8" fill="#1E2022"/>
              <ellipse cx="245" cy="192" rx="11" ry="8" fill="#1E2022"/>
              <ellipse cx="225" cy="115" rx="43" ry="36" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1"/>
              <ellipse cx="208" cy="114" rx="10" ry="12" transform="rotate(-12 208 114)" fill="#1E2022"/>
              <ellipse cx="242" cy="114" rx="10" ry="12" transform="rotate(12 242 114)" fill="#1E2022"/>
              <circle cx="209" cy="113" r="3.8" fill="#FFFFFF"/>
              <circle cx="241" cy="113" r="3.8" fill="#FFFFFF"/>
              <circle cx="210.5" cy="111.5" r="1.5" fill="#000000"/>
              <circle cx="242.5" cy="111.5" r="1.5" fill="#000000"/>
              <circle cx="194" cy="128" r="9" fill="#FB7185" opacity="0.6"/>
              <circle cx="256" cy="128" r="9" fill="#FB7185" opacity="0.6"/>
              <ellipse cx="225" cy="121" rx="4" ry="2.8" fill="#1E2022"/>
              <path d="M220 126 Q225 133 230 126" stroke="#1E2022" strokeWidth="2.2" strokeLinecap="round" fill="#F43F5E"/>
              <path d="M192 154 Q178 152 170 156" stroke="#1E2022" strokeWidth="12" strokeLinecap="round"/>
              <g className="anim-bubu-arm">
                <path d="M256 148 Q274 142 280 128" stroke="#1E2022" strokeWidth="12" strokeLinecap="round"/>
                <rect x="274" y="116" width="16" height="24" rx="4" fill="#059669" stroke="#34D399" strokeWidth="1.5"/>
                <rect x="277" y="119" width="10" height="15" rx="2" fill="#ECFDF5"/>
                <circle cx="282" cy="136" r="1.5" fill="#FFFFFF"/>
              </g>
            </g>
          </svg>
        </div>

        {/* Heading & Invite */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
            ⭐ Special Invite from Bubu & Dudu
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
            Wait! Join Our WhatsApp Channels Before You Shop!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Bubu & Dudu follow both channels so they never overpay. Join for instant price-glitch & ₹99 loot alerts!
          </p>
        </div>

        {/* 2 WHATSAPP CHANNELS BUTTONS */}
        <div className="space-y-2.5 pt-1">
          {/* Channel 1: Main DealsHub India */}
          <a
            href={mainChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs tracking-wider shadow-lg shadow-[#25D366]/20 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24">
                  <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div>
                <div className="font-extrabold text-xs">DealsHub India (Main Channel)</div>
                <div className="text-[10px] font-semibold opacity-80">All Lightning Sales & Price Drops</div>
              </div>
            </div>
            <span className="text-xs font-black">JOIN →</span>
          </a>

          {/* Channel 2: 99₹ Deals - DealsHub India */}
          <a
            href={deals99Url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-base">
                ⚡
              </div>
              <div>
                <div className="font-extrabold text-xs">99₹ Deals - DealsHub India</div>
                <div className="text-[10px] font-semibold opacity-90">Under ₹99 Loots & Steal Deals</div>
              </div>
            </div>
            <span className="text-xs font-black">JOIN →</span>
          </a>
        </div>

        {/* DEDICATED DIRECT COPY URL / VIEW ON FLIPKART BOX */}
        {targetUrl && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Flipkart Review URL
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>{copied ? '✓ Copied!' : '📋 Copy URL'}</span>
              </button>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate select-all">
              {targetUrl}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="pt-1">
          <button
            onClick={handleContinue}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-4 cursor-pointer transition-colors"
          >
            {targetActionName === 'view' ? 'Proceed to Flipkart →' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
