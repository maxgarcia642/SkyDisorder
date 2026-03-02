'use client';

import React, { useState, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface City {
  name: string;
  x: number;
  y: number;
}

const CITIES: City[] = [
  { name: 'New York', x: 28, y: 38 },
  { name: 'London', x: 48, y: 28 },
  { name: 'Tokyo', x: 82, y: 36 },
  { name: 'Sydney', x: 85, y: 72 },
  { name: 'Cairo', x: 55, y: 42 },
  { name: 'Rio de Janeiro', x: 32, y: 68 },
  { name: 'Moscow', x: 58, y: 24 },
  { name: 'Mumbai', x: 68, y: 46 },
  { name: 'Los Angeles', x: 14, y: 38 },
  { name: 'Paris', x: 49, y: 30 },
  { name: 'Beijing', x: 76, y: 34 },
  { name: 'Cape Town', x: 52, y: 76 },
];

const ROUNDS = 4;
const THRESHOLD = 12;

export default function MapFinder({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(() => CITIES[Math.floor(Math.random() * CITIES.length)]);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const usedRef = useRef<Set<string>>(new Set([target.name]));
  const completedRef = useRef(false);

  const pickNext = () => {
    let city: City;
    do { city = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (usedRef.current.has(city.name) && usedRef.current.size < CITIES.length);
    usedRef.current.add(city.name);
    return city;
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (feedback || result !== 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setClickPos({ x, y });

    const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
    const hit = dist <= THRESHOLD;
    const newScore = hit ? score + 1 : score;
    setScore(newScore);
    setFeedback(hit ? `FOUND! (${dist.toFixed(0)}px away)` : `MISSED! (${dist.toFixed(0)}px away)`);

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        const success = newScore >= 2;
        setResult(success ? 'success' : 'fail');
        setTimeout(() => {
          if (!completedRef.current) { completedRef.current = true; onComplete(success, newScore * 25); }
        }, 1500);
      } else {
        setRound(nextRound);
        setTarget(pickNext());
        setClickPos(null);
        setFeedback(null);
      }
    }, 1200);
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '12px' }}>
      <h3 style={{ color: 'var(--neon-cyan)' }}>Map Finder</h3>
      <div style={{ color: 'var(--neon-yellow)', fontSize: '12px' }}>Round {round + 1}/{ROUNDS} | Hits: {score}</div>
      <div style={{ color: '#fff', fontSize: '16px' }}>Find: <span style={{ color: 'var(--neon-pink)' }}>{target.name}</span></div>

      <div
        onClick={handleMapClick}
        style={{
          width: 380, height: 240, position: 'relative', cursor: 'crosshair',
          background: 'linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 30%, #0d3d5c 60%, #1a2a4a 100%)',
          border: '3px solid var(--neon-cyan)', borderRadius: '4px', overflow: 'hidden',
          boxShadow: '0 0 15px rgba(79,195,247,0.2)',
        }}
      >
        {/* Simplified continent outlines */}
        <div style={{ position: 'absolute', left: '8%', top: '20%', width: '25%', height: '55%', background: 'rgba(46,125,50,0.3)', borderRadius: '30% 40% 60% 20%' }} />
        <div style={{ position: 'absolute', left: '38%', top: '10%', width: '25%', height: '50%', background: 'rgba(46,125,50,0.3)', borderRadius: '20% 30% 40% 25%' }} />
        <div style={{ position: 'absolute', left: '55%', top: '15%', width: '30%', height: '40%', background: 'rgba(46,125,50,0.3)', borderRadius: '25% 35% 30% 20%' }} />
        <div style={{ position: 'absolute', left: '75%', top: '55%', width: '15%', height: '25%', background: 'rgba(46,125,50,0.3)', borderRadius: '30%' }} />
        <div style={{ position: 'absolute', left: '25%', top: '55%', width: '15%', height: '30%', background: 'rgba(46,125,50,0.3)', borderRadius: '20% 40% 30% 50%' }} />
        <div style={{ position: 'absolute', left: '42%', top: '55%', width: '18%', height: '35%', background: 'rgba(46,125,50,0.3)', borderRadius: '20% 25% 50% 30%' }} />

        {/* Target indicator (shown after click) */}
        {clickPos && (
          <>
            <div style={{
              position: 'absolute', left: `${target.x}%`, top: `${target.y}%`,
              width: 10, height: 10, borderRadius: '50%', background: 'var(--neon-green)',
              transform: 'translate(-50%, -50%)', boxShadow: '0 0 8px var(--neon-green)',
            }} />
            <div style={{
              position: 'absolute', left: `${clickPos.x}%`, top: `${clickPos.y}%`,
              width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-red)',
              transform: 'translate(-50%, -50%)', boxShadow: '0 0 8px var(--neon-red)',
            }} />
          </>
        )}

        {/* Grid lines */}
        {[20, 40, 60, 80].map((p) => (
          <React.Fragment key={p}>
            <div style={{ position: 'absolute', left: `${p}%`, top: 0, width: 1, height: '100%', background: 'rgba(79,195,247,0.1)' }} />
            <div style={{ position: 'absolute', top: `${p}%`, left: 0, height: 1, width: '100%', background: 'rgba(79,195,247,0.1)' }} />
          </React.Fragment>
        ))}
      </div>

      {feedback && (
        <div style={{ color: feedback.startsWith('FOUND') ? 'var(--neon-green)' : 'var(--neon-red)', fontSize: '14px' }}>
          {feedback}
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>NAVIGATOR!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>LOST!</div>}
    </div>
  );
}
