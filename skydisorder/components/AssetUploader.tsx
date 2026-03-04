'use client';
import React, { useState, useRef } from 'react';
import { useChaosStore } from '@/lib/chaosStore';

export default function AssetUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const addCustomAsset = useChaosStore((s) => s.addCustomAsset);
  const customAssets = useChaosStore((s) => s.customAssets);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { alert('Only PNG/JPEG/GIF/WebP allowed'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Max 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setName(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) return;
    addCustomAsset({ id: `custom-${Date.now()}`, dataUrl: preview, name: name || 'Custom Asset' });
    setPreview(null);
    setName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="pixel-panel" style={{ padding: 12, maxWidth: 260 }}>
      <h4 style={{ color: 'var(--neon-cyan)', fontSize: 10, fontFamily: 'var(--font-pixel)', marginBottom: 8 }}>
        UPLOAD CUSTOM ASSET
      </h4>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ fontSize: 10, color: '#fff', maxWidth: '100%' }}
      />
      {preview && (
        <div style={{ marginTop: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" style={{ maxWidth: 80, maxHeight: 80, border: '2px solid var(--neon-green)', borderRadius: 4 }} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Asset name"
            style={{ display: 'block', marginTop: 6, width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--pixel-border)', color: '#fff', fontSize: 10, fontFamily: 'var(--font-system)', borderRadius: 2 }}
          />
          <button
            onClick={handleSave}
            className="pixel-panel"
            style={{ marginTop: 6, cursor: 'pointer', color: 'var(--neon-green)', borderColor: 'var(--neon-green)', padding: '6px 12px', fontSize: 10, fontFamily: 'var(--font-pixel)', width: '100%' }}
          >
            SAVE TO GAME (+$500)
          </button>
        </div>
      )}
      {customAssets.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-pixel)' }}>
          {customAssets.length} ASSET{customAssets.length !== 1 ? 'S' : ''} UPLOADED
        </div>
      )}
    </div>
  );
}
