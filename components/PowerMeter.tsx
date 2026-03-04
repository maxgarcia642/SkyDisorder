'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PowerMeterProps {
  type: 'power' | 'accuracy';
  onStop: (value: number) => void;
  active: boolean;
}

export default function PowerMeter({ type, onStop, active }: PowerMeterProps) {
  const [value, setValue] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirRef = useRef(1);
  const valueRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!active || frozen) return;

    setValue(0);
    valueRef.current = 0;
    dirRef.current = 1;
    lastRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastRef.current;
      if (dt >= 20) {
        lastRef.current = now;
        let next = valueRef.current + dirRef.current * 2.5;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        if (next <= 0) { next = 0; dirRef.current = 1; }
        valueRef.current = next;
        setValue(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, frozen]);

  const handleStop = useCallback(() => {
    if (frozen) return;
    setFrozen(true);
    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 300);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    onStop(Math.round(valueRef.current));
  }, [frozen, onStop]);

  useEffect(() => {
    if (active) setFrozen(false);
  }, [active]);

  useEffect(() => {
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!active || frozen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, frozen, handleStop]);

  const inSweetSpot = value >= 45 && value <= 55;
  const valueColor = inSweetSpot ? 'var(--neon-green)' : value >= 35 && value <= 65 ? 'var(--neon-yellow)' : 'var(--neon-red)';

  return (
    <div className="power-meter-wrapper" onClick={handleStop}
      style={{ cursor: 'pointer', transition: 'transform 0.1s', transform: flash ? 'scale(1.03)' : 'scale(1)' }}>
      <div className="power-meter-label pixel-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{type === 'power' ? 'POWER' : 'ACCURACY'}</span>
        <span style={{ fontSize: '8px', color: 'var(--text-dim)' }}>Click or press Space</span>
      </div>
      <div className="power-meter">
        <div className="power-fill" style={{ width: `${value}%` }} />
        {/* Sweet spot indicator on both meters */}
        <div style={{
          position: 'absolute', left: '45%', width: '10%', top: 0, bottom: 0,
          backgroundColor: 'rgba(74, 222, 128, 0.25)',
          borderLeft: '2px solid rgba(74, 222, 128, 0.6)',
          borderRight: '2px solid rgba(74, 222, 128, 0.6)',
          pointerEvents: 'none',
        }} />
      </div>
      <div className="power-meter-value pixel-text" style={{ textAlign: 'center', marginTop: 4, color: valueColor, transition: 'color 0.1s' }}>
        {Math.round(value)} {flash && <span style={{ color: 'var(--neon-green)' }}>LOCKED!</span>}
      </div>
    </div>
  );
}
