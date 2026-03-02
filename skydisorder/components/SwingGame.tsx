'use client';

import { useChaosStore } from '@/lib/chaosStore';
import { formatMoney } from '@/lib/utils';
import PowerMeter from './PowerMeter';

function calcPowerScore(power: number): number {
  if (power >= 45 && power <= 55) return 100;
  const dist = power < 45 ? 45 - power : power - 55;
  return Math.max(0, 100 - dist * 2.5);
}

function calcAccuracyScore(accuracy: number): number {
  if (accuracy >= 45 && accuracy <= 55) return 100;
  const dist = accuracy < 45 ? 45 - accuracy : accuracy - 55;
  return Math.max(0, 100 - dist * 2.5);
}

function shotLabel(total: number): string {
  if (total >= 190) return 'HOLE IN ONE!';
  if (total >= 140) return 'NICE SHOT!';
  return 'BOGEY!';
}

export default function SwingGame() {
  const swing = useChaosStore((s) => s.swing);
  const setPower = useChaosStore((s) => s.setPower);
  const setAccuracy = useChaosStore((s) => s.setAccuracy);
  const completeSwing = useChaosStore((s) => s.completeSwing);
  const cancelSwing = useChaosStore((s) => s.cancelSwing);

  if (!swing.active) return null;

  const powerScore = Math.round(calcPowerScore(swing.power));
  const accuracyScore = Math.round(calcAccuracyScore(swing.accuracy));
  const total = powerScore + accuracyScore;
  const money = Math.round(total * 2.5);

  return (
    <div className="swing-modal">
      <div className="swing-panel pixel-panel">
        <button
          className="swing-cancel pixel-text"
          onClick={cancelSwing}
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#ff6b6b',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <h2 className="swing-title pixel-text" style={{ textShadow: '0 0 12px #4fc3f7' }}>
          SWING AT: {swing.targetFeature?.name ?? '???'}
        </h2>

        {swing.phase === 'power' && (
          <div className="swing-phase">
            <p className="pixel-text" style={{ marginBottom: 12, opacity: 0.7 }}>
              Click to set your power!
            </p>
            <PowerMeter type="power" onStop={setPower} active />
          </div>
        )}

        {swing.phase === 'accuracy' && (
          <div className="swing-phase">
            <p className="pixel-text" style={{ color: '#4ade80', marginBottom: 8 }}>
              NICE POWER: {swing.power}
            </p>
            <p className="pixel-text" style={{ marginBottom: 12, opacity: 0.7 }}>
              Now click to set accuracy!
            </p>
            <PowerMeter type="accuracy" onStop={setAccuracy} active />
          </div>
        )}

        {swing.phase === 'result' && (
          <div className="swing-result">
            <p className="pixel-text">Power: {swing.power} → {powerScore} pts</p>
            <p className="pixel-text">Accuracy: {swing.accuracy} → {accuracyScore} pts</p>
            <p className="pixel-text" style={{ fontSize: 14, marginTop: 8 }}>
              Total: {total} pts
            </p>
            <p
              className="pixel-text"
              style={{ color: '#ffd700', textShadow: '0 0 8px #ffd700', fontSize: 16, marginTop: 8 }}
            >
              Earned: {formatMoney(money)}
            </p>
            <p
              className="pixel-text"
              style={{
                marginTop: 12,
                fontSize: 18,
                color: total >= 190 ? '#ffd700' : total >= 140 ? '#4ade80' : '#ff6b6b',
                textShadow: `0 0 10px ${total >= 190 ? '#ffd700' : total >= 140 ? '#4ade80' : '#ff6b6b'}`,
              }}
            >
              {shotLabel(total)}
            </p>
            <button
              className="swing-continue pixel-btn pixel-text"
              onClick={completeSwing}
              style={{ marginTop: 16 }}
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
