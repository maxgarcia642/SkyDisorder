'use client';

import { useEffect } from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function ParticleSystem() {
  const particles = useChaosStore((s) => s.particles);
  const clearParticles = useChaosStore((s) => s.clearParticles);

  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(clearParticles, 3000);
    return () => clearTimeout(timer);
  }, [particles, clearParticles]);

  if (particles.length === 0) return null;

  return (
    <div className="particle-container">
      {particles.map((p, i) => {
        const size = 6 + Math.random() * 6;
        return (
          <div
            key={p.id}
            className="confetti"
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: 0,
              width: size,
              height: size,
              backgroundColor: p.color,
              animationDelay: `${(i % 10) * 0.1}s`,
            }}
          />
        );
      })}
    </div>
  );
}
