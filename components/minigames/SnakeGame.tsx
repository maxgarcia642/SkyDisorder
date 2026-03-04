'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Cell = { x: number; y: number };

const GRID = 20;
const CELL_PX = 18;
const TIME_LIMIT = 10;
const FOOD_GOAL = 5;
const TICK_MS = 120;

export default function SnakeGame({ onComplete }: Props) {
  const [snake, setSnake] = useState<Cell[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Cell>({ x: 15, y: 10 });
  const [eaten, setEaten] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const dirRef = useRef<Direction>('RIGHT');
  const gameOverRef = useRef(false);
  const completedRef = useRef(false);

  const spawnFood = useCallback((currentSnake: Cell[]): Cell => {
    let pos: Cell;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (currentSnake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w') && d !== 'DOWN') dirRef.current = 'UP';
      if ((e.key === 'ArrowDown' || e.key === 's') && d !== 'UP') dirRef.current = 'DOWN';
      if ((e.key === 'ArrowLeft' || e.key === 'a') && d !== 'RIGHT') dirRef.current = 'LEFT';
      if ((e.key === 'ArrowRight' || e.key === 'd') && d !== 'LEFT') dirRef.current = 'RIGHT';
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (gameOverRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          gameOverRef.current = true;
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      if (gameOverRef.current) return;

      setSnake((prev) => {
        const head = prev[0];
        const dir = dirRef.current;
        const next: Cell = {
          x: dir === 'LEFT' ? head.x - 1 : dir === 'RIGHT' ? head.x + 1 : head.x,
          y: dir === 'UP' ? head.y - 1 : dir === 'DOWN' ? head.y + 1 : head.y,
        };

        if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID ||
            prev.some((s) => s.x === next.x && s.y === next.y)) {
          gameOverRef.current = true;
          setGameOver(true);
          return prev;
        }

        const newSnake = [next, ...prev];

        setFood((currentFood) => {
          if (next.x === currentFood.x && next.y === currentFood.y) {
            setEaten((e) => {
              const newEaten = e + 1;
              if (newEaten >= FOOD_GOAL) {
                gameOverRef.current = true;
                setGameOver(true);
              }
              return newEaten;
            });
            const spawned = spawnFood(newSnake);
            return spawned;
          }
          newSnake.pop();
          return currentFood;
        });

        return newSnake;
      });
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [spawnFood]);

  useEffect(() => {
    if (!gameOver || completedRef.current) return;
    completedRef.current = true;
    const success = eaten >= FOOD_GOAL;
    setResult(success ? 'success' : 'fail');
    setTimeout(() => onComplete(success, success ? eaten * 20 : 0), 1500);
  }, [gameOver, eaten, onComplete]);

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px' }}>
      <h3 style={{ color: 'var(--neon-green)' }}>Snake Dash</h3>
      <p style={{ color: '#ccc', textAlign: 'center' }}>Eat {FOOD_GOAL} items in {TIME_LIMIT}s! Use arrow keys or WASD.</p>
      <div style={{ color: '#fff', display: 'flex', gap: '20px' }}>
        <span>Time: {timeLeft}s</span>
        <span>Eaten: {eaten}/{FOOD_GOAL}</span>
      </div>

      <div style={{
        width: GRID * CELL_PX,
        height: GRID * CELL_PX,
        background: '#111',
        border: '3px solid var(--neon-green)',
        position: 'relative',
        boxShadow: '0 0 15px rgba(74, 222, 128, 0.2)',
      }}>
        {snake.map((cell, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cell.x * CELL_PX,
              top: cell.y * CELL_PX,
              width: CELL_PX - 1,
              height: CELL_PX - 1,
              background: i === 0 ? 'var(--neon-green)' : '#2e7d32',
              borderRadius: i === 0 ? '3px' : '1px',
            }}
          />
        ))}
        <div style={{
          position: 'absolute',
          left: food.x * CELL_PX,
          top: food.y * CELL_PX,
          width: CELL_PX - 1,
          height: CELL_PX - 1,
          background: 'var(--neon-red)',
          borderRadius: '50%',
          boxShadow: '0 0 6px var(--neon-red)',
        }} />
      </div>

      {/* Mobile direction buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => { if (dirRef.current !== 'DOWN') dirRef.current = 'UP'; }}
          className="pixel-panel" style={{ width: 48, height: 36, cursor: 'pointer', fontSize: 14, padding: 0 }}>▲</button>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => { if (dirRef.current !== 'RIGHT') dirRef.current = 'LEFT'; }}
            className="pixel-panel" style={{ width: 48, height: 36, cursor: 'pointer', fontSize: 14, padding: 0 }}>◄</button>
          <button onClick={() => { if (dirRef.current !== 'UP') dirRef.current = 'DOWN'; }}
            className="pixel-panel" style={{ width: 48, height: 36, cursor: 'pointer', fontSize: 14, padding: 0 }}>▼</button>
          <button onClick={() => { if (dirRef.current !== 'LEFT') dirRef.current = 'RIGHT'; }}
            className="pixel-panel" style={{ width: 48, height: 36, cursor: 'pointer', fontSize: 14, padding: 0 }}>►</button>
        </div>
      </div>

      <button
        className="pixel-panel"
        onClick={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            gameOverRef.current = true;
            onComplete(false, 0);
          }
        }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}
      >
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '24px' }}>SNAKE MASTER!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '24px' }}>TOO SLOW!</div>}
    </div>
  );
}
