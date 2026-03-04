'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getByRole, getRandomByRole } from '@/lib/repoRegistry';

const HEADLINE_TEMPLATES = [
  (n: string) => `BREAKING: ${n} just pivoted. Again.`,
  (n: string) => `${n} announces layoffs, blames "market conditions"`,
  (n: string) => `Rumor: ${n} in acquisition talks with SkyDisorder Corp`,
  (n: string) => `${n} trending on Hacker News for all the wrong reasons`,
  (n: string) => `Investors pull funding from ${n} after demo day disaster`,
  (n: string) => `${n} achieves product-market fit. Nobody is sure what the product is.`,
  (n: string) => `LEAKED: ${n} internal memo says "we have no idea what we're doing"`,
  (n: string) => `${n} stock up 340% on news of absolutely nothing`,
  (n: string) => `${n} CEO tweets "we're fine" — stock drops 12%`,
  (n: string) => `Hot take from ${n}: "AI will replace golfers by 2027"`,
  (n: string) => `${n} open-sourced their chaos engine. GitHub is confused.`,
  (n: string) => `Board meeting at ${n} ended in a food fight. Productivity up 200%.`,
];

function generateHeadlines() {
  const events = getByRole('event');
  const headlines: { source: string; text: string }[] = [];

  for (const entity of events) {
    const template = HEADLINE_TEMPLATES[Math.floor(Math.random() * HEADLINE_TEMPLATES.length)];
    headlines.push({ source: entity.name, text: template(entity.name) });
  }

  for (let i = 0; i < 10; i++) {
    const random = getRandomByRole('competitor') ?? getRandomByRole('sponsor');
    if (random) {
      const template = HEADLINE_TEMPLATES[Math.floor(Math.random() * HEADLINE_TEMPLATES.length)];
      headlines.push({ source: random.name, text: template(random.name) });
    }
  }

  for (let i = headlines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [headlines[i], headlines[j]] = [headlines[j], headlines[i]];
  }

  return headlines;
}

export default function ChaosNewsFeed() {
  const headlines = useMemo(() => generateHeadlines(), []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      timeoutRef.current = setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % headlines.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [headlines.length]);

  const item = headlines[currentIdx];
  if (!item) return null;

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
