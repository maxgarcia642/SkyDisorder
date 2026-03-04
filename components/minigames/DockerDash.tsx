'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const LABELS = ['web', 'api', 'db', 'cache'];

interface Container {
  id: number;
  column: number;
  label: string;
  color: string;
  y: number;
  placed: boolean;
}

export default function DockerDash({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const [containers, setContainers] = useState<Container[]>(() => {
    const items: Container[] = [];
    for (let i = 0; i < 8; i++) {
      const col = i % 4;
      items.push({
        id: i,
        column: col,
        label: LABELS[col],
        color: COLORS[col],
        y: -20 - Math.random() * 60,
        placed: false,
      });
    }
    return items.sort(() => Math.random() - 0.5);
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [placements, setPlacements] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const finishGame = useCallback((correct: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const won = correct >= 6;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, correct * 12), 1400);
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
      const correct = placements.filter((col, i) => col === containers[i].column).length;
      finishGame(correct);
    }
  }, [timeLeft, placements, containers, finishGame]);

  const placeInColumn = (col: number) => {
    if (result !== 'none' || currentIdx >= containers.length) return;
    const newPlacements = [...placements, col];
    setPlacements(newPlacements);
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);

    if (nextIdx >= containers.length) {
      const correct = newPlacements.filter((c, i) => c === containers[i].column).length;
      finishGame(correct);
    }
  };

  const current = currentIdx < containers.length ? containers[currentIdx] : null;

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Docker Dash</h3>
      <div style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>
        Sort containers into the right column! ({placements.length}/8)
      </div>
      <div style={{ color: 'var(--neon-cyan)', fontSize: '14px' }}>⏱ {timeLeft}s</div>

      {current && result === 'none' && (
        <div style={{
          padding: '10px 20px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold',
          background: current.color, color: '#000', textTransform: 'uppercase',
          boxShadow: `0 0 12px ${current.color}`,
        }}>
          📦 {current.label}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {LABELS.map((label, col) => (
          <button
            key={col}
            className="pixel-panel"
            disabled={result !== 'none'}
            onClick={() => placeInColumn(col)}
            style={{
              cursor: result === 'none' ? 'pointer' : 'default',
              padding: '12px 10px', minWidth: '60px', fontSize: '11px',
              color: COLORS[col], borderColor: COLORS[col],
              opacity: result !== 'none' ? 0.4 : 1,
            }}
          >
            {label.toUpperCase()}
            <div style={{ fontSize: '9px', color: '#888', marginTop: '4px' }}>
              {placements.filter((c, i) => i < placements.length && c === col).length}
            </div>
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
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>CONTAINERS DEPLOYED! 🐳</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>STACK OVERFLOW 💥</div>}
    </div>
  );
}
