'use client';
import { create } from 'zustand';
import { randomItem, randomInt } from './utils';

export interface RepoFeature {
  id: string;
  name: string;
  type: string;
  repoId: string;
}

export interface Repo {
  id: string;
  name: string;
  folderName: string;
  description: string;
  techStack: string[];
  features: RepoFeature[];
  par: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE' | 'IMPOSSIBLE' | 'CORPORATE';
  holeNumber: number;
  played: boolean;
  score: number;
  coworker: string;
  uploaded: boolean;
}

export interface ActiveFeature {
  featureId: string;
  featureName: string;
  repoName: string;
  activatedAt: number;
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
}

export type GameState = 'menu' | 'playing' | 'gameover' | 'leaderboard' | 'minigame_menu' | 'minigame';

export type GameTheme = 'classic' | 'neon' | 'glitch' | 'matrix';

export const MINIGAME_IDS = [
  'coffee', 'tactical', 'radar', 'snake',
  'numberguess', 'realorbot', 'mapfinder', 'plantwater',
  'foodrush', 'debatejudge', 'codepuzzle', 'bowling',
  'dockerdash', 'gitrebase', 'bugsquash', 'stockticker',
  'typeracer', 'firewall', 'mini2048', 'tictactoe',
] as const;
export type MinigameId = (typeof MINIGAME_IDS)[number];

export const MINIGAME_DISPLAY_NAMES: Record<MinigameId, string> = {
  coffee: 'Caffeine Crisis',
  tactical: 'Deadline Destroyer',
  radar: 'Lunch Lottery',
  snake: 'Cable Management',
  numberguess: 'Estimate Roulette',
  realorbot: 'Bot or Intern?',
  mapfinder: 'Remote Worker Tracker',
  plantwater: 'Office Plant Duty',
  foodrush: 'Expense Report Speedrun',
  debatejudge: 'Standup Arbitration',
  codepuzzle: 'Code Review Chaos',
  bowling: 'Layoff Bowling',
  dockerdash: 'Container Stacker',
  gitrebase: 'Rebase Roulette',
  bugsquash: 'QA Nightmare',
  stockticker: 'Stonks Simulator',
  typeracer: 'Keyboard Warrior',
  firewall: 'Firewall Frenzy',
  mini2048: 'Sprint Planning 2048',
  tictactoe: 'Whiteboard Interview',
};

export const MINIGAME_SOURCES: Record<MinigameId, string> = {
  coffee: 'coffee-please-main',
  tactical: 'modern-aw-game-main',
  radar: 'TasteMap-main',
  snake: 'native-stuff-main',
  numberguess: 'native-stuff-main',
  realorbot: 'robotriffs-main',
  mapfinder: 'maptiler-sdk-js-fork-main',
  plantwater: 'lovefern-main',
  foodrush: 'TasteMap-main',
  debatejudge: 'verydebate-main',
  codepuzzle: 'advent-of-code-main',
  bowling: 'thoughtsonbowling-main',
  dockerdash: 'zmk-fourier-master',
  gitrebase: 'Terminal-Code-Collective',
  bugsquash: 'code_puppy-main',
  stockticker: 'yield-monitor-main',
  typeracer: 'advent-of-code-main',
  firewall: 'native-stuff-main',
  mini2048: 'nextjs-dashboard-main',
  tictactoe: 'robotriffs-main',
};

interface SwingState {
  active: boolean;
  phase: 'power' | 'accuracy' | 'result';
  power: number;
  accuracy: number;
  targetFeature: RepoFeature | null;
  score: number;
}

interface ChaosStore {
  gameState: GameState;
  streak: number;
  partnerships: number;
  strikes: number;
  maxStrikes: number;
  currentMinigame: MinigameId | null;
  leaderboard: { name: string; score: number; money: number }[];
  lastEarnings: number;
  purchasedItems: Set<string>;
  skipNextMinigame: boolean;
  scoreMultiplier: number;
  chaosBoost: boolean;

  sponsorMoney: number;
  totalScore: number;
  chaosLevel: number;

