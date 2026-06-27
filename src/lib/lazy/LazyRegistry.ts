export interface LazyFeatureConfig {
  name: string;
  loader: () => Promise<any>;
  adapter: 'react' | 'svelte' | 'vanilla';
  prefetch?: 'hover' | 'focus' | 'idle' | 'manual' | false;
  retry?: boolean;
  measure?: boolean;
  restoreFocus?: boolean;
}

class Registry {
  private features = new Map<string, LazyFeatureConfig>();

  public register(config: LazyFeatureConfig) {
    if (this.features.has(config.name)) {
      console.warn(`[LazyRegistry] Feature ${config.name} is already registered.`);
    }
    this.features.set(config.name, config);
  }

  public get(name: string): LazyFeatureConfig | undefined {
    return this.features.get(name);
  }

  public list(): string[] {
    return Array.from(this.features.keys());
  }
}

export const LazyRegistry = new Registry();
