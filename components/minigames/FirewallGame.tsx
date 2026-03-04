'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

interface Packet {
  id: number;
  bad: boolean;
  x: number;
  y: number;
  speed: number;
  blocked: boolean;
  escaped: boolean;
}

export default function FirewallGame({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);

  const [packets, setPackets] = useState<Packet[]>(() => {
    const items: Packet[] = [];
    const badCount = 5;
    const goodCount = 7;
    for (let i = 0; i < badCount + goodCount; i++) {
      items.push({
        id: i,
        bad: i < badCount,
        x: -10 - Math.random() * 40,
        y: 15 + Math.random() * 70,
        speed: 0.4 + Math.random() * 0.3,
        blocked: false,
        escaped: false,
      });
    }
    return items.sort(() => Math.random() - 0.5);
  });

  const [blockedBad, setBlockedBad] = useState(0);
  const [blockedGood, setBlockedGood] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const spawnIdx = useRef(0);

  const finishGame = useCallback((badBlocked: number, goodBlocked: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const won = badBlocked >= 4 && goodBlocked === 0;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, won ? badBlocked * 25 : 0), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

  useEffect(() => {
    const spawnTimer = window.setInterval(() => {
      if (completedRef.current) return;
      spawnIdx.current = Math.min(spawnIdx.current + 1, 11);
    }, 1100);

    animRef.current = window.setInterval(() => {
      if (completedRef.current) return;
      setPackets(prev => prev.map((p, i) => {
        if (p.blocked || p.escaped || i > spawnIdx.current) return p;
        const newX = p.x + p.speed;
        if (newX > 105) return { ...p, escaped: true, x: 105 };
        return { ...p, x: newX };
      }));
    }, 30);

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          clearInterval(spawnTimer);
          if (animRef.current) clearInterval(animRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) clearInterval(animRef.current);
      clearInterval(spawnTimer);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      finishGame(blockedBad, blockedGood);
    }
  }, [timeLeft, blockedBad, blockedGood, finishGame]);

  const handleClick = (id: number) => {
    if (result !== 'none') return;
    setPackets(prev => {
      const pkt = prev.find(p => p.id === id);
      if (!pkt || pkt.blocked || pkt.escaped) return prev;
      if (pkt.bad) setBlockedBad(b => b + 1);
      else setBlockedGood(b => b + 1);
      return prev.map(p => p.id === id ? { ...p, blocked: true } : p);
    });
  };

  const activePackets = packets.filter((p, i) => i <= spawnIdx.current && !p.blocked && !p.escaped);

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Firewall</h3>
      <div style={{ color: '#ccc', fontSize: '11px', textAlign: 'center' }}>
        Block 🔴 bad packets! Don't block 🟢 good ones!
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span style={{ color: 'var(--neon-red)' }}>Blocked: {blockedBad}/4+</span>
        <span style={{ color: blockedGood > 0 ? 'var(--neon-red)' : 'var(--neon-green)' }}>
          Mistakes: {blockedGood}
        </span>
        <span style={{ color: 'var(--neon-cyan)' }}>⏱ {timeLeft}s</span>
      </div>

      <div style={{
        position: 'relative', width: '300px', height: '180px',
        background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: '20%', top: 0, bottom: 0, width: '2px',
          background: 'var(--neon-cyan)', opacity: 0.3,
        }} />
        <div style={{
          position: 'absolute', right: '18%', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--neon-cyan)', fontSize: '9px', opacity: 0.5, writingMode: 'vertical-lr',
        }}>
          FIREWALL
        </div>

        {activePackets.map(pkt => (
          <div
            key={pkt.id}
            onClick={() => handleClick(pkt.id)}
            style={{
              position: 'absolute',
              left: `${pkt.x}%`, top: `${pkt.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '28px', height: '28px', borderRadius: '50%',
              background: pkt.bad ? 'var(--neon-red)' : 'var(--neon-green)',
              boxShadow: `0 0 8px ${pkt.bad ? 'var(--neon-red)' : 'var(--neon-green)'}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', transition: 'top 0.1s',
            }}
          >
            {pkt.bad ? '⛔' : '✅'}
          </div>
        ))}

        {packets.filter(p => p.blocked).map(pkt => (
          <div
            key={`b-${pkt.id}`}
            style={{
              position: 'absolute',
              left: `${pkt.x}%`, top: `${pkt.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '16px', opacity: 0.3,
            }}
          >
            💥
          </div>
        ))}
      </div>

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>FIREWALL SECURE! 🛡️</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>BREACH DETECTED! 🚨</div>}
    </div>
  );
}
