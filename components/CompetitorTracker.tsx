'use client';
import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { getById } from '@/lib/repoRegistry';

export default function CompetitorTracker() {
  const { activeCompetitors, chaosLevel } = useChaosStore();

  if (activeCompetitors.length === 0) return null;

  return (
    <div className="pixel-panel" style={{ padding: 12, fontSize: 10, fontFamily: 'var(--font-pixel)' }}>
      <h4 style={{ color: 'var(--neon-red)', marginBottom: 8, fontSize: 10 }}>COMPETITORS</h4>
      {activeCompetitors.map((cid) => {
        const entity = getById(cid);
        const threat = Math.min(100, 20 + chaosLevel * 2 + Math.random() * 15);
        return (
          <div key={cid} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
              <span>{entity ? `${entity.icon} ${entity.name}` : cid}</span>
              <span style={{ color: threat > 70 ? 'var(--neon-red)' : 'var(--neon-yellow)' }}>{Math.round(threat)}%</span>
            </div>
            <div style={{ width: '100%', height: 4, background: '#222', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
              <div style={{
                width: `${threat}%`, height: '100%',
                background: threat > 70 ? 'var(--neon-red)' : threat > 40 ? 'var(--neon-yellow)' : 'var(--neon-green)',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
