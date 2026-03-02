'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

export default function TacticalStrike({ onComplete }: Props) {
  const [targets, setTargets] = useState<{ id: number; x: number; y: number; hit: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);
  const [hits, setHits] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameOverRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const initialTargets = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      hit: false
    }));
    setTargets(initialTargets);

    const moveInterval = setInterval(() => {
      if (gameOverRef.current) return;
      setTargets(prev => prev.map(t =>
        t.hit ? t : { ...t, x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }
      ));
    }, 800);

    const timerInterval = setInterval(() => {
      if (gameOverRef.current) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameOverRef.current = true;
          setGameOver(true);
          clearInterval(moveInterval);
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(moveInterval);
      clearInterval(timerInterval);
    };
  }, []);

  useEffect(() => {
    if (!gameOver || completedRef.current) return;
    completedRef.current = true;
    const success = hits >= 3;
    setTimeout(() => onComplete(success, hits * 33), 1500);
  }, [gameOver, hits, onComplete]);

  const handleHit = (id: number) => {
    if (gameOverRef.current) return;
    setTargets(prev => prev.map(t => t.id === id ? { ...t, hit: true } : t));
    setHits(prev => {
      const newHits = prev + 1;
      if (newHits >= 3 && !gameOverRef.current) {
        gameOverRef.current = true;
        setGameOver(true);
      }
      return newHits;
    });
  };

  return (
    <div className="pixel-panel" style={{ width: '400px', height: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <h3 style={{ color: 'var(--neon-red)', zIndex: 10, margin: '10px 0' }}>Tactical Strike</h3>
      <div style={{ color: '#fff', zIndex: 10, marginBottom: '10px' }}>Time: {timeLeft}s | Hits: {hits}/3</div>

      <div style={{ position: 'relative', width: '100%', flex: 1 }}>
        {targets.map(t => !t.hit && (
          <div
            key={t.id}
            onPointerDown={() => handleHit(t.id)}
            style={{
              position: 'absolute',
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: '40px',
              height: '40px',
              background: 'var(--neon-red)',
              borderRadius: '50%',
              cursor: 'crosshair',
              transition: 'left 0.3s ease-in-out, top 0.3s ease-in-out',
              boxShadow: '0 0 10px var(--neon-red)'
            }}
          />
        ))}
      </div>

      <button
        className="pixel-panel"
        onClick={() => {
          if (!completedRef.current) { completedRef.current = true; gameOverRef.current = true; onComplete(false, 0); }
        }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px', zIndex: 10, margin: '8px 0' }}
      >
        QUIT
      </button>

      {gameOver && (
        <div className="pixel-panel" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#111', zIndex: 20, padding: '20px', textAlign: 'center' }}>
          {hits >= 3 ? <h2 style={{ color: 'var(--neon-green)', margin: 0 }}>MISSION SUCCESS</h2> : <h2 style={{ color: 'var(--neon-red)', margin: 0 }}>MISSION FAILED</h2>}
        </div>
      )}
    </div>
  );
}
