
export const onIdle = (cb: () => void) => {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 1);
    }
  }
};

export const prefetchRoute = (url: string) => {
  onIdle(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};
