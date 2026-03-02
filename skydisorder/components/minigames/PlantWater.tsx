'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Plant {
  id: number;
  name: string;
  emoji: string;
  thirst: number;
  wilting: boolean;
  watered: boolean;
}

const PLANT_TYPES = [
  { name: 'Fern', emoji: '🌿' },
  { name: 'Cactus', emoji: '🌵' },
  { name: 'Flower', emoji: '🌸' },
  { name: 'Tulip', emoji: '🌷' },
  { name: 'Herb', emoji: '🌱' },
  { name: 'Tree', emoji: '🌳' },
  { name: 'Rose', emoji: '🌹' },
  { name: 'Sunflower', emoji: '🌻' },
];

const PLANT_COUNT = 6;
const TIME_LIMIT = 12;
const WILT_THRESHOLD = 80;

export default function PlantWater({ onComplete }: Props) {
  const [plants, setPlants] = useState<Plant[]>(() =>
    Array.from({ length: PLANT_COUNT }, (_, i) => {
      const type = PLANT_TYPES[i % PLANT_TYPES.length];
      return { id: i, name: type.name, emoji: type.emoji, thirst: Math.random() * 30 + 10, wilting: false, watered: false };
    })
  );
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const gameOverRef = useRef(false);
  const completedRef = useRef(false);

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
    const thirstTimer = setInterval(() => {
      if (gameOverRef.current) return;
      setPlants((prev) => prev.map((p) => {
        if (p.watered) return p;
        const newThirst = p.thirst + 4 + Math.random() * 3;
        return { ...p, thirst: Math.min(100, newThirst), wilting: newThirst >= WILT_THRESHOLD };
      }));
    }, 500);
    return () => clearInterval(thirstTimer);
  }, []);

  useEffect(() => {
    if (!gameOver || completedRef.current) return;
    completedRef.current = true;
    const wateredCount = plants.filter((p) => p.watered).length;
    const success = wateredCount >= PLANT_COUNT - 1;
    setResult(success ? 'success' : 'fail');
    setTimeout(() => onComplete(success, wateredCount * 15), 1500);
  }, [gameOver, plants, onComplete]);

  const waterPlant = (id: number) => {
    if (gameOverRef.current) return;
    setPlants((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, thirst: 0, wilting: false, watered: true } : p));
      if (updated.every((p) => p.watered)) {
        gameOverRef.current = true;
        setGameOver(true);
      }
      return updated;
    });
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-green)' }}>Plant Water</h3>
      <p style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>Water all plants before they wilt! Tap each one.</p>
      <div style={{ display: 'flex', gap: '16px', color: '#fff', fontSize: '12px' }}>
        <span>Time: {timeLeft}s</span>
        <span>Watered: {plants.filter((p) => p.watered).length}/{PLANT_COUNT}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {plants.map((p) => (
          <button
            key={p.id}
            onClick={() => !p.watered && waterPlant(p.id)}
            disabled={p.watered || gameOver}
            className="pixel-panel"
            style={{
              width: 90, height: 100, cursor: p.watered ? 'default' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
              background: p.watered ? 'rgba(74,222,128,0.15)' : p.wilting ? 'rgba(255,68,68,0.15)' : 'rgba(0,0,0,0.3)',
              borderColor: p.watered ? 'var(--neon-green)' : p.wilting ? 'var(--neon-red)' : '#555',
              transition: 'all 0.2s',
              opacity: p.watered ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: '28px', filter: p.wilting && !p.watered ? 'grayscale(0.7)' : 'none' }}>{p.emoji}</span>
            <span style={{ fontSize: '8px', color: p.watered ? 'var(--neon-green)' : p.wilting ? 'var(--neon-red)' : '#aaa' }}>
              {p.watered ? 'HAPPY' : p.wilting ? 'WILTING!' : p.name}
            </span>
            {!p.watered && (
              <div style={{ width: '80%', height: 4, background: '#333', borderRadius: 2 }}>
                <div style={{
                  width: `${p.thirst}%`, height: '100%', borderRadius: 2,
                  background: p.thirst > 70 ? 'var(--neon-red)' : p.thirst > 40 ? 'var(--neon-yellow)' : 'var(--neon-green)',
                  transition: 'width 0.3s',
                }} />
              </div>
            )}
          </button>
        ))}
      </div>

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; gameOverRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>GREEN THUMB!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>PLANTS WILTED!</div>}
    </div>
  );
}
