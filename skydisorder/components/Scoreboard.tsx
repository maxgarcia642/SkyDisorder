'use client';
import { useChaosStore } from '@/lib/chaosStore';

export function Scoreboard() {
  const repos = useChaosStore((s) => s.repos);
  const currentHole = useChaosStore((s) => s.currentHole);

  const totalScore = repos.reduce((sum, r) => sum + (r.played ? r.score : 0), 0);
  const totalPar = repos.reduce((sum, r) => sum + r.par, 0);

  return (
    <div className="pixel-panel">
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '4px',
          paddingBottom: '6px',
        }}
      >
        {repos.map((r) => {
          const isCurrent = r.holeNumber === currentHole;
          const bg = r.played ? '#065f46' : 'rgba(255,255,255,0.05)';
          const border = isCurrent ? '2px solid #22d3ee' : '2px solid transparent';

          return (
            <div
              key={r.id}
              style={{
                minWidth: '36px',
                height: '36px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                border,
                borderRadius: '4px',
                fontSize: '10px',
                flexShrink: 0,
              }}
              className="pixel-text"
            >
              <div style={{ opacity: 0.6 }}>{r.holeNumber}</div>
              {r.played && <div style={{ fontWeight: 'bold' }}>{r.score}</div>}
            </div>
          );
        })}
      </div>
      <div className="pixel-text" style={{ fontSize: '11px', marginTop: '4px', textAlign: 'center' }}>
        Total: {totalScore} / Par: {totalPar}
      </div>
    </div>
  );
}
