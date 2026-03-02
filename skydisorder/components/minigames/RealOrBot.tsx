'use client';

import React, { useState, useRef } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

const POSTS: { text: string; isBot: boolean }[] = [
  { text: "Just had the most amazing avocado toast. Life is good. #blessed #brunch", isBot: false },
  { text: "Analyzing current market trends suggests a 47.3% probability of increased engagement metrics across all verticals.", isBot: true },
  { text: "why does my code only work at 3am??? someone explain this dark magic", isBot: false },
  { text: "I have synthesized 847 perspectives on this topic and concluded that further analysis is required for optimal output.", isBot: true },
  { text: "My cat just knocked my coffee off the desk. Third time this week. Send help.", isBot: false },
  { text: "Leveraging synergistic paradigms to optimize cross-functional deliverables in the Q4 pipeline.", isBot: true },
  { text: "hot take: pineapple on pizza is actually elite and i will die on this hill", isBot: false },
  { text: "Based on comprehensive data analysis, the optimal breakfast configuration maximizes nutritional throughput.", isBot: true },
  { text: "forgot to save my work for 3 hours. the universe is testing me.", isBot: false },
  { text: "Implementing recursive self-improvement protocols to enhance content generation capabilities by 340%.", isBot: true },
  { text: "just spent 20 minutes arguing with a vending machine. I think it won.", isBot: false },
  { text: "The intersection of blockchain and artisanal cheese presents unprecedented disruption opportunities.", isBot: true },
];

const ROUNDS = 5;

export default function RealOrBot({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [currentPost, setCurrentPost] = useState(() => POSTS[Math.floor(Math.random() * POSTS.length)]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const usedRef = useRef<Set<number>>(new Set());
  const completedRef = useRef(false);

  const pickNext = () => {
    let idx: number;
    do { idx = Math.floor(Math.random() * POSTS.length); } while (usedRef.current.has(idx) && usedRef.current.size < POSTS.length);
    usedRef.current.add(idx);
    return POSTS[idx];
  };

  const handleAnswer = (answeredBot: boolean) => {
    if (feedback || result !== 'none') return;
    const isCorrect = answeredBot === currentPost.isBot;
    const newCorrect = isCorrect ? correct + 1 : correct;
    setCorrect(newCorrect);
    setFeedback(isCorrect ? 'CORRECT!' : `WRONG! It was ${currentPost.isBot ? 'a BOT' : 'REAL'}`);

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        const success = newCorrect >= 3;
        setResult(success ? 'success' : 'fail');
        setTimeout(() => {
          if (!completedRef.current) { completedRef.current = true; onComplete(success, newCorrect * 20); }
        }, 1500);
      } else {
        setRound(nextRound);
        setCurrentPost(pickNext());
        setFeedback(null);
      }
    }, 1000);
  };

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '16px', maxWidth: 420 }}>
      <h3 style={{ color: '#c084fc' }}>Real or Bot?</h3>
      <p style={{ color: '#ccc', textAlign: 'center', fontSize: '11px' }}>Is this post from a human or an AI bot?</p>
      <div style={{ color: 'var(--neon-yellow)', fontSize: '12px' }}>Round {round + 1}/{ROUNDS} | Score: {correct}/{round}</div>

      <div style={{
        background: 'rgba(0,0,0,0.4)', border: '2px solid #555', borderRadius: '4px',
        padding: '16px', width: '100%', minHeight: 80, fontSize: '13px', color: '#eee', lineHeight: 1.6,
        fontFamily: 'var(--font-system)',
      }}>
        &ldquo;{currentPost.text}&rdquo;
      </div>

      {feedback && (
        <div style={{ color: feedback.startsWith('CORRECT') ? 'var(--neon-green)' : 'var(--neon-red)', fontSize: '16px' }}>
          {feedback}
        </div>
      )}

      {result === 'none' && !feedback && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="pixel-panel" onClick={() => handleAnswer(false)}
            style={{ cursor: 'pointer', padding: '10px 20px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)', fontSize: '14px' }}>
            REAL
          </button>
          <button className="pixel-panel" onClick={() => handleAnswer(true)}
            style={{ cursor: 'pointer', padding: '10px 20px', color: 'var(--neon-red)', borderColor: 'var(--neon-red)', fontSize: '14px' }}>
            BOT
          </button>
        </div>
      )}

      <button className="pixel-panel"
        onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
        style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
        QUIT
      </button>

      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>BOT DETECTOR!</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>FOOLED!</div>}
    </div>
  );
}
