'use client';

import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function Leaderboard() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const leaderboard = useChaosStore((state) => state.leaderboard || []);

  if (gameState !== 'leaderboard') return null;

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px', minWidth: '400px' }}>
      <h2 style={{ color: 'var(--neon-yellow)', fontSize: '36px', margin: '0 0 20px 0' }}>
        LEADERBOARD
      </h2>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888' }}>No scores yet</div>
        ) : (
          leaderboard.map((entry: any, index: number) => (
            <div key={index} className="pixel-panel" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderColor: '#444' }}>
              <span style={{ color: 'var(--neon-blue)' }}>{index + 1}. {entry.name}</span>
              <span style={{ color: 'var(--neon-green)' }}>${entry.score}</span>
            </div>
          ))
        )}
      </div>

      <button 
        className="pixel-panel"
        onClick={() => setGameState('menu')}
        style={{ cursor: 'pointer', color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', padding: '10px 30px' }}
      >
        BACK TO MENU
      </button>
    </div>
  );
}
