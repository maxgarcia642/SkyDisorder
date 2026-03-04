'use client';

import React, { useState, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

export default function NumberGuess({ onComplete }: Props) {
  const [target] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<{ value: number; hint: string }[]>([]);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const maxAttempts = 7;
  const completedRef = useRef(false);

  const handleGuess = () => {
    if (result !== 'none' || !guess.trim()) return;
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < 1 || num > 100) return;

    const hint = num === target ? 'CORRECT!' : num < target ? 'TOO LOW' : 'TOO HIGH';
    const newAttempts = [...attempts, { value: num, hint }];
    setAttempts(newAttempts);
    setGuess('');

    if (num === target) {
      setResult('success');
      const score = Math.max(10, 100 - (newAttempts.length - 1) * 15);
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(true, score); }
      }, 1500);
    } else if (newAttempts.length >= maxAttempts) {
      setResult('fail');
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); }
      }, 1500);
    }
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px', minWidth: 320 }}>
      <h3 style={{ color: 'var(--neon-green)' }}>Number Guess</h3>
      <p style={{ color: '#ccc', textAlign: 'center', fontSize: '12px' }}>
        Guess the number between 1-100!<br />You have {maxAttempts} attempts.
      </p>
      <div style={{ color: 'var(--neon-yellow)' }}>Attempts: {attempts.length}/{maxAttempts}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxHeight: 140, overflowY: 'auto' }}>
        {attempts.map((a, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
            background: a.hint === 'CORRECT!' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)',
            borderRadius: '2px', fontSize: '12px',
          }}>
            <span style={{ color: '#fff' }}>#{i + 1}: {a.value}</span>
            <span style={{ color: a.hint === 'TOO LOW' ? 'var(--neon-blue)' : a.hint === 'TOO HIGH' ? 'var(--neon-red)' : 'var(--neon-green)' }}>
              {a.hint}
            </span>
          </div>
        ))}
      </div>

      {result === 'none' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number" min={1} max={100}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            className="pixel-panel"
            style={{ width: 80, padding: '8px', fontSize: '16px', background: 'rgba(0,0,0,0.5)', color: '#fff', textAlign: 'center' }}
            placeholder="?"
          />
          <button className="pixel-panel" onClick={handleGuess}
            style={{ cursor: 'pointer', padding: '8px 16px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>
            GUESS
          </button>
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '24px' }}>NAILED IT!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '24px' }}>It was {target}!</div>}
    </div>
  );
}
