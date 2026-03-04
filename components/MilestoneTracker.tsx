'use client';
import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { getByRole } from '@/lib/repoRegistry';

const MILESTONE_UNLOCK: Record<string, string> = {
  'mile-mvp': 'Play 3 holes',
  'mile-users': 'Earn $10,000',
  'mile-revenue': 'Complete 5 minigames',
  'mile-series-a': 'Hire 3 employees',
  'mile-ipo': 'Reach Series C funding',
};

export default function MilestoneTracker() {
  const { completedMilestones, hitMilestone, totalScore, employees, fundingRound, sponsorMoney } = useChaosStore();
  const milestones = getByRole('milestone').slice(0, 10);

  const canUnlock = (id: string): boolean => {
    if (completedMilestones.includes(id)) return false;
    if (id === 'mile-mvp') return totalScore >= 300;
    if (id === 'mile-users') return sponsorMoney >= 10000;
    if (id === 'mile-revenue') return totalScore >= 500;
    if (id === 'mile-series-a') return employees.length >= 3;
    if (id === 'mile-ipo') return fundingRound === 'series-c';
    return false;
  };

  return (
    <div className="pixel-panel" style={{ padding: 12, fontSize: 10, fontFamily: 'var(--font-pixel)' }}>
      <h4 style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 10 }}>MILESTONES</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {milestones.map((m) => {
          const done = completedMilestones.includes(m.id);
          const unlock = canUnlock(m.id);
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', opacity: done ? 0.5 : 1 }}>
              <div>
                <span style={{ marginRight: 4 }}>{done ? '✅' : m.icon}</span>
                <span style={{ color: done ? 'var(--neon-green)' : 'var(--text)' }}>{m.name}</span>
                {!done && MILESTONE_UNLOCK[m.id] && (
                  <span style={{ color: 'var(--text-dim)', fontSize: 7, marginLeft: 6 }}>({MILESTONE_UNLOCK[m.id]})</span>
                )}
              </div>
              {unlock && (
                <button
                  onClick={() => hitMilestone(m.id)}
                  style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 7, padding: '2px 6px', borderRadius: 2, fontFamily: 'var(--font-pixel)' }}
                >
                  CLAIM
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
