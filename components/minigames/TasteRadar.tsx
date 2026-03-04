'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const COLORS = ['Red', 'Green', 'Blue'];
const COLOR_MAP: Record<string, string> = {
  Red: 'var(--neon-red, #ff4444)',
  Green: 'var(--neon-green, #44ff44)',
  Blue: 'var(--neon-blue, #4444ff)'
};

export default function TasteRadar({ onComplete }: Props) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [flashingColor, setFlashingColor] = useState<string | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState(true);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');

  const completedRef = useRef(false);

  useEffect(() => {
    const newSeq = Array.from({ length: 4 }).map(() => COLORS[Math.floor(Math.random() * COLORS.length)]);
    setSequence(newSeq);

    let i = 0;
    const playNext = () => {
      if (i >= newSeq.length) {
        setIsPlayingSequence(false);
        return;
      }
      setFlashingColor(newSeq[i]);
      setTimeout(() => {
        setFlashingColor(null);
        i++;
        setTimeout(playNext, 300);
      }, 700);
    };

    setTimeout(playNext, 1000);
  }, []);

  const handleColorClick = (color: string) => {
    if (isPlayingSequence || result !== 'none') return;

    const newPlayerSeq = [...playerSequence, color];
    setPlayerSequence(newPlayerSeq);

    setFlashingColor(color);
    setTimeout(() => setFlashingColor(null), 200);

    const currentIndex = newPlayerSeq.length - 1;
    if (sequence[currentIndex] !== color) {
      setResult('fail');
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); }
      }, 1500);
    } else if (newPlayerSeq.length === sequence.length) {
      setResult('success');
      setTimeout(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(true, 100); }
      }, 1500);
    }
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '20px' }}>
      <h3 style={{ color: 'var(--neon-blue, #60a5fa)' }}>Taste Radar</h3>
      <p style={{ color: '#ccc' }}>Repeat the sequence of 4 colors!</p>

      {isPlayingSequence ? (
        <div style={{ color: 'var(--neon-yellow)', marginBottom: '10px' }}>MEMORIZE...</div>
      ) : (
        <div style={{ color: 'var(--neon-green, #4ade80)', marginBottom: '10px' }}>YOUR TURN!</div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        {COLORS.map(color => (
          <button
            key={color}
            className="pixel-panel"
            onClick={() => handleColorClick(color)}
            disabled={isPlayingSequence || result !== 'none'}
            style={{
              width: '80px',
              height: '80px',
              cursor: isPlayingSequence ? 'default' : 'pointer',
              background: flashingColor === color ? COLOR_MAP[color] : 'transparent',
              borderColor: COLOR_MAP[color],
              color: flashingColor === color ? '#fff' : COLOR_MAP[color],
              transition: 'background 0.1s'
            }}
          >
            {color}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid #555',
              background: playerSequence[i] ? COLOR_MAP[playerSequence[i]] : 'transparent'
            }}
          />
        ))}
      </div>

      <button
        className="pixel-panel"
        onClick={() => {
          if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); }
        }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}
      >
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green, #4ade80)', fontSize: '24px', marginTop: '10px' }}>SEQUENCE CORRECT!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red, #ff4444)', fontSize: '24px', marginTop: '10px' }}>WRONG SEQUENCE!</div>}
    </div>
  );
}
