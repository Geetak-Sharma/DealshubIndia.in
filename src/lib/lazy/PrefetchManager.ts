export class PrefetchManager {
  public static initHoverPrefetch(elementId: string, loader: () => Promise<any>) {
    if (typeof document === 'undefined') return;
    
    const el = document.getElementById(elementId);
    if (!el) return;

    const onHover = () => {
      loader().catch(() => {});
      el.removeEventListener('mouseenter', onHover);
    };

    el.addEventListener('mouseenter', onHover);
  }

  public static initFocusPrefetch(elementId: string, loader: () => Promise<any>) {
    if (typeof document === 'undefined') return;

    const el = document.getElementById(elementId);
    if (!el) return;

    const onFocus = () => {
      loader().catch(() => {});
      el.removeEventListener('focusin', onFocus);
    };

    el.addEventListener('focusin', onFocus);
  }

  public static initIdlePrefetch(loader: () => Promise<any>) {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => loader().catch(() => {}));
    } else if (typeof window !== 'undefined') {
      setTimeout(() => loader().catch(() => {}), 1000);
    }
  }
}
