'use client';

import { useEffect, useState } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { MINIGAME_DISPLAY_NAMES } from '@/lib/chaosStore';
import type { MinigameId } from '@/lib/chaosStore';
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

import AICaddy from '@/components/AICaddy';
import ChaosNewsFeed from '@/components/ChaosNewsFeed';
import SponsorShop from '@/components/SponsorShop';

import CoffeePour from '@/components/minigames/CoffeePour';
import TacticalStrike from '@/components/minigames/TacticalStrike';
import TasteRadar from '@/components/minigames/TasteRadar';
import SnakeGame from '@/components/minigames/SnakeGame';
import NumberGuess from '@/components/minigames/NumberGuess';
import RealOrBot from '@/components/minigames/RealOrBot';
import MapFinder from '@/components/minigames/MapFinder';
import PlantWater from '@/components/minigames/PlantWater';
import FoodRush from '@/components/minigames/FoodRush';
import DebateJudge from '@/components/minigames/DebateJudge';
import CodePuzzle from '@/components/minigames/CodePuzzle';
import BowlingStrike from '@/components/minigames/BowlingStrike';

interface Props {
  initialRepos: Repo[];
}

const INTERSTITIAL_MS = 1500;

export function HomeClient({ initialRepos }: Props) {
  const setRepos = useChaosStore((s) => s.setRepos);
  const addMessage = useChaosStore((s) => s.addMessage);
  const hydrate = useChaosStore((s) => s.hydrate);
  const repos = useChaosStore((s) => s.repos);
  const setShowUploadModal = useChaosStore((s) => s.setShowUploadModal);
  const swing = useChaosStore((s) => s.swing);
  const gameState = useChaosStore((s) => s.gameState);
  const currentMinigame = useChaosStore((s) => s.currentMinigame);
  const completeMinigame = useChaosStore((s) => s.completeMinigame);

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialName, setInterstitialName] = useState('');

  useEffect(() => {
    hydrate();
    if (initialRepos.length > 0) {
      setRepos(initialRepos);
      addMessage(`Course loaded! ${initialRepos.length} holes detected. Let's play!`);
    } else {
      addMessage('No repos detected. Upload some to get started!');
    }
    addMessage(TAGLINE);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameState === 'minigame' && currentMinigame) {
      const displayName = MINIGAME_DISPLAY_NAMES[currentMinigame as MinigameId] ?? currentMinigame;
      setInterstitialName(displayName);
      setShowInterstitial(true);
      const timer = setTimeout(() => setShowInterstitial(false), INTERSTITIAL_MS);
      return () => clearTimeout(timer);
    }
    setShowInterstitial(false);
  }, [gameState, currentMinigame]);

  const renderMinigame = () => {
    if (showInterstitial) {
      return (
        <div className="pixel-panel" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 40px', gap: '20px', textAlign: 'center',
        }}>
          <h2 style={{ color: 'var(--neon-yellow)', fontSize: '28px', textShadow: '0 0 15px var(--neon-yellow)' }}>
            INCOMING MINIGAME
          </h2>
          <h3 style={{ color: 'var(--neon-cyan)', fontSize: '22px', textShadow: '0 0 10px var(--neon-cyan)' }}>
            {interstitialName}
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Get ready...</p>
        </div>
      );
    }

    switch (currentMinigame) {
      case 'coffee':
        return <CoffeePour onComplete={completeMinigame} />;
      case 'tactical':
        return <TacticalStrike onComplete={completeMinigame} />;
      case 'radar':
        return <TasteRadar onComplete={completeMinigame} />;
      case 'snake':
        return <SnakeGame onComplete={completeMinigame} />;
      case 'numberguess':
        return <NumberGuess onComplete={completeMinigame} />;
      case 'realorbot':
        return <RealOrBot onComplete={completeMinigame} />;
      case 'mapfinder':
        return <MapFinder onComplete={completeMinigame} />;
      case 'plantwater':
        return <PlantWater onComplete={completeMinigame} />;
      case 'foodrush':
        return <FoodRush onComplete={completeMinigame} />;
      case 'debatejudge':
        return <DebateJudge onComplete={completeMinigame} />;
      case 'codepuzzle':
        return <CodePuzzle onComplete={completeMinigame} />;
      case 'bowling':
        return <BowlingStrike onComplete={completeMinigame} />;
      default:
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

    return (
      <>
        <div style={{ padding: '0 16px', marginTop: '16px' }}>
          <Scoreboard />
        </div>

        {/* Repo integrations bar */}
        <div style={{ padding: '0 16px', marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AICaddy />
            <ChaosNewsFeed />
          </div>
          <SponsorShop />
        </div>

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

  const showTopBar = gameState === 'playing';

  return (
    <ArcadeCabinet>
      {showTopBar && (
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
      )}

      {renderGameContent()}

      {showTopBar && <MessageLog />}

      {showTopBar && <ChaosButton />}
      {swing.active && gameState === 'playing' && <SwingGame />}
      <UploadModal />
      <ParticleSystem />
    </ArcadeCabinet>
  );
}
