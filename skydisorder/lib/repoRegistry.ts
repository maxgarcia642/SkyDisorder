export type GameRole =
  | 'minigame'
  | 'sponsor'
  | 'employee'
  | 'competitor'
  | 'hazard'
  | 'powerup'
  | 'event'
  | 'milestone';

export interface GameEntity {
  id: string;
  name: string;
  description: string;
  role: GameRole;
  sourceRepos: string[];
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const GAME_ENTITIES: GameEntity[] = [
  // ─── MINIGAMES ────────────────────────────────────────────
  { id: 'coffee-pour', name: 'Caffeine Crisis', description: 'Pour the perfect cup before the sprint meeting', role: 'minigame', sourceRepos: ['coffee-please-main'], icon: '☕', rarity: 'common' },
  { id: 'tactical-strike', name: 'Deadline Destroyer', description: 'Click away the bugs before deployment', role: 'minigame', sourceRepos: ['modern-aw-game-main'], icon: '🎯', rarity: 'common' },
  { id: 'taste-radar', name: 'Lunch Lottery', description: 'Remember where the good restaurants are', role: 'minigame', sourceRepos: ['TasteMap-main'], icon: '🍽️', rarity: 'common' },
  { id: 'snake', name: 'Cable Management', description: 'Route the ethernet without crossing streams', role: 'minigame', sourceRepos: ['native-stuff-main'], icon: '🐍', rarity: 'common' },
  { id: 'numberguess', name: 'Estimate Roulette', description: 'Guess the sprint points (you will be wrong)', role: 'minigame', sourceRepos: ['native-stuff-main'], icon: '🔢', rarity: 'common' },
  { id: 'realorbot', name: 'Bot or Intern?', description: 'Is this code from AI or a junior dev?', role: 'minigame', sourceRepos: ['robotriffs-main', 'code_puppy-main'], icon: '🤖', rarity: 'rare' },
  { id: 'mapfinder', name: 'Remote Worker Tracker', description: 'Find where your team actually is', role: 'minigame', sourceRepos: ['maptiler-sdk-js-fork-main'], icon: '🗺️', rarity: 'common' },
  { id: 'plantwater', name: 'Office Plant Duty', description: 'Keep the succulents alive (unlike the startup)', role: 'minigame', sourceRepos: ['lovefern-main'], icon: '🌱', rarity: 'common' },
  { id: 'foodrush', name: 'Expense Report Speedrun', description: 'Categorize meals before finance notices', role: 'minigame', sourceRepos: ['TasteMap-main'], icon: '🍕', rarity: 'common' },
  { id: 'debatejudge', name: 'Standup Arbitration', description: 'Decide who actually blocked whom', role: 'minigame', sourceRepos: ['verydebate-main'], icon: '⚖️', rarity: 'rare' },
  { id: 'codepuzzle', name: 'Code Review Chaos', description: 'Spot the bug in 30 seconds', role: 'minigame', sourceRepos: ['advent-of-code-main'], icon: '💻', rarity: 'rare' },
  { id: 'bowling', name: 'Layoff Bowling', description: 'Knock down headcount (its restructuring)', role: 'minigame', sourceRepos: ['thoughtsonbowling-main'], icon: '🎳', rarity: 'epic' },
  { id: 'dockerdash', name: 'Container Stacker', description: 'Stack Docker containers before the server tips over', role: 'minigame', sourceRepos: ['zmk-fourier-master', 'zmk-roadrunner-main'], icon: '🐳', rarity: 'rare' },
  { id: 'gitrebase', name: 'Rebase Roulette', description: 'Reorder commits without breaking the build', role: 'minigame', sourceRepos: ['Terminal-Code-Collective'], icon: '🔀', rarity: 'rare' },
  { id: 'bugsquash', name: 'QA Nightmare', description: 'Squash the bugs before the demo', role: 'minigame', sourceRepos: ['code_puppy-main'], icon: '🐛', rarity: 'common' },
  { id: 'stockticker', name: 'Stonks Simulator', description: 'Buy high sell low (the dev way)', role: 'minigame', sourceRepos: ['yield-monitor-main', 'Probabilistic-Rating-Engine-main'], icon: '📈', rarity: 'epic' },
  { id: 'typeracer', name: 'Keyboard Warrior', description: 'Type code faster than the linter complains', role: 'minigame', sourceRepos: ['advent-of-code-main', 'cstc210-main'], icon: '⌨️', rarity: 'common' },
  { id: 'firewall', name: 'Firewall Frenzy', description: 'Block bad packets or the CEO reads your Slack', role: 'minigame', sourceRepos: ['native-stuff-main'], icon: '🛡️', rarity: 'rare' },
  { id: 'mini2048', name: 'Sprint Planning 2048', description: 'Merge tickets until nothing makes sense', role: 'minigame', sourceRepos: ['nextjs-dashboard-main'], icon: '🔢', rarity: 'common' },
  { id: 'tictactoe', name: 'Whiteboard Interview', description: 'Beat the AI at a game nobody asked about', role: 'minigame', sourceRepos: ['robotriffs-main'], icon: '❌', rarity: 'common' },

  // ─── SPONSORS ─────────────────────────────────────────────
  { id: 'sponsor-bigtech', name: 'MegaCorp Ventures', description: 'They want 40% equity for a logo placement', role: 'sponsor', sourceRepos: ['portfolio-v3-main', 'personal-website-main', 'next-website-main'], icon: '🏢', rarity: 'epic' },
  { id: 'sponsor-angel', name: 'Rich Uncle Capital', description: 'Family money with family opinions', role: 'sponsor', sourceRepos: ['ecommerce-admin-main', 'storage-closet-main'], icon: '👼', rarity: 'rare' },
  { id: 'sponsor-crypto', name: 'Web3 Believers Fund', description: 'Paid in tokens (currently worthless)', role: 'sponsor', sourceRepos: ['neon-main', 'indie-stack-main'], icon: '🪙', rarity: 'legendary' },
  { id: 'sponsor-govt', name: 'Innovation Grant 3000', description: '18 months of paperwork for $50k', role: 'sponsor', sourceRepos: ['SWOT_Dashboard-main', 'yield-monitor-main'], icon: '🏛️', rarity: 'rare' },
  { id: 'sponsor-accelerator', name: 'Y Combinator Knockoff', description: 'Demo day is in 3 weeks. Good luck.', role: 'sponsor', sourceRepos: ['nextjs-dashboard-main', 'social-app-main'], icon: '🚀', rarity: 'epic' },

  // ─── EMPLOYEES ────────────────────────────────────────────
  { id: 'emp-frontend', name: 'React Randy', description: 'Refuses to write CSS. Everything is a component.', role: 'employee', sourceRepos: ['nextjs-twitter-clone-main', 'nextjs-live-transcription-main'], icon: '⚛️', rarity: 'common' },
  { id: 'emp-backend', name: 'API Alice', description: 'Microservices for a TODO app', role: 'employee', sourceRepos: ['rails-api-main', 'express-main'], icon: '🔧', rarity: 'common' },
  { id: 'emp-devops', name: 'Docker Dave', description: 'The pipeline is his personality', role: 'employee', sourceRepos: ['zmk-fourier-master', 'zmk-roadrunner-main'], icon: '🐳', rarity: 'rare' },
  { id: 'emp-designer', name: 'Figma Fiona', description: 'The mockups are perfect. Too bad we cant build them.', role: 'employee', sourceRepos: ['portfolio-v3-main', 'personal-website-main'], icon: '🎨', rarity: 'rare' },
  { id: 'emp-pm', name: 'Jira Janet', description: 'Moved your ticket to Backlog Refinement Limbo', role: 'employee', sourceRepos: ['nextjs-dashboard-main'], icon: '📋', rarity: 'common' },
  { id: 'emp-data', name: 'SQL Steve', description: 'SELECT * FROM problems WHERE solution IS NULL', role: 'employee', sourceRepos: ['Probabilistic-Rating-Engine-main', 'SWOT_Dashboard-main'], icon: '📊', rarity: 'rare' },
  { id: 'emp-ml', name: 'TensorFlow Tina', description: 'The model works locally (narrator: it didnt)', role: 'employee', sourceRepos: ['code_puppy-main', 'robotriffs-main'], icon: '🧠', rarity: 'epic' },
  { id: 'emp-intern', name: 'Unpaid Ulysses', description: 'Stack Overflow is down. Hes stuck.', role: 'employee', sourceRepos: ['cstc210-main', 'advent-of-code-main'], icon: '🎓', rarity: 'common' },

  // ─── COMPETITORS ──────────────────────────────────────────
  { id: 'comp-clone', name: 'Copycat Corp', description: 'They pivoted to your exact idea 2 weeks ago', role: 'competitor', sourceRepos: ['nextjs-twitter-clone-main'], icon: '🐱', rarity: 'common' },
  { id: 'comp-funded', name: 'Overfunded Inc', description: '$50M Series A for an app that doesnt exist', role: 'competitor', sourceRepos: ['ecommerce-admin-main'], icon: '💰', rarity: 'epic' },
  { id: 'comp-bigtech', name: 'Google Side Project', description: 'They built your product as a hackathon demo', role: 'competitor', sourceRepos: ['maptiler-sdk-js-fork-main'], icon: '🔍', rarity: 'legendary' },
  { id: 'comp-cheap', name: 'Offshore Alternatives', description: '1/10th the price, 1/100th the quality', role: 'competitor', sourceRepos: ['storage-closet-main'], icon: '🌏', rarity: 'common' },

  // ─── HAZARDS ──────────────────────────────────────────────
  { id: 'hazard-techdebt', name: 'Technical Debt Bunker', description: 'Nobody remembers why this code exists', role: 'hazard', sourceRepos: ['native-stuff-main', 'indie-stack-main'], icon: '🕳️', rarity: 'common' },
  { id: 'hazard-outage', name: 'AWS Water Hazard', description: 'us-east-1 is down. Again.', role: 'hazard', sourceRepos: ['storage-closet-main'], icon: '💧', rarity: 'rare' },
  { id: 'hazard-meeting', name: 'All-Hands Quicksand', description: 'This could have been an email', role: 'hazard', sourceRepos: ['verydebate-main'], icon: '📅', rarity: 'common' },
  { id: 'hazard-pivot', name: 'Pivot Tornado', description: 'The board wants you to become an AI company now', role: 'hazard', sourceRepos: ['code_puppy-main'], icon: '🌪️', rarity: 'epic' },
  { id: 'hazard-funding', name: 'Funding Winter', description: 'VCs are only investing in AI. Youre not AI enough.', role: 'hazard', sourceRepos: ['neon-main'], icon: '❄️', rarity: 'legendary' },

  // ─── POWERUPS ─────────────────────────────────────────────
  { id: 'powerup-coffee', name: 'Espresso Injection', description: '+$1000 (repeatable caffeine addiction)', role: 'powerup', sourceRepos: ['coffee-please-main'], icon: '☕', rarity: 'common' },
  { id: 'powerup-pivot', name: 'Emergency Pivot', description: 'Skip the next minigame (we changed direction)', role: 'powerup', sourceRepos: ['indie-stack-main'], icon: '🔄', rarity: 'rare' },
  { id: 'powerup-hype', name: 'LinkedIn Hype Train', description: '2x score on next swing (thought leadership)', role: 'powerup', sourceRepos: ['social-app-main', 'robotriffs-main'], icon: '📣', rarity: 'rare' },
  { id: 'powerup-runway', name: 'Bridge Round', description: '+1 strike tolerance (extended runway)', role: 'powerup', sourceRepos: ['ecommerce-admin-main'], icon: '🌉', rarity: 'epic' },
  { id: 'powerup-chaos', name: 'Chaos Multiplier', description: '3x chaos button earnings (move fast break things)', role: 'powerup', sourceRepos: ['modern-aw-game-main'], icon: '🔥', rarity: 'epic' },

  // ─── EVENTS ───────────────────────────────────────────────
  { id: 'event-viralpost', name: 'Viral Tweet', description: 'Your intern posted. It worked. Somehow.', role: 'event', sourceRepos: ['robotriffs-main', 'nextjs-twitter-clone-main'], icon: '🐦', rarity: 'rare' },
  { id: 'event-acquisition', name: 'Acquisition Offer', description: 'Big Corp wants to acqui-hire. Do you sell out?', role: 'event', sourceRepos: ['ecommerce-admin-main'], icon: '🤝', rarity: 'legendary' },
  { id: 'event-press', name: 'TechCrunch Feature', description: 'They spelled your name wrong but traffic is up', role: 'event', sourceRepos: ['portfolio-v3-main'], icon: '📰', rarity: 'epic' },
  { id: 'event-hack', name: 'Security Breach', description: 'The password was admin123', role: 'event', sourceRepos: ['native-stuff-main'], icon: '🔓', rarity: 'rare' },

  // ─── MILESTONES ───────────────────────────────────────────
  { id: 'mile-mvp', name: 'MVP Shipped', description: 'It crashes, but it ships', role: 'milestone', sourceRepos: ['storage-closet-main'], icon: '🚢', rarity: 'common' },
  { id: 'mile-users', name: '1000 Users', description: '997 are bots but who is counting', role: 'milestone', sourceRepos: ['social-app-main'], icon: '👥', rarity: 'rare' },
  { id: 'mile-revenue', name: 'First Dollar', description: 'Customer #1 (your mom) paid', role: 'milestone', sourceRepos: ['ecommerce-admin-main'], icon: '💵', rarity: 'rare' },
  { id: 'mile-series-a', name: 'Series A Closed', description: 'Now you have real money and real problems', role: 'milestone', sourceRepos: ['neon-main'], icon: '🎉', rarity: 'epic' },
  { id: 'mile-ipo', name: 'IPO Bell', description: 'You rang the bell. Was it worth it?', role: 'milestone', sourceRepos: ['yield-monitor-main'], icon: '🔔', rarity: 'legendary' },
];

export const getByRole = (role: GameRole) => GAME_ENTITIES.filter(e => e.role === role);
export const getMinigames = () => getByRole('minigame');
export const getSponsors = () => getByRole('sponsor');
export const getEmployees = () => getByRole('employee');
export const getCompetitors = () => getByRole('competitor');
export const getHazards = () => getByRole('hazard');
export const getPowerups = () => getByRole('powerup');
export const getEvents = () => getByRole('event');
export const getMilestones = () => getByRole('milestone');
export const getById = (id: string) => GAME_ENTITIES.find(e => e.id === id);
export const getRandomByRole = (role: GameRole) => {
  const pool = getByRole(role);
  return pool[Math.floor(Math.random() * pool.length)];
};
