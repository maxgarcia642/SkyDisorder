export const TAGLINE =
  'SkyDisorder — Breaking the ground with no land order at all. Try Google products like NotebookLM, Gemini, and their Labs #MayOrMayNotBeSponsored';

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TAKEOVER_MESSAGES = [
  "{repo}'s code just took over the main thread!",
  "Coworker deployed {repo} directly to prod… again.",
  "{repo} just force-pushed to main. No PR. No review. No mercy.",
  "Someone left a `console.log('here')` in {repo}. It's been there since 2019.",
  "{repo}'s CI pipeline has been running for 47 minutes. Nobody is worried.",
  "Breaking: {repo} just mass-imported every npm package. Node_modules now visible from space.",
  "{repo}'s README says 'will document later.' Commit date: 3 years ago.",
  "{repo} added 14 TODO comments in a single commit. Zero were ever done.",
  "Alert: {repo} just deleted node_modules and reinstalled. Progress!",
  "Coworker rage-quit mid-refactor on {repo}. Half the types are `any`.",
  "{repo} has a file called `temp_FINAL_v2_REAL_FINAL.tsx`. It is the only file that works.",
  "Legend says if you run {repo}'s tests, your laptop catches fire.",
  "{repo} just shipped a feature nobody asked for. Stakeholders are thrilled.",
  "{repo} discovered it has two package-lock.json files. Both are wrong.",
  "The intern touched {repo}. Three microservices are now down.",
];

export function randomTakeover(repoName: string): string {
  return randomItem(TAKEOVER_MESSAGES).replace('{repo}', repoName);
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: '#4ade80',
  MEDIUM: '#fbbf24',
  HARD: '#f97316',
  NIGHTMARE: '#ef4444',
  IMPOSSIBLE: '#d946ef',
  CORPORATE: '#7c3aed',
};

export function difficultyColor(d: string): string {
  return DIFFICULTY_COLORS[d] ?? '#ffffff';
}
