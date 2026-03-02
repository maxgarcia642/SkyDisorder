'use client';

import { useChaosStore } from '@/lib/chaosStore';
import { difficultyColor } from '@/lib/utils';
import type { Repo } from '@/lib/chaosStore';

interface RepoCardProps {
  repo: Repo;
}

export default function RepoCard({ repo }: RepoCardProps) {
  const startSwing = useChaosStore((s) => s.startSwing);

  return (
    <div className={`repo-card${repo.played ? ' repo-card--played' : ''}`}>
      {repo.played && (
        <div className="repo-card-played-overlay">
          <span className="played-badge pixel-text">PLAYED — {repo.score} pts</span>
        </div>
      )}

      <div className="repo-card-header">
        <div className="hole-number pixel-text">{repo.holeNumber}</div>
        <div className="par-badge pixel-text">PAR {repo.par}</div>
      </div>

      <div
        className="difficulty-badge pixel-text"
        style={{ backgroundColor: difficultyColor(repo.difficulty), color: '#000' }}
      >
        {repo.difficulty}
      </div>

      <h3 className="repo-card-name pixel-text">{repo.name}</h3>

      <p className="repo-card-desc">{repo.description}</p>

      <p className="repo-card-coworker">
        <em>Built by: {repo.coworker}</em>
      </p>

      <div className="repo-card-tech">
        {repo.techStack.map((tech) => (
          <span key={tech} className="tech-badge pixel-text">{tech}</span>
        ))}
      </div>

      {repo.features.length > 0 && (
        <div className="repo-card-features">
          {repo.features.slice(0, 4).map((feature) => (
            <button
              key={feature.id}
              className="feature-btn pixel-text"
              onClick={() => startSwing(feature)}
            >
              {feature.name}
              <span className="feature-swing-label">SWING</span>
            </button>
          ))}
        </div>
      )}

      <div className="repo-card-footer pixel-text">
        Hole {repo.holeNumber} · Par {repo.par}
      </div>
    </div>
  );
}
