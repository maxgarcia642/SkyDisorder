import { scanRepos } from '@/lib/repoScanner';
import { HomeClient } from './HomeClient';
import type { Repo } from '@/lib/chaosStore';

export default async function HomePage() {
  let scanned: Repo[] = [];
  try {
    const raw = await scanRepos();
    scanned = raw.map((r, i) => ({
      ...r,
      holeNumber: r.holeNumber ?? i + 1,
      played: false,
      score: 0,
      uploaded: false,
    }));
  } catch {
    scanned = [];
  }
  return <HomeClient initialRepos={scanned} />;
}
