'use client';
import { useChaosStore } from '@/lib/chaosStore';
import { randomTakeover } from '@/lib/utils';

export function ChaosButton() {
  const triggerChaos = useChaosStore((s) => s.triggerChaos);
  const chaosLevel = useChaosStore((s) => s.chaosLevel);
  const repos = useChaosStore((s) => s.repos);

  const handleClick = () => {
    triggerChaos();

    if (repos.length > 0) {
      const repo = repos[Math.floor(Math.random() * repos.length)];
      console.log(randomTakeover(repo.name));
    }

    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 100);
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999, textAlign: 'center' }}>
      <button className="chaos-button" onClick={handleClick}>
        ⚡ CHAOS ⚡
      </button>
      <div className="pixel-text" style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
        Lvl {chaosLevel}
      </div>
    </div>
  );
}
