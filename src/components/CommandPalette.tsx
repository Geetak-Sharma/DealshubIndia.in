import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Deal {
  id: string;
  title: string;
  url: string;
  image?: string;
  price?: string;
  platform?: string;
  category?: string;
}

interface SearchResult {
  type: 'deal' | 'blog' | 'page';
  id: string;
  title: string;
  url: string;
  image?: string;
  price?: string;
  platform?: string;
  category?: string;
}

// Static quick-links shown when no query is typed
const QUICK_LINKS: SearchResult[] = [
  { type: 'page', id: 'home',        title: 'Home — All Deals',         url: '/',                category: 'navigate' },
  { type: 'page', id: 'live',        title: 'Live Deal Feed',            url: '/livedeals',        category: 'navigate' },
  { type: 'page', id: 'blog',        title: 'Blog & Money Tips',         url: '/blog',             category: 'navigate' },
  { type: 'page', id: 'tg',          title: 'Join Telegram Channel',     url: 'https://t.me/DealsHubIndiaa', category: 'community' },
  { type: 'page', id: 'wa',          title: 'Join WhatsApp Channel',     url: 'https://whatsapp.com/channel/0029Va8sOrp4SpkEQKVElV1i', category: 'community' },
];

// ─── Fuzzy Match (lightweight — no dep needed) ───────────────────────────────
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 2; // substring match beats character match
  let qi = 0, score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score++; qi++; }
  }
  return qi === q.length ? score : 0;
}

// ─── Price extractor (mirrors TelegramFeed logic) ────────────────────────────
function extractPrice(deal: Deal): string | null {
  if (!deal.price || deal.price === 'Check Price') return null;
  if (deal.price.includes('₹')) return deal.price;
  return `₹${deal.price}`;
}

