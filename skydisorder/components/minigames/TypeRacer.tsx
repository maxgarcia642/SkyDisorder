'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const SNIPPETS = [
  'const x = arr.map()',
  'if (err) throw err;',
  'return res.json()',
  'let sum = a + b;',
  'for (let i = 0;)',
  'import React from',
  'export default fn',
  'await fetch(url)',
  'console.log(data)',
  'arr.filter(Boolean)',
  'obj?.key ?? null',
  'try { parse() }',
  'new Map().set(k,v)',
  'str.split("").join',
  'fn = () => void 0;',
];

function pickRandom(exclude: string[]): string {
  const available = SNIPPETS.filter(s => !exclude.includes(s));
  return available[Math.floor(Math.random() * available.length)] || SNIPPETS[0];
}

export default function TypeRacer({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const [usedSnippets] = useState<string[]>([]);
  const [snippet, setSnippet] = useState(() => pickRandom([]));
  const [input, setInput] = useState('');
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finishGame = useCallback((wins: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const won = wins >= 2;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, wins * 33), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [round]);

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
  }, [round]);

  useEffect(() => {
    if (timeLeft === 0 && result === 'none') {
      handleRoundEnd(false);
    }
  }, [timeLeft]);

  const handleRoundEnd = (matched: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const newCorrect = matched ? correct + 1 : correct;
    if (matched) setCorrect(newCorrect);
    setRoundFeedback(matched ? 'MATCH!' : 'MISS!');

    if (round >= 3) {
      finishGame(newCorrect);
    } else {
      const t = window.setTimeout(() => {
        if (completedRef.current) return;
        usedSnippets.push(snippet);
        setSnippet(pickRandom(usedSnippets));
        setInput('');
        setRound(r => r + 1);
        setTimeLeft(8);
        setRoundFeedback(null);
      }, 800);
      timersRef.current.push(t);
    }
  };

  const handleSubmit = () => {
    if (result !== 'none' || roundFeedback) return;
    const matched = input.trim() === snippet;
    handleRoundEnd(matched);
  };

  const charColors = snippet.split('').map((ch, i) => {
    if (i >= input.length) return '#666';
    return input[i] === ch ? 'var(--neon-green)' : 'var(--neon-red)';
  });

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Type Racer</h3>
      <div style={{ color: '#ccc', fontSize: '11px' }}>Type the code snippet exactly!</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span style={{ color: 'var(--neon-cyan)' }}>Round {round}/3</span>
        <span style={{ color: 'var(--neon-green)' }}>✓ {correct}</span>
        <span style={{ color: 'var(--neon-pink)' }}>⏱ {timeLeft}s</span>
      </div>

      <div style={{
        fontFamily: 'monospace', fontSize: '16px', letterSpacing: '1px',
        padding: '10px 14px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px',
        whiteSpace: 'pre',
      }}>
        {snippet.split('').map((ch, i) => (
          <span key={i} style={{ color: charColors[i] }}>{ch}</span>
        ))}
      </div>

      {result === 'none' && !roundFeedback && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="pixel-panel"
            style={{
              width: '220px', padding: '8px', fontSize: '14px',
              background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'monospace',
            }}
            placeholder="type here..."
            autoFocus
          />
          <button className="pixel-panel" onClick={handleSubmit}
            style={{ cursor: 'pointer', padding: '8px 14px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>
            ⏎
          </button>
        </div>
      )}

      {roundFeedback && result === 'none' && (
        <div style={{
          color: roundFeedback === 'MATCH!' ? 'var(--neon-green)' : 'var(--neon-red)',
          fontSize: '16px',
        }}>
          {roundFeedback}
        </div>
      )}

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>SPEED DEMON! ⌨️</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>TOO SLOW! 🐌</div>}
    </div>
  );
}
