'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const PIN_POSITIONS = [
  { x: 50, y: 15 },
  { x: 42, y: 28 }, { x: 58, y: 28 },
  { x: 34, y: 41 }, { x: 50, y: 41 }, { x: 66, y: 41 },
  { x: 26, y: 54 }, { x: 42, y: 54 }, { x: 58, y: 54 }, { x: 74, y: 54 },
];

export default function BowlingStrike({ onComplete }: Props) {
  const [aimX, setAimX] = useState(50);
  const [phase, setPhase] = useState<'aim' | 'power' | 'rolling' | 'result'>('aim');
  const [power, setPower] = useState(0);
  const [pinsDown, setPinsDown] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const completedRef = useRef(false);
  const aimDirRef = useRef(1);
  const powerDirRef = useRef(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const animateAim = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setAimX((prev) => {
      let next = prev + aimDirRef.current * 60 * delta;
      if (next >= 85) { next = 85; aimDirRef.current = -1; }
      if (next <= 15) { next = 15; aimDirRef.current = 1; }
      return next;
    });
    rafRef.current = requestAnimationFrame(animateAim);
  }, []);

  const animatePower = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setPower((prev) => {
      let next = prev + powerDirRef.current * 80 * delta;
      if (next >= 100) { next = 100; powerDirRef.current = -1; }
      if (next <= 0) { next = 0; powerDirRef.current = 1; }
      return next;
    });
    rafRef.current = requestAnimationFrame(animatePower);
  }, []);

  useEffect(() => {
    if (phase === 'aim') {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animateAim);
    } else if (phase === 'power') {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animatePower);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, animateAim, animatePower]);

  const handleClick = () => {
    if (phase === 'aim') {
      cancelAnimationFrame(rafRef.current);
      setPhase('power');
    } else if (phase === 'power') {
      cancelAnimationFrame(rafRef.current);
      setPhase('rolling');

      const hitRadius = 8 + (power / 100) * 12;
      const knocked = new Set<number>();
      PIN_POSITIONS.forEach((pin, i) => {
        const dist = Math.abs(pin.x - aimX);
        if (dist <= hitRadius) knocked.add(i);
      });
      setPinsDown(knocked);

      setTimeout(() => {
        setPhase('result');
        const count = knocked.size;
        const success = count >= 7;
        setResult(success ? 'success' : 'fail');
        if (!completedRef.current) {
          completedRef.current = true;
          setTimeout(() => onComplete(success, count * 10), 1500);
        }
      }, 1000);
    }
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '12px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Bowling Strike</h3>
      <p style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>
        {phase === 'aim' ? 'Click to set aim!' : phase === 'power' ? 'Click to set power!' : phase === 'rolling' ? 'Rolling...' : `Pins down: ${pinsDown.size}/10`}
      </p>

      {/* Lane */}
      <div style={{
        width: 240, height: 280, position: 'relative',
        background: 'linear-gradient(180deg, #5d4037 0%, #795548 100%)',
        border: '3px solid #8d6e63', borderRadius: '4px', overflow: 'hidden',
      }}>
        {/* Lane lines */}
        <div style={{ position: 'absolute', left: '20%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', left: '80%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.05)' }} />

        {/* Pins */}
        {PIN_POSITIONS.map((pin, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`,
            width: 14, height: 14, borderRadius: '50%',
            background: pinsDown.has(i) ? 'rgba(100,100,100,0.3)' : '#fff',
            border: pinsDown.has(i) ? '1px solid #555' : '2px solid #ddd',
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s',
            boxShadow: pinsDown.has(i) ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
          }} />
        ))}

        {/* Ball / aim indicator */}
        {(phase === 'aim' || phase === 'power') && (
          <div style={{
            position: 'absolute', left: `${aimX}%`, bottom: '8%',
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--neon-red)', transform: 'translateX(-50%)',
            boxShadow: '0 0 10px var(--neon-red)',
          }} />
        )}

        {phase === 'rolling' && (
          <div style={{
            position: 'absolute', left: `${aimX}%`, top: '40%',
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--neon-red)', transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px var(--neon-red)',
            transition: 'top 0.8s ease-out',
          }} />
        )}
      </div>

      {/* Power bar */}
      {phase === 'power' && (
        <div style={{ width: 240, height: 20, background: '#222', border: '2px solid #555', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${power}%`, height: '100%',
            background: power > 80 ? 'var(--neon-red)' : power > 50 ? 'var(--neon-yellow)' : 'var(--neon-green)',
            transition: 'width 0.05s linear',
          }} />
        </div>
      )}

      {(phase === 'aim' || phase === 'power') && (
        <button className="pixel-panel" onClick={handleClick}
          style={{ cursor: 'pointer', padding: '10px 24px', color: 'var(--neon-yellow)', borderColor: 'var(--neon-yellow)', fontSize: '14px' }}>
          {phase === 'aim' ? 'SET AIM' : 'SET POWER'}
        </button>
      )}

      {phase !== 'result' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>STRIKE!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>GUTTER BALL!</div>}
    </div>
  );
}
