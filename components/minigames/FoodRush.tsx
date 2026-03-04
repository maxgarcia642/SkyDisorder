'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface FoodItem {
  id: number;
  name: string;
  emoji: string;
  cuisine: string;
}

const CUISINES = ['Italian', 'Japanese', 'Mexican', 'Indian'];
const FOODS: FoodItem[] = [
  { id: 0, name: 'Pizza', emoji: '🍕', cuisine: 'Italian' },
  { id: 1, name: 'Pasta', emoji: '🍝', cuisine: 'Italian' },
  { id: 2, name: 'Sushi', emoji: '🍣', cuisine: 'Japanese' },
  { id: 3, name: 'Ramen', emoji: '🍜', cuisine: 'Japanese' },
  { id: 4, name: 'Taco', emoji: '🌮', cuisine: 'Mexican' },
  { id: 5, name: 'Burrito', emoji: '🌯', cuisine: 'Mexican' },
  { id: 6, name: 'Curry', emoji: '🍛', cuisine: 'Indian' },
  { id: 7, name: 'Naan', emoji: '🫓', cuisine: 'Indian' },
  { id: 8, name: 'Gelato', emoji: '🍨', cuisine: 'Italian' },
  { id: 9, name: 'Tempura', emoji: '🍤', cuisine: 'Japanese' },
  { id: 10, name: 'Nachos', emoji: '🧀', cuisine: 'Mexican' },
  { id: 11, name: 'Samosa', emoji: '🥟', cuisine: 'Indian' },
];

const ROUNDS = 8;
const TIME_LIMIT = 15;

export default function FoodRush({ onComplete }: Props) {
  const [currentFood, setCurrentFood] = useState<FoodItem>(() => FOODS[Math.floor(Math.random() * FOODS.length)]);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const gameOverRef = useRef(false);
  const completedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (gameOverRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          gameOverRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      const success = correct >= 5;
      setResult(success ? 'success' : 'fail');
      completedRef.current = true;
      timersRef.current.push(setTimeout(() => onComplete(success, correct * 12), 1500));
    }
  }, [timeLeft, correct, onComplete]);

  const handleChoice = (cuisine: string) => {
    if (feedback || gameOverRef.current || result !== 'none') return;
    const isCorrect = cuisine === currentFood.cuisine;
    const newCorrect = isCorrect ? correct + 1 : correct;
    setCorrect(newCorrect);
    setFeedback(isCorrect ? 'YUM!' : `NOPE! It's ${currentFood.cuisine}`);

    timersRef.current.push(setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        gameOverRef.current = true;
        const success = newCorrect >= 5;
        setResult(success ? 'success' : 'fail');
        if (!completedRef.current) {
          completedRef.current = true;
          timersRef.current.push(setTimeout(() => onComplete(success, newCorrect * 12), 1500));
        }
      } else {
        setRound(nextRound);
        setCurrentFood(FOODS[Math.floor(Math.random() * FOODS.length)]);
        setFeedback(null);
      }
    }, 600));
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Food Rush</h3>
      <p style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>Sort the food to the right cuisine! Fast!</p>
      <div style={{ display: 'flex', gap: '16px', color: '#fff', fontSize: '12px' }}>
        <span>Time: {timeLeft}s</span>
        <span>Score: {correct}/{round}</span>
      </div>

      {result === 'none' && (
        <div style={{
          fontSize: '48px', padding: '16px', background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px', border: '2px solid #555', textAlign: 'center', minWidth: 120,
        }}>
          {currentFood.emoji}
          <div style={{ fontSize: '12px', color: 'var(--neon-cyan)', marginTop: '4px' }}>{currentFood.name}</div>
        </div>
      )}

      {feedback && (
        <div style={{ color: feedback === 'YUM!' ? 'var(--neon-green)' : 'var(--neon-red)', fontSize: '16px' }}>
          {feedback}
        </div>
      )}

      {result === 'none' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {CUISINES.map((c) => (
            <button key={c} className="pixel-panel" onClick={() => handleChoice(c)}
              style={{
                cursor: 'pointer', padding: '10px 16px', fontSize: '12px',
                color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)',
                minWidth: 110,
              }}>
              {c}
            </button>
          ))}
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { timersRef.current.forEach(t => clearTimeout(t)); if (!completedRef.current) { completedRef.current = true; gameOverRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>FOOD CRITIC!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>FOOD POISONING!</div>}
    </div>
  );
}
