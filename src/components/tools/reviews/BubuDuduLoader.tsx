import React from 'react';

export interface BubuDuduLoaderProps {
  telegramUrl?: string;
  whatsappUrl?: string;
}

export const BubuDuduLoader: React.FC<BubuDuduLoaderProps> = ({
  telegramUrl = 'https://t.me/dealshub_india',
  whatsappUrl = 'https://whatsapp.com/channel/dealshub'
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-center space-y-5 animate-in fade-in duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes duduHop {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes bubuHop {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(2.5deg); }
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
      ` }} />

      {/* Top Status */}
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 py-1.5 px-3.5 rounded-full w-fit mx-auto">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>Fetching your reviews... Meanwhile, check this out! 👇</span>
      </div>

      {/* BUBU & DUDU ACCURATE OFFICIAL STAGE */}
      <div className="relative w-80 h-48 mx-auto flex items-end justify-center">

        {/* Floating Hearts */}
        <div className="absolute top-1 left-24 text-rose-500 text-lg animate-bounce">❤️</div>
        <div className="absolute top-2 right-24 text-pink-400 text-sm animate-pulse">✨</div>

        <svg className="w-full h-full drop-shadow-md overflow-visible" viewBox="0 0 340 210" fill="none" xmlns="http://www.w3.org/2000/svg">
          
          {/* Ground Shadows */}
          <ellipse className="anim-shadow-dudu" cx="110" cy="198" rx="38" ry="9" fill="#000000"/>
          <ellipse className="anim-shadow-bubu" cx="225" cy="198" rx="38" ry="9" fill="#000000"/>

          {/* DUDU (CARAMEL BROWN BEAR) */}
          <g className="anim-dudu">
            {/* Ears */}
            <circle cx="82" cy="88" r="15" fill="#B27A52"/>
            <circle cx="82" cy="88" r="8" fill="#D4A37C"/>
            <circle cx="138" cy="88" r="15" fill="#B27A52"/>
            <circle cx="138" cy="88" r="8" fill="#D4A37C"/>

            {/* Chubby Body */}
            <ellipse cx="110" cy="162" rx="36" ry="32" fill="#B27A52"/>
            <ellipse cx="110" cy="164" rx="22" ry="19" fill="#E8C3A4"/>

            {/* Stubby Feet */}
            <ellipse cx="90" cy="192" rx="11" ry="8" fill="#9E6741"/>
            <ellipse cx="130" cy="192" rx="11" ry="8" fill="#9E6741"/>

            {/* Big Chubby Head */}
            <ellipse cx="110" cy="116" rx="42" ry="35" fill="#B27A52"/>

            {/* Cute Rosy Cheeks */}
            <circle cx="84" cy="128" r="8" fill="#FB7185" opacity="0.6"/>
            <circle cx="136" cy="128" r="8" fill="#FB7185" opacity="0.6"/>

            {/* Snout Cream Patch */}
            <ellipse cx="110" cy="125" rx="15" ry="11" fill="#E8C3A4"/>
            <ellipse cx="110" cy="121" rx="5" ry="3.5" fill="#3E2211"/>
            <path d="M105 127 Q110 131 115 127" stroke="#3E2211" strokeWidth="2.2" strokeLinecap="round"/>

            {/* Eyes */}
            <ellipse cx="95" cy="113" rx="4" ry="5.5" fill="#26150B"/>
            <ellipse cx="125" cy="113" rx="4" ry="5.5" fill="#26150B"/>
            <circle cx="94" cy="111" r="1.8" fill="#FFFFFF"/>
            <circle cx="124" cy="111" r="1.8" fill="#FFFFFF"/>

            {/* Left Arm (Waving) */}
            <g className="anim-dudu-arm">
              <path d="M74 148 Q55 136 60 120" stroke="#B27A52" strokeWidth="13" strokeLinecap="round"/>
              <circle cx="60" cy="118" r="7" fill="#9E6741"/>
            </g>

            {/* Right Arm */}
            <path d="M144 150 Q160 148 172 154" stroke="#B27A52" strokeWidth="12" strokeLinecap="round"/>
          </g>

          {/* BUBU (SNOW-WHITE PANDA) */}
          <g className="anim-bubu">
            {/* Jet-Black Round Ears */}
            <circle cx="198" cy="86" r="15" fill="#1E2022"/>
            <circle cx="252" cy="86" r="15" fill="#1E2022"/>

            {/* Chubby Snow-White Body */}
            <ellipse cx="225" cy="162" rx="36" ry="32" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1"/>

            {/* Black Feet */}
            <ellipse cx="205" cy="192" rx="11" ry="8" fill="#1E2022"/>
            <ellipse cx="245" cy="192" rx="11" ry="8" fill="#1E2022"/>

            {/* Big Chubby White Head */}
            <ellipse cx="225" cy="115" rx="43" ry="36" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1"/>

            {/* Slanted Black Panda Eye-Patches */}
            <ellipse cx="208" cy="114" rx="10" ry="12" transform="rotate(-12 208 114)" fill="#1E2022"/>
            <ellipse cx="242" cy="114" rx="10" ry="12" transform="rotate(12 242 114)" fill="#1E2022"/>

            {/* Sparkling Big White Pupils */}
            <circle cx="209" cy="113" r="3.8" fill="#FFFFFF"/>
            <circle cx="241" cy="113" r="3.8" fill="#FFFFFF"/>
            <circle cx="210.5" cy="111.5" r="1.5" fill="#000000"/>
            <circle cx="242.5" cy="111.5" r="1.5" fill="#000000"/>

            {/* Pink Blush Cheeks */}
            <circle cx="194" cy="128" r="9" fill="#FB7185" opacity="0.6"/>
            <circle cx="256" cy="128" r="9" fill="#FB7185" opacity="0.6"/>

            {/* Nose & Smile */}
            <ellipse cx="225" cy="121" rx="4" ry="2.8" fill="#1E2022"/>
            <path d="M220 126 Q225 133 230 126" stroke="#1E2022" strokeWidth="2.2" strokeLinecap="round" fill="#F43F5E"/>

            {/* Left Arm */}
            <path d="M192 154 Q178 152 170 156" stroke="#1E2022" strokeWidth="12" strokeLinecap="round"/>

            {/* Right Arm (Waving) */}
            <g className="anim-bubu-arm">
              <path d="M256 148 Q274 142 280 128" stroke="#1E2022" strokeWidth="12" strokeLinecap="round"/>
              <rect x="274" y="116" width="16" height="24" rx="4" fill="#059669" stroke="#34D399" strokeWidth="1.5"/>
              <rect x="277" y="119" width="10" height="15" rx="2" fill="#ECFDF5"/>
              <circle cx="282" cy="136" r="1.5" fill="#FFFFFF"/>
            </g>
          </g>

        </svg>
      </div>

      {/* PROMO CARD */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
            ⭐ We Are Here Too!
          </div>
          <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
            Join Our DealsHub Community!
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bubu & Dudu also follow DealsHub for the latest shopping loot alerts and price drops. Come hang out with us!
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#229ED9] hover:bg-[#1f8fc4] text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.946z"/>
            </svg>
            <span>Join Telegram Channel</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
            </svg>
            <span>Join WhatsApp Alerts</span>
          </a>
        </div>
      </div>

    </div>
  );
};
