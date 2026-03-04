'use client';
import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { formatMoney } from '@/lib/utils';
import { getById } from '@/lib/repoRegistry';

const ROUND_LABELS: Record<string, string> = {
  bootstrapped: 'Bootstrapped',
  'pre-seed': 'Pre-Seed',
  seed: 'Seed',
  'series-a': 'Series A',
  'series-b': 'Series B',
  'series-c': 'Series C',
  ipo: 'IPO',
  acquired: 'Acquired',
  bankrupt: 'Bankrupt',
};

const ROUND_ORDER = ['bootstrapped', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];

export default function StartupDashboard() {
  const { fundingRound, burnRate, runway, valuation, equity, employees, boardMembers, completedMilestones, calculateRunway, fireEmployee } = useChaosStore();

  React.useEffect(() => { calculateRunway(); }, [calculateRunway]);

  const roundIdx = ROUND_ORDER.indexOf(fundingRound);
  const progress = roundIdx >= 0 ? ((roundIdx + 1) / ROUND_ORDER.length) * 100 : 100;

  return (
    <div className="pixel-panel" style={{ padding: 12, fontSize: 10, fontFamily: 'var(--font-pixel)' }}>
      <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 8, fontSize: 11 }}>STARTUP DASHBOARD</h4>

      <div style={{ marginBottom: 8 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 8, marginBottom: 4 }}>FUNDING: {ROUND_LABELS[fundingRound] ?? fundingRound}</div>
        <div style={{ width: '100%', height: 8, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>VALUATION</div>
          <div style={{ color: 'var(--gold)', fontSize: 11 }}>{formatMoney(valuation)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>EQUITY</div>
          <div style={{ color: equity < 30 ? 'var(--neon-red)' : 'var(--neon-green)', fontSize: 11 }}>{equity}%</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>BURN RATE</div>
          <div style={{ color: 'var(--neon-yellow)', fontSize: 11 }}>{formatMoney(burnRate)}/mo</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>RUNWAY</div>
          <div style={{ color: runway < 3 ? 'var(--neon-red)' : 'var(--neon-green)', fontSize: 11 }}>{runway} mo</div>
        </div>
      </div>

      {employees.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 8, marginBottom: 4 }}>TEAM ({employees.length})</div>
          {employees.map((eid) => {
            const entity = getById(eid);
            return (
              <div key={eid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                <span>{entity ? `${entity.icon} ${entity.name}` : eid}</span>
                <button onClick={() => fireEmployee(eid)} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', fontSize: 7, padding: '1px 4px', borderRadius: 2, fontFamily: 'var(--font-pixel)' }}>
                  FIRE
                </button>
              </div>
            );
          })}
        </div>
      )}

      {boardMembers.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 8, marginBottom: 4 }}>BOARD ({boardMembers.length})</div>
          {boardMembers.map((bid) => {
            const entity = getById(bid);
            return <div key={bid} style={{ fontSize: 9 }}>{entity ? `${entity.icon} ${entity.name}` : bid}</div>;
          })}
        </div>
      )}

      <div style={{ color: 'var(--text-dim)', fontSize: 8 }}>
        MILESTONES: {completedMilestones.length}
      </div>
    </div>
  );
}