// ─── Platform colours ─────────────────────────────────────────────────────────
function platformColor(url = '') {
  const u = url.toLowerCase();
  if (u.includes('amazon') || u.includes('amzn') || u.includes('amazn')) return '#FF9900';
  if (u.includes('flipkart') || u.includes('fkrt'))                       return '#2874F0';
  if (u.includes('myntra'))                                                return '#FF3F6C';
  if (u.includes('ajio'))                                                  return '#2C4152';
  return '#22C55E';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CommandPalette() {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [activeIdx, setActiveIdx]     = useState(0);

  const inputRef       = useRef<HTMLInputElement>(null);
  const listRef        = useRef<HTMLDivElement>(null);
  const debounceTimer  = useRef<ReturnType<typeof setTimeout>>();

  // ── Open / close helpers ──────────────────────────────────────────────────
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults([]);
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    window.dispatchEvent(new CustomEvent('close-command-palette'));
  }, []);

  // ── Global keyboard shortcut: Cmd+K / Ctrl+K ─────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? closePalette() : openPalette();
      }
      if (e.key === 'Escape' && open) closePalette();
    };
    window.addEventListener('keydown', onKey);

    // Also wire up the search icon in the header (dispatches 'open-command-palette')
    const onOpenEvent = () => openPalette();
    window.addEventListener('open-command-palette', onOpenEvent);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpenEvent);
    };
  }, [open, openPalette, closePalette]);

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }

    setLoading(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/tg-search?q=${encodeURIComponent(query)}&limit=24`);
        const data = await res.json();
        const deals: Deal[] = data.deals || [];

        // Fuzzy-rank results
        const scored = deals
          .map(d => ({ deal: d, score: fuzzyScore(query, d.title || '') }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map<SearchResult>(({ deal }) => ({
            type:     'deal',
            id:        deal.id,
            title:     deal.title?.replace(/[⏫⏬🔗⚡✅💥🔥👉📌➡️🪄✨🪙]/g, '').trim() || 'Deal',
            url:       deal.url,
            image:     deal.image,
            price:     extractPrice(deal) || undefined,
            platform:  deal.platform,
            category:  deal.category,
          }));

        setResults(scored);
        setActiveIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // ── Keyboard navigation inside the list ──────────────────────────────────
  const displayItems = query.trim() ? results : QUICK_LINKS;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, displayItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = displayItems[activeIdx];
      if (item) navigateTo(item.url);
    }
  };

  // Keep active item scrolled into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // ── Navigation (uses View Transitions if available) ───────────────────────
  const navigateTo = (url: string) => {
    closePalette();
    // External links open in new tab
    if (url.startsWith('http') && !url.includes(window.location.hostname)) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    // Use Astro's programmatic navigation for View Transition support
    try {
      // @ts-ignore — astro:transitions/client is available at runtime
      import('astro:transitions/client').then(({ navigate }) => navigate(url));
    } catch {
      window.location.href = url;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  // When closed, render nothing — the header nav__search bar is the trigger.
  // Keyboard shortcut (Ctrl+K) and open-command-palette event both work via useEffect above.
  if (!open) return null;

  const isEmpty = displayItems.length === 0;

  return (
    <>
      {/* ── Backdrop ── */}
      <div className="cp-backdrop" onClick={closePalette} aria-hidden="true" />

      {/* ── Modal ── */}
      <div
        className="cp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search input row */}
        <div className="cp-input-row">
          <span className="cp-search-icon">
            {loading
              ? <svg className="cp-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            }
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cp-input"
            placeholder="Search deals, categories, blogs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="cp-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear">
              ✕
            </button>
          )}
          <kbd className="cp-esc" onClick={closePalette}>ESC</kbd>
        </div>

        {/* Section label */}
        <div className="cp-section-label">
          {query.trim() ? (results.length > 0 ? `${results.length} results` : loading ? 'Searching…' : 'No results') : 'Quick Links'}
        </div>

        {/* Results list */}
        <div className="cp-results" ref={listRef} role="listbox">
          {isEmpty && !loading && (
            <div className="cp-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <p>No deals found for <strong>"{query}"</strong></p>
              <a href={`/telegramlivedeals?q=${encodeURIComponent(query)}`} onClick={e => { e.preventDefault(); navigateTo(`/telegramlivedeals?q=${encodeURIComponent(query)}`); }} className="cp-empty-link">
                Browse live feed →
              </a>
            </div>
          )}

          {displayItems.map((item, idx) => (
            <button
              key={item.id}
              data-idx={idx}
              className={`cp-result-item ${idx === activeIdx ? 'is-active' : ''} cp-result-item--${item.type}`}
              role="option"
              aria-selected={idx === activeIdx}
              onClick={() => navigateTo(item.url)}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              {/* Thumbnail / Icon */}
              <div className="cp-thumb-wrap">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="cp-thumb"
                    style={{ viewTransitionName: `deal-img-${item.id?.slice(0, 40)}` } as React.CSSProperties}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="cp-thumb-icon">
                    {item.type === 'page' && item.category === 'community'
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    }
                  </div>
                )}
                {/* Platform dot */}
                {item.type === 'deal' && (
                  <span className="cp-platform-dot" style={{ background: platformColor(item.url) }} />
                )}
              </div>

              {/* Text */}
              <div className="cp-result-body">
                <span className="cp-result-title">
                  {highlightMatch(item.title, query)}
                </span>
                <span className="cp-result-meta">
                  {item.type === 'deal' && <span className="cp-tag cp-tag--deal">🔥 Deal</span>}
                  {item.type === 'blog' && <span className="cp-tag cp-tag--blog">📝 Blog</span>}
                  {item.type === 'page' && item.category === 'navigate' && <span className="cp-tag cp-tag--page">↗ Page</span>}
                  {item.type === 'page' && item.category === 'community' && <span className="cp-tag cp-tag--community">💬 Community</span>}
                  {item.category && item.type === 'deal' && <span className="cp-result-cat">{item.category}</span>}
                </span>
              </div>

              {/* Price badge */}
              {item.price && (
                <span className="cp-price-badge">{item.price}</span>
              )}

              {/* Arrow */}
              <svg className="cp-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>ESC</kbd> close</span>
          <span style={{ marginLeft: 'auto', opacity: 0.4 }}>DealsHub ⌘K</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Backdrop ──────────────────────────────────────────────── */
        .cp-backdrop {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: cpFadeIn 0.15s ease both;
        }

        /* ── Modal ────────────────────────────────────────────────── */
        .cp-modal {
          position: fixed;
          top: 12vh;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: min(680px, calc(100vw - 32px));
          background: rgba(12, 15, 22, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(34, 197, 94, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(40px) saturate(2);
          -webkit-backdrop-filter: blur(40px) saturate(2);
          overflow: hidden;
          display: flex; flex-direction: column;
          max-height: 70vh;
          animation: cpSlideIn 0.18s cubic-bezier(0, 0, 0.2, 1) both;
        }

        @keyframes cpFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cpSlideIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.97); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }

        /* ── Input row ───────────────────────────────────────────── */
        .cp-input-row {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
        }
        .cp-search-icon { color: rgba(255,255,255,0.35); display: flex; flex-shrink: 0; }
        .cp-spinner { animation: cpSpin 0.8s linear infinite; color: #22C55E; }
        @keyframes cpSpin { to { transform: rotate(360deg); } }

        .cp-input {
          flex: 1; min-width: 0;
          background: transparent; border: none; outline: none;
          color: #fff; font-size: 16px; font-weight: 500;
          caret-color: #22C55E;
        }
        .cp-input::placeholder { color: rgba(255,255,255,0.25); }

        .cp-clear {
          background: none; border: none;
          color: rgba(255,255,255,0.3); font-size: 14px;
          cursor: pointer; padding: 4px 6px; border-radius: 6px;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .cp-clear:hover { color: white; background: rgba(255,255,255,0.08); }

        .cp-esc {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; padding: 3px 8px;
          font-size: 10px; font-weight: 700;
          color: rgba(255,255,255,0.35);
          cursor: pointer; flex-shrink: 0;
          letter-spacing: 0.5px;
          font-family: inherit;
        }
        .cp-esc:hover { color: white; background: rgba(255,255,255,0.08); }

        /* ── Section label ──────────────────────────────────────── */
        .cp-section-label {
          padding: 8px 20px 4px;
          font-size: 10px; font-weight: 800;
          color: rgba(255,255,255,0.25);
          letter-spacing: 1px; text-transform: uppercase;
          flex-shrink: 0;
        }

        /* ── Results list ───────────────────────────────────────── */
        .cp-results {
          flex: 1; overflow-y: auto;
          padding: 4px 8px 8px;
          scroll-padding: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .cp-results::-webkit-scrollbar       { width: 4px; }
        .cp-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        /* ── Result item ─────────────────────────────────────────── */
        .cp-result-item {
          display: flex; align-items: center; gap: 14px;
          width: 100%; padding: 10px 12px;
          border-radius: 12px; border: none;
          background: transparent;
          cursor: pointer; text-align: left;
          transition: background 0.12s ease;
          color: inherit;
          position: relative;
        }
        .cp-result-item + .cp-result-item { margin-top: 2px; }
        .cp-result-item.is-active,
        .cp-result-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .cp-result-item--deal.is-active {
          background: rgba(34, 197, 94, 0.08);
          box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.15);
        }

        /* Thumbnail */
        .cp-thumb-wrap {
          width: 48px; height: 48px;
          border-radius: 10px; overflow: hidden;
          background: rgba(255,255,255,0.05);
          flex-shrink: 0; position: relative;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .cp-thumb {
          width: 100%; height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }
        .cp-result-item.is-active .cp-thumb { transform: scale(1.05); }
        .cp-thumb-icon {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.3);
        }
        .cp-platform-dot {
          position: absolute; bottom: 3px; right: 3px;
          width: 8px; height: 8px;
          border-radius: 50%;
          border: 1.5px solid rgba(12,15,22,0.9);
        }

        /* Body */
        .cp-result-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .cp-result-title {
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);
          overflow: hidden; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          line-height: 1.35;
        }
        .cp-result-title mark {
          background: rgba(34,197,94,0.25); color: #22C55E;
          border-radius: 2px; padding: 0 1px;
        }
        .cp-result-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cp-tag {
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.5px; padding: 2px 6px; border-radius: 4px;
        }
        .cp-tag--deal      { color: #22C55E; background: rgba(34,197,94,0.1); }
        .cp-tag--blog      { color: #a78bfa; background: rgba(167,139,250,0.1); }
        .cp-tag--page      { color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.06); }
        .cp-tag--community { color: #38bdf8; background: rgba(56,189,248,0.1); }
        .cp-result-cat {
          font-size: 9px; color: rgba(255,255,255,0.25);
          text-transform: capitalize; font-weight: 600;
        }

        /* Price */
        .cp-price-badge {
          font-size: 13px; font-weight: 900;
          color: black; background: #22C55E;
          padding: 4px 10px; border-radius: 8px;
          flex-shrink: 0; letter-spacing: -0.3px;
        }

        /* Arrow */
        .cp-arrow { color: rgba(255,255,255,0.15); flex-shrink: 0; transition: transform 0.15s; }
        .cp-result-item.is-active .cp-arrow,
        .cp-result-item:hover     .cp-arrow { color: rgba(255,255,255,0.7); transform: translateX(3px); }

        /* Empty state */
        .cp-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 40px 20px; text-align: center;
        }
        .cp-empty p { color: rgba(255,255,255,0.4); font-size: 14px; margin: 0; }
        .cp-empty strong { color: rgba(255,255,255,0.7); }
        .cp-empty-link {
          color: #22C55E; font-size: 13px; font-weight: 700;
          text-decoration: none; padding: 8px 18px;
          border: 1px solid rgba(34,197,94,0.3); border-radius: 8px;
          transition: all 0.2s;
        }
        .cp-empty-link:hover { background: rgba(34,197,94,0.1); box-shadow: 0 0 14px rgba(34,197,94,0.2); }

        /* ── Footer ─────────────────────────────────────────────── */
        .cp-footer {
          display: flex; align-items: center; gap: 16px;
          padding: 10px 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .cp-footer span { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.25); }
        .cp-footer kbd {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 2px 6px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 5px;
          font-size: 10px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          font-family: inherit; letter-spacing: 0.3px;
        }

        /* ── Responsive ─────────────────────────────────────────── */
        @media (max-width: 640px) {
          .cp-modal { top: 0; border-radius: 0 0 20px 20px; max-height: 85vh; }
          .cp-footer { display: none; }
          .cp-esc { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cp-backdrop, .cp-modal { animation: none !important; }
        }
      `}} />
    </>
  );
}

// ─── Highlight matched characters ─────────────────────────────────────────────
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts  = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  } catch {
    return text;
  }
}
