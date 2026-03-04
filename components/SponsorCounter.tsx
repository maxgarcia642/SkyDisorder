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
  const maxStrikes = useChaosStore((s) => s.maxStrikes);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (sponsorMoney === 0) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 300);
    return () => clearTimeout(t);
  }, [sponsorMoney]);

  const chaosColor = chaosLevel < 5 ? 'var(--neon-green)' : chaosLevel < 15 ? 'var(--neon-yellow)' : chaosLevel < 30 ? 'var(--neon-red)' : 'var(--neon-pink)';
  const streakGlow = streak >= 3 ? 'var(--gold)' : 'var(--neon-green)';

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
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px' }} className="pixel-text">
        <span style={{ color: chaosColor }}>Chaos Lvl: {chaosLevel}</span>
        <span className="text-glow-cyan">Score: {totalScore}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px' }} className="pixel-text">
        <span style={{ color: streakGlow, textShadow: streak >= 3 ? '0 0 8px var(--gold)' : 'none' }}>
          Streak: {streak} {streak >= 3 ? '🔥🔥' : '🔥'}
        </span>
        <span style={{ color: 'var(--neon-green)' }}>Partners: {partnerships} 🤝</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px' }} className="pixel-text">
        <span style={{ color: strikes >= maxStrikes - 1 ? 'var(--neon-red)' : 'var(--danger)' }}>
          Strikes: {'X'.repeat(Math.min(strikes, maxStrikes))}{'-'.repeat(Math.max(0, maxStrikes - strikes))}
        </span>
      </div>
    </div>
  );
}
