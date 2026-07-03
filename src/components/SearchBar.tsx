import React, { useState, useEffect, useRef } from 'react';
import { navigate } from 'astro:transitions/client';

interface SearchResult {
  type: 'blog' | 'deal';
  title: string;
  url: string;
  price?: string;
  category?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isHomePage, setIsHomePage] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [blogIndex, setBlogIndex] = useState<SearchResult[]>([]);
  const [dealsIndex, setDealsIndex] = useState<SearchResult[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Check page context
    const checkIsSearchablePage = () => {
      const path = window.location.pathname;
      setIsHomePage(path === '/' || path === '/livedeals');
    };
    checkIsSearchablePage();

    // 2. Fetch Blog Index
    fetch('/api/search.json')
      .then(r => r.json())
      .then(data => setBlogIndex(data.blogs || []))
      .catch(() => {});

    // 3. Fetch Initial Deals
    fetch('/api/deals?limit=100')
      .then(r => r.json())
      .then(data => {
        const mapped = (data.deals || []).map((d: any) => ({
          type: 'deal',
          title: d.title,
          url: d.url,
          price: d.price
        }));
        setDealsIndex(mapped);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      setIsExpanded(true);
    }

    const handler = (e: any) => {
      if (e.detail && typeof e.detail.query === 'string' && e.detail.query !== query) {
        setQuery(e.detail.query);
        setIsExpanded(!!e.detail.query);
      }
    };
    window.addEventListener('deals-search' as any, handler);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (!query.trim()) setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('astro:after-navigation', handleUp);
      window.removeEventListener('deals-search' as any, handler);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [query]);

  // Live filter logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      if (isHomePage) {
        window.dispatchEvent(new CustomEvent('deals-search', { detail: { query: '' } }));
      }
      return;
    }

    const q = query.toLowerCase();
    const matchedBlogs = blogIndex.filter(b => b.title.toLowerCase().includes(q)).slice(0, 3);
    const matchedDeals = dealsIndex.filter(d => d.title.toLowerCase().includes(q)).slice(0, 5);
    
    setResults([...matchedBlogs, ...matchedDeals]);
    setIsOpen(true);

    if (isHomePage) {
      const handler = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('deals-search', { detail: { query: query.trim() } }));
      }, 200);
      return () => clearTimeout(handler);
    }
  }, [query, isHomePage, blogIndex, dealsIndex]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsOpen(false);
    
    // Always update URL for persistent search state
    const targetUrl = `/?q=${encodeURIComponent(trimmed)}`;
    
    if (window.location.pathname !== '/') {
      window.location.href = targetUrl;
    } else {
      // Just update query param without reload if already home
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('q', trimmed);
      window.history.pushState({}, '', newUrl);
      
      // Dispatch event for instantaneous grid filtering
      window.dispatchEvent(new CustomEvent('deals-search', { detail: { query: trimmed } }));
    }
  };

  const handleItemClick = (url: string) => {
    setIsOpen(false);
    window.location.href = url;
  };

  const handleIconClick = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className={`bs-search-outer ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} ref={containerRef}>
      <form className="bs-search" onSubmit={handleSubmit}>
        <div className="bs-input-group">
          <button type="button" className="bs-input-trigger" onClick={handleIconClick} aria-label="Open Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          
          <input
            ref={inputRef}
            type="text"
            id="deals-search" className="bs-form-control"
            placeholder="Search loots..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            autoComplete="off"
          />
          
          {isExpanded && query && (
            <button type="button" className="bs-clear" onClick={() => setQuery('')}>&times;</button>
          )}
          
          {isExpanded && (
            <button type="submit" className="bs-btn-primary">GO</button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {isExpanded && isOpen && results.length > 0 && (
        <div className="search-dropdown">
          <div className="search-dropdown__scrollable">
            {results.map((res, idx) => (
              <a 
                key={idx} 
                href={res.url} 
                className="search-item" 
                onClick={(e) => { e.preventDefault(); handleItemClick(res.url); }}
              >
                <div className="search-item__content">
                  <h4 className="search-item__title">{res.title}</h4>
                  <div className="search-item__meta">
                    <span className={`search-item__type search-item__type--${res.type}`}>
                      {res.type === 'blog' ? '📝 Blog Post' : '🔥 Live Deal'}
                    </span>
                    {res.price && <span className="search-item__price">{res.price}</span>}
                  </div>
                </div>
                <svg className="search-item__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            ))}
          </div>
          <a 
            href={`/?q=${encodeURIComponent(query)}`} 
            className="search-dropdown__footer" 
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            <span>View all findings for "{query}"</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .bs-search-outer { 
          position: relative; 
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          width: 44px;
          flex-shrink: 0;
        }
        
        .bs-search-outer.is-expanded {
          width: 100%;
          max-width: 440px;
        }

        .bs-input-group {
          display: flex;
          background: rgba(25, 30, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          overflow: hidden;
          height: 44px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .is-expanded .bs-input-group {
          border-color: #39FF14;
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 20px rgba(57, 255, 20, 0.1);
        }

        .bs-input-trigger {
          background: transparent;
          border: none;
          color: var(--text-muted);
          width: 44px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .is-expanded .bs-input-trigger { color: #39FF14; }

        .bs-form-control {
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          width: 0;
          padding: 0;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .is-expanded .bs-form-control {
          width: 100%;
          opacity: 1;
          padding: 0 12px;
        }

        .bs-clear { background: transparent; border: none; color: #666; font-size: 20px; padding: 0 12px; cursor: pointer; }

        .bs-btn-primary { 
          background: #39FF14; 
          color: #000; 
          border: none; 
          padding: 0 16px; 
          font-size: 11px; 
          font-weight: 900; 
          cursor: pointer;
          text-transform: uppercase;
        }

        /* DROPDOWN STRUCTURE */
        .search-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          background: #0f1218;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.6);
          z-index: 3000;
          overflow: hidden;
          backdrop-filter: blur(24px) saturate(1.8);
        }

        .search-dropdown__scrollable {
          max-height: 420px;
          overflow-y: auto;
        }

        .search-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .search-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .search-item__content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .search-item__title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .search-item__meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-item__type {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
        }

        .search-item__type--blog { color: #39FF14; background: rgba(57, 255, 20, 0.05); }
        .search-item__type--deal { color: #87CEFA; background: rgba(135, 206, 250, 0.05); }

        .search-item__price {
          font-size: 13px;
          font-weight: 800;
          color: #39FF14;
        }

        .search-item__arrow {
          color: #444;
          transition: transform 0.2s;
        }

        .search-item:hover .search-item__arrow {
          color: #fff;
          transform: translateX(4px);
        }

        .search-dropdown__footer {
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .search-dropdown__footer:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 768px) {
          .bs-search-outer.is-expanded {
             position: absolute;
             top: 13px;
             left: 16px;
             right: 16px;
             width: auto;
             max-width: none;
             z-index: 3001;
             margin: 0;
          }
          .is-expanded .bs-input-group {
            background: rgba(10, 15, 25, 0.95);
            box-shadow: 0 0 0 100vmax rgba(0,0,0,0.4); /* Dim the rest of header slightly */
          }
          .search-dropdown {
            position: fixed;
            top: 70px;
            left: 16px;
            right: 16px;
            width: auto;
          }
        }
      `}} />
    </div>
  );
}
