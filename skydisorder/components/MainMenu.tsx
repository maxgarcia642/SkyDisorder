'use client';

import React from 'react';
import { useChaosStore, MINIGAME_IDS } from '@/lib/chaosStore';
import { TAGLINE } from '@/lib/utils';
import { GAME_ENTITIES } from '@/lib/repoRegistry';

export default function MainMenu() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const resetGame = useChaosStore((state) => state.resetGame);

  if (gameState !== 'menu') return null;

  const handleStartGame = () => {
    resetGame();
    setGameState('playing');
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 30px', gap: '16px' }}>
      <h1 style={{
        color: 'var(--neon-yellow)', fontSize: 'clamp(28px, 5vw, 52px)', margin: '0',
        textShadow: '3px 3px 0 var(--neon-pink), -1px -1px 0 var(--neon-blue), 0 0 20px var(--neon-yellow)',
        textAlign: 'center', letterSpacing: '4px',
      }}>
        ⛳ SKYDISORDER ⛳
      </h1>

      <p style={{
        color: 'var(--text-dim)', fontSize: '9px', textAlign: 'center',
        maxWidth: '400px', lineHeight: 1.8, fontFamily: 'var(--font-pixel)',
      }}>
        {TAGLINE}
      </p>

      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <button className="pixel-panel" onClick={handleStartGame}
          style={{ width: '100%', cursor: 'pointer', fontSize: '18px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)', padding: '14px' }}>
          START GAME
        </button>

        <button className="pixel-panel" onClick={() => setGameState('minigame_menu')}
          style={{ width: '100%', cursor: 'pointer', fontSize: '18px', color: 'var(--neon-blue)', borderColor: 'var(--neon-blue)', padding: '14px' }}>
          MINIGAMES ({MINIGAME_IDS.length})
        </button>

        <button className="pixel-panel" onClick={() => setGameState('leaderboard')}
          style={{ width: '100%', cursor: 'pointer', fontSize: '18px', color: 'var(--neon-yellow)', borderColor: 'var(--neon-yellow)', padding: '14px' }}>
          LEADERBOARD
        </button>
      </div>

      <div style={{
        marginTop: '16px', padding: '12px 16px', background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--pixel-border)', borderRadius: '4px', maxWidth: 360,
      }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: 'var(--neon-cyan)', marginBottom: '6px' }}>
          HOW TO PLAY
        </div>
        <div style={{ fontFamily: 'var(--font-system)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Each repo is a golf hole. Click features to swing — nail the power and accuracy meters to earn sponsor money.
          Every swing triggers a random minigame. Build streaks for partnerships. 3 strikes and you&apos;re out!
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: 'var(--text-dim)', marginTop: '8px', opacity: 0.5 }}>
        v3.0 — {new Date().getFullYear()} — {GAME_ENTITIES.length} repos integrated — Maximum Chaos Edition
      </div>
    </div>
  );
}
