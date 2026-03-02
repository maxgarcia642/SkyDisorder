'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const FILL_RATE = 30; // percent per second, frame-rate independent

export default function CoffeePour({ onComplete }: Props) {
  const [fillLevel, setFillLevel] = useState(0);
  const [isPouring, setIsPouring] = useState(false);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const pour = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setFillLevel((prev) => {
      const next = prev + FILL_RATE * delta;
      return next >= 100 ? 100 : next;
    });

    requestRef.current = requestAnimationFrame(pour);
  }, []);

  useEffect(() => {
    if (isPouring) {
      lastTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(pour);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPouring, pour]);

  const handlePointerDown = () => {
    if (result !== 'none') return;
    setIsPouring(true);
  };

  const handlePointerUp = () => {
    if (result !== 'none' || !isPouring) return;
    setIsPouring(false);

    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    if (fillLevel >= 80 && fillLevel <= 90) {
      setResult('success');
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(true, 100); }
      }, 1500);
    } else {
      setResult('fail');
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); }
      }, 1500);
    }
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Coffee Pour</h3>
      <p style={{ color: '#ccc', textAlign: 'center' }}>Hold POUR to fill the cup.<br/>Release between 80% and 90%!</p>

      <div style={{ width: '100px', height: '300px', border: '4px solid #fff', position: 'relative', background: '#222' }}>
        <div style={{ position: 'absolute', bottom: '80%', height: '10%', width: '100%', background: 'rgba(74, 222, 128, 0.3)', borderTop: '2px dashed var(--neon-green)', borderBottom: '2px dashed var(--neon-green)' }} />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${fillLevel}%`, background: '#8B4513', transition: 'height 0.05s linear' }} />
      </div>

      <button
        className="pixel-panel"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: 'pointer', padding: '20px 40px', fontSize: '24px', userSelect: 'none', color: isPouring ? 'var(--neon-green)' : '#fff', touchAction: 'none' }}
      >
        POUR
      </button>

      <button
        className="pixel-panel"
        onClick={() => {
          if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); }
        }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}
      >
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '24px' }}>PERFECT POUR!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '24px' }}>FAILED!</div>}
    </div>
  );
}
