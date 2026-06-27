import { createRoot, Root } from 'react-dom/client';
import React from 'react';

const rootCache = new Map<string, Root>();

export class ReactAdapter {
  public static mount(
    element: HTMLElement,
    component: any,
    props: Record<string, any> = {}
  ) {
    let root = rootCache.get(element.id);
    if (!root) {
      root = createRoot(element);
      rootCache.set(element.id, root);
    }
    root.render(React.createElement(component, props));
  }

  public static unmount(element: HTMLElement) {
    const root = rootCache.get(element.id);
    if (root) {
      root.unmount();
      rootCache.delete(element.id);
    }
  }
}
