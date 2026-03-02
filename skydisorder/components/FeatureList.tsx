'use client';
import { useChaosStore } from '@/lib/chaosStore';
import { PixelPanel } from './PixelPanel';

export function FeatureList() {
  const activeFeatures = useChaosStore((s) => s.activeFeatures);
  const deactivateFeature = useChaosStore((s) => s.deactivateFeature);

  return (
    <PixelPanel title="ACTIVE FEATURES">
      {activeFeatures.length === 0 ? (
        <div style={{ opacity: 0.4, fontSize: '11px' }} className="pixel-text">
          No features active
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {activeFeatures.map((f) => (
            <div
              key={f.featureId + f.activatedAt}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}
            >
              <div>
                <span style={{ fontWeight: 'bold' }}>{f.featureName}</span>
                <span style={{ opacity: 0.5, marginLeft: '6px' }}>{f.repoName}</span>
              </div>
              <button
                onClick={() => deactivateFeature(f.featureId)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '10px',
                  lineHeight: '1.4',
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </PixelPanel>
  );
}
