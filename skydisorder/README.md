# SkyDisorder

**Breaking the ground with no land order at all. Try Google products like NotebookLM, Gemini, and their Labs #MayOrMayNotBeSponsored**

A chaotic, interconnected multi-repo platform styled as a retro golf arcade machine game inspired by Neo Turf Masters (1996 Neo Geo). This app turns a folder of random codebases into a playable, gamified experience where users interact with features from different repos like they're playing holes on a golf course.

## Run

```bash
cd skydisorder
npm install
npm run dev
```

Open `http://localhost:3000`.

## What happens

- The app scans the parent folder for anything that looks like a repo
- Each repo becomes a "hole" on a chaotic golf course
- Click features to play a swing mini-game (power + accuracy meters)
- Earn sponsorship money with every action
- Smash the CHAOS button for random mayhem
- Upload your own repos to add more holes
- Watch the chaos level climb

## Tech

- Next.js 14 (App Router)
- Zustand for state
- Zero external UI libraries — pure CSS arcade aesthetic
- Server-side repo scanning via `fs`
- Client-side file upload for session repos
