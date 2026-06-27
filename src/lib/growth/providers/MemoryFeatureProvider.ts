export interface FeatureFlag {
  id: string;
  enabled: boolean;
  percentageRollout?: number; // 0 to 100
  environments?: string[]; // 'production', 'staging'
}

export interface IFeatureProvider {
  getFlag(id: string): Promise<FeatureFlag | undefined>;
  getAllFlags(): Promise<FeatureFlag[]>;
}

export class MemoryFeatureProvider implements IFeatureProvider {
  private flags: Map<string, FeatureFlag> = new Map([
    ['new-ui-v2', { id: 'new-ui-v2', enabled: true, percentageRollout: 20 }],
    ['ai-summaries', { id: 'ai-summaries', enabled: true, environments: ['staging'] }]
  ]);

  async getFlag(id: string) { return this.flags.get(id); }
  async getAllFlags() { return Array.from(this.flags.values()); }
}
