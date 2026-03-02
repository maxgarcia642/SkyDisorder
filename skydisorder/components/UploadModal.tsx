'use client';

import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useChaosStore } from '@/lib/chaosStore';
import { randomInt, randomItem } from '@/lib/utils';
import type { Repo, RepoFeature } from '@/lib/chaosStore';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'NIGHTMARE', 'IMPOSSIBLE', 'CORPORATE'] as const;
const FALLBACK_TECH = ['React', 'Node', 'TypeScript', 'CSS', 'HTML'];
const DEFAULT_FEATURE_NAMES = ['Main Feature', 'Secret Feature', 'Legacy Code'];

export default function UploadModal() {
  const showUploadModal = useChaosStore((s) => s.showUploadModal);
  const setShowUploadModal = useChaosStore((s) => s.setShowUploadModal);
  const addRepo = useChaosStore((s) => s.addRepo);
  const addMoney = useChaosStore((s) => s.addMoney);
  const addMessage = useChaosStore((s) => s.addMessage);

  const [name, setName] = useState('');
  const [coworker, setCoworker] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const reset = useCallback(() => {
    setName('');
    setCoworker('');
    setDescription('');
    setFiles(null);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const detectTechFromFiles = useCallback(async (fileList: FileList): Promise<string[]> => {
    const detected = new Set<string>();
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name === 'package.json') {
        try {
          const text = await file.text();
          const pkg = JSON.parse(text);
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          if (allDeps) {
            if (allDeps.react || allDeps['react-dom']) detected.add('React');
            if (allDeps.next) detected.add('Next.js');
            if (allDeps.vue) detected.add('Vue');
            if (allDeps.express || allDeps.fastify || allDeps.koa) detected.add('Node');
            if (allDeps.typescript) detected.add('TypeScript');
            if (allDeps.tailwindcss) detected.add('Tailwind');
            if (allDeps.prisma || allDeps['@prisma/client']) detected.add('Prisma');
          }
        } catch { /* malformed package.json */ }
      }
    }
    return detected.size > 0
      ? Array.from(detected)
      : FALLBACK_TECH.sort(() => Math.random() - 0.5).slice(0, randomInt(2, 4));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const techStack = files && files.length > 0
      ? await detectTechFromFiles(files)
      : FALLBACK_TECH.sort(() => Math.random() - 0.5).slice(0, randomInt(2, 4));

    const repoId = 'uploaded-' + name.toLowerCase().replace(/\s+/g, '-');

    const features: RepoFeature[] = DEFAULT_FEATURE_NAMES.map((fname, i) => ({
      id: `${repoId}-feat-${i}`,
      name: fname,
      type: 'uploaded',
      repoId,
    }));

    const newRepo: Repo = {
      id: repoId,
      name: name.trim(),
      folderName: name.toLowerCase().replace(/\s+/g, '-'),
      description: description.trim() || 'No description provided. Probably cursed.',
      techStack,
      features,
      par: randomInt(3, 6),
      difficulty: randomItem([...DIFFICULTIES]),
      holeNumber: 0,
      played: false,
      score: 0,
      coworker: coworker.trim() || 'Anonymous Coworker',
      uploaded: true,
    };

    addRepo(newRepo);
    addMoney(100000);
    addMessage(`New repo uploaded: ${newRepo.name}! $1,000 bonus!`);
    setShowUploadModal(false);
    reset();
  }, [name, coworker, description, files, detectTechFromFiles, addRepo, addMoney, addMessage, setShowUploadModal, reset]);

  if (!showUploadModal) return null;

  return (
    <div className="upload-modal">
      <div className="upload-panel pixel-panel">
        <h2 className="pixel-text insert-coin" style={{ textAlign: 'center', marginBottom: 16 }}>
          INSERT COIN — ADD REPO
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="pixel-text upload-label">
            Repo Name
            <input
              type="text"
              className="pixel-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="pixel-text upload-label">
            Coworker Who Made It
            <input
              type="text"
              className="pixel-input"
              value={coworker}
              onChange={(e) => setCoworker(e.target.value)}
              placeholder="e.g. Tyler from Backend"
            />
          </label>

          <label className="pixel-text upload-label">
            What&apos;s Wrong With It
            <textarea
              className="pixel-input pixel-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The tests pass but nobody knows why"
              rows={3}
            />
          </label>

          <label className="pixel-text upload-label">
            Upload Files (optional)
            <input
              type="file"
              className="pixel-input"
              onChange={handleFileChange}
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>

          <div className="upload-actions">
            <button type="submit" className="pixel-btn pixel-text upload-submit">
              UPLOAD REPO
            </button>
            <button
              type="button"
              className="pixel-btn pixel-text upload-cancel"
              onClick={() => {
                setShowUploadModal(false);
                reset();
              }}
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
