'use client';

import React, { useState } from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function GameOver() {
  const gameState = useChaosStore((state) => state.gameState);
  const money = useChaosStore((state) => state.sponsorMoney);
  const partnerships = useChaosStore((state) => state.partnerships);
  const submitScore = useChaosStore((state) => state.submitScore);
  
  const [name, setName] = useState('');

  if (gameState !== 'gameover') return null;

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px' }}>
      <h2 style={{ color: 'var(--neon-red)', fontSize: '36px', margin: '0 0 20px 0', textAlign: 'center' }}>
        GAME OVER - ENEMY DEFEATED YOU
      </h2>
      
      <div style={{ fontSize: '24px', color: 'var(--neon-yellow)' }}>
        Final Money: ${money}
      </div>
      
      <div style={{ fontSize: '24px', color: 'var(--neon-green)' }}>
        Partnerships: {partnerships || 0}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <input 
          type="text" 
          className="pixel-panel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ENTER NAME"
          style={{ padding: '10px', fontSize: '16px', background: 'var(--panel-bg)', color: '#fff', width: '200px' }}
        />
        <button 
          className="pixel-panel"
          onClick={() => {
            if (name.trim()) submitScore(name);
          }}
          style={{ cursor: 'pointer', color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', padding: '10px 20px' }}
        >
          SUBMIT SCORE
        </button>
      </div>
    </div>
  );
}
