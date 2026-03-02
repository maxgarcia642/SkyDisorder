'use client';

import React, { useState, useEffect, useRef } from 'react';

const NEWS_ITEMS = [
  { source: 'robotriffs-main', text: 'AI bot just posted: "Is cereal a soup?" — 47k likes in 2 minutes' },
  { source: 'social-app-main', text: 'Bluesky trending: #SkyDisorder is NOT a real company (or is it?)' },
  { source: 'ecommerce-admin-main', text: 'BREAKING: Sponsor Shop inventory updated — new chaos power-ups available' },
  { source: 'nextjs-dashboard-main', text: 'Analytics report: Chaos levels up 340% since last session' },
  { source: 'portfolio-v3-main', text: "Coworker's portfolio just crashed. Again. It's a feature." },
  { source: 'coffee-please-main', text: 'Coffee machine status: DECAF ONLY. Morale at all-time low.' },
  { source: 'SWOT_Dashboard-main', text: 'NASA SWOT satellite detects water hazard on hole #7. Par adjusted.' },
  { source: 'nextjs-twitter-clone-main', text: 'Hot take going viral: "Tabs vs spaces debate is actually about power"' },
  { source: 'indie-stack-main', text: "Someone left a TODO: 'fix everything'. It's been 3 years." },
  { source: 'personal-website-main', text: "Ethan's website is up! Nobody visited. Classic." },
  { source: 'storage-closet-main', text: 'Storage closet inventory: 47 unused npm packages found' },
  { source: 'lovefern-main', text: 'ALERT: Office fern is dying. Nobody watered it since Tuesday.' },
  { source: 'maptiler-sdk-js-fork-main', text: 'Map update: New shortcut discovered between hole #3 and #9' },
  { source: 'verydebate-main', text: 'Debate results: AI won 7-2 against humans. Humanity concerned.' },
  { source: 'Probabilistic-Rating-Engine-main', text: 'Rating update: Your win probability is... let me recalculate...' },
  { source: 'code_puppy-main', text: 'AI Caddy promoted to Senior Caddy. Still gives bad advice.' },
  { source: 'modern-aw-game-main', text: 'Tactical alert: Enemy units spotted near the 18th hole' },
  { source: 'TasteMap-main', text: 'Restaurant finder update: All nearby restaurants are closed. As usual.' },
  { source: 'next-website-main', text: 'Type animation loading... still loading... almost there...' },
  { source: 'neon-main', text: 'Database status: Serverless Postgres is feeling lonely' },
];

export default function ChaosNewsFeed() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      timeoutRef.current = setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % NEWS_ITEMS.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const item = NEWS_ITEMS[currentIdx];

  return (
    <div style={{
      background: 'rgba(0,0,0,0.6)', border: '1px solid var(--pixel-border)', borderRadius: '2px',
      padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center',
      opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease',
      overflow: 'hidden',
    }}>
      <span style={{ fontSize: '8px', color: 'var(--neon-red)', fontFamily: 'var(--font-pixel)' }}>● LIVE</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '7px', color: 'var(--neon-cyan)', marginRight: '6px' }}>
          [{item.source}]
        </span>
        <span style={{ fontFamily: 'var(--font-system)', fontSize: '10px', color: 'var(--text-dim)' }}>
          {item.text}
        </span>
      </div>
    </div>
  );
}
