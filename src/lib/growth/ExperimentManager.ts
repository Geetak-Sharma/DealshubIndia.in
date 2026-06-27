import crypto from 'crypto';

export interface Variant {
  id: string;
  weight: number; // 0 to 100
  payload?: any;
}

export interface Experiment {
  id: string;
  isActive: boolean;
  variants: Variant[];
}

export class ExperimentManagerImpl {
  private experiments: Map<string, Experiment> = new Map([
    ['checkout-v2', {
      id: 'checkout-v2',
      isActive: true,
      variants: [
        { id: 'control', weight: 50 },
        { id: 'treatment', weight: 50 }
      ]
    }]
  ]);

  // Deterministic sticky assignment
  private assignVariant(userId: string, experiment: Experiment): Variant {
    const hash = crypto.createHash('sha256').update(`${userId}:${experiment.id}`).digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) return variant;
    }
    
    return experiment.variants[0]; // Fallback to control
  }

  getVariant(experimentId: string, userId: string): Variant | undefined {
    const exp = this.experiments.get(experimentId);
    if (!exp || !exp.isActive) return undefined;

    return this.assignVariant(userId, exp);
  }
}

export const ExperimentManager = new ExperimentManagerImpl();
