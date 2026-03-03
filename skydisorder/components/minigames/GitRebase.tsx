'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Commit {
  id: number;
  hash: string;
  message: string;
}

const COMMIT_SETS: Commit[][] = [
  [
    { id: 0, hash: 'a1b2c3', message: 'init: project setup' },
    { id: 1, hash: 'd4e5f6', message: 'feat: add user model' },
    { id: 2, hash: '7g8h9i', message: 'feat: add auth routes' },
    { id: 3, hash: 'j0k1l2', message: 'fix: password hashing' },
    { id: 4, hash: 'm3n4o5', message: 'deploy: v1.0 release' },
  ],
  [
    { id: 0, hash: 'f0f0f0', message: 'init: create repo' },
    { id: 1, hash: 'a1a1a1', message: 'feat: add database' },
    { id: 2, hash: 'b2b2b2', message: 'feat: add API layer' },
    { id: 3, hash: 'c3c3c3', message: 'test: add unit tests' },
    { id: 4, hash: 'd4d4d4', message: 'ci: add pipeline' },
  ],
  [
    { id: 0, hash: 'x1y2z3', message: 'init: scaffold app' },
    { id: 1, hash: 'w4v5u6', message: 'feat: add homepage' },
    { id: 2, hash: 't7s8r9', message: 'style: add CSS theme' },
    { id: 3, hash: 'q0p1o2', message: 'fix: responsive layout' },
    { id: 4, hash: 'n3m4l5', message: 'docs: update README' },
  ],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GitRebase({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const [commits] = useState(() => COMMIT_SETS[Math.floor(Math.random() * COMMIT_SETS.length)]);
  const [order, setOrder] = useState<Commit[]>(() => {
    let shuffled = shuffle(commits);
    while (shuffled.every((c, i) => c.id === i)) shuffled = shuffle(commits);
    return shuffled;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const finishGame = useCallback((won: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, won ? 100 : 0), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      finishGame(false);
    }
  }, [timeLeft, finishGame]);

  const handleClick = (idx: number) => {
    if (result !== 'none') return;
    if (selected === null) {
      setSelected(idx);
    } else {
      const newOrder = [...order];
      [newOrder[selected], newOrder[idx]] = [newOrder[idx], newOrder[selected]];
      setOrder(newOrder);
      setSelected(null);

      if (newOrder.every((c, i) => c.id === i)) {
        finishGame(true);
      }
    }
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Git Rebase</h3>
      <div style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>
        Reorder commits chronologically! Click two to swap.
      </div>
      <div style={{ color: 'var(--neon-cyan)', fontSize: '14px' }}>⏱ {timeLeft}s</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: 320 }}>
        {order.map((commit, idx) => (
          <button
            key={commit.hash}
            className="pixel-panel"
            onClick={() => handleClick(idx)}
            style={{
              cursor: result === 'none' ? 'pointer' : 'default',
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: '8px 12px', fontSize: '11px', textAlign: 'left',
              color: selected === idx ? 'var(--neon-yellow)' : '#ccc',
              borderColor: selected === idx ? 'var(--neon-yellow)' : undefined,
              background: selected === idx ? 'rgba(255,255,0,0.08)' : undefined,
            }}
          >
            <span style={{ color: 'var(--neon-pink)', fontFamily: 'monospace', flexShrink: 0 }}>{commit.hash}</span>
            <span>{commit.message}</span>
          </button>
        ))}
      </div>

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>REBASE COMPLETE! 🔀</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>MERGE CONFLICT! 💥</div>}
    </div>
  );
}
