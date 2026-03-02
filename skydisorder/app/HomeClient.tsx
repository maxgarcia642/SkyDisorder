'use client';

import { useEffect } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { TAGLINE } from '@/lib/utils';
import type { Repo } from '@/lib/chaosStore';

import { ArcadeCabinet } from '@/components/ArcadeCabinet';
import { SponsorCounter } from '@/components/SponsorCounter';
import { Scoreboard } from '@/components/Scoreboard';
import { FeatureList } from '@/components/FeatureList';
import RepoCard from '@/components/RepoCard';
import { ChaosButton } from '@/components/ChaosButton';
import { MessageLog } from '@/components/MessageLog';
import SwingGame from '@/components/SwingGame';
import UploadModal from '@/components/UploadModal';
import ParticleSystem from '@/components/ParticleSystem';

import MainMenu from '@/components/MainMenu';
import GameOver from '@/components/GameOver';
import MinigameMenu from '@/components/MinigameMenu';
import Leaderboard from '@/components/Leaderboard';

import CoffeePour from '@/components/minigames/CoffeePour';
import TacticalStrike from '@/components/minigames/TacticalStrike';
import TasteRadar from '@/components/minigames/TasteRadar';

interface Props {
  initialRepos: Repo[];
}

export function HomeClient({ initialRepos }: Props) {
  const setRepos = useChaosStore((s) => s.setRepos);
  const addMessage = useChaosStore((s) => s.addMessage);
  const repos = useChaosStore((s) => s.repos);
  const setShowUploadModal = useChaosStore((s) => s.setShowUploadModal);
  const swing = useChaosStore((s) => s.swing);
  const gameState = useChaosStore((s) => s.gameState);
  const currentMinigame = useChaosStore((s) => s.currentMinigame);
  const completeMinigame = useChaosStore((s) => s.completeMinigame);

  useEffect(() => {
    if (initialRepos.length > 0) {
      setRepos(initialRepos);
      addMessage(`Course loaded! ${initialRepos.length} holes detected. Let's play!`);
    } else {
      addMessage('No repos detected. Upload some to get started!');
    }
    addMessage(TAGLINE);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderMinigame = () => {
    switch (currentMinigame) {
      case 'coffee':
      case 'Coffee Pour':
        return <CoffeePour onComplete={completeMinigame} />;
      case 'tactical':
      case 'Tactical Strike':
        return <TacticalStrike onComplete={completeMinigame} />;
      case 'radar':
      case 'Taste Radar':
        return <TasteRadar onComplete={completeMinigame} />;
      default:
        // Fallback for snake or others not explicitly implemented
        return <TasteRadar onComplete={completeMinigame} />;
    }
  };

  const renderGameContent = () => {
    if (gameState === 'menu') return <MainMenu />;
    if (gameState === 'gameover') return <GameOver />;
    if (gameState === 'leaderboard') return <Leaderboard />;
    if (gameState === 'minigame_menu') return <MinigameMenu />;
    if (gameState === 'minigame') return (
       <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
         {renderMinigame()}
       </div>
    );

    // gameState === 'playing'
    return (
      <>
        {/* Scoreboard */}
        <div style={{ padding: '0 16px', marginTop: '16px' }}>
          <Scoreboard />
        </div>

        {/* Course grid */}
        <div className="course-grid">
          {repos.length === 0 ? (
            <div className="pixel-panel insert-coin" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
              INSERT COIN — Upload repos or scan folder to begin
            </div>
          ) : (
            repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)
          )}
        </div>
      </>
    );
  };

  return (
    <ArcadeCabinet>
      {/* Top bar: Sponsor counter - always show except in full minigame maybe, let's just always show it */}
      <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <SponsorCounter />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 200 }}>
          <FeatureList />
          <button
            className="pixel-panel"
            onClick={() => setShowUploadModal(true)}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              fontSize: '10px',
              fontFamily: 'var(--font-pixel)',
              color: 'var(--neon-yellow)',
              border: '2px solid var(--neon-yellow)',
              background: 'var(--panel-bg)',
              padding: '8px',
            }}
          >
            + UPLOAD NEW REPO TO CHAOS COURSE
          </button>
        </div>
      </div>

      {renderGameContent()}

      {/* Message log at bottom */}
      <MessageLog />

      {/* Overlays */}
      <ChaosButton />
      {swing.active && <SwingGame />}
      <UploadModal />
      <ParticleSystem />
    </ArcadeCabinet>
  );
}
