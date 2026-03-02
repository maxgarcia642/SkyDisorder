'use client';
import { useChaosStore } from '@/lib/chaosStore';

export function Scoreboard() {
  const repos = useChaosStore((s) => s.repos);
  const currentHole = useChaosStore((s) => s.currentHole);

  const playedCount = repos.filter((r) => r.played).length;
  const totalScore = repos.reduce((sum, r) => sum + (r.played ? r.score : 0), 0);
  const totalPar = repos.reduce((sum, r) => sum + r.par, 0);
  const diff = totalScore - totalPar;
  const diffColor = diff < 0 ? 'var(--neon-green)' : diff > 0 ? 'var(--neon-red)' : 'var(--neon-yellow)';
  const diffLabel = diff < 0 ? `${diff} (Under Par!)` : diff > 0 ? `+${diff} (Over Par)` : 'Even Par';

  return (
    <div className="pixel-panel">
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '4px',
          paddingBottom: '6px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--neon-cyan) var(--fairway-dark)',
        }}
      >
        {repos.map((r) => {
          const isCurrent = r.holeNumber === currentHole;
          const holeDiff = r.played ? r.score - r.par : 0;
          const scoreColor = !r.played ? '#888' : holeDiff < 0 ? 'var(--neon-green)' : holeDiff > 0 ? 'var(--neon-red)' : 'var(--neon-yellow)';

          return (
            <div
              key={r.id}
              style={{
                minWidth: '40px',
                height: '44px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: r.played ? '#065f46' : isCurrent ? 'rgba(79,195,247,0.1)' : 'rgba(255,255,255,0.05)',
                border: isCurrent ? '2px solid #22d3ee' : '2px solid transparent',
                borderRadius: '4px',
                fontSize: '10px',
                flexShrink: 0,
                gap: '1px',
              }}
              className="pixel-text"
            >
              <div style={{ opacity: 0.6, fontSize: '8px' }}>{r.holeNumber}</div>
              {r.played && <div style={{ fontWeight: 'bold', color: scoreColor }}>{r.score}</div>}
              {r.played && <div style={{ fontSize: '6px', color: scoreColor }}>P{r.par}</div>}
            </div>
          );
        })}
      </div>
      <div className="pixel-text" style={{ fontSize: '11px', marginTop: '6px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <span>{playedCount}/{repos.length} holes</span>
        <span>Score: {totalScore}</span>
        <span style={{ color: diffColor }}>{diffLabel}</span>
      </div>
    </div>
  );
}
