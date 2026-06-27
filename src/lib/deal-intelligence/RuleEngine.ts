import { DealEntity } from '../entities/types';

export interface BusinessRule {
  id: string;
  evaluate(deal: DealEntity, context: any): { passed: boolean; warning?: string };
}

export class RuleEngine {
  private static rules: BusinessRule[] = [
    {
      id: 'minimum-discount',
      evaluate: (deal, ctx) => {
        const passed = ctx.discountPercentage >= 5;
        return { passed, warning: passed ? undefined : 'Discount is below 5%' };
      }
    },
    {
      id: 'maximum-suspicious-discount',
      evaluate: (deal, ctx) => {
        const passed = ctx.discountPercentage <= 90;
        return { passed, warning: passed ? undefined : 'Discount exceeds 90% threshold' };
      }
    }
  ];

  static execute(deal: DealEntity, context: any): string[] {
    const warnings: string[] = [];
    for (const rule of this.rules) {
      const result = rule.evaluate(deal, context);
      if (!result.passed && result.warning) {
        warnings.push(result.warning);
      }
    }
    return warnings;
  }
}
