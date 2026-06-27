import { IFeatureProvider } from './providers/MemoryFeatureProvider';
import { MemoryFeatureProvider } from './providers/MemoryFeatureProvider';
import crypto from 'crypto';

export class FeatureFlagManagerImpl {
  private provider: IFeatureProvider;
  private currentEnvironment: string = 'production';

  constructor() {
    this.provider = new MemoryFeatureProvider();
  }

  setProvider(provider: IFeatureProvider) { this.provider = provider; }
  setEnvironment(env: string) { this.currentEnvironment = env; }

  // Deterministic hashing for sticky percentage rollouts
  private getDeterministicHash(userId: string, flagId: string): number {
    const hash = crypto.createHash('sha256').update(`${userId}:${flagId}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 100;
  }

  async isEnabled(flagId: string, userId?: string): Promise<boolean> {
    const flag = await this.provider.getFlag(flagId);
    if (!flag) return false;
    
    if (!flag.enabled) return false;

    if (flag.environments && !flag.environments.includes(this.currentEnvironment)) {
      return false;
    }

    if (flag.percentageRollout !== undefined && flag.percentageRollout < 100) {
      if (!userId) return false; // Anonymous users fail percentage rollouts by default
      const bucket = this.getDeterministicHash(userId, flagId);
      if (bucket >= flag.percentageRollout) return false;
    }

    return true;
  }
}

export const FeatureFlagManager = new FeatureFlagManagerImpl();
