'use client';
import React, { useState } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { getAllEmployees } from '@/lib/repoRegistry';
import { formatMoney } from '@/lib/utils';

const HIRE_COST_BASE = 2000;

export default function HireMenu() {
  const [open, setOpen] = useState(false);
  const { sponsorMoney, employees, hireEmployee } = useChaosStore();
  const allEmployees = getAllEmployees();

  if (!open) {
    return (
      <button
        className="pixel-panel"
        onClick={() => setOpen(true)}
        style={{ cursor: 'pointer', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', padding: '6px 12px', fontSize: 9, fontFamily: 'var(--font-pixel)', width: '100%' }}
      >
        HIRE TEAM MEMBER
      </button>
    );
  }

  return (
    <div className="pixel-panel" style={{ padding: 12, maxHeight: 300, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ color: 'var(--neon-cyan)', fontSize: 10, fontFamily: 'var(--font-pixel)' }}>HIRE MENU</h4>
        <button onClick={() => setOpen(false)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #888', color: '#888', fontSize: 8, padding: '2px 6px', borderRadius: 2, fontFamily: 'var(--font-pixel)' }}>X</button>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {allEmployees.map((entity) => {
          const cost = HIRE_COST_BASE + (entity.rarity === 'epic' ? 3000 : entity.rarity === 'rare' ? 1500 : entity.rarity === 'legendary' ? 5000 : 0);
          const hired = employees.includes(entity.id);
          const canAfford = sponsorMoney >= cost;

          return (
            <div key={entity.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 2, opacity: hired ? 0.4 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-pixel)', color: hired ? 'var(--text-dim)' : 'var(--text)' }}>
                  {entity.icon} {entity.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)' }}>
                  {entity.description}
                </div>
              </div>
              <button
                onClick={() => hireEmployee(entity.id, cost)}
                disabled={hired || !canAfford}
                style={{
                  cursor: hired || !canAfford ? 'not-allowed' : 'pointer',
                  background: 'none',
                  border: `1px solid ${hired ? '#555' : canAfford ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                  color: hired ? '#555' : canAfford ? 'var(--neon-green)' : 'var(--neon-red)',
                  fontSize: 8, padding: '3px 8px', borderRadius: 2, fontFamily: 'var(--font-pixel)', whiteSpace: 'nowrap',
                }}
              >
                {hired ? 'HIRED' : formatMoney(cost)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
