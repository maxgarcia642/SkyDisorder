'use client';

import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { formatMoney } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const resetGame = useChaosStore((state) => state.resetGame);
  const leaderboard = useChaosStore((state) => state.leaderboard);

  if (gameState !== 'leaderboard') return null;

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px', minWidth: '400px' }}>
      <h2 style={{ color: 'var(--neon-yellow)', fontSize: '36px', margin: '0 0 20px 0' }}>
        LEADERBOARD
      </h2>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888' }}>No scores yet — go play!</div>
        ) : (
          leaderboard.map((entry: { name: string; score: number; money: number }, index: number) => (
            <div key={index} className="pixel-panel" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 20px',
              borderColor: index < 3 ? 'var(--gold)' : '#444',
            }}>
              <span style={{ color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: index < 3 ? '18px' : '12px' }}>{MEDALS[index] ?? `#${index + 1}`}</span>
                {entry.name}
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--neon-green)', fontSize: '13px' }}>{entry.score} pts</div>
                <div style={{ color: 'var(--gold)', fontSize: '10px' }}>{formatMoney(entry.money)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="pixel-panel" onClick={() => { resetGame(); setGameState('playing'); }}
          style={{ cursor: 'pointer', color: 'var(--neon-green)', borderColor: 'var(--neon-green)', padding: '10px 24px' }}>
          PLAY AGAIN
        </button>
        <button className="pixel-panel" onClick={() => setGameState('menu')}
          style={{ cursor: 'pointer', color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', padding: '10px 24px' }}>
          BACK TO MENU
        </button>
      </div>
    </div>
  );
}
