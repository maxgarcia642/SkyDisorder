# SkyDisorder v3.0

**Breaking the ground with no land order at all. Try Google products like NotebookLM, Gemini, and their Labs #MayOrMayNotBeSponsored**

A chaotic, interconnected multi-repo platform styled as a retro golf arcade machine game inspired by Neo Turf Masters (1996 Neo Geo). This satirical startup app turns a collective of what seems to be **various repository programs** into a playable, gamified entity.

## Run

```bash
git clone https://github.com/maxgarcia642/SkyDisorder.git
cd SkyDisorder
npm install
npm run dev
```

Open `http://localhost:3000`.

## What's In v3.0

### 405 Entities Integrated as Game Characters

Every repo from the Sky Disorder folder plus 21 satirical investor parodies are mapped to startup-themed game entities:

| Role | Count | Purpose |
|------|-------|---------|
| Minigames | 25 | Playable game challenges |
| Sponsors | 35 | Fund your startup (includes 8 parody VC firms) |
| Employees | 44 | Hire them, increase burn rate |
| Competitors | 16 | Rival startups gaining on you |
| Hazards | 22 | Course obstacles that cost you money |
| Powerups | 26 | Shop items with real gameplay effects |
| Events | 23 | Random occurrences during gameplay |
| Milestones | 33 | Achievements to unlock |
| Caddies | 139 | AI advisors rotating tips |
| Courses | 16 | Background themes for the arcade |
| Clubhouses | 2 | Full app showcases |
| Trophies | 12 | Proof of completed projects |
| Equipment | 14 | Unlockable dev tools |

#### Investor Satire Entities (NEW)

21 parody versions of real-world investors from Ordinal/Breakground AI and Acres/AcreTrader backers:

- Breaking Artificial Glass and Running on Intelligent Ground (legendary sponsor)
- Narnia's Vance-Thiel Dark Pool Syndicate (legendary sponsor)
- Misunderstood Anthill Group (legendary sponsor)
- Natural Disasters (legendary hazard)
- Land Traitors (epic competitor)
- Out-of-Order Kiosk (epic hazard)
- W Family's Razor Blade Fund (epic hazard)
- Betting on Money Printers Fund (epic sponsor)
- And 13 more satirical VC/PE entities across sponsors, hazards, events, caddies, and powerups

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
- AI Caddy rotates through 139+ advisors
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
