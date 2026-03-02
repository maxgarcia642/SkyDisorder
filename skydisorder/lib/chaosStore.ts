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
  currentMinigame: string | null;
  leaderboard: { name: string; score: number; money: number }[];

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

  startSwing: (feature: RepoFeature) => void;
  setPower: (power: number) => void;
  setAccuracy: (accuracy: number) => void;
  completeSwing: () => void;
  cancelSwing: () => void;

  spawnParticles: (x: number, y: number, count: number) => void;
  clearParticles: () => void;

  setGameState: (state: GameState) => void;
  setCurrentMinigame: (minigame: string | null) => void;
  submitScore: (name: string) => void;
  completeMinigame: (success: boolean, score: number) => void;
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

function loadPersisted<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
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
  currentMinigame: null,
  leaderboard: [],

  sponsorMoney: loadPersisted('sky_sponsorMoney', 0),
  totalScore: 0,
  chaosLevel: loadPersisted('sky_chaosLevel', 0),

  repos: [],
  activeFeatures: [],
  currentHole: 1,

  messages: [],
  theme: 'classic',
  showUploadModal: false,
  swing: { ...DEFAULT_SWING },
  particles: [],

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

      const moneyGain = 500 * count;
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

    const total = swing.score;
    const isGoodHit = total > 150;

    let newStreak = s.streak;
    let newPartnerships = s.partnerships;
    let newStrikes = s.strikes;
    let moneyChange = 0;
    let messageText = '';

    if (isGoodHit) {
      newStreak += 1;
      if (newStreak % 3 === 0) {
        newPartnerships += 1;
      }
      moneyChange = total * 2.5 * (1 + newPartnerships * 0.1);
      messageText = `Good hit! Streak: ${newStreak}`;
    } else {
      newStreak = 0;
      moneyChange = -500;
      newStrikes += 1;
      messageText = `Miss! The enemy is catching up! Strike ${newStrikes}/3`;
    }

    if (newStrikes >= 3) {
      set((prev) => ({
        ...prev,
        strikes: newStrikes,
        streak: newStreak,
        partnerships: newPartnerships,
        sponsorMoney: prev.sponsorMoney + moneyChange,
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
        makeMsg(`Swing complete! Score: ${total} | Earned/Lost $${moneyChange.toFixed(0)}`),
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

      const randomMinigame = randomItem(['coffee', 'tactical', 'radar', 'snake']);

      return {
        streak: newStreak,
        partnerships: newPartnerships,
        strikes: newStrikes,
        sponsorMoney: nextMoney,
        chaosLevel: nextChaos,
        activeFeatures: nextActives,
        swing: { ...DEFAULT_SWING },
        gameState: 'minigame',
        currentMinigame: randomMinigame,
        messages: [...prev.messages, ...msgs].slice(-50),
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
      resetGame: () => set({ sponsorMoney: 0, strikes: 0, streak: 0, partnerships: 0, totalScore: 0, currentHole: 0 }),
      setCurrentMinigame: (minigame) => set({ currentMinigame: minigame }),

  submitScore: (name) =>
    set((s) => {
      const entry = { name, score: s.totalScore, money: s.sponsorMoney };
      return {
        leaderboard: [...s.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10),
        gameState: 'menu',
      };
    }),

  completeMinigame: (success, score) =>
    set((s) => {
      let moneyChange = success ? score * 5 : -200;
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
