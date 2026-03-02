'use client';
import { useEffect, useRef } from 'react';
import { useChaosStore } from '@/lib/chaosStore';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function MessageLog() {
  const messages = useChaosStore((s) => s.messages);
  const endRef = useRef<HTMLDivElement>(null);

  const visible = messages.slice(-8);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className="pixel-panel"
      style={{
        maxHeight: '160px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.6',
      }}
    >
      {visible.length === 0 && (
        <div style={{ opacity: 0.4 }}>Waiting for chaos...</div>
      )}
      {visible.map((msg) => (
        <div key={msg.id} style={{ display: 'flex', gap: '8px' }}>
          <span style={{ opacity: 0.5, flexShrink: 0 }}>{formatTime(msg.timestamp)}</span>
          <span>{msg.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
