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
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    onStop(Math.round(valueRef.current));
  }, [frozen, onStop]);

  useEffect(() => {
    if (active) setFrozen(false);
  }, [active]);

  return (
    <div className="power-meter-wrapper" onClick={handleStop} style={{ cursor: 'pointer' }}>
      <div className="power-meter-label pixel-text">
        {type === 'power' ? 'POWER' : 'ACCURACY'}
      </div>
      <div className="power-meter">
        <div
          className="power-fill"
          style={{ width: `${value}%` }}
        />
        {type === 'accuracy' && (
          <div
            className="accuracy-target-zone"
            style={{
              position: 'absolute',
              left: '45%',
              width: '10%',
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(74, 222, 128, 0.3)',
              borderLeft: '2px solid #4ade80',
              borderRight: '2px solid #4ade80',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      <div className="power-meter-value pixel-text" style={{ textAlign: 'center', marginTop: 4 }}>
        {Math.round(value)}
      </div>
    </div>
  );
}
