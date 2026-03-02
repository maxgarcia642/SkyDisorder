'use client';
import { TAGLINE } from '@/lib/utils';

export function ArcadeCabinet({ children }: { children: React.ReactNode }) {
  return (
    <div className="arcade-cabinet scanlines">
      <div className="arcade-header">
        <h1 className="text-glow-yellow pixel-text" style={{ fontSize: '14px', margin: 0 }}>
          ⛳ SKYDISORDER ⛳
        </h1>
        <div className="arcade-marquee">
          <span className="arcade-marquee-text">{TAGLINE}</span>
        </div>
      </div>
      <div className="arcade-screen">
        {children}
      </div>
    </div>
  );
}
