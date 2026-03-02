'use client';

import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function MinigameMenu() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const setCurrentMinigame = useChaosStore((state) => state.setCurrentMinigame);

  if (gameState !== 'minigame_menu') return null;

  const handleSelectMinigame = (game: string) => {
    setCurrentMinigame(game);
    setGameState('minigame');
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px' }}>
      <h2 style={{ color: 'var(--neon-blue)', fontSize: '36px', margin: '0 0 20px 0', textAlign: 'center' }}>
        SELECT MINIGAME
      </h2>

      <button 
        className="pixel-panel"
        onClick={() => handleSelectMinigame('Coffee Pour')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: '#c084fc', borderColor: '#c084fc' }}
      >
        Coffee Pour
      </button>

      <button 
        className="pixel-panel"
        onClick={() => handleSelectMinigame('Tactical Strike')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: 'var(--neon-red)', borderColor: 'var(--neon-red)' }}
      >
        Tactical Strike
      </button>

      <button 
        className="pixel-panel"
        onClick={() => handleSelectMinigame('Taste Radar')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}
      >
        Taste Radar
      </button>

      <button 
        className="pixel-panel"
        onClick={() => setGameState('menu')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: '#888', borderColor: '#888', marginTop: '20px' }}
      >
        BACK TO MENU
      </button>
    </div>
  );
}
