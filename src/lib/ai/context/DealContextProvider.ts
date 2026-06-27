import { IContextProvider } from './IContextProvider';
import { EntityRegistry } from '../../entities/EntityRegistry';
import { DealEntity } from '../../entities/types';

export class DealContextProvider implements IContextProvider<DealEntity> {
  name = 'DealContext';

  async buildContext(entityId: string): Promise<Record<string, any>> {
    const deal = await EntityRegistry.find(entityId) as DealEntity | undefined;
    if (!deal) throw new Error(`Deal ${entityId} not found`);

    const merchant = await EntityRegistry.find(deal.merchantId);
    const category = await EntityRegistry.find(deal.categoryId);

    return {
      deal,
      merchant,
      category,
      _meta: { timestamp: Date.now() }
    };
  }
}

// Global registry for Context Providers
export const ContextProviderRegistry = new Map<string, IContextProvider>();
ContextProviderRegistry.set('deal', new DealContextProvider());