  repos: Repo[];
  activeFeatures: ActiveFeature[];
  currentHole: number;

  messages: Message[];
  theme: GameTheme;
  showUploadModal: boolean;
  swing: SwingState;
  particles: { id: string; x: number; y: number; color: string }[];

  customAssets: { id: string; dataUrl: string; name: string }[];
  addCustomAsset: (asset: { id: string; dataUrl: string; name: string }) => void;

  fundingRound: 'bootstrapped' | 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'ipo' | 'acquired' | 'bankrupt';
  burnRate: number;
  runway: number;
  valuation: number;
  equity: number;
  employees: string[];
  boardMembers: string[];
  activeCompetitors: string[];
  completedMilestones: string[];
  pendingBoardDemands: string[];

  hireEmployee: (entityId: string, cost: number) => void;
  fireEmployee: (entityId: string) => void;
  acceptFunding: (sponsorId: string, amount: number, equityPercent: number) => void;
  hitMilestone: (milestoneId: string) => void;
  advanceFundingRound: () => void;
  addCompetitor: (competitorId: string) => void;
  removeCompetitor: (competitorId: string) => void;
  calculateRunway: () => void;

  hydrate: () => void;
  addMoney: (amount: number) => void;
  setRepos: (repos: Repo[]) => void;
  addRepo: (repo: Repo) => void;
  activateFeature: (feature: RepoFeature) => void;
  deactivateFeature: (featureId: string) => void;
  markHolePlayed: (repoId: string, score: number) => void;
  triggerChaos: () => void;
  addMessage: (text: string) => void;
  setTheme: (theme: GameTheme) => void;
  setShowUploadModal: (show: boolean) => void;
  purchaseItem: (itemId: string) => void;

  startSwing: (feature: RepoFeature) => void;
  setPower: (power: number) => void;
  setAccuracy: (accuracy: number) => void;
  completeSwing: () => void;
  cancelSwing: () => void;

  spawnParticles: (x: number, y: number, count: number) => void;
  clearParticles: () => void;

  setGameState: (state: GameState) => void;
  setCurrentMinigame: (minigame: MinigameId | null) => void;
  submitScore: (name: string) => void;
  completeMinigame: (success: boolean, score?: number) => void;
  resetGame: () => void;
}

const THEMES: GameTheme[] = ['classic', 'neon', 'glitch', 'matrix'];
const PARTICLE_COLORS = ['#ffeb3b', '#4fc3f7', '#ff6b6b', '#4ade80', '#c084fc', '#ffd700'];

const DEFAULT_SWING: SwingState = {
  active: false,
  phase: 'power',
  power: 0,
  accuracy: 0,
  targetFeature: null,
  score: 0,
};

export function calcPowerScore(power: number): number {
  if (power >= 45 && power <= 55) return 100;
  const dist = power < 45 ? 45 - power : power - 55;
  return Math.max(0, 100 - dist * 2.5);
}

export function calcAccuracyScore(accuracy: number): number {
  if (accuracy >= 45 && accuracy <= 55) return 100;
  const dist = accuracy < 45 ? 45 - accuracy : accuracy - 55;
  return Math.max(0, 100 - dist * 2.5);
}

