'use client';
import { useEffect, useState } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { formatMoney } from '@/lib/utils';

export function SponsorCounter() {
  const sponsorMoney = useChaosStore((s) => s.sponsorMoney);
  const chaosLevel = useChaosStore((s) => s.chaosLevel);
  const totalScore = useChaosStore((s) => s.totalScore);
  const streak = useChaosStore((s) => s.streak);
  const partnerships = useChaosStore((s) => s.partnerships);
  const strikes = useChaosStore((s) => s.strikes);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (sponsorMoney === 0) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 300);
    return () => clearTimeout(t);
  }, [sponsorMoney]);

  return (
    <div className="sponsor-counter pixel-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '10px', opacity: 0.5 }} className="pixel-text">
        MAYBE SPONSORED™
      </div>
      <div
        className={`text-glow-yellow pixel-text ${pop ? 'number-pop' : ''}`}
        style={{ fontSize: '28px', margin: '4px 0' }}
      >
        {formatMoney(sponsorMoney)}
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px' }} className="pixel-text text-glow-cyan">
        <span>Chaos Lvl: {chaosLevel}</span>
        <span>Score: {totalScore}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px', color: 'var(--neon-green)' }} className="pixel-text">
        <span>Streak: {streak} 🔥</span>
        <span>Partners: {partnerships} 🤝</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px', color: 'var(--neon-red)' }} className="pixel-text">
        <span>Strikes: {'X'.repeat(strikes)}{'-'.repeat(3 - strikes)}</span>
      </div>
    </div>
  );
}
