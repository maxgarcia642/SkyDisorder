'use client';

import { useMemo } from 'react';
import { TAGLINE } from '@/lib/utils';
import { getRandomByRole, GAME_ENTITIES } from '@/lib/repoRegistry';
import { MINIGAME_IDS } from '@/lib/chaosStore';

export function ArcadeCabinet({ children }: { children: React.ReactNode }) {
  const course = useMemo(() => getRandomByRole('course'), []);
  const entityCount = GAME_ENTITIES.length;

  return (
    <div className="arcade-cabinet scanlines">
      <div className="arcade-header">
        <h1 className="logo">⛳ SKYDISORDER ⛳</h1>
        <div className="tagline">{TAGLINE}</div>
        {course && (
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '7px', color: 'var(--neon-cyan)', marginTop: 2, opacity: 0.7 }}>
            COURSE: {course.icon} {course.name}
          </div>
        )}
      </div>
      <div className="arcade-marquee">
        <span className="marquee-text">
          ★ {TAGLINE} ★ {MINIGAME_IDS.length} PLAYABLE MINIGAMES ★ {entityCount} REPOS INTEGRATED ★ INFINITE CHAOS ★ SPONSOR MONEY ★ BREAK THE GROUND ★
        </span>
      </div>
      <div className="arcade-screen">
        {children}
      </div>
    </div>
  );
}
