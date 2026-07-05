# SkyDisorder — BUILD REPORT

## PLAYTEST-FEEDBACK PASS (2026-07-04) — post-handoff polish, bugfix, humor

Max played the build and filed notes; this pass addresses them surgically. All
edits are tagged in source with `// USER-PLAYTEST-FIX`, `// HUMOR-SHARPEN`,
`// UI-POLISH`, or `// JUICE`. Frozen PascalCase faction keys untouched; no new
systems invented; tone guardrails held (punch up, fiction only).

### Critical UI / layering fixes
- **Footnote Ledger**: the scrolling entries were drawn UNDER the "currently
  open / latest entry" preview box — `headerH` was 72 while the preview extends
  to `PY+152`. Raised `headerH` to 162 and `footerH` to 52 so nothing overlaps.
  Button row raised clear of the panel edge; the ESC hint recolored from
  near-black `#5a4a1a` to readable gold, in its own strip below the buttons.
- **Credits**: long lines are now word-wrapped inside the panel borders, and
  the crawl is a seamless repeating loop (wrap-around draw over the true
  content height) instead of the old jump-cut modulo-980 "lazy refresh."
- **Marketplace**: cash readout is right-aligned at the panel edge — big
  balances no longer clip. Powerup catalog doubled from 4 to 8 (Mulligan Memo,
  Lobbyist Umbrella, PR Blast, Shredder Hour), with save-merge so older saves
  see the full roster.
- **Watch Mode**: the sim ball was drawn at `260 + ballY` (y≈580) — below the
  field, in the void. The field is now self-contained: fixed tee, fixed flag
  aligned to the field's own ground line, ball arcs tee→flag with a turf
  shadow. Back button raised inside the panel; landing burst added; commentary
  drawn from a pool instead of two fixed lines.
- **Minigame Arcade**: PLAY SELECTED / END GAME / BACK were stacked on the same
  centered coordinates (BACK was literally unreachable in two phases). Buttons
  are now laid out per phase: select = TRAINING CAMP / PLAY / BACK side by
  side; play = END GAME only; results = PLAY AGAIN + BACK. The grid now lists
  12 cabinets — the 9 base games plus the three GP-8 reskins with a ★ cue.
- **Job Fair**: the "glitching grey text" was `getJobOfferLine()` re-rolling a
  random voice line EVERY FRAME — lines are now cached per offer. Fair expanded
  to 9 offers in a 3×3 grid with mouse-wheel / arrow-key scrolling, scrollbar,
  and scroll-aware hitboxes. Cash right-aligned.
- **Main Menu**: the Architect Desk card overlapped the right button column and
  panel edge. Menu narrowed/shifted (now an exact 2×6 grid) and the desk card
  slightly shrunk — no more collisions.
