'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Puzzle {
  question: string;
  code: string;
  options: string[];
  answer: number;
}

const PUZZLES: Puzzle[] = [
  {
    question: 'What does this return?',
    code: '[1, 2, 3].map(x => x * 2).filter(x => x > 3)',
    options: ['[4, 6]', '[2, 4, 6]', '[4]', '[6]'],
    answer: 0,
  },
  {
    question: 'What is logged?',
    code: 'console.log(typeof null)',
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    answer: 2,
  },
  {
    question: 'What does this evaluate to?',
    code: '"5" + 3',
    options: ['8', '"53"', 'NaN', '"8"'],
    answer: 1,
  },
  {
    question: 'What is the output?',
    code: '[..."hello"].reverse().join("")',
    options: ['"hello"', '"olleh"', '["o","l","l","e","h"]', 'Error'],
    answer: 1,
  },
  {
    question: 'What does this return?',
    code: 'Math.max(...[])',
    options: ['0', 'undefined', '-Infinity', 'NaN'],
    answer: 2,
  },
  {
    question: 'What is logged?',
    code: 'console.log(0.1 + 0.2 === 0.3)',
    options: ['true', 'false', 'undefined', 'NaN'],
    answer: 1,
  },
  {
    question: 'What does this return?',
    code: '"abc".split("").sort().join("")',
    options: ['"abc"', '"cba"', '"bac"', '"acb"'],
    answer: 0,
  },
  {
    question: 'What is the result?',
    code: 'Boolean("false")',
    options: ['false', 'true', '"false"', 'Error'],
    answer: 1,
  },
];

const ROUNDS = 4;
const TIME_PER_ROUND = 12;

export default function CodePuzzle({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [puzzle, setPuzzle] = useState(() => {
    const idx = Math.floor(Math.random() * PUZZLES.length);
    return { idx, data: PUZZLES[idx] };
  });
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const usedRef = useRef<Set<number>>(new Set([puzzle.idx]));
  const completedRef = useRef(false);
  const roundActiveRef = useRef(true);

  const pickNext = () => {
    let idx: number;
    do { idx = Math.floor(Math.random() * PUZZLES.length); } while (usedRef.current.has(idx) && usedRef.current.size < PUZZLES.length);
    usedRef.current.add(idx);
    return { idx, data: PUZZLES[idx] };
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
      setPuzzle(pickNext());
      setTimeLeft(TIME_PER_ROUND);
      setSelected(null);
      setFeedback(null);
      roundActiveRef.current = true;
    }
  };

  const handleAnswer = (idx: number) => {
    if (feedback || result !== 'none' || !roundActiveRef.current) return;
    roundActiveRef.current = false;
    setSelected(idx);
    const isCorrect = idx === puzzle.data.answer;
    const newCorrect = isCorrect ? correct + 1 : correct;
    setCorrect(newCorrect);
    setFeedback(isCorrect ? 'CORRECT!' : `WRONG! Answer: ${puzzle.data.options[puzzle.data.answer]}`);
    setTimeout(() => advanceRound(newCorrect), 1200);
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '12px', maxWidth: 440 }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Code Puzzle</h3>
      <div style={{ display: 'flex', gap: '16px', color: '#fff', fontSize: '12px' }}>
        <span>Round {round + 1}/{ROUNDS}</span>
        <span>Time: {timeLeft}s</span>
        <span>Score: {correct}</span>
      </div>

      <div style={{ color: 'var(--neon-cyan)', fontSize: '13px' }}>{puzzle.data.question}</div>

      <div style={{
        width: '100%', padding: '12px', background: 'rgba(0,0,0,0.6)',
        border: '2px solid #444', borderRadius: '4px',
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: 'var(--neon-green)',
        whiteSpace: 'pre-wrap', lineHeight: 1.5,
      }}>
        {puzzle.data.code}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
        {puzzle.data.options.map((opt, i) => (
          <button key={i} className="pixel-panel" onClick={() => handleAnswer(i)}
            disabled={!!feedback}
            style={{
              cursor: feedback ? 'default' : 'pointer', padding: '10px', fontSize: '12px',
              fontFamily: '"Courier New", monospace',
              color: selected === i
                ? (i === puzzle.data.answer ? 'var(--neon-green)' : 'var(--neon-red)')
                : (feedback && i === puzzle.data.answer ? 'var(--neon-green)' : 'var(--neon-cyan)'),
              borderColor: selected === i
                ? (i === puzzle.data.answer ? 'var(--neon-green)' : 'var(--neon-red)')
                : (feedback && i === puzzle.data.answer ? 'var(--neon-green)' : '#555'),
              background: selected === i ? 'rgba(255,255,255,0.05)' : 'transparent',
            }}>
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <div style={{ color: feedback.startsWith('CORRECT') ? 'var(--neon-green)' : 'var(--neon-red)', fontSize: '16px' }}>
          {feedback}
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>CODE WIZARD!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>SYNTAX ERROR!</div>}
    </div>
  );
}
