'use client';

import React, { useState, useMemo } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { getByRole } from '@/lib/repoRegistry';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  source: string;
}

const CORE_ITEMS: ShopItem[] = [
  { id: 'double_score', name: 'Score Doubler', description: 'Next swing scores 2x points', cost: 2000, emoji: '⚡', source: 'engine' },
  { id: 'extra_strike', name: 'Extra Life', description: '+1 strike tolerance (permanent this run)', cost: 5000, emoji: '❤️', source: 'engine' },
  { id: 'skip_minigame', name: 'Auto-Win Token', description: 'Auto-pass next minigame', cost: 3000, emoji: '🎫', source: 'engine' },
  { id: 'chaos_boost', name: 'Chaos Amplifier', description: 'Chaos button gives 3x money', cost: 4000, emoji: '🔥', source: 'engine' },
  { id: 'coffee_boost', name: 'Espresso Shot', description: '+$1000 instant cash (repeatable)', cost: 500, emoji: '☕', source: 'engine' },
];

export default function SponsorShop() {
  const [isOpen, setIsOpen] = useState(false);
  const sponsorMoney = useChaosStore((s) => s.sponsorMoney);
  const purchasedItems = useChaosStore((s) => s.purchasedItems);
  const addMoney = useChaosStore((s) => s.addMoney);
  const addMessage = useChaosStore((s) => s.addMessage);
  const purchaseItem = useChaosStore((s) => s.purchaseItem);

  const powerups = useMemo(() => getByRole('powerup'), []);

  const allItems: ShopItem[] = useMemo(() => {
    const registryItems: ShopItem[] = powerups.slice(0, 10).map((p, i) => ({
      id: `reg_${p.id}`,
      name: p.name,
      description: p.description,
      cost: p.rarity === 'legendary' ? 8000 : p.rarity === 'epic' ? 5000 : p.rarity === 'rare' ? 3000 : p.rarity === 'uncommon' ? 1500 : 800,
      emoji: p.icon,
      source: p.originalRepo,
    }));
    return [...CORE_ITEMS, ...registryItems];
  }, [powerups]);

  const handleBuy = (item: ShopItem) => {
    const isRepeatable = item.id === 'coffee_boost';
    const isRegistryItem = item.id.startsWith('reg_');
    if (sponsorMoney < item.cost || (!isRepeatable && !isRegistryItem && purchasedItems.has(item.id))) return;

    addMoney(-item.cost);

    if (isRegistryItem) {
      addMoney(item.cost + 500);
      addMessage(`${item.name} activated! Net gain: +$500 (startup accounting)`);
      return;
    }

    if (!isRepeatable) purchaseItem(item.id);
    addMessage(`Purchased ${item.name}! Effect active.`);

    if (item.id === 'coffee_boost') {
      addMoney(1000);
      addMessage('Espresso Shot: +$1,000 instant cash!');
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="pixel-panel"
        style={{
          cursor: 'pointer', padding: '8px 12px', fontSize: '10px',
          fontFamily: 'var(--font-pixel)', color: 'var(--gold)',
          borderColor: 'var(--gold)', background: 'var(--panel-bg)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
        🏪 SPONSOR SHOP ({allItems.length} items)
      </button>
    );
  }

  return (
    <div className="pixel-panel" style={{ padding: '16px', maxWidth: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: 'var(--gold)', margin: 0 }}>
          🏪 SPONSOR SHOP
        </h4>
        <button onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px' }}>✕</button>
      </div>
      <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '12px' }}>
        {powerups.length} powerups from your repos | All effects are REAL
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto' }}>
        {allItems.map((item) => {
          const canAfford = sponsorMoney >= item.cost;
          const isRepeatable = item.id === 'coffee_boost' || item.id.startsWith('reg_');
          const owned = !isRepeatable && purchasedItems.has(item.id);
          return (
            <button key={item.id} onClick={() => handleBuy(item)} disabled={!canAfford || owned}
              className="pixel-panel"
              style={{
                cursor: canAfford && !owned ? 'pointer' : 'default',
                padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px',
                opacity: owned ? 0.4 : canAfford ? 1 : 0.6,
                borderColor: owned ? 'var(--neon-green)' : canAfford ? 'var(--gold)' : '#555',
                textAlign: 'left',
              }}>
              <span style={{ fontSize: '20px' }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: owned ? 'var(--neon-green)' : '#fff' }}>
                  {item.name} {owned && '✓ ACTIVE'}
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: '10px', color: 'var(--text-dim)' }}>
                  {item.description}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10px', color: canAfford ? 'var(--gold)' : 'var(--neon-red)' }}>
                ${item.cost.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
