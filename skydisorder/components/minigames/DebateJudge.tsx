'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Debate {
  topic: string;
  argA: string;
  argB: string;
  winner: 'A' | 'B';
}

const DEBATES: Debate[] = [
  { topic: 'Tabs vs Spaces', argA: 'Tabs adapt to any display width preference.', argB: 'Spaces ensure consistent formatting everywhere.', winner: 'B' },
  { topic: 'Dark Mode vs Light Mode', argA: 'Dark mode reduces eye strain and saves battery on OLED.', argB: 'Light mode is better for readability in bright environments.', winner: 'A' },
  { topic: 'Monolith vs Microservices', argA: 'Monoliths are simpler to deploy, test, and debug.', argB: 'Microservices scale independently and isolate failures.', winner: 'A' },
  { topic: 'REST vs GraphQL', argA: 'REST is simple, cacheable, and universally understood.', argB: 'GraphQL eliminates over-fetching and under-fetching.', winner: 'B' },
  { topic: 'Pineapple on Pizza', argA: 'Sweet and savory is a classic flavor combination.', argB: 'Fruit on pizza violates the sacred pizza covenant.', winner: 'A' },
  { topic: 'Remote vs Office', argA: 'Remote work boosts productivity and eliminates commutes.', argB: 'Office fosters collaboration and spontaneous innovation.', winner: 'A' },
  { topic: 'TypeScript vs JavaScript', argA: 'TypeScript catches bugs at compile time, saving hours.', argB: 'JavaScript is faster to write and more flexible.', winner: 'A' },
  { topic: 'Cats vs Dogs', argA: 'Cats are independent and low-maintenance companions.', argB: 'Dogs are loyal, trainable, and emotionally supportive.', winner: 'B' },
];

const ROUNDS = 4;
const TIME_PER_ROUND = 8;

export default function DebateJudge({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [debate, setDebate] = useState(() => DEBATES[Math.floor(Math.random() * DEBATES.length)]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const usedRef = useRef<Set<string>>(new Set([debate.topic]));
  const completedRef = useRef(false);
  const roundActiveRef = useRef(true);

  const pickNext = () => {
    let d: Debate;
    do { d = DEBATES[Math.floor(Math.random() * DEBATES.length)]; } while (usedRef.current.has(d.topic) && usedRef.current.size < DEBATES.length);
    usedRef.current.add(d.topic);
    return d;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!roundActiveRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          roundActiveRef.current = false;
          setFeedback('TIME UP!');
          setTimeout(() => advanceRound(correct), 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const advanceRound = (newCorrect: number) => {
    const nextRound = round + 1;
    if (nextRound >= ROUNDS) {
      const success = newCorrect >= 3;
      setResult(success ? 'success' : 'fail');
      if (!completedRef.current) {
        completedRef.current = true;
        setTimeout(() => onComplete(success, newCorrect * 25), 1500);
      }
    } else {
      setRound(nextRound);
      setDebate(pickNext());
      setTimeLeft(TIME_PER_ROUND);
      setFeedback(null);
      roundActiveRef.current = true;
    }
  };

  const handleJudge = (choice: 'A' | 'B') => {
    if (feedback || result !== 'none' || !roundActiveRef.current) return;
    roundActiveRef.current = false;
    const isCorrect = choice === debate.winner;
    const newCorrect = isCorrect ? correct + 1 : correct;
    setCorrect(newCorrect);
    setFeedback(isCorrect ? 'GOOD CALL!' : `WRONG! ${debate.winner === 'A' ? 'Side A' : 'Side B'} wins.`);
    setTimeout(() => advanceRound(newCorrect), 1000);
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '12px', maxWidth: 440 }}>
      <h3 style={{ color: 'var(--neon-pink)' }}>Debate Judge</h3>
      <div style={{ display: 'flex', gap: '16px', color: '#fff', fontSize: '12px' }}>
        <span>Round {round + 1}/{ROUNDS}</span>
        <span>Time: {timeLeft}s</span>
        <span>Score: {correct}</span>
      </div>

      <div style={{ color: 'var(--neon-yellow)', fontSize: '14px', textAlign: 'center' }}>{debate.topic}</div>

      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <button className="pixel-panel" onClick={() => handleJudge('A')}
          disabled={!!feedback}
          style={{
            flex: 1, cursor: feedback ? 'default' : 'pointer', padding: '12px',
            fontSize: '11px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)',
            textAlign: 'left', lineHeight: 1.5, fontFamily: 'var(--font-system)',
          }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10px', marginBottom: '6px', color: 'var(--neon-green)' }}>SIDE A</div>
          {debate.argA}
        </button>
        <button className="pixel-panel" onClick={() => handleJudge('B')}
          disabled={!!feedback}
          style={{
            flex: 1, cursor: feedback ? 'default' : 'pointer', padding: '12px',
            fontSize: '11px', color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)',
            textAlign: 'left', lineHeight: 1.5, fontFamily: 'var(--font-system)',
          }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10px', marginBottom: '6px', color: 'var(--neon-red)' }}>SIDE B</div>
          {debate.argB}
        </button>
      </div>

      {feedback && (
        <div style={{ color: feedback.startsWith('GOOD') ? 'var(--neon-green)' : 'var(--neon-red)', fontSize: '16px' }}>
          {feedback}
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>SUPREME JUDGE!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>OVERRULED!</div>}
    </div>
  );
}