- **Settings**: the caddy section now explains itself ("the voice that
  critiques every swing from the HUD ticker"), shows a live sample line from
  the selected caddy, and hitboxes track the reflowed layout.

### Structure
- **Training Camp merged into the Arcade** ("Trading/Camp and Arcade are the
  same thing"): one menu entry (`🎮 ARCADE & CAMP`), camp reachable from the
  arcade select screen, BACK/ESC from camp returns to the arcade. Menu is now
  an even 2 × 6 grid.
- **World Map boardroom strategy** rendered empty from the menu because offers
  were only generated at run start — now lazily populated.

### Gameplay feel
- **The golfer no longer flies with the ball**: sprite is anchored to the swing
  spot (`st.golferX/Y`) instead of the airborne ball position.
- Mulligan Memo (miss costs no strike) and Lobbyist Umbrella (cancels wind)
  wired into `landBall()` / `applySwing()`.

### Music + juice
- **Procedural music**: "The Quillhaven Court Minstrel" — a buildless WebAudio
  chiptune loop (minor-key arpeggio over a civic drone), starts on first
  gesture, respects the MUSIC toggle live, routed through its own gain node.
  To swap in real audio later, replace `musicTick()` scheduling with a looping
  `AudioBufferSourceNode` through `MUSIC.gain` (hook point documented in code).
- Ball flight now has a sparkle trail plus occasional drifting emojis; cleared
  holes spawn an emoji fountain scaled by quality; watch-mode landings burst.

### Humor sharpening (short-form only, guardrails held)
- Third, meaner line added to every minigame QUIP pool.
- New `MISS_STINGERS` pool — announcer roasts the narrative, never the player.
- GP-8 variant reward popups sharpened (they were "still relatively polite").
- Watch-mode commentary pools, five new marquee lines, five new timer clocks.
- **The satirical NWA name**: the region is now officially
  **"The Ozark Ambition Corridor™"** — on the title screen, the marquee, and
  the Job Fair. The one stray literal "Northwest Arkansas" string in the Job
  Fair UI was replaced with it (canon rule: fiction only).

### Verification
- `node --check` clean; new `verify-stub.mjs` harness executes the game under a
  DOM/canvas/WebAudio stub: loads with zero exceptions, draws every menu screen,
  ticks 300 frames idle + 300 frames in-run, confirms the watch ball never
  leaves the field, the fair scrolls to row 3, 12 menu items, 8 powerups,
  12 arcade cabinets, stable job-offer lines, and the 11 frozen faction keys.
  **13/13 checks pass.**

### Honest flags for Rosebud-side work
- Music is procedural by design; if you want composed tracks, add audio assets
  in Rosebud and hook them at `MUSIC.gain` (see code comment).
- Emoji glyph coverage varies by platform font; Rosebud's browser runtime
  should render them, but eyeball the new floating emojis on-device.
- Play-feel items (variant spawn rate, faction delta sizes, mobile hit targets)
  remain playtest verdicts, unchanged from the prior report.

---

## IMPLEMENTATION PHASE COMPLETE

**Status: CLOSED.** Across all turns this build delivered: the full Phase 4 spec systems
(11 frozen factions, 50 bureaucracy events, 34 pitches, 36 reviews, 12 pivots, 25 spoons,
60 footnotes, 19 endgame identities, 7 dialogue pools, 15 conversation pairs); the GP-8
minigame reskins (`tax_shelter_tetris`, `stealth_mode`, `pivot_roulette`) built on
`MINIGAME_VARIANTS_CONFIG` with variant-aware flavor; unique faction-standing consequences
on variant resolve (`applyVariantFactionReward`, idempotent, five wiring sites, frozen keys
only); playtest-readiness polish (single tunable `VARIANT_SPAWN_CHANCE`, first-spawn
announcement, popup-color edge fix); and a final close-out pass (flow documentation, run
reset of the announce flag, sharper announcer line, Ledger-overlay flavor notes, and a ★
reskin cue on the minigame title). No new pools or systems were invented — additions were
surgical and tagged. This is maximum practical completion before real human sessions.

---

## VERDICT

**Implementation complete — ready for human playtest and iteration.**

The one genuinely missing mechanic — unique faction-standing consequences when a
GP-8 minigame *variant* resolves — is **implemented, wired into all five resolve
sites, idempotent, tone-checked, and CLOSED / COMPLETE.** A small playtest-readiness
polish pass has also landed (single tunable spawn constant + first-spawn variant
announcement). Static validation passes with zero blocking diagnostics; a fresh
preview boots with zero console/runtime errors.

Important correction to the prior narration: the earlier chat referenced
`MINIGAME_RESKINS` / `applyMinigameReskin` / `applyReskinOutcome`. **Those symbols do
not exist in the real `main.js`.** The variant system is actually built on
`MINIGAME_VARIANTS_CONFIG` (supplies depts/pairs/choices to the shared builders) plus
the variant-aware `pickFlavor(...variant || ...id)`. This build therefore added a
fresh, self-contained reward module rather than wiring into a function that was never
there.

---

## RUNTIME CENSUS (post-fix, counted from source)

| System | Required | Found | Status |
|---|---|---|---|
| Factions (frozen PascalCase keys) | 11 | 11 | ✅ exact keys |
| Bureaucracy events | 50 | 50 | ✅ |
| Pitch scenarios (`branches`/`outcomes`) | 34 | 34 | ✅ |
| Quarterly reviews (`karenLine`) | 36 | 36 | ✅ |
| Pivot options | 12 | 12 | ✅ |
| Ceremonial spoons (`spoon_*`) | 25 | 25 | ✅ |
| Architect footnotes | 60 | 60 | ✅ |
| Endgame identities (`match()`) | 19 | 19 | ✅ |
| Dialogue pools (characters) | 7 | 7 | ✅ six-key contract, ≥30 lines each, 1 Williams beat |
| Cross-character conversation pairs | 15 | 15 | ✅ `CHARACTER_CONVERSATIONS_BY_PAIR` |

**Frozen key discipline:** `adjustStanding()` guards with
`hasOwnProperty(st.ledger, faction)` and never mutates `st.ledger` directly; all new
reward deltas use the 11 frozen keys only. No camelCase / pluralized / invented keys
introduced.

**Load / loop:** `validate_project` (browser-esm) — pass, 0 blocking, 18 advisory.
`check_runtime` (restart) — 0 log / 0 warn / 0 error, no exceptions.

---

## NEW MECHANIC — VARIANT FACTION REWARDS (this next step)

All insertion sites are tagged for surgical removal with
`// GP-8-EXT / NEXT-STEP-FACTION-REWARDS`.

**Module** (added directly above `applyMinigameModifier`):
- `VARIANT_STANDING_REWARDS` — per-variant win/loss (and hype/grounded) branches.
- `PIVOT_ROULETTE_HYPE_IDS` — `Set(['rock','paper'])` = AI DIRT / CRYPTO (hype);
  `scissors` = SAAS (grounded).
- `applyVariantFactionReward(mini, won)` — idempotent via `mini._variantRewardApplied`;
  reads `mini.variant`; routes deltas through `adjustStanding()` and stat nudges through
  `applyStatChange()`; shows one short themed popup. No-op for the 9 base games.

**Reward design (punch-up, canon-faithful):**
- `tax_shelter_tetris` (Sir Wastrel) — Win: `CommitteeUnnecessarySynergy +5`,
  `PredictiveCompliance +4`, `auditRisk −4`. Loss: `PredictiveCompliance −6`, `auditRisk +6`.
- `stealth_mode` (Brother Idleworth) — Win (perfect fakery): `MigratoryFounders +3`,
  `NativeHollows −2`. Loss (answered honestly): `NativeHollows +7`. Failing the LARP
  honestly is mechanically more respectable than flawless evasion.
- `pivot_roulette` (Pivot Addict) — branches on the *last chosen narrative*, not score:
  hype pick (AI DIRT / CRYPTO) → `CursorSpectacles +4`, `MigratoryFounders +3`,
  `NativeHollows −3`; grounded pick (SAAS) → `NativeHollows +5`, `CursorSpectacles −2`.

**Wiring (5 call sites, all tagged):**
1. `finishPregate()` — after the pregate flavor popup.
2. `endChaos()` — after the chaos flavor popup.
3. `updateTraining()` — after flavor lookup, before `cleanupMini`.
4. `updateArcade()` — arcade auto-timeout resolve.
5. `clickArcade()` — arcade manual "END GAME" resolve.

Sites 4 and 5 can both fire on one arcade instance; the `_variantRewardApplied` guard
ensures the reward lands exactly once.

**RPS support (1 tagged line):** `buildRps` now records
`this._lastPivotChoiceId = choices[i].id` on each pick, so `pivot_roulette` can read the
narrative the player actually committed to.

**Status: CLOSED / COMPLETE.** Reviewed this pass — config, guard, five wiring sites,
and RPS narrative capture all verified correct against source.

---

## POLISH PASS (playtest-readiness — tagged `// GP-8-EXT / POLISH`)

1. **Tunable variant spawn chance.** Added `const VARIANT_SPAWN_CHANCE = 0.35;` near the
   top of `main.js` (just below the variant theme block, ~line 174), alongside
   `GP8_VARIANT_IDS` and a one-shot `_variantAnnouncedOnce` flag. Wired into `chooseGame()`
   (~line 6248): when the pool hands back a GP-8 variant, it only actually serves the
   reskin at `VARIANT_SPAWN_CHANCE`, otherwise it degrades to the plain base game via
   `MINIGAME_ALIAS`. The frequency is now a single number to change post-playtest — no
   hunting through pool tables.
2. **First-spawn announcement.** The first time a variant genuinely spawns in a session,
   `chooseGame()` fires one gold announcer popup so the player immediately registers
   they're in a reskinned minigame. One sentence, existing announcer style, punch-up tone.
   (Final wording — see close-out below.)
3. **Edge-case fix (popup color).** `applyVariantFactionReward` now tracks a `positive`
   flag (~line 7518) so the reward popup color matches the actual branch. Previously
   `pivot_roulette` (which branches on narrative, not win/loss) could show a color keyed
   off `won` that contradicted the hype/grounded branch chosen. Standings/stats logic
   unchanged — cosmetic correctness only.

---

## FINAL CLOSE-OUT PASS (tagged `// GP-8-EXT / FINAL`)

- **Robustness confirmed.** `applyVariantFactionReward` is fully guarded: no-op on missing
  `mini`, on unknown/base variant (`!cfg`), on a missing branch (`!branch`), and after the
  idempotency guard (`_variantRewardApplied`).
- **Flag lifecycle documented + reset.** `_variantRewardApplied` and `_lastPivotChoiceId`
  live on the per-spawn minigame instance (rebuilt by `createMinigameInstance` every hole),
  so they reset automatically and need no clearing. The only session-global flag,
  `_variantAnnouncedOnce`, is now explicitly reset in `startNewRun()` so each fresh run
  re-announces the first reskin. A maintainer flow comment sits above `VARIANT_SPAWN_CHANCE`.
- **Sharper announcer line.** First-spawn popup upgraded to
  `"⚠ A REBRAND is upon thee — same toil, freshly monetised."` — one short mock-archaic,
  punch-up sentence through the existing `addPopup` system.
- **Ledger-overlay flavor notes.** On a variant reward, the biggest standing swing now also
  pushes a short themed note into `st.ledgerPopups` (`VARIANT_LEDGER_NOTES.rise/fall`), so
  the consequence is visible in the Ledger overlay, not just the field popup.
- **★ reskin cue.** New `miniDisplayLabel(mini, fallback)` prefixes the variant label with
  `★` on the pre-gate / chaos / training / arcade minigame title when a reskin is active;
  base games show their plain title unchanged.

---

## POST-PLAYTEST TUNING ITEMS (require a real Rosebud playtest)

- **Minigame balance:** delta sizes (±4–7) feel right on paper against the ±1–15
  guidance, but only live play across a full run confirms they don't over/under-swing the
  Ledger.
- **35% variant spawn feel:** frequency and pacing of variants surfacing after hole 3 is
  untested for feel in a real session.
- **Mobile ergonomics:** touch resolve paths route through the same handlers, but small
  minigame hit-targets on phones are unverified on-device.
- **Full tone consistency across 200+ entries:** I sampled ~20 lines (new reward copy +
  neighbors) against the guardrails and found no punch-down, no real names, no key drift.
  A complete line-by-line audit of every pool was not performed.
- **Screenshots:** runtime screenshot capture timed out; load-health is confirmed via
  console/exception diagnostics, not a visual frame.
- **Variant announcement + tunable spawn chance added for easier post-playtest adjustment.**

---

## READY FOR HUMAN PLAYTEST

The code side of the requested work is done and honest about its edges. What remains is
**real play across multiple holes/runs**, to gather concrete feel on:
- how the new ±4–7 faction deltas land in practice;
- whether the 35% variant rate feels right or wants tuning (now a one-line change);
- mobile hit-targets on the minigames;
- overall pacing and tone consistency in actual sessions.

Not claiming "finished" or "perfectly balanced" — those are playtest verdicts, not code
verdicts. This build is stable, wired, and ready for a human to sit down and play.

---

## CHARLIE MIKE

Implementation chapter is **CLOSED**. Census verified against source, the variant faction
mechanic implemented surgically and idempotently, playtest-readiness polish and the final
close-out pass (robustness review, flag reset, sharper announcer, Ledger notes, ★ cue) all
landed and tagged, frozen keys honored, tone contract held on all new copy, validation and
fresh-boot both clean (0 blocking / 18 advisory unchanged / 0 runtime errors). Not claiming
perfect balance or 100% completion — those are verdicts only real sessions can give. The
project is hereby handed to the human for playtest and iteration. The next chapter belongs
to the player, not the compiler. 🦞
