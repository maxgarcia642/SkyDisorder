'use client';

import React, { useMemo } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { MINIGAME_IDS, MINIGAME_DISPLAY_NAMES, MINIGAME_SOURCES } from '@/lib/chaosStore';
import type { MinigameId } from '@/lib/chaosStore';
import { getAllMinigames } from '@/lib/repoRegistry';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: 'var(--neon-green)',
  rare: 'var(--neon-blue)',
  epic: '#c084fc',
  legendary: 'var(--gold)',
};

const BUTTON_COLORS: Record<MinigameId, string> = {
  coffee: '#c084fc',
  tactical: 'var(--neon-red)',
  radar: 'var(--neon-green)',
  snake: 'var(--neon-blue)',
  numberguess: 'var(--neon-yellow)',
  realorbot: 'var(--neon-pink)',
  mapfinder: 'var(--neon-cyan)',
  plantwater: 'var(--neon-green)',
  foodrush: 'var(--neon-yellow)',
  debatejudge: 'var(--neon-pink)',
  codepuzzle: 'var(--neon-cyan)',
  bowling: 'var(--neon-red)',
  dockerdash: '#4fc3f7',
  gitrebase: '#ff9800',
  bugsquash: '#f44336',
  stockticker: '#4caf50',
  typeracer: '#ffeb3b',
  firewall: '#e040fb',
  mini2048: '#00bcd4',
  tictactoe: '#ff6eb4',
};

export default function MinigameMenu() {
  const gameState = useChaosStore((state) => state.gameState);
  const setGameState = useChaosStore((state) => state.setGameState);
  const setCurrentMinigame = useChaosStore((state) => state.setCurrentMinigame);

  const registryMinigames = useMemo(() => getAllMinigames(), []);

  if (gameState !== 'minigame_menu') return null;

  const handleSelectMinigame = (game: MinigameId) => {
    setCurrentMinigame(game);
    setGameState('minigame');
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px', maxWidth: 700 }}>
      <h2 style={{ color: 'var(--neon-blue)', fontSize: '28px', margin: '0 0 8px 0', textAlign: 'center' }}>
        SELECT MINIGAME
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '10px', textAlign: 'center' }}>
        {MINIGAME_IDS.length} playable + {registryMinigames.length} registered from your repos
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px', width: '100%', maxHeight: '50vh', overflowY: 'auto', padding: '4px',
      }}>
        {MINIGAME_IDS.map((id) => (
          <button key={id} className="pixel-panel" onClick={() => handleSelectMinigame(id)}
            style={{
              cursor: 'pointer', padding: '12px 8px',
              color: BUTTON_COLORS[id], borderColor: BUTTON_COLORS[id],
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center',
            }}>
            <span style={{ fontSize: '13px' }}>{MINIGAME_DISPLAY_NAMES[id]}</span>
            <span style={{ fontSize: '7px', color: 'var(--text-dim)', fontFamily: 'var(--font-system)' }}>
              from: {MINIGAME_SOURCES[id]}
            </span>
          </button>
        ))}
      </div>

      {registryMinigames.length > 0 && (
        <>
          <h3 style={{ color: 'var(--neon-yellow)', fontSize: '14px', margin: '12px 0 4px 0' }}>
            REGISTRY MINIGAMES ({registryMinigames.length} repos)
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '6px', width: '100%', maxHeight: '30vh', overflowY: 'auto', padding: '4px',
          }}>
            {registryMinigames.map((entity) => (
              <div key={entity.id} className="pixel-panel" style={{
                padding: '8px', textAlign: 'center', opacity: 0.7,
                borderColor: RARITY_COLORS[entity.rarity] ?? '#555',
              }}>
                <div style={{ fontSize: '16px' }}>{entity.icon}</div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: RARITY_COLORS[entity.rarity] ?? '#aaa', marginTop: 2 }}>
                  {entity.name}
                </div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '6px', color: '#666', marginTop: 2 }}>
                  [{entity.rarity.toUpperCase()}] COMING SOON
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="pixel-panel" onClick={() => setGameState('menu')}
        style={{ cursor: 'pointer', fontSize: '14px', color: '#888', borderColor: '#888', padding: '10px 30px', marginTop: '8px' }}>
        BACK TO MENU
      </button>
    </div>
  );
}
