
import React from 'react';
import type { NormalizedQCDeal } from '../../lib/qc/types';
import { QCDealCard } from './QCDealCard';

export interface DealsGridProps {
  deals: NormalizedQCDeal[];
  loading: boolean;
  onCardAction: (deal: NormalizedQCDeal) => void;
  onShareAction: (deal: NormalizedQCDeal) => void;
}

export const DealsGrid: React.FC<DealsGridProps> = ({
  deals,
  loading,
  onCardAction,
  onShareAction
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {deals.map(deal => (
        <QCDealCard
          key={deal.id}
          deal={deal}
          variant={deal.variant}
          onPrimaryAction={() => onCardAction(deal)}
          onShare={() => onShareAction(deal)}
        />
      ))}
    </div>
  );
};
