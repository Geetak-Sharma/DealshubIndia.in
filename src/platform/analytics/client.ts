
// Centralized Analytics Plugin
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const el = target.closest('[data-analytics-click]');
    if (el) {
      const eventName = el.getAttribute('data-analytics-click');
      const payloadStr = el.getAttribute('data-analytics-payload');
      
      try {
        const payload = payloadStr ? JSON.parse(payloadStr) : {};
        // Simulate sending to DataLayer
        console.log('[Global Analytics Click]', eventName, payload);
      } catch (err) {
        console.error('[Analytics Error] Invalid payload', err);
      }
    }
  });

  // Intersection Observer for impressions
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const eventName = el.getAttribute('data-analytics-view');
        const payloadStr = el.getAttribute('data-analytics-payload');
        try {
          const payload = payloadStr ? JSON.parse(payloadStr) : {};
          console.log('[Global Analytics View]', eventName, payload);
          observer.unobserve(el);
        } catch(e) {}
      }
    });
  }, { threshold: 0.5 });

  // Initialize on components
  const initObserver = () => {
    document.querySelectorAll('[data-analytics-view]').forEach(el => observer.observe(el));
  };
  
  // Run on mount
  initObserver();
  // Support for Astro view transitions if added later
  document.addEventListener('astro:page-load', initObserver);
}
