# SkyDisorder v3.0

**Breaking the ground with no land order at all. Try Google products like NotebookLM, Gemini, and their Labs #MayOrMayNotBeSponsored**

A chaotic, interconnected multi-repo platform styled as a retro golf arcade machine game inspired by Neo Turf Masters (1996 Neo Geo). This app turns **384 repositories** from a single folder into a playable, gamified startup satire where every repo becomes a game entity.

## Run

```bash
git clone https://github.com/maxgarcia642/SkyDisorder.git
cd SkyDisorder
npm install
npm run dev
```

Open `http://localhost:3000`.

## What's In v3.0

### 384 Repos Integrated as Game Entities

Every single repo from the Sky Disorder folder is mapped to a satirical startup-themed game entity:

| Role | Count | Purpose |
|------|-------|---------|
| Minigames | 25 | Playable game challenges |
| Sponsors | 27 | Fund your startup |
| Employees | 44 | Hire them, increase burn rate |
| Competitors | 14 | Rival startups gaining on you |
| Hazards | 15 | Course obstacles that cost you money |
| Powerups | 25 | Shop items with real gameplay effects |
| Events | 20 | Random occurrences during gameplay |
| Milestones | 33 | Achievements to unlock |
| Caddies | 137 | AI advisors rotating tips |
| Courses | 16 | Background themes for the arcade |
| Clubhouses | 2 | Full app showcases |
| Trophies | 12 | Proof of completed projects |
| Equipment | 14 | Unlockable dev tools |

### 20 Playable Minigames

Coffee Pour, Tactical Strike, Taste Radar, Snake, Number Guess, Real or Bot, Map Finder, Plant Water, Food Rush, Debate Judge, Code Puzzle, Bowling Strike, Docker Dash, Git Rebase, Bug Squash, Stock Ticker, Type Racer, Firewall, 2048, Tic-Tac-Toe

### Startup Simulation

- Funding rounds: Bootstrapped through IPO/Acquired/Bankrupt
- Hire/fire employees from repos (affects burn rate)
- Competitor tracker with threat levels
- Board meetings with demands
- Milestone tracker with unlock conditions
- Game over: runway hits 0, equity drops below 10%, or you IPO

### Gameplay

- Each repo is a "hole" on a chaotic golf course
- Click features to swing (power + accuracy meters)
- Earn sponsorship money, build streaks for partnerships
- Random hazards from the registry can penalize your swing
- Random events fire after swings (10% chance)
- Sponsor Shop with real gameplay effects from registry powerups
- AI Caddy rotates through 137+ advisors
- Chaos News Feed generates headlines from event entities
- 3 strikes and you're out

### Custom Assets

Upload your own images to use in-game (PNG/JPEG/GIF/WebP, max 2MB)

## Tech

- Next.js 14 (App Router)
- Zustand for state management
- Zero external UI libraries -- pure CSS arcade aesthetic
- Server-side repo scanning via `fs`
- Client-side file upload
- Mobile/touch friendly
- localStorage persistence for leaderboard, money, and purchases