function persist(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

function makeMsg(text: string): Message {
  return { id: `${Date.now()}-${Math.random()}`, text, timestamp: Date.now() };
}

export const useChaosStore = create<ChaosStore>((set, get) => ({
  gameState: 'menu',
  streak: 0,
  partnerships: 0,
  strikes: 0,
  maxStrikes: 3,
  currentMinigame: null,
  leaderboard: [],
  purchasedItems: new Set<string>(),
  skipNextMinigame: false,
  scoreMultiplier: 1,
  chaosBoost: false,
  lastEarnings: 0,

  sponsorMoney: 0,
  totalScore: 0,
  chaosLevel: 0,

  repos: [],
  activeFeatures: [],
  currentHole: 1,

  messages: [],
  theme: 'classic',
  showUploadModal: false,
  swing: { ...DEFAULT_SWING },
  particles: [],
  customAssets: [],

  fundingRound: 'bootstrapped',
  burnRate: 1000,
  runway: 12,
  valuation: 0,
  equity: 100,
  employees: [],
  boardMembers: [],
  activeCompetitors: [],
  completedMilestones: [],
  pendingBoardDemands: [],

  hireEmployee: (entityId, cost) =>
    set((s) => {
      if (s.employees.includes(entityId) || s.sponsorMoney < cost) return s;
      const nextMoney = s.sponsorMoney - cost;
      persist('sky_sponsorMoney', nextMoney);
      return {
        employees: [...s.employees, entityId],
        sponsorMoney: nextMoney,
        burnRate: s.burnRate + Math.round(cost * 0.1),
        messages: [...s.messages, makeMsg(`Hired new team member! -$${cost}`)].slice(-50),
      };
    }),

  fireEmployee: (entityId) =>
    set((s) => {
      if (!s.employees.includes(entityId)) return s;
      return {
        employees: s.employees.filter((e) => e !== entityId),
        burnRate: Math.max(500, s.burnRate - 100),
        messages: [...s.messages, makeMsg('Team member let go. Burn rate reduced.')].slice(-50),
      };
    }),

  acceptFunding: (sponsorId, amount, equityPercent) =>
    set((s) => {
      const nextMoney = s.sponsorMoney + amount;
      const nextEquity = Math.max(0, s.equity - equityPercent);
      persist('sky_sponsorMoney', nextMoney);
      const newBoard = equityPercent >= 15 ? [...s.boardMembers, sponsorId] : s.boardMembers;
      return {
        sponsorMoney: nextMoney,
        equity: nextEquity,
        valuation: s.valuation + amount * 4,
        boardMembers: newBoard,
        messages: [...s.messages, makeMsg(`Funding accepted! +$${amount} for ${equityPercent}% equity`)].slice(-50),
      };
    }),

  hitMilestone: (milestoneId) =>
    set((s) => {
      if (s.completedMilestones.includes(milestoneId)) return s;
      const bonus = 5000;
      const nextMoney = s.sponsorMoney + bonus;
      persist('sky_sponsorMoney', nextMoney);
      return {
        completedMilestones: [...s.completedMilestones, milestoneId],
        sponsorMoney: nextMoney,
        valuation: s.valuation + 50000,
        messages: [...s.messages, makeMsg(`Milestone reached! +$${bonus} and valuation boost!`)].slice(-50),
      };
    }),

  advanceFundingRound: () =>
    set((s) => {
      const order: ChaosStore['fundingRound'][] = ['bootstrapped', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];
      const idx = order.indexOf(s.fundingRound);
      if (idx < 0 || idx >= order.length - 1) return s;
      const next = order[idx + 1];
      return {
        fundingRound: next,
        messages: [...s.messages, makeMsg(`Advanced to ${next.toUpperCase()}! New funding unlocked.`)].slice(-50),
      };
    }),

  addCompetitor: (competitorId) =>
    set((s) => ({
      activeCompetitors: s.activeCompetitors.includes(competitorId) ? s.activeCompetitors : [...s.activeCompetitors, competitorId],
    })),

  removeCompetitor: (competitorId) =>
    set((s) => ({
      activeCompetitors: s.activeCompetitors.filter((c) => c !== competitorId),
    })),

  calculateRunway: () =>
    set((s) => ({
      runway: s.burnRate > 0 ? Math.round(s.sponsorMoney / s.burnRate) : 99,
    })),

  addCustomAsset: (asset) =>
    set((s) => {
      const nextMoney = s.sponsorMoney + 500;
      persist('sky_sponsorMoney', nextMoney);
      return {
        customAssets: [...s.customAssets, asset],
        sponsorMoney: nextMoney,
        messages: [...s.messages, makeMsg(`Asset "${asset.name}" uploaded! +$500`)].slice(-50),
      };
    }),

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const money = localStorage.getItem('sky_sponsorMoney');
      const chaos = localStorage.getItem('sky_chaosLevel');
      const lb = localStorage.getItem('sky_leaderboard');
      const items = localStorage.getItem('sky_purchasedItems');
      const parsed: string[] = items !== null ? JSON.parse(items) : [];
      const purchased = new Set<string>(parsed);
      set({
        sponsorMoney: money !== null ? JSON.parse(money) : 0,
        chaosLevel: chaos !== null ? JSON.parse(chaos) : 0,
        leaderboard: lb !== null ? (JSON.parse(lb) as { name: string; score: number; money?: number }[]).map(e => ({ ...e, money: e.money ?? 0 })) : [],
        purchasedItems: purchased,
        scoreMultiplier: purchased.has('double_score') ? 2 : 1,
        maxStrikes: 3 + (purchased.has('extra_strike') ? 1 : 0),
        chaosBoost: purchased.has('chaos_boost'),
      });
    } catch { /* ignore */ }
  },

  purchaseItem: (itemId) =>
    set((s) => {
      if (s.purchasedItems.has(itemId)) return s;
      const next = new Set(s.purchasedItems);
      next.add(itemId);
      persist('sky_purchasedItems', [...next]);

      const updates: Partial<ChaosStore> = { purchasedItems: next };

      if (itemId === 'double_score') updates.scoreMultiplier = 2;
      if (itemId === 'extra_strike') updates.maxStrikes = s.maxStrikes + 1;
      if (itemId === 'skip_minigame') updates.skipNextMinigame = true;
      if (itemId === 'chaos_boost') updates.chaosBoost = true;

      return updates as ChaosStore;
    }),

  addMoney: (amount) =>
    set((s) => {
      const next = s.sponsorMoney + amount;
      persist('sky_sponsorMoney', next);
      return {
        sponsorMoney: next,
        messages: [...s.messages, makeMsg(`Ka-ching! +$${amount} sponsorship`)].slice(-50),
      };
    }),

  setRepos: (repos) => set({ repos }),

  addRepo: (repo) =>
    set((s) => ({
      repos: [...s.repos, { ...repo, holeNumber: s.repos.length + 1 }],
    })),

  activateFeature: (feature) =>
    set((s) => {
      const entry: ActiveFeature = {
        featureId: feature.id,
        featureName: feature.name,
        repoName: s.repos.find((r) => r.id === feature.repoId)?.name ?? 'Unknown',
        activatedAt: Date.now(),
      };
      let next = [...s.activeFeatures, entry];
      if (next.length > 10) next = next.slice(next.length - 10);
      const chaos = s.chaosLevel + 1;
      persist('sky_chaosLevel', chaos);
      return {
        activeFeatures: next,
        chaosLevel: chaos,
        messages: [
          ...s.messages,
          makeMsg(`${entry.repoName}'s ${feature.name} activated!`),
        ].slice(-50),
      };
    }),

  deactivateFeature: (featureId) =>
    set((s) => ({
      activeFeatures: s.activeFeatures.filter((f) => f.featureId !== featureId),
    })),

  markHolePlayed: (repoId, score) =>
    set((s) => ({
      repos: s.repos.map((r) =>
        r.id === repoId ? { ...r, played: true, score } : r,
      ),
      totalScore: s.totalScore + score,
    })),

  triggerChaos: () =>
    set((s) => {
      const allFeatures = s.repos.flatMap((r) => r.features);
      if (allFeatures.length === 0) return {};

      const count = randomInt(3, Math.min(7, allFeatures.length));
      const shuffled = [...allFeatures].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, count);

      const newActives: ActiveFeature[] = picked.map((f) => ({
        featureId: f.id,
        featureName: f.name,
        repoName: s.repos.find((r) => r.id === f.repoId)?.name ?? 'Unknown',
        activatedAt: Date.now(),
      }));

      let combined = [...s.activeFeatures, ...newActives];
      if (combined.length > 10) combined = combined.slice(combined.length - 10);

      const moneyGain = 500 * count * (s.chaosBoost ? 3 : 1);
      const nextMoney = s.sponsorMoney + moneyGain;
      const nextChaos = s.chaosLevel + count;
      const nextTheme = randomItem(THEMES);

      persist('sky_sponsorMoney', nextMoney);
      persist('sky_chaosLevel', nextChaos);

      const msgs: Message[] = [
        ...picked.map((f) => {
          const rn = s.repos.find((r) => r.id === f.repoId)?.name ?? 'Unknown';
          return makeMsg(`CHAOS: ${rn}'s ${f.name} activated!`);
        }),
        makeMsg(`Ka-ching! +$${moneyGain} sponsorship from chaos!`),
        makeMsg(`Theme shifted to ${nextTheme}. Brace yourself.`),
      ];

      return {
        activeFeatures: combined,
        sponsorMoney: nextMoney,
        chaosLevel: nextChaos,
        theme: nextTheme,
        messages: [...s.messages, ...msgs].slice(-50),
      };
    }),

  addMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, makeMsg(text)].slice(-50),
    })),

  setTheme: (theme) => set({ theme }),

  setShowUploadModal: (show) => set({ showUploadModal: show }),

  startSwing: (feature) =>
    set({
      swing: {
        active: true,
        phase: 'power',
        power: 0,
        accuracy: 0,
        targetFeature: feature,
        score: 0,
      },
    }),

  setPower: (power) =>
    set((s) => ({
      swing: { ...s.swing, power, phase: 'accuracy' },
    })),

  setAccuracy: (accuracy) =>
    set((s) => {
      const pScore = calcPowerScore(s.swing.power);
      const aScore = calcAccuracyScore(accuracy);
      const total = Math.round(pScore + aScore);
      return {
        swing: { ...s.swing, accuracy, phase: 'result', score: total },
      };
    }),

  completeSwing: () => {
    const s = get();
    const { swing } = s;
    if (!swing.active || !swing.targetFeature) return;

    const total = Math.round(swing.score * s.scoreMultiplier);
    const isGoodHit = total > 150;

    let newStreak = s.streak;
    let newPartnerships = s.partnerships;
    let newStrikes = s.strikes;
    let moneyChange = 0;
    let messageText = '';
    let nextMultiplier = s.purchasedItems.has('double_score') ? 2 : 1;

    if (isGoodHit) {
      newStreak += 1;
      if (newStreak % 3 === 0) {
        newPartnerships += 1;
      }
      moneyChange = Math.round(total * 2.5 * (1 + newPartnerships * 0.1));
      if (s.scoreMultiplier > 1) messageText = `BOOSTED hit! 2x Score! Streak: ${newStreak}`;
      else messageText = `Good hit! Streak: ${newStreak}`;
    } else {
      newStreak = 0;
      moneyChange = -500;
      newStrikes += 1;
      messageText = `Miss! The enemy is catching up! Strike ${newStrikes}/${s.maxStrikes}`;
    }

    if (newStrikes >= s.maxStrikes) {
      set((prev) => ({
        ...prev,
        strikes: newStrikes,
        streak: newStreak,
        partnerships: newPartnerships,
        sponsorMoney: prev.sponsorMoney + moneyChange,
        lastEarnings: moneyChange,
        gameState: 'gameover',
        swing: { ...DEFAULT_SWING },
        messages: [...prev.messages, makeMsg(messageText)].slice(-50),
      }));
      return;
    }

    const feature = swing.targetFeature;
    const repo = s.repos.find((r) => r.id === feature.repoId);
    const firstTime = repo && !repo.played;

    set((prev) => {
      const nextMoney = prev.sponsorMoney + moneyChange;
      persist('sky_sponsorMoney', nextMoney);

      const activatedEntry: ActiveFeature = {
        featureId: feature.id,
        featureName: feature.name,
        repoName: repo?.name ?? 'Unknown',
        activatedAt: Date.now(),
      };
      let nextActives = [...prev.activeFeatures, activatedEntry];
      if (nextActives.length > 10) nextActives = nextActives.slice(nextActives.length - 10);

      const nextChaos = prev.chaosLevel + 1;
      persist('sky_chaosLevel', nextChaos);

      const msgs: Message[] = [
        makeMsg(messageText),
        makeMsg(`Swing complete! Score: ${total} | Earned/Lost $${moneyChange}`),
      ];
      if (firstTime && repo) {
        msgs.push(makeMsg(`Hole #${repo.holeNumber} cleared!`));
      }

      const pColors = Array.from({ length: 15 }, (_, i) => ({
        id: `${Date.now()}-${i}-${Math.random()}`,
        x: 50 + (Math.random() - 0.5) * 40,
        y: 50 + (Math.random() - 0.5) * 40,
        color: randomItem(PARTICLE_COLORS),
      }));

      const randomMinigame = randomItem([...MINIGAME_IDS]);

      return {
        streak: newStreak,
        partnerships: newPartnerships,
        strikes: newStrikes,
        sponsorMoney: nextMoney,
        lastEarnings: moneyChange,
        scoreMultiplier: nextMultiplier,
        chaosLevel: nextChaos,
        activeFeatures: nextActives,
        swing: { ...DEFAULT_SWING },
        gameState: prev.skipNextMinigame ? 'playing' : 'minigame',
        currentMinigame: prev.skipNextMinigame ? null : randomMinigame,
        skipNextMinigame: false,
        messages: [...prev.messages, ...msgs, ...(prev.skipNextMinigame ? [makeMsg('Auto-Win Token used! Minigame skipped.')] : [])].slice(-50),
        particles: [...prev.particles, ...pColors],
        repos: prev.repos.map((r) =>
          r.id === feature.repoId && firstTime
            ? { ...r, played: true, score: total }
            : r,
        ),
        totalScore: firstTime ? prev.totalScore + total : prev.totalScore,
      };
    });
  },

  cancelSwing: () => set({ swing: { ...DEFAULT_SWING } }),

  spawnParticles: (x, y, count) =>
    set((s) => {
      const fresh = Array.from({ length: count }, (_, i) => ({
        id: `${Date.now()}-${i}-${Math.random()}`,
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        color: randomItem(PARTICLE_COLORS),
      }));
      return { particles: [...s.particles, ...fresh] };
    }),

  clearParticles: () => set({ particles: [] }),

  setGameState: (state) => set({ gameState: state }),

  resetGame: () =>
    set((s) => {
      persist('sky_sponsorMoney', 0);
      persist('sky_chaosLevel', 0);
      persist('sky_purchasedItems', []);
      return {
        sponsorMoney: 0,
        strikes: 0,
        maxStrikes: 3,
        streak: 0,
        partnerships: 0,
        totalScore: 0,
        currentHole: 1,
        lastEarnings: 0,
        scoreMultiplier: 1,
        skipNextMinigame: false,
        chaosBoost: false,
        purchasedItems: new Set<string>(),
        gameState: 'menu',
        currentMinigame: null,
        activeFeatures: [],
        chaosLevel: 0,
        messages: [],
        swing: { ...DEFAULT_SWING },
        particles: [],
        customAssets: [],
        fundingRound: 'bootstrapped',
        burnRate: 1000,
        runway: 12,
        valuation: 0,
        equity: 100,
        employees: [],
        boardMembers: [],
        activeCompetitors: [],
        completedMilestones: [],
        pendingBoardDemands: [],
        repos: s.repos.map((r) => ({ ...r, played: false, score: 0 })),
      };
    }),

  setCurrentMinigame: (minigame) => set({ currentMinigame: minigame }),

  submitScore: (name) =>
    set((s) => {
      const entry = { name, score: s.totalScore, money: s.sponsorMoney };
      const newBoard = [...s.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
      persist('sky_leaderboard', newBoard);
      return {
        leaderboard: newBoard,
        gameState: 'leaderboard',
      };
    }),

  completeMinigame: (success, score = 0) =>
    set((s) => {
      const moneyChange = success ? score * 5 : -200;
      const nextMoney = s.sponsorMoney + moneyChange;
      persist('sky_sponsorMoney', nextMoney);

      return {
        sponsorMoney: nextMoney,
        gameState: 'playing',
        currentMinigame: null,
        messages: [
          ...s.messages,
          makeMsg(success ? `Minigame success! +$${score * 5}` : `Minigame failed! -$200`)
        ].slice(-50),
      };
    }),
}));
