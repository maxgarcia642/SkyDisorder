'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Bug {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  spawned: boolean;
}

export default function BugSquash({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const [bugs, setBugs] = useState<Bug[]>(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 5,
      y: Math.random() * 80 + 5,
      alive: true,
      spawned: false,
    }))
  );
  const [squashed, setSquashed] = useState(0);
  const [escaped, setEscaped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const nextSpawnRef = useRef(0);

  const finishGame = useCallback((kills: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const won = kills >= 7;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, kills * 14), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

  useEffect(() => {
    const spawnInterval = window.setInterval(() => {
      if (completedRef.current) return;
      setBugs(prev => {
        const next = prev.map((b, i) => {
          if (i === nextSpawnRef.current && !b.spawned) return { ...b, spawned: true };
          return b;
        });
        nextSpawnRef.current = Math.min(nextSpawnRef.current + 1, 9);
        return next;
      });
    }, 1000);

    const escapeInterval = window.setInterval(() => {
      if (completedRef.current) return;
      setBugs(prev => prev.map(b => {
        if (b.spawned && b.alive) {
          return { ...b, x: Math.random() * 80 + 5, y: Math.random() * 80 + 5 };
        }
        return b;
      }));
    }, 1500);

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          clearInterval(spawnInterval);
          clearInterval(escapeInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(spawnInterval);
      clearInterval(escapeInterval);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      finishGame(squashed);
    }
  }, [timeLeft, squashed, finishGame]);

  useEffect(() => {
    if (squashed + escaped >= 10 && !completedRef.current) {
      finishGame(squashed);
    }
  }, [squashed, escaped, finishGame]);

  const handleSquash = (id: number) => {
    if (result !== 'none') return;
    setBugs(prev => {
      const bug = prev.find(b => b.id === id);
      if (!bug || !bug.alive) return prev;
      setSquashed(s => s + 1);
      return prev.map(b => b.id === id ? { ...b, alive: false } : b);
    });
  };

  const activeBugs = bugs.filter(b => b.spawned && b.alive);

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Bug Squash</h3>
      <div style={{ color: '#ccc', fontSize: '11px' }}>Click the bugs before they escape!</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
        <span style={{ color: 'var(--neon-green)' }}>🐛 {squashed}/7</span>
        <span style={{ color: 'var(--neon-cyan)' }}>⏱ {timeLeft}s</span>
      </div>

      <div style={{
        position: 'relative', width: '280px', height: '220px',
        background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden',
      }}>
        {activeBugs.map(bug => (
          <div
            key={bug.id}
            onClick={() => handleSquash(bug.id)}
            style={{
              position: 'absolute',
              left: `${bug.x}%`, top: `${bug.y}%`,
              fontSize: '24px', cursor: 'pointer',
              transition: 'left 0.4s ease, top 0.4s ease',
              userSelect: 'none',
              filter: 'drop-shadow(0 0 4px rgba(0,255,0,0.5))',
            }}
          >
            🐛
          </div>
        ))}
        {bugs.filter(b => b.spawned && !b.alive).map(bug => (
          <div
            key={`dead-${bug.id}`}
            style={{
              position: 'absolute',
              left: `${bug.x}%`, top: `${bug.y}%`,
              fontSize: '18px', opacity: 0.3,
            }}
          >
            💀
          </div>
        ))}
      </div>

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>BUGS SQUASHED! 🎯</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>BUGS ESCAPED! 🐛💨</div>}
    </div>
  );
}
