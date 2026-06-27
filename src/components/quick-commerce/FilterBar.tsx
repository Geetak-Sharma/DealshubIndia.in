import React, { useState, useRef, useEffect } from 'react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenFiltersDrawer: () => void;
}

const CATEGORY_MAP = [
  { id: 'all', label: 'All Deals', icon: '🍽️' },
  { id: 'food-delivery', label: 'Food Delivery', icon: '🍕' },
  { id: 'grocery', label: 'Grocery', icon: '🛒' },
  { id: 'cashback', label: 'Cashback', icon: '💳' },
  { id: 'freebies', label: 'Freebies', icon: '🆓' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenFiltersDrawer
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let ctx: any;
    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger')
    ]).then(([{ default: gsap }, { default: ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const navLink = document.querySelector('.nav__link--qc');
        const banner = document.getElementById('qc-sticky-banner');
        if (navLink && banner) {
          gsap.timeline({
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "60px top",
              scrub: 0.5,
            }
          })
          .to(navLink, { opacity: 0, y: 15, scale: 0.9, duration: 1, transformOrigin: "center bottom" }, 0)
          .fromTo(banner, 
            { opacity: 0, y: -20, scale: 0.8 }, 
            { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power2.out" }, 
          0);
        }
      });
    }).catch(err => console.error("GSAP load error:", err));

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div 
      className="sticky top-[15px] z-[100] w-full flex items-center justify-between gap-3 p-3 mt-0 mb-6 rounded-2xl border border-white/10 bg-slate-900/85 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all"
    >
      <style>{`
        @keyframes shimmer-slide {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer-slide 3s linear infinite;
        }
        @keyframes slide-in-out {
          0% { transform: translateX(-150%) skewX(-15deg); }
          50%, 100% { transform: translateX(250%) skewX(-15deg); }
        }
        .animate-glass-slide {
          animation: slide-in-out 4s ease-in-out infinite;
        }
      `}</style>
      {/* ── Left: Back to Home ── */}
      <a 
        href="/" 
        className="flex-shrink-0 inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-slate-950/60 border border-white/10 text-slate-400 text-xs md:text-sm font-semibold hover:text-white hover:border-green-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.25)] transition-all"
      >
        <span className="transform transition-transform group-hover:-translate-x-1">←</span>
        <span className="hidden sm:inline">Back to Home</span>
      </a>

      {/* ── Center: Animated Banner ── */}
      <div className="hidden md:flex flex-1 justify-center items-center">
        <div id="qc-sticky-banner" className="relative group overflow-hidden rounded-full px-5 py-1.5 border border-white/10 bg-slate-950/50 cursor-default">
          {/* Glass slide effect */}
          <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-glass-slide" />
          
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-rose-500/20 to-orange-500/20 animate-pulse" />
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-rose-400 to-orange-500 opacity-20 group-hover:opacity-50 blur-lg transition-opacity duration-700" />
          
          <span className="relative flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-rose-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-shimmer">
            <span className="text-orange-400 animate-bounce">⚡</span>
            Quick Commerce
          </span>
        </div>
      </div>

      {/* ── Right: Search & Dropdown ── */}
      <div className="relative flex-1 max-w-[400px] flex justify-end" ref={containerRef}>
        <div className="relative w-full">
          <input
            type="search"
            placeholder="Search deals, coupons..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-full text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-slate-900 transition-all shadow-inner"
          />
          <span className="absolute left-3.5 top-2.5 text-slate-500">🔍</span>
        </div>

        {/* ── Dropdown Suggestions ── */}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[110] animate-in slide-in-from-top-2 fade-in duration-200">
            
            <div className="flex items-center justify-between px-3 pt-2 pb-1 mb-1 border-b border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter By Category</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setIsFocused(false);
                  onOpenFiltersDrawer();
                }}
                className="text-[10px] font-bold text-green-400 hover:text-green-300 uppercase tracking-widest flex items-center gap-1"
              >
                Advanced ⚙️
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-none py-1">
              {CATEGORY_MAP.map(cat => (
                <button
                  key={cat.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus on input
                    onCategoryChange(cat.id);
                    setIsFocused(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                      : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                  {selectedCategory === cat.id && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};






