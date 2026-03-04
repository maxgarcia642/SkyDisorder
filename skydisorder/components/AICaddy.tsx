'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getByRole } from '@/lib/repoRegistry';

const FALLBACK_TIPS = [
  "Have you tried turning it off and on again? Works for golf too.",
  "My analysis says you should aim for the hole. Revolutionary, I know.",
  "Pro tip: the ball goes where you hit it. Sometimes.",
  "I've computed the optimal strategy: just press all the buttons.",
  "Statistical analysis complete: you have a 50/50 chance. You either win or you don't.",
  "Loading golf wisdom... ERROR 404: Wisdom not found.",
  "I asked GPT for advice and it said 'skill issue'.",
  "My training data includes 0 actual golf games. Good luck!",
  "Remember: every pro was once a beginner who pressed random buttons.",
];

export default function AICaddy() {
  const caddies = useMemo(() => getByRole('caddy'), []);

  const tips = useMemo(() => {
    const fromRegistry = caddies.map(c => `${c.icon} [${c.name}]: ${c.description}`);
    return [...fromRegistry, ...FALLBACK_TIPS];
  }, [caddies]);

  const [tip, setTip] = useState('');
  const [caddyName, setCaddyName] = useState('AI Caddy');
  const [visible, setVisible] = useState(false);
  const lastIdxRef = useRef(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickTip = useCallback(() => {
    let idx: number;
    do { idx = Math.floor(Math.random() * tips.length); } while (idx === lastIdxRef.current && tips.length > 1);
    lastIdxRef.current = idx;

    if (idx < caddies.length) {
      setCaddyName(caddies[idx].name);
    } else {
      const randomCaddy = caddies[Math.floor(Math.random() * caddies.length)];
      setCaddyName(randomCaddy?.name ?? 'AI Caddy');
    }

    return tips[idx];
  }, [tips, caddies]);

  useEffect(() => {
    setTip(pickTip());
    setVisible(true);

    const interval = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setTip(pickTip());
        setVisible(true);
      }, 500);
    }, 12000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pickTip]);

  return (
    <div style={{
      background: 'var(--panel-bg)', border: '2px solid #c084fc', borderRadius: '4px',
      padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start',
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
      boxShadow: '0 0 12px rgba(192,132,252,0.15)',
    }}>
      <div style={{ fontSize: '24px', lineHeight: 1 }}>🤖</div>
      <div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: '#c084fc', marginBottom: '4px', letterSpacing: '0.5px' }}>
          {caddyName.toUpperCase()} — {caddies.length} caddies on staff
        </div>
        <div style={{ fontFamily: 'var(--font-system)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {tip}
        </div>
      </div>
    </div>
  );
}
