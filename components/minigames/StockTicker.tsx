'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

export default function StockTicker({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);

  const [prices, setPrices] = useState<number[]>([50]);
  const [round, setRound] = useState(0);
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [profits, setProfits] = useState<number[]>([]);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const [roundResult, setRoundResult] = useState<string | null>(null);

  const currentPrice = prices[prices.length - 1];

  const finishGame = useCallback((totalProfit: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const won = totalProfit > 0;
    setResult(won ? 'success' : 'fail');
    const t = window.setTimeout(() => onComplete(won, Math.max(0, Math.round(totalProfit))), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      if (completedRef.current) return;
      setPrices(prev => {
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.45) * 8;
        const next = Math.max(5, Math.min(95, last + change));
        const trimmed = prev.length > 30 ? prev.slice(-30) : prev;
        return [...trimmed, Math.round(next * 10) / 10];
      });
    }, 300);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleBuy = () => {
    if (buyPrice !== null || result !== 'none') return;
    setBuyPrice(currentPrice);
    setRoundResult(null);
  };

  const handleSell = () => {
    if (buyPrice === null || result !== 'none') return;
    const profit = currentPrice - buyPrice;
    const newProfits = [...profits, profit];
    setProfits(newProfits);
    setBuyPrice(null);
    setRoundResult(profit >= 0 ? `+$${profit.toFixed(1)}` : `-$${Math.abs(profit).toFixed(1)}`);

    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= 3) {
      const total = newProfits.reduce((a, b) => a + b, 0);
      finishGame(total);
    }
  };

  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const chartWidth = 260;
  const chartHeight = 100;
  const visiblePrices = prices.slice(-30);
  const minP = Math.min(...visiblePrices) - 2;
  const maxP = Math.max(...visiblePrices) + 2;
  const range = maxP - minP || 1;

  const points = visiblePrices.map((p, i) => {
    const x = (i / Math.max(visiblePrices.length - 1, 1)) * chartWidth;
    const y = chartHeight - ((p - minP) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Stock Ticker</h3>
      <div style={{ color: '#ccc', fontSize: '11px' }}>Buy low, sell high! 3 rounds.</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span style={{ color: 'var(--neon-cyan)' }}>Round {Math.min(round + 1, 3)}/3</span>
        <span style={{ color: totalProfit >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
          P/L: ${totalProfit.toFixed(1)}
        </span>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.4)', borderRadius: '4px', padding: '8px',
        position: 'relative',
      }}>
        <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
          <polyline
            points={points}
            fill="none"
            stroke="var(--neon-green)"
            strokeWidth="2"
          />
          {buyPrice !== null && (
            <line
              x1={0} y1={chartHeight - ((buyPrice - minP) / range) * chartHeight}
              x2={chartWidth} y2={chartHeight - ((buyPrice - minP) / range) * chartHeight}
              stroke="var(--neon-yellow)" strokeWidth="1" strokeDasharray="4,4"
            />
          )}
        </svg>
        <div style={{
          position: 'absolute', top: '4px', right: '12px',
          color: 'var(--neon-green)', fontSize: '18px', fontWeight: 'bold',
        }}>
          ${currentPrice.toFixed(1)}
        </div>
      </div>

      {roundResult && result === 'none' && (
        <div style={{
          color: roundResult.startsWith('+') ? 'var(--neon-green)' : 'var(--neon-red)',
          fontSize: '14px',
        }}>
          {roundResult}
        </div>
      )}

      {result === 'none' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="pixel-panel" onClick={handleBuy}
            disabled={buyPrice !== null}
            style={{
              cursor: buyPrice === null ? 'pointer' : 'not-allowed',
              padding: '8px 18px', fontSize: '13px',
              color: 'var(--neon-green)', borderColor: 'var(--neon-green)',
              opacity: buyPrice !== null ? 0.4 : 1,
            }}>
            BUY
          </button>
          <button className="pixel-panel" onClick={handleSell}
            disabled={buyPrice === null}
            style={{
              cursor: buyPrice !== null ? 'pointer' : 'not-allowed',
              padding: '8px 18px', fontSize: '13px',
              color: 'var(--neon-red)', borderColor: 'var(--neon-red)',
              opacity: buyPrice === null ? 0.4 : 1,
            }}>
            SELL
          </button>
        </div>
      )}

      {buyPrice !== null && result === 'none' && (
        <div style={{ color: 'var(--neon-yellow)', fontSize: '11px' }}>
          Bought @ ${buyPrice.toFixed(1)} | Current: ${(currentPrice - buyPrice) >= 0 ? '+' : ''}${(currentPrice - buyPrice).toFixed(1)}
        </div>
      )}

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>PROFIT! 📈</div>}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>BANKRUPT! 📉</div>}
    </div>
  );
}
