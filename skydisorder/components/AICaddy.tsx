'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const CADDY_TIPS = [
  "Have you tried turning it off and on again? Works for golf too.",
  "My analysis says you should aim for the hole. Revolutionary, I know.",
  "Based on 847 data points, your swing needs... everything.",
  "Pro tip: the ball goes where you hit it. Sometimes.",
  "I've computed the optimal strategy: just press all the buttons.",
  "The wind is blowing at 0 mph because this is a screen.",
  "Fun fact: this caddy was trained on Stack Overflow answers.",
  "Your sponsorship potential is through the roof! (The roof is very low.)",
  "I recommend the 9-iron. I don't know what that means either.",
  "Statistical analysis complete: you have a 50/50 chance. You either win or you don't.",
  "My neural network suggests: have you tried the chaos button?",
  "Loading golf wisdom... ERROR 404: Wisdom not found.",
  "According to my calculations, you should play more minigames.",
  "I asked GPT for advice and it said 'skill issue'.",
  "The leaderboard awaits! (It's mostly empty. No pressure.)",
  "Debugging your swing... found 47 issues. Shall I list them?",
  "My training data includes 0 actual golf games. Good luck!",
  "Tip: Coffee Pour is easier if you pretend it's real coffee.",
  "The enemy is always one step behind. Unless they're ahead.",
  "Remember: every pro was once a beginner who pressed random buttons.",
];

export default function AICaddy() {
  const [tip, setTip] = useState('');
  const [visible, setVisible] = useState(false);
  const lastIdxRef = useRef(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickTip = useCallback(() => {
    let idx: number;
    do { idx = Math.floor(Math.random() * CADDY_TIPS.length); } while (idx === lastIdxRef.current && CADDY_TIPS.length > 1);
    lastIdxRef.current = idx;
    return CADDY_TIPS[idx];
  }, []);

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
          AI CADDY (code_puppy-main)
        </div>
        <div style={{ fontFamily: 'var(--font-system)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {tip}
        </div>
      </div>
    </div>
  );
}
