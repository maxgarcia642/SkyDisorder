'use client';

import { useState, useMemo } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { calcPowerScore, calcAccuracyScore } from '@/lib/chaosStore';
import { getRandomByRole } from '@/lib/repoRegistry';
import PowerMeter from './PowerMeter';

function shotLabel(total: number): string {
  if (total >= 190) return 'HOLE IN ONE!';
  if (total >= 140) return 'NICE SHOT!';
  return 'BOGEY!';
}

export default function SwingGame() {
  const swing = useChaosStore((s) => s.swing);
  const lastEarnings = useChaosStore((s) => s.lastEarnings);
  const setPower = useChaosStore((s) => s.setPower);
  const setAccuracy = useChaosStore((s) => s.setAccuracy);
  const completeSwing = useChaosStore((s) => s.completeSwing);
  const cancelSwing = useChaosStore((s) => s.cancelSwing);
  const addMessage = useChaosStore((s) => s.addMessage);
  const addMoney = useChaosStore((s) => s.addMoney);

  const [hazardTriggered, setHazardTriggered] = useState(false);
  const [hazardName, setHazardName] = useState('');

  const hazard = useMemo(() => {
    if (Math.random() < 0.2) {
      const h = getRandomByRole('hazard');
      return h ?? null;
    }
    return null;
  }, []);

  if (!swing.active) return null;

  const rawPower = calcPowerScore(swing.power);
  const rawAccuracy = calcAccuracyScore(swing.accuracy);
  let total = Math.round(rawPower + rawAccuracy);
  const powerScore = Math.round(rawPower);
  const accuracyScore = Math.round(rawAccuracy);

  const handleContinue = () => {
    if (hazard && !hazardTriggered) {
      setHazardTriggered(true);
      setHazardName(hazard.name);
      const penalty = Math.floor(Math.random() * 500) + 200;
      addMoney(-penalty);
      addMessage(`HAZARD: ${hazard.name} — ${hazard.description}! -$${penalty}`);
      setTimeout(() => completeSwing(), 1500);
      return;
    }
    completeSwing();
  };

  return (
    <div className="swing-modal">
      <div className="swing-panel pixel-panel">
        <button
          className="swing-cancel pixel-text"
          onClick={cancelSwing}
          style={{
            position: 'absolute', top: 8, right: 12, background: 'none',
            border: 'none', color: '#ff6b6b', fontSize: 18, cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <h2 className="swing-title pixel-text" style={{ textShadow: '0 0 12px #4fc3f7' }}>
          SWING AT: {swing.targetFeature?.name ?? '???'}
        </h2>

        {hazard && !hazardTriggered && swing.phase === 'power' && (
          <div style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid var(--neon-red)', borderRadius: 4, padding: '6px 10px', marginBottom: 8, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '8px', color: 'var(--neon-red)' }}>
              ⚠ HAZARD AHEAD: {hazard.icon} {hazard.name}
            </span>
          </div>
        )}

        {swing.phase === 'power' && (
          <div className="swing-phase">
            <p className="pixel-text" style={{ marginBottom: 12, opacity: 0.7 }}>Click to set your power!</p>
            <PowerMeter type="power" onStop={setPower} active />
          </div>
        )}

        {swing.phase === 'accuracy' && (
          <div className="swing-phase">
            <p className="pixel-text" style={{ color: '#4ade80', marginBottom: 8 }}>NICE POWER: {swing.power}</p>
            <p className="pixel-text" style={{ marginBottom: 12, opacity: 0.7 }}>Now click to set accuracy!</p>
            <PowerMeter type="accuracy" onStop={setAccuracy} active />
          </div>
        )}

        {swing.phase === 'result' && (
          <div className="swing-result">
            <p className="pixel-text">Power: {swing.power} → {powerScore} pts</p>
            <p className="pixel-text">Accuracy: {swing.accuracy} → {accuracyScore} pts</p>
            <p className="pixel-text" style={{ fontSize: 14, marginTop: 8 }}>Total: {total} pts</p>
            <p className="pixel-text" style={{ marginTop: 6, fontSize: 12, color: lastEarnings >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
              {lastEarnings !== 0 ? `Last swing: ${lastEarnings >= 0 ? '+' : ''}$${lastEarnings.toLocaleString()}` : ''}
            </p>
            {hazardTriggered && (
              <p className="pixel-text" style={{ color: 'var(--neon-red)', fontSize: 11, marginTop: 4 }}>
                ⚠ {hazardName} triggered!
              </p>
            )}
            <p className="pixel-text" style={{
              marginTop: 12, fontSize: 18,
              color: total >= 190 ? '#ffd700' : total >= 140 ? '#4ade80' : '#ff6b6b',
              textShadow: `0 0 10px ${total >= 190 ? '#ffd700' : total >= 140 ? '#4ade80' : '#ff6b6b'}`,
            }}>
              {shotLabel(total)}
            </p>
            <button className="swing-continue pixel-btn pixel-text" onClick={handleContinue} style={{ marginTop: 16 }}>
              CONTINUE → MINIGAME
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
