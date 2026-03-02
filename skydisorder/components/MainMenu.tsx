'use client';

import React from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function MainMenu() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const resetGame = useChaosStore((state) => state.resetGame);

  if (gameState !== 'menu') return null;

  const handleStartGame = () => {
    if (resetGame) resetGame();
    setGameState('playing');
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px' }}>
      <h1 style={{ color: 'var(--neon-pink)', fontSize: '48px', margin: '0 0 20px 0', textShadow: '2px 2px 0 var(--neon-blue)', textAlign: 'center' }}>
        ARCADE MAYHEM
      </h1>
      
      <button 
        className="pixel-panel" 
        onClick={handleStartGame}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}
      >
        START GAME
      </button>
      
      <button 
        className="pixel-panel" 
        onClick={() => setGameState('minigame_menu')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: 'var(--neon-blue)', borderColor: 'var(--neon-blue)' }}
      >
        MINIGAMES
      </button>
      
      <button 
        className="pixel-panel" 
        onClick={() => setGameState('leaderboard')}
        style={{ width: '250px', cursor: 'pointer', fontSize: '20px', color: 'var(--neon-yellow)', borderColor: 'var(--neon-yellow)' }}
      >
        LEADERBOARD
      </button>
    </div>
  );
}
