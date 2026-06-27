import React from 'react';

interface LootMeterProps {
  dealId: string;
  timestamp?: number;
}

export function getLootMeterData(dealId: string, timestamp?: number) {
  const ageMs  = Date.now() - (timestamp || 0);
  const ageHrs = ageMs / 3_600_000;
  // heat 100 = brand new, 0 = 24h+ old
  const heat   = Math.max(0, Math.min(100, Math.round(100 - (ageHrs / 24) * 100)));



  // Gradient: green → amber → red
  let barColor: string;
  if (heat < 40)      barColor = 'linear-gradient(90deg, #22C55E, #4ADE80)';
  else if (heat < 70) barColor = `linear-gradient(90deg, #22C55E, #F59E0B ${heat}%)`;
  else                barColor = `linear-gradient(90deg, #F59E0B, #EF4444 ${heat}%)`;

  const label = heat >= 70 ? '🔥 HOT' : heat >= 40 ? '⚡ WARM' : '✅ LIVE';
  return { heat, barColor, label };
}

export default function LootMeter({ dealId, timestamp }: LootMeterProps) {
  const { heat, barColor, label } = getLootMeterData(dealId, timestamp);

  return (
    <div className="loot-meter">
      <div className="loot-meter-header">
        <span className="loot-heat-label">{label}</span>
        
      </div>
      <div className="loot-bar-track">
        <div
          className="loot-bar-fill"
          style={{ width: `${Math.max(8, heat)}%`, background: barColor }}
        />
        <div className="loot-bar-shimmer" />
      </div>
    </div>
  );
}
