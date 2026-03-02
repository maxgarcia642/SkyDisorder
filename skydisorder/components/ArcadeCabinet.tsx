'use client';
import { TAGLINE } from '@/lib/utils';

export function ArcadeCabinet({ children }: { children: React.ReactNode }) {
  return (
    <div className="arcade-cabinet scanlines">
      <div className="arcade-header">
        <h1 className="logo">⛳ SKYDISORDER ⛳</h1>
        <div className="tagline">{TAGLINE}</div>
      </div>
      <div className="arcade-marquee">
        <span className="marquee-text">
          ★ {TAGLINE} ★ 12 MINIGAMES ★ INFINITE CHAOS ★ SPONSOR MONEY ★ BREAK THE GROUND ★
        </span>
      </div>
      <div className="arcade-screen">
        {children}
      </div>
    </div>
  );
}
