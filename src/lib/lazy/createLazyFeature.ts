import { LazyRegistry } from './LazyRegistry';
import type { LazyFeatureConfig } from './LazyRegistry';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ErrorReporter } from './ErrorReporter';
import { RetryManager } from './RetryManager';
import { FocusManager } from './FocusManager';
import { PrefetchManager } from './PrefetchManager';

const moduleCache = new Map<string, any>();

export function createLazyFeature(config: LazyFeatureConfig) {
  LazyRegistry.register(config);

  return {
    config,
    /**
     * Initializes prefetching strategies based on config
     */
    initPrefetch: (triggerElementId?: string) => {
      if (config.prefetch === 'hover' && triggerElementId) {
        PrefetchManager.initHoverPrefetch(triggerElementId, config.loader);
      } else if (config.prefetch === 'focus' && triggerElementId) {
        PrefetchManager.initFocusPrefetch(triggerElementId, config.loader);
      } else if (config.prefetch === 'idle') {
        PrefetchManager.initIdlePrefetch(config.loader);
      }
    },

    /**
     * Loads the module and mounts it to the specified DOM element using the appropriate adapter.
     */
    mount: async (elementId: string, props: Record<string, any> = {}, componentExportName: string = 'default') => {
      const element = document.getElementById(elementId);
      if (!element) {
        ErrorReporter.capture(new Error(`Mount point #${elementId} not found for feature ${config.name}`));
        return;
      }

      if (element.hasAttribute('data-mounted')) return;
      element.setAttribute('data-mounted', 'true');

      if (config.restoreFocus) {
        FocusManager.saveFocus();
      }

      if (config.measure) {
        PerformanceMonitor.start(config.name);
      }

      try {
        let module;
        if (moduleCache.has(config.name)) {
          module = moduleCache.get(config.name);
        } else {
          module = await RetryManager.execute(config.loader, config.retry ? 1 : 0);
          moduleCache.set(config.name, module);
        }

        const Component = module[componentExportName];
        if (!Component) {
          throw new Error(`Component ${componentExportName} not found in loaded module for ${config.name}`);
        }

        // Delegate to specific adapter
        if (config.adapter === 'react') {
          const { ReactAdapter } = await import('./adapters/ReactAdapter');
          ReactAdapter.mount(element, Component, props);
        } else {
          throw new Error(`Adapter ${config.adapter} is not yet implemented.`);
        }

        if (config.measure) {
          PerformanceMonitor.end(config.name);
        }

      } catch (error) {
        ErrorReporter.capture(error, { feature: config.name });
        element.removeAttribute('data-mounted'); // allow retry
      }
    },

    /**
     * Unmounts the component and restores focus if configured
     */
    unmount: async (elementId: string) => {
      const element = document.getElementById(elementId);
      if (!element) return;

      if (config.adapter === 'react') {
        const { ReactAdapter } = await import('./adapters/ReactAdapter');
        ReactAdapter.unmount(element);
      }
      
      element.removeAttribute('data-mounted');

      if (config.restoreFocus) {
        FocusManager.restoreFocus();
      }
    }
  };
}

