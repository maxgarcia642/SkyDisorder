'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: 3 }, () => Array(3).fill(0));
}

function addRandom(grid: Grid): Grid {
  const g = grid.map(r => [...r]);
  const empty: [number, number][] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (g[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.8 ? 2 : 4;
  return g;
}

function slideRow(row: number[]): number[] {
  const filtered = row.filter(v => v !== 0);
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < 3) merged.push(0);
  return merged;
}

function moveLeft(grid: Grid): Grid {
  return grid.map(row => slideRow(row));
}

function moveRight(grid: Grid): Grid {
  return grid.map(row => slideRow([...row].reverse()).reverse());
}

function moveUp(grid: Grid): Grid {
  const transposed = grid[0].map((_, c) => grid.map(r => r[c]));
  const moved = transposed.map(row => slideRow(row));
  return moved[0].map((_, c) => moved.map(r => r[c]));
}

function moveDown(grid: Grid): Grid {
  const transposed = grid[0].map((_, c) => grid.map(r => r[c]));
  const moved = transposed.map(row => slideRow([...row].reverse()).reverse());
  return moved[0].map((_, c) => moved.map(r => r[c]));
}

function gridsEqual(a: Grid, b: Grid): boolean {
  return a.every((row, r) => row.every((v, c) => v === b[r][c]));
}

function hasMaxTile(grid: Grid, target: number): boolean {
  return grid.some(row => row.some(v => v >= target));
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  0: 'rgba(255,255,255,0.05)',
  2: '#1a1a2e',
  4: '#16213e',
  8: '#0f3460',
  16: '#533483',
  32: '#e94560',
  64: '#f5a623',
  128: '#4ade80',
};

export default function Mini2048({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(emptyGrid())));
  const [timeLeft, setTimeLeft] = useState(20);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const finishGame = useCallback((won: boolean, g: Grid) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setResult(won ? 'success' : 'fail');
    const maxTile = Math.max(...g.flat());
    const t = window.setTimeout(() => onComplete(won, maxTile), 1400);
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
      finishGame(hasMaxTile(grid, 64), grid);
    }
  }, [timeLeft, grid, finishGame]);

  const doMove = useCallback((moveFn: (g: Grid) => Grid) => {
    if (result !== 'none') return;
    setGrid(prev => {
      const moved = moveFn(prev);
      if (gridsEqual(prev, moved)) return prev;
      const next = addRandom(moved);

      if (hasMaxTile(next, 64) && !completedRef.current) {
        completedRef.current = true;
        setResult('success');
        const maxTile = Math.max(...next.flat());
        const t = window.setTimeout(() => onComplete(true, maxTile), 1400);
        timersRef.current.push(t);
      } else if (!canMove(next) && !completedRef.current) {
        completedRef.current = true;
        setResult('fail');
        const maxTile = Math.max(...next.flat());
        const t = window.setTimeout(() => onComplete(false, maxTile), 1400);
        timersRef.current.push(t);
      }

      return next;
    });
  }, [result, onComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (result !== 'none') return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); doMove(moveLeft); break;
        case 'ArrowRight': e.preventDefault(); doMove(moveRight); break;
        case 'ArrowUp': e.preventDefault(); doMove(moveUp); break;
        case 'ArrowDown': e.preventDefault(); doMove(moveDown); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doMove, result]);

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Mini 2048</h3>
      <div style={{ color: '#ccc', fontSize: '11px' }}>Reach 64 to win! Arrow keys or buttons.</div>
      <div style={{ color: 'var(--neon-cyan)', fontSize: '14px' }}>⏱ {timeLeft}s</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gap: '4px',
        background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px',
      }}>
        {grid.flat().map((val, i) => (
          <div key={i} style={{
            width: '70px', height: '70px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: TILE_COLORS[val] || '#f5a623',
            borderRadius: '4px', fontSize: val >= 64 ? '22px' : '20px',
            fontWeight: 'bold',
            color: val === 0 ? 'transparent' : val >= 64 ? 'var(--neon-yellow)' : '#fff',
            textShadow: val >= 64 ? '0 0 8px var(--neon-yellow)' : 'none',
            transition: 'background 0.15s',
          }}>
            {val || ''}
          </div>
        ))}
      </div>

      {result === 'none' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '150px' }}>
          <div />
          <button className="pixel-panel" onClick={() => doMove(moveUp)}
            style={{ cursor: 'pointer', padding: '6px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', fontSize: '14px' }}>▲</button>
          <div />
          <button className="pixel-panel" onClick={() => doMove(moveLeft)}
            style={{ cursor: 'pointer', padding: '6px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', fontSize: '14px' }}>◀</button>
          <button className="pixel-panel" onClick={() => doMove(moveDown)}
            style={{ cursor: 'pointer', padding: '6px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', fontSize: '14px' }}>▼</button>
          <button className="pixel-panel" onClick={() => doMove(moveRight)}
            style={{ cursor: 'pointer', padding: '6px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', fontSize: '14px' }}>▶</button>
        </div>
      )}

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>64 REACHED! 🏆</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>NO MOVES LEFT! 💀</div>}
    </div>
  );
}
