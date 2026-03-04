'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onComplete: (success: boolean, score?: number) => void;
}

type Cell = 'X' | 'O' | null;
type Board = Cell[];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every(c => c !== null) && !checkWinner(board);
}

function getAiMove(board: Board): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  if (empty.length === 0) return -1;

  for (const idx of empty) {
    const test = [...board];
    test[idx] = 'O';
    if (checkWinner(test) === 'O') return idx;
  }

  for (const idx of empty) {
    const test = [...board];
    test[idx] = 'X';
    if (checkWinner(test) === 'X') return idx;
  }

  if (board[4] === null) return 4;

  const corners = [0, 2, 6, 8].filter(i => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToeGame({ onComplete }: Props) {
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const aiTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [result, setResult] = useState<'none' | 'success' | 'fail'>('none');
  const [timeLeft, setTimeLeft] = useState(30);

  const finishGame = useCallback((won: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setResult(won ? 'success' : 'fail');
    if (intervalRef.current) clearInterval(intervalRef.current);
    const t = window.setTimeout(() => onComplete(won, won ? 100 : 0), 1400);
    timersRef.current.push(t);
  }, [onComplete]);

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
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      finishGame(false);
    }
  }, [timeLeft, finishGame]);

  useEffect(() => {
    if (!isPlayerTurn && result === 'none') {
      aiTimerRef.current = window.setTimeout(() => {
        if (completedRef.current) return;
        const move = getAiMove(board);
        if (move === -1) return;
        const newBoard = [...board];
        newBoard[move] = 'O';
        setBoard(newBoard);

        const winner = checkWinner(newBoard);
        if (winner === 'O') {
          finishGame(false);
        } else if (isDraw(newBoard)) {
          finishGame(true);
        } else {
          setIsPlayerTurn(true);
        }
      }, 400);
    }
  }, [isPlayerTurn, board, result, finishGame]);

  const handleClick = (idx: number) => {
    if (!isPlayerTurn || board[idx] || result !== 'none') return;
    const newBoard = [...board];
    newBoard[idx] = 'X';
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    if (winner === 'X') {
      finishGame(true);
    } else if (isDraw(newBoard)) {
      finishGame(true);
    } else {
      setIsPlayerTurn(false);
    }
  };

  const winLine = LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);

  return (
    <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '14px' }}>
      <h3 style={{ color: 'var(--neon-yellow)' }}>Tic Tac Toe</h3>
      <div style={{ color: '#ccc', fontSize: '11px' }}>You are X. Win or draw to succeed!</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span style={{ color: isPlayerTurn ? 'var(--neon-green)' : 'var(--neon-red)' }}>
          {result !== 'none' ? 'GAME OVER' : isPlayerTurn ? 'YOUR TURN' : 'AI THINKING...'}
        </span>
        <span style={{ color: 'var(--neon-cyan)' }}>⏱ {timeLeft}s</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gap: '4px',
      }}>
        {board.map((cell, idx) => {
          const isWinCell = winLine?.includes(idx);
          return (
            <button
              key={idx}
              className="pixel-panel"
              onClick={() => handleClick(idx)}
              style={{
                width: '70px', height: '70px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 'bold',
                cursor: !cell && isPlayerTurn && result === 'none' ? 'pointer' : 'default',
                color: cell === 'X' ? 'var(--neon-cyan)' : cell === 'O' ? 'var(--neon-pink)' : 'transparent',
                background: isWinCell ? 'rgba(255,255,0,0.1)' : undefined,
                textShadow: isWinCell ? '0 0 10px var(--neon-yellow)' : undefined,
              }}
            >
              {cell || '·'}
            </button>
          );
        })}
      </div>

      {result === 'none' && (
        <button className="pixel-panel"
          onClick={() => { if (!completedRef.current) { completedRef.current = true; onComplete(false, 0); } }}
          style={{ cursor: 'pointer', color: '#888', borderColor: '#888', padding: '6px 16px', fontSize: '10px' }}>
          QUIT
        </button>
      )}
      {result === 'success' && (
        <div style={{ color: 'var(--neon-green)', fontSize: '20px' }}>
          {checkWinner(board) === 'X' ? 'YOU WIN! 🎉' : 'DRAW! GOOD ENOUGH! 🤝'}
        </div>
      )}
      {result === 'fail' && <div style={{ color: 'var(--neon-red)', fontSize: '20px' }}>AI WINS! 🤖</div>}
    </div>
  );
}
