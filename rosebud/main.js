// =====================================================
// SKYDISORDER — CORPORATE REINVENTION v5.1
// Phase 2: 9 Arcade Minigames + Corporate Satire Layer
// Canvas 2D • buildless • stable implementation
// =====================================================
//
// =============================================================
// CS-9 AUDIT FIXES — applied after partial Phase 4 build
// =============================================================
// FIX A: Added playExplode() stub — was called in landOpponent()
//         but never defined, causing a ReferenceError at runtime.
// FIX B: bureaucracyTimer is NOT in getFreshState(). It is
//         initialised lazily with (st.bureaucracyTimer || 0) + dt
//         which is safe, but it should also be reset in startNewRun
//         for cleanliness. Added explicit reset there.
// FIX C: BUREAUCRACY_EVENTS effects call adjustStanding() but
//         adjustStanding is defined AFTER the array. Moved the
//         array below the function definition so the closures
//         always capture the real function. (No-op at parse time
//         because they are arrow-function closures, but fixes any
//         future hoisting confusion and matches Prompt 02's intent.)
// FIX D: Faction key drift — BUREAUCRACY_EVENTS and PITCH_DECK
//         already use the pre-keystone camelCase keys. Documented
//         here. Prompt 02 (CS-4) will redefine the authoritative
//         key set; these references will be updated then.
// FIX E: DIALOGUE_POOLS.brotherIdleworth uses 'smallTalk' (camelCase).
//         The canonical key per the spec is 'smalltalk' (lowercase).
//         Normalised to lowercase to match the six-key contract
//         that Prompt 11 (GP-1) will fill in.
// FIX F: Pitch, Review, and Pivot overlays were NOT blocking input
//         from passing through to the game layer. Added input-guard
//         in onCanvasClick and keydown handler.
// FIX G: Quarterly Review was never triggered from finishHole().
//         Added maybeTriggerQuarterly() call. Pitch was also never
//         triggered. Added maybeTriggerPitch() call.
// FIX H: 'P' hotkey for Pivot Table and 'L' hotkey for Ledger
//         overlay were unbound. Wired them into the keydown handler.
// FIX I: LEDGER_FLAVOR_POOLS used 'positive'/'negative' keys but
//         pickLedgerFlavor() reads 'up'/'down'. Normalised to up/down.
// FIX J: adjustStanding() ripple applies direct mutation
//         (st.ledger[other] = clamp(...)) instead of a recursive
//         adjustStanding call, which is correct for depth-1 only,
//         but bypasses showLedgerChangePopup for ripple targets.
//         Left intentionally — ripple popups would be noise.
//         Documented for Prompt 06 (CS-5) awareness.
// =============================================================

const G = document.getElementById('game');
const FILE_INPUT = document.getElementById('repoUpload');
const W = 750;
const H = 560;

const C = document.createElement('canvas');
// Fix #15 — DPR-aware canvas scaling for crisp rendering on high-DPI displays
const DPR = Math.min(window.devicePixelRatio || 1, 3); // cap at 3x for perf
C.width = W * DPR;
C.height = H * DPR;
C.style.cssText = 'width:100%;border-radius:8px;display:block;image-rendering:pixelated;background:#0a3d0a;cursor:pointer;position:relative;z-index:1;';
G.appendChild(C);
const X = C.getContext('2d');
X.scale(DPR, DPR);

const SCAN = document.createElement('div');
SCAN.style.cssText = 'position:absolute;top:14px;left:14px;right:14px;bottom:14px;pointer-events:none;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,rgba(0,0,0,0.10) 2px,rgba(0,0,0,0.10) 4px);border-radius:8px;z-index:10;';
G.appendChild(SCAN);
const CRT = document.createElement('div');
CRT.style.cssText = 'position:absolute;top:14px;left:14px;right:14px;bottom:14px;pointer-events:none;box-shadow:inset 0 0 90px rgba(0,0,0,0.55),inset 0 0 25px rgba(0,255,100,0.03);border-radius:8px;z-index:11;';
G.appendChild(CRT);
const BEZ = document.createElement('div');
BEZ.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;border:14px solid #2a1a30;border-radius:20px;background:linear-gradient(180deg,#3d2045 0%,#1a0d1a 100%);box-shadow:inset 0 2px 0 #5a3060,inset 0 -2px 0 #0a050a,0 0 30px rgba(0,0,0,0.9);pointer-events:none;z-index:0;';
G.insertBefore(BEZ, G.firstChild);

// Fix #10 — Event listener leak guard
const _listeners = [];
function addListener(target, ev, fn, opts) {
  target.addEventListener(ev, fn, opts);
  _listeners.push({ target, ev, fn, opts });
}
function removeAllListeners() {
  _listeners.forEach(l => l.target.removeEventListener(l.ev, l.fn, l.opts));
  _listeners.length = 0;
}

// Fix #1 — AudioContext resume on first gesture
let audioCtx = null;
let audioUnlocked = false;
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  audioUnlocked = true;
}
['pointerdown','keydown','touchstart'].forEach(ev =>
  window.addEventListener(ev, ensureAudioCtx, { once: true, passive: true })
);

const AC = (() => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Setup gain nodes for ducking and master volume
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = 1.0;
    sfx.gain.value = 0.8;
    ctx._master = master;
    ctx._sfx = sfx;
    return ctx;
  } catch (err) {
    return null;
  }
})();

function duckSfx(targetVolume = 0.25, duration = 1.2) {
  if (!AC) return;
  const now = AC.currentTime;
  const sfx = AC._sfx;
  const current = sfx.gain.value;
  sfx.gain.cancelScheduledValues(now);
  sfx.gain.setValueAtTime(current, now);
  sfx.gain.linearRampToValueAtTime(targetVolume, now + 0.1);
  sfx.gain.setValueAtTime(targetVolume, now + duration - 0.2);
  sfx.gain.linearRampToValueAtTime(0.8, now + duration);
}

// Fix #14 — Sprite loader fallback
const FALLBACK_SPRITE = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const x = c.getContext('2d'); x.fillStyle = '#f0f'; x.fillRect(0,0,1,1);
  const img = new Image(); img.src = c.toDataURL(); return img;
})();
function drawSprite(img, x, y, w, h) {
  const s = (img && img.complete && img.naturalWidth) ? img : FALLBACK_SPRITE;
  X.drawImage(s, x, y, w, h);
}

// ============================================================
// SCREEN ENUM (Fix #8 — replaces magic strings)
// ============================================================
const SCREEN = Object.freeze({
  BOOT:'boot', MAIN_MENU:'menu', WORLD_MAP:'worldmap',
  PLAYING:'playing', PREGATE:'pregate', CHAOS:'chaos',
  MINIGAME:'minigame', BOARDROOM:'boardroom',
  PAUSED:'paused', RESULTS:'results',
  GAMEOVER:'gameover', JOBFAIR:'jobfair', BENCH:'bench',
  TRAINING:'training', ARCADE:'arcade', WATCH:'watch',
  REPO:'repo', SHOP:'shop', SETTINGS:'settings',
  LEADERBOARD:'leaderboard', CREDITS:'credits', FOOTNOTES:'footnotes', IPO: 'ipo', EPILOGUE:'epilogue'
});

const MINI_WINDOW_STANDARD = Object.freeze({ x: 220, y: 100, w: 310, h: 210 });
const MINI_WINDOW_CHAOS = Object.freeze({ x: 220, y: 150, w: 310, h: 210 });
const MINI_WINDOW_SKINS = Object.freeze({
  default: Object.freeze({ shell:'#25152b', border:'#5a3060', fill:'#041610', glow:'rgba(120,255,180,0.06)', vignette:'rgba(0,0,0,0.18)', footer:'#3d2045', label:'#ffe066' }),
  pong: Object.freeze({ shell:'#10263d', border:'#4cc9f0', fill:'#07131f', glow:'rgba(76,201,240,0.12)', vignette:'rgba(0,10,20,0.22)', footer:'#16314d', label:'#bff4ff' }),
  breakout: Object.freeze({ shell:'#2a1a12', border:'#f59e0b', fill:'#16100a', glow:'rgba(245,158,11,0.12)', vignette:'rgba(25,10,0,0.22)', footer:'#3b2718', label:'#ffe29a' }),
  catch: Object.freeze({ shell:'#2d1b12', border:'#fb923c', fill:'#1c1109', glow:'rgba(251,146,60,0.12)', vignette:'rgba(30,12,0,0.22)', footer:'#422619', label:'#ffd0a8' }),
  flappy: Object.freeze({ shell:'#102c32', border:'#22d3ee', fill:'#07191c', glow:'rgba(34,211,238,0.14)', vignette:'rgba(0,18,24,0.18)', footer:'#173940', label:'#c8fbff' }),
  memory: Object.freeze({ shell:'#1e1735', border:'#8b5cf6', fill:'#100d1f', glow:'rgba(139,92,246,0.14)', vignette:'rgba(12,0,28,0.20)', footer:'#2a2146', label:'#ddd6fe' }),
  rps: Object.freeze({ shell:'#301423', border:'#f472b6', fill:'#180a12', glow:'rgba(244,114,182,0.14)', vignette:'rgba(28,0,16,0.20)', footer:'#421b2f', label:'#ffd1e8' }),
  tetris: Object.freeze({ shell:'#13201e', border:'#34d399', fill:'#091110', glow:'rgba(52,211,153,0.13)', vignette:'rgba(0,20,12,0.20)', footer:'#1d302d', label:'#c8ffeb' }),
  ttt: Object.freeze({ shell:'#1b2338', border:'#60a5fa', fill:'#0c1120', glow:'rgba(96,165,250,0.13)', vignette:'rgba(0,8,28,0.20)', footer:'#25304a', label:'#dbeafe' }),
  twentyforty: Object.freeze({ shell:'#2f2416', border:'#facc15', fill:'#171108', glow:'rgba(250,204,21,0.14)', vignette:'rgba(25,16,0,0.20)', footer:'#41321d', label:'#fff1ad' }),
  // GP-8 Variants
  tax_shelter_tetris: Object.freeze({ shell:'#2a1a12', border:'#f59e0b', fill:'#16100a', glow:'rgba(245,158,11,0.12)', vignette:'rgba(25,10,0,0.22)', footer:'#3b2718', label:'#ffe29a' }),
  stealth_mode: Object.freeze({ shell:'#1e1735', border:'#8b5cf6', fill:'#100d1f', glow:'rgba(139,92,246,0.14)', vignette:'rgba(12,0,28,0.20)', footer:'#2a2146', label:'#ddd6fe' }),
  pivot_roulette: Object.freeze({ shell:'#301423', border:'#f472b6', fill:'#180a12', glow:'rgba(244,114,182,0.14)', vignette:'rgba(28,0,16,0.20)', footer:'#421b2f', label:'#ffd1e8' })
});

// GP-8-EXT / POLISH
// GP-8 VARIANT FLOW (for maintainers): WORLD_MINIGAME_POOL (Worlds 4+) lists variant
// IDs → chooseGame() gates each at VARIANT_SPAWN_CHANCE, else degrades to the base game
// via MINIGAME_ALIAS → createMinigameInstance() builds the reskin via MINIGAME_VARIANTS_CONFIG
// → on resolve, pickFlavor() shows themed copy and applyVariantFactionReward() applies the
// unique faction consequence (idempotent per instance). This one constant controls frequency.
// How often a hole that COULD serve a GP-8 reskin (tax_shelter_tetris /
// stealth_mode / pivot_roulette) actually serves the variant instead of its
// plain base game. Single tunable knob — change this one number after playtest.
const VARIANT_SPAWN_CHANCE = 0.35; // 35% once variants are in the pool (Worlds 4+) — adjust after playtest
// Set of GP-8 variant IDs, gated by VARIANT_SPAWN_CHANCE in chooseGame().
const GP8_VARIANT_IDS = new Set(['tax_shelter_tetris', 'stealth_mode', 'pivot_roulette']);
// One-shot flag so the "you're in a reskin" announcement fires only the first
// time a variant genuinely spawns in a session.
let _variantAnnouncedOnce = false;

// ============================================================
// PHASE 2 — MINIGAME INTERFACE CONTRACT
// ============================================================
const MINIGAME_CONTRACT_VERSION = 2;

// ============================================================
// SECTION C — CORPORATE SATIRE STRINGS
// ============================================================
const TIMER_VARIATIONS = [
  'VC Pitch in T-{X}s!',
  'Layoff Clock Active',
  'Board Meeting T-{X}s',
  'All-Hands in T-{X}s',
  'Q4 Earnings T-{X}s',
  'Vesting Cliff T-{X}s',
  'Runway Ends T-{X}s',
  'PIP Review T-{X}s',
  'RTO Mandate Live',
  'Standup Starts T-{X}s',
  'Demo Day T-{X}s',
  'Severance Pending',
  'Sprint Ends T-{X}s',
  'Audit in T-{X}s',
  'Series B Close T-{X}s',
  // HUMOR-SHARPEN — meaner clocks
  'Vibes Audit T-{X}s',
  'Thy Equity Evaporates T-{X}s',
  'Mandatory Fun T-{X}s',
  'Spoon Review T-{X}s',
  'The Board Is Already Here'
];

const QUIPS = {
  pong: [
    "The Most Serene Company is volleying SLA violations! Hold the line!",
    "Chargeback inbound! He's deflecting harder than a Vastcart buyer!",
    "Miss this rally and legal says thou art, quote, 'cooked.'" // HUMOR-SHARPEN
  ],
  breakout: [
    "Every brick is a clinical delay. Miss one and the Apothecary denies the claim.",
    "Look at that paddle work — deflecting liability like a true synergy committee!",
    "Each brick is somebody's prior auth. No pressure. Enormous pressure." // HUMOR-SHARPEN
  ],
  catch: [
    "Forgeharvest shift change, and we're down a sorter. Catch the yield!",
    "He's grabbing throughput like a baron spotting un-taxed revenue. Smooth!",
    "Drop three nuggets and thou shalt be restructured into a learning." // HUMOR-SHARPEN
  ],
  flappy: [
    "Lord Buzzwick's drone weaving through Quillhaven airspace like rent's due.",
    "Folks, that mechanical crow is flying lower than employee morale.",
    "The crow sees all. Mostly it sees thee about to hit that pipe." // HUMOR-SHARPEN
  ],
  memory: [
    "Magistrate Ledger demands your pre-violation forms, your ledger, AND your dignity.",
    "He's matching encrypted wires faster than the Contrarian Baron can un-send them!",
    "Forget one password and the Ministry forgets thy severance." // HUMOR-SHARPEN
  ],
  rps: [
    "Term sheet showdown! Rock crushes valuation, paper covers NDAs, scissors cut equity.",
    "This founder's been pivoting since the dot-com era. Watch the hands close.",
    "He has thrown 'rock' at every board meeting since 2019. Adapt." // HUMOR-SHARPEN
  ],
  tetris: [
    "Reorg incoming! Stack those fractional assets tight or it's an SEC violation.",
    "Look at that L-block synergy drop right into Logistics. Clean cut, beautiful!",
    "Leave one gap and that gap becomes a whole department. With a director." // HUMOR-SHARPEN
  ],
  ttt: [
    "Bespoke algorithmic round, and our candidate's drawing X's like he owns the cap table.",
    "Goodwife Henrietta is not impressed by your noughts, but she's pouring the tea anyway.",
    "Lose to this algorithm and it goes on thy permanent vibe record." // HUMOR-SHARPEN
  ],
  twentyforty: [
    "Sprint planning! Combine the tokenized dirt until you hit a Series A.",
    "Merge those synergies. Sir Wastrel is measuring your velocity!",
    "Two mid ideas merge into one big idea. That's just fundraising." // HUMOR-SHARPEN
  ],
  tax_shelter_tetris: [
    "Sir Wastrel: 'Look at those gorgeous losses. If we hit the bottom, the taxman can't touch us!'",
    "Every block is a potential deduction. Don't let the IRS see the synergy!",
    "Sir Wastrel: 'Profit? In THIS economy? Stack faster.'" // HUMOR-SHARPEN
  ],
  stealth_mode: [
    "Brother Idleworth: 'Don't actually do anything. Just look like you're matching something important.'",
    "Silent productivity is the loudest form of stealth. Match the vibes, ignore the logic.",
    "Brother Idleworth: 'We are pre-product, pre-revenue, and post-lunch.'" // HUMOR-SHARPEN
  ],
  pivot_roulette: [
    "The Pivot Addict: 'Blockchain is out! Generative Dirt is in! Spin the wheel of synergy!'",
    "Term sheet showdown! Rock crushes valuation, paper covers NDAs, scissors cut equity.",
    "The Pivot Addict: 'This is what we've ALWAYS been building.' It is not." // HUMOR-SHARPEN
  ]
};

// HUMOR-SHARPEN — announcer stingers for missed shots. Punch up: the target is
// always the machine, the money, and the narrative — never the player's worth.
const MISS_STINGERS = [
  'The Committee has classified that swing as "directional learnings."',
  'Sir Reginald marked thee down from CONVICTION to VIBES.',
  'That shot has been rebranded as an intentional land acknowledgment.',
  'The deck said "world-class execution." The fairway disagrees.',
  'Goodwife Henrietta saw that. She is not mad. She is brewing.',
  'Lord Buzzwick\'s crows are filing that under "content."',
  'Thy swing has been escalated to a working group.',
  'The Ledger notes: great story, no product.',
  'Magistrate Ledger has pre-approved thy excuse. It is still an excuse.',
  'Investor update draft: "strategic exploration of adjacent turf."'
];

const WIN_FLAVOR = {
  twentyforty: [
    'You consolidated the synergies. PowerBoost +12% on next swing.',
    'Tokens merged, Brother Tillage pleased. Velocity unlocked. Angle deviation reduced 15%.',
    'Tickets merged, the Apothecary is pleased. PowerBoost +18% for the back nine.',
    'You hit 2048 and a Series A on the same day. ChaosFactor minimized.',
    'The committee ran under five minutes for once. Bonus accuracy granted.'
  ],
  tax_shelter_tetris: [
    "The audit was successfully deferred. Sir Wastrel awards you a commemorative lead spoon.",
    "Losses stacked, liabilities flattened. You are legally a nonprofit today. Accuracy +20%.",
    "Sir Wastrel is weeping with joy. Your structural incompetence is a work of art. Power +15%."
  ],
  stealth_mode: [
    "You appeared perfectly occupied. The board is impressed by your 'deep focus'. Power +12%.",
    "Stealth maintained. The VCs think you're working on a 'stealth unicorn'. Accuracy +15%.",
    "Matched the vibes, missed the work. Brother Idleworth is proud. ChaosFactor reduced."
  ],
  pivot_roulette: [
    "You landed on 'AI-Powered Napkins.' Valuation up 400%! Power +20%.",
    "The pivot succeeded. The board has already forgotten what you were doing yesterday. Accuracy +18%.",
    "Successful category jump. You are now a leader in 'Bespoke Spoon Logistics'. ChaosFactor minimized."
  ],
  breakout: [
    'All metrics shattered. Sir Wastrel approves. PowerBoost +20%, hold the applause.',
    'You broke through the glass ceiling AND the compliance wall. PowerBoost stacked.',
    'Algorithmic alignment achieved. Angle deviation locked tight as your NDA.',
    'Performance review: exceeds expectations. ChaosFactor eliminated this hole.',
    'Brick by brick, you dismantled the roadmap. Confidence interval +25%.'
  ],
  catch: [
    'Throughput survived. Forgeharvest wrote a recommendation. PowerBoost +15%.',
    'Every yield caught, zero dropped. Logistics queue cleared. Accuracy boost active.',
    "You caught 'em like Vastcart catches vendor margins. ChaosFactor reduced.",
    'Six dollars an hour and Olympic reflexes. PowerBoost stacked, dignity bartered.',
    'Throughput Employee of the Month. Angle deviation halved.'
  ],
  flappy: [
    'Observation complete! Buzzwick rated you five stars. PowerBoost +15%.',
    'Quillhaven airspace conquered. No pre-violations logged. Accuracy locked in.',
    'You flapped past three power lines and a Forgeharvest plant. ChaosFactor minimized.',
    'Mechanical crow of the hour. Tip: $2.13. Modifier: power +10%.',
    'Successful surveillance drop. The lens approved your form. Angle deviation halved.'
  ],
  memory: [
    'All encrypted wires matched on first try. Coastal Shadow shocked. Accuracy boost locked in.',
    'Magistrate Ledger satisfied, audit defeated, soul partially intact. PowerBoost +12%.',
    "You remembered your stealth narrative before the rotation. ChaosFactor reduced.",
    'Ledger finally unlocked, sanity restored. Angle deviation tightened 18%.',
    'Bespoke algorithm actually worked today. Miracle modifier: PowerBoost +20%.'
  ],
  pong: [
    'The grievance has been escalated to the Apothecary. PowerBoost +15%.',
    'Chargeback denied with a smile. Hype up two points. Accuracy boost granted.',
    'You held the supply chain at 47 minutes. Vastcart rage-quit. ChaosFactor reduced.',
    "Audit result: 'helpful and respectful.' Lies, but PowerBoost stacked anyway.",
    'Liability deflected to a subsidiary shell company. Bonus angle precision unlocked.'
  ],
  rps: [
    'Term sheet signed. 2x liquidation preference. PowerBoost +20%, dignity -50%.',
    'You out-negotiated Coastal Shadow Holdings. Accuracy boosted, valuation halved.',
    'Anti-dilution clause crushed. ChaosFactor minimized for the next funding round.',
    'Down round avoided. Cap table unbloodied. Modifier: angle deviation -22%.',
    'The Confraternity blinked first. Shocking. PowerBoost +18%.'
  ],
  tetris: [
    'Flawless synergy. Three layers flattened, no wrongful termination suits. PowerBoost +15%.',
    'Middle management vaporized cleanly. ChaosFactor reduced. RIF complete.',
    'L-block dropped on the native hollows — perfect fit. Angle deviation tightened nicely.',
    'Org chart now resembles a pyramid scheme. PowerBoost +20%, ethics -infinity.',
    'T-shaped reorg complete. Synergy unlocked. Bonus accuracy on next swing.'
  ],
  ttt: [
    'Three in a row before they finished the pitch. Funded. PowerBoost +18%.',
    'You inverted the binary tree AND the stealth deck. Accuracy locked.',
    'Whiteboard wiped, ego intact, founder cried. ChaosFactor minimized.',
    'Big O of one, charisma of nine. Angle deviation reduced 20%.',
    'Stealth phase passed, hype secured. Modifier: +15% power, +1 vesting cliff.'
  ]
};

const LOSS_FLAVOR = {
  twentyforty: [
    'Fractional token failed retro. Velocity decreased 8%. Try again next quarter.',
    'Tokens blocked by the committee again. Standup ran 90 minutes. Accuracy -10%.',
    "Brother Tillage flagged you 'low engagement.' ChaosFactor +12%, snack budget revoked.",
    'Backlog grew faster than your stack trace. PowerBoost reduced 15%.',
    'The algorithm crashed mid-merge. Synergies lost forever. Angle deviation +15%.'
  ],
  breakout: [
    'Pre-violation issued. KPIs unmet. PowerBoost -12%, severance already printed.',
    'Algorithmic alignment failed. Brick wall intact, you are not. Accuracy -15%.',
    'Ledger scorecard: deep red. Performance bonus revoked. ChaosFactor +18%.',
    'Emergency session requested by Sir Wastrel. Brace yourself. Angle deviation +20%.',
    'Quarterly review tanked. The Devotional unfollowed you. Power penalty applied.'
  ],
  catch: [
    'Yield scattered like unvested stock options. Forgeharvest docked your pay. PowerBoost -10%.',
    'Vastcart livid. Chargeback pending. ChaosFactor +18%, margins wasted.',
    "The Noble Order called you 'logistically developmental.' Accuracy -15%.",
    'Supply chain backed up to the hollows. Angle deviation +20%, manager screaming.',
    'Compliance inspector watching, product on floor. Modifier: shame +25%.'
  ],
  flappy: [
    'Drone clipped a Forgeharvest silo. Insurance claim filed. PowerBoost -15%.',
    'Predictive complaint logged. The committee is furious. ChaosFactor +20%.',
    'Crashed into a Vastcart fulfillment sign. Angle deviation +18%.',
    'Surveillance data: smashed. Trust: zero. Accuracy -12%.',
    "Drone now property of Goodwife Henrietta's tea room. Modifier: PowerBoost -20%."
  ],
  memory: [
    'Ledger locked. Ministry queue: 312 audits ahead of you. Accuracy -15%.',
    'You typed your encrypted wire four times. The Baron laughs. PowerBoost -12%.',
    'Token expired mid-merge. Soul partially escaped. ChaosFactor +20%.',
    'Denial sent to a deactivated email. Angle deviation +18%, morale frozen.',
    "Password 'Quillhaven1!' was already taken. Twice. Modifier: dignity -25%."
  ],
  pong: [
    'Vastcart left a 1-star vendor review. Your margins tank. PowerBoost -15%.',
    'Liability escalated to corporate, then to the Magistrate. ChaosFactor +25%.',
    'Refund granted under duress. Hype in freefall. Accuracy -18%.',
    'The buyer knows the CEO\'s name AND yours now. Angle deviation +20%.',
    'Complaint went viral in the Confraternity chat. Modifier: dignity -30%.'
  ],
  rps: [
    'Down round at half valuation. 3x participating preferred. PowerBoost -22%.',
    'Coastal Shadow ghosted you mid-pitch. Runway eight weeks. ChaosFactor +25%.',
    'You signed the side letter unread. Cap table compromised. Accuracy -20%.',
    'Anti-dilution triggered. Founders\' shares minced. Angle deviation +22%.',
    'Pro-rata rights surrendered. Future you is furious. Modifier: regret +infinity.'
  ],
  tetris: [
    'Synergy leaked to the newsletter before the all-hands. PowerBoost -15%.',
    'Wrongful termination suit filed. Legal billables stacking. ChaosFactor +25%.',
    'Flat structure inverted itself. You now report to your intern. Accuracy -18%.',
    'Severance packages exceeded the remaining runway. Angle deviation +20%.',
    'Hype rating dropped to 1.9. The Devotional laughing. Modifier: hiring -30%.'
  ],
  ttt: [
    "Couldn't reverse a linked list. The Apothecary pretending to take notes. PowerBoost -15%.",
    "You said 'I'd just ask the algorithm' out loud. ChaosFactor +20%.",
    'Whiteboard marker dried up mid-recursion. Accuracy -18%, panic visible.',
    'Interviewer asked about gaps. You mentioned the Contrarian Baron. Angle deviation +22%.',
    'Take-home offered. Six hours unpaid. Modifier: dignity -25%, hope -90%.'
  ],
  tax_shelter_tetris: [
    "The spreadsheet balanced. Sir Wastrel is devastated. Audit risk +25%.",
    "A clean audit trail was detected. Sir Wastrel calls your lack of imagination 'quaint'. Power -12%.",
    "You made a profit. The Committee is launching an emergency investigation. ChaosFactor +20%."
  ],
  stealth_mode: [
    "You were caught having a thought. Stealth mode compromised. Reputation -10%.",
    "Management noticed you were actually working. The mystery is gone. Hype -15%.",
    "Too much productivity. You've been assigned to a 'Special Committee for Alignment'. Accuracy -12%."
  ],
  pivot_roulette: [
    "You landed on 'Physical Goods.' The shame is unbearable. Hype -20%.",
    "The category crashed before you could even update your LinkedIn. Power -15%.",
    "Venture debt triggered. You now report to a mechanical crow. ChaosFactor +25%."
  ]
};

const TOUCH_TOOLTIPS = [
  'Swipe up for power, tap for accuracy',
  'Hold to charge your shot, release to swing',
  'Drag back like a slingshot, let go to drive',
  'Two fingers to aim, one finger to commit',
  'Tap and hold for backspin, swipe for slice'
];

const BOARDROOM_LINES_V2 = [
  { who:'VC Bro',             line:"Your burn rate is concerning. Have you considered firing your customer support team?" },
  { who:'VC Bro',             line:"We're not investors, we're partners. Now sign this 4x liquidation preference real quick." },
  { who:'VC Bro',             line:"Pivot to AI. Pivot to crypto. Pivot to AI crypto. Just pivot before the wire clears." },
  { who:'CFO Karen',          line:"I ran the numbers. The numbers are crying. The numbers want to go home." },
  { who:'CFO Karen',          line:"We can't afford the Christmas party, but we're flying execs to Aspen for 'strategy.'" },
  { who:'CFO Karen',          line:"Cut twenty percent of headcount or twenty percent off my Aspen trip. Your call." },
  { who:'Walmart Buyer',      line:"I'll take 47,000 units. Your margin is now eleven cents. Welcome to Bentonville, partner." },
  { who:'Walmart Buyer',      line:"Be at the Home Office Monday at 7 AM sharp. Wear khakis. Bring receipts." },
  { who:'Walmart Buyer',      line:"Your pricing's cute. Now cut it 30% and add a free unit. We'll consider you." },
  { who:'Tyson Exec',         line:"Vertical integration means we own the chicken, the truck, the road, and your cousin." },
  { who:'Tyson Exec',         line:"Springdale taught us one thing: nobody asks where the nuggets come from twice." },
  { who:'Tyson Exec',         line:"We're not a chicken company. We're a logistics empire that occasionally murders chickens." },
  { who:"Sam Walton's Ghost", line:"Son, in my day we just underpaid people. Why's it so complicated now?" },
  { who:"Sam Walton's Ghost", line:"I drove a beat-up pickup. You drive a Cybertruck. Something's gone real wrong, partner." },
  { who:"Sam Walton's Ghost", line:"Always low prices, always. The 'always low wages' part was supposed to be the quiet part." },
  { who:'Founder',            line:"I'm not in this for the money. I'm in it for the IPO money. Different thing entirely." },
  { who:'Founder',            line:"We're disrupting Bentonville. Our office is in Bentonville. The synergy is intentional." },
  { who:'Founder',            line:"My therapist says I'm a sociopath. My VCs say I'm 'founder material.' Same thing apparently." },
  { who:'Marketing VP',       line:"We're rebranding 'mass layoff' as 'organizational rightsizing for stakeholder velocity acceleration.'" },
  { who:'Marketing VP',       line:"The campaign tested well in Fayetteville focus groups. Mostly because we paid them in chicken." },
  { who:'Marketing VP',       line:"We need a TikTok strategy, a podcast, and a Super Bowl ad. Budget? Aspirational." },
  { who:'Tech Lead',          line:"The microservices are fine. The monolith is fine. The intern who pushed to main is not." },
  { who:'Tech Lead',          line:"We can ship it Friday or we can ship it correctly. Pick one. Spoiler: it's Friday." },
  { who:'Tech Lead',          line:"I told them the migration would take six months. They scheduled it for six days." },
  { who:'HR Director',        line:"We don't call them layoffs anymore. We call them 'graduations from the company family.'" },
  { who:'HR Director',        line:"Your concerns are valid, important, and unfortunately, not actionable at this time." },
  { who:'HR Director',        line:"Per the new policy, unlimited PTO means unlimited guilt. Effective immediately and retroactively." },
  { who:'Burnt-Out IC',       line:"I haven't slept since the vesting cliff. My standup is just the sound of crying now." },
  { who:'Burnt-Out IC',       line:"They gave me equity instead of a raise. I tried to buy groceries with it. Didn't work." },
  { who:'Burnt-Out IC',       line:"I'm not quiet quitting. I'm whisper screaming. There's a difference. Probably. I think." }
];

function pickAnnouncerQuip(id, worldId) {
  const arr = QUIPS[id]; if (!arr) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFlavor(id, won) {
  const pool = (won ? WIN_FLAVOR : LOSS_FLAVOR)[id];
  if (!pool || !pool.length) {
    return won
      ? 'Stakeholders are cautiously thrilled. Modifier package approved.'
      : 'Leadership called this a learning moment and cut the snack budget.';
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildModifierPopupText(perf) {
  const parts = [];
  if (perf.angleDeviation) parts.push((perf.angleDeviation > 0 ? '+' : '') + perf.angleDeviation.toFixed(0) + '° aim');
  if (perf.powerBoost) parts.push((perf.powerBoost > 0 ? '+' : '') + (perf.powerBoost * 100).toFixed(0) + '% power');
  if (perf.chaosFactor > 0.3) parts.push('chaos rising');
  return parts.join(' · ');
}

function pickTouchTooltip() {
  return TOUCH_TOOLTIPS[Math.floor(Math.random() * TOUCH_TOOLTIPS.length)];
}

function maybeShowTouchOnboarding() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch || st.touchOnboardingShown) return;
  addPopup(pickTouchTooltip(), W / 2, H - 40, COL.cyan, 8, 4.5);
  st.touchOnboardingShown = true;
  saveMeta(); // using saveMeta as saveCareer equivalent in this project
}

function formatBoardroomLine(entry) {
  if (!entry) return 'Narrator: The boardroom is silent.';
  if (typeof entry === 'string') return entry;
  return `${entry.who}: ${entry.line}`;
}

// ============================================================
// WORLD → MINIGAME POOL MAPPING (Phase 2)
// ============================================================
const WORLD_MINIGAME_POOL = {
  1: ['catch', 'pong'],
  2: ['memory', 'pong'],
  3: ['flappy', 'memory'],
  4: ['twentyforty', 'tetris', 'stealth_mode'],
  5: ['twentyforty', 'breakout', 'ttt'],
  6: ['breakout', 'tax_shelter_tetris'],
  7: ['rps', 'tetris', 'pivot_roulette'],
  8: ['rps', 'ttt', 'tax_shelter_tetris', 'pivot_roulette', 'stealth_mode']
};
function getWorldMinigamePool(worldId) {
  return WORLD_MINIGAME_POOL[worldId] || ['pong'];
}
function pickMinigameForHole(worldId, holeIndex) {
  const pool = getWorldMinigamePool(worldId);
  const seed = (holeIndex * 7919 + worldId * 31) % pool.length;
  return pool[seed];
}

const COL = {
  bg: '#0a0012',
  panel: '#0f1c16',
  panelHi: '#173124',
  fair: '#1b5e20',
  fairD: '#0d3010',
  sand: '#d4a856',
  water: '#2980b9',
  flag: '#e74c3c',
  yel: '#ffeb3b',
  cyan: '#4fc3f7',
  pink: '#ff6eb4',
  grn: '#4ade80',
  red: '#ff4444',
  pur: '#9b59b6',
  gold: '#ffd700',
  ora: '#ff9800',
  teal: '#14b8a6',
  white: '#ffffff',
  black: '#000000',
  dim: '#778089'
};

const SAVE_KEY = 'skydisorder_v5_run';
const SAVE_KEY_LEGACY_V4 = 'skydisorder_v4_run';
const META_KEY = 'skydisorder_v4_meta';

const BUREAUCRACY_EVENTS = [
  { name: 'Committee for Unnecessary Synergy', desc: 'A meeting about having more meetings.', effect: s => { s.hype += 5; s.compliance += 5; s.burnRate += 20; }, flavor: 'We need to align on the alignment.' },
  { name: 'Mandatory Fun Friday', desc: 'Enforced social interaction.', effect: s => { s.reputation -= 5; s.compliance += 10; }, flavor: 'The pizza is lukewarm and the morale is lower.' },
  { name: 'The Audit of Perpetual Paperwork', desc: 'Someone found a receipt for a $400 toaster.', effect: s => { s.money -= 200; s.auditRisk -= 10; }, flavor: 'Is this toaster mission-critical? Magistrate Ledger asks.' },
  { name: 'Pivot to AI (Again)', desc: 'The board heard a podcast.', effect: s => { s.hype += 15; s.burnRate += 50; s.compliance -= 5; }, flavor: 'Just add "Intelligence" to the name. Any intelligence will do.' },
  { name: 'Open-Office Reorg', desc: 'Nobody has a desk anymore.', effect: s => { s.reputation -= 10; s.hype += 5; }, flavor: 'It promotes "spontaneous collaboration" and "lower rent costs."' },
  { name: 'Stealth Mode Activated', desc: 'Wait, what are we building?', effect: s => { s.hype += 10; s.compliance -= 15; }, flavor: 'If we don\'t know, the competitors certainly won\'t.' },
  { name: 'The Wellness Retreat Hole', desc: 'Five hours of yoga in a bunker.', effect: s => { s.reputation += 10; s.money -= 500; }, flavor: 'Namaste, stakeholders.' },
  { name: 'Leaked Slack Logs', desc: 'The truth about the breakroom fridge.', effect: s => { s.reputation -= 15; s.hype -= 10; s.auditRisk += 20; }, flavor: '"Who stole the organic kale?" becomes a city-wide scandal.' },
  { name: 'The Ceremonial Spoon Polishing', desc: 'A tradition of the Most Serene Company.', effect: s => { s.compliance += 20; adjustStanding('Vastcart', 5); }, flavor: 'Shiny spoons represent shiny profits.' },
  { name: 'Unsolicited Advice from a Billionaire', desc: 'He says you should wake up at 3 AM.', effect: s => { s.hype += 5; s.reputation -= 5; }, flavor: '"I attribute my success to drinking lake water," he claims.' },
  { name: 'Ghosting the Landlord', desc: 'Operational efficiency at its finest.', effect: s => { s.money += 400; s.reputation -= 10; s.auditRisk += 15; }, flavor: '"We\'re not late, we\'re just in a stealth payment phase."' },
  { name: 'The Synergy Smoothie Incident', desc: 'The kale was fermented. Unintentionally.', effect: s => { s.reputation -= 5; s.compliance -= 5; }, flavor: 'The Board is calling it a "biological pivot."' },
  { name: 'AI Hallucination Pitch', desc: 'The model suggested we sell "digital dirt."', effect: s => { s.hype += 12; s.compliance -= 8; }, flavor: '"It\'s not a bug, it\'s a generative feature," says Brother Hustleworth.' },
  { name: 'Corporate Jargon Overload', desc: 'The "deliverables" are "actionable."', effect: s => { s.compliance += 15; s.reputation -= 8; }, flavor: 'Magistrate Ledger is pleased with the high syllable count.' },
  { name: 'The LinkedIn Influencer Visit', desc: 'He wants to film a "Day in the Life."', effect: s => { s.hype += 8; s.reputation -= 12; }, flavor: '"Focus on the espresso machine, not the balance sheet."' },
  { name: 'Supply Chain "Optimization"', desc: 'The trucks are now bicycles.', effect: s => { s.burnRate -= 50; s.reputation -= 15; adjustStanding('Forgeharvest', -5); }, flavor: 'Vastcart & Sons are confused. Goodwife Henrietta is amused.' },
  { name: 'The Stealth-Wealth Gala', desc: 'Dressing like you\'re poor is expensive.', effect: s => { s.money -= 600; s.hype += 20; adjustStanding('MigratoryFounders', 8); }, flavor: 'Brother Idleworth wore a t-shirt that cost more than your car.' },
  { name: 'Magistrate Ledger\'s Disappointment', desc: 'He found a comma splice in the SEC filing.', effect: s => { s.compliance -= 10; s.auditRisk += 15; adjustStanding('PredictiveCompliance', -5); }, flavor: 'The Department of Perpetual Paperwork never forgets.' },
  { name: 'The Great Coffee Shortage', desc: 'The beans were seized for an audit.', effect: s => { s.reputation -= 20; s.compliance -= 10; adjustStanding('CommitteeUnnecessarySynergy', -5); }, flavor: 'Productivity didn\'t drop, it just became very aggressive.' },
  { name: 'An Elaborate Loss', desc: 'Sir Wastrel is impressed.', effect: s => { s.money -= 800; adjustStanding('CommitteeUnnecessarySynergy', 10); }, flavor: '"This is art," Sir Wastrel whispers, looking at the Q3 deficit.' },
  
  // ── GP-2: NEW CHOICE-BASED BUREAUCRACY EVENTS ──────────────────────────────
  {
    id: 'bureau_synergy_audit_01',
    org: 'Committee for Unnecessary Synergy',
    prompt: "The Committee requires you to justify, in triplicate and iambic pentameter, why your last shot was 'a touch ambitious.' A ceremonial spoon hangs in the balance.",
    choices: [
      { label: "Comply, in verse.", standingMap: { CommitteeUnnecessarySynergy: +6, NativeHollows: -2 } },
      { label: "Demand the form to request the form.", standingMap: { PredictiveCompliance: +8, CommitteeUnnecessarySynergy: -3 } },
      { label: "Quietly weep, then comply.", standingMap: { NativeHollows: +3 } }
    ]
  },
  {
    id: 'bureau_drone_path_02',
    org: 'Lord Buzzwick\'s Mechanical Crow Syndicate',
    prompt: "A flock of mechanical crows has established a permanent nesting pattern directly over the 14th hole. They are recording your heart rate.",
    choices: [
      { label: "Monetize the biological data.", standingMap: { MechanicalCrow: +8, CursorSpectacles: +4, NativeHollows: -5 } },
      { label: "Install anti-drone netting.", standingMap: { NativeHollows: +6, MechanicalCrow: -8, PredictiveCompliance: -2 } },
      { label: "Charge the crows rent.", standingMap: { Vastcart: +5, MechanicalCrow: -4 } }
    ]
  },
  {
    id: 'bureau_retail_margin_03',
    org: 'The Most Serene Company of Vastcart & Sons',
    prompt: "The Home Office hath decreed that all future swings must maintain a minimum 14% margin of error to remain shelf-stable. Compliance is mandatory.",
    choices: [
      { label: "Sacrifice distance for compliance.", standingMap: { Vastcart: +10, CursorSpectacles: -5 } },
      { label: "Argue that golf is an artisanal craft.", standingMap: { FarmableFractions: +6, Vastcart: -10 } },
      { label: "Agree, then ignore the memo.", standingMap: { MigratoryFounders: +5, PredictiveCompliance: -6 } }
    ]
  },
  {
    id: 'bureau_algo_denial_04',
    org: 'The Bespoke Apothecary of Algorithmic Approvals',
    prompt: "Your request for 'a better lie in the rough' has been algorithmically denied on the grounds that your suffering builds character.",
    choices: [
      { label: "Accept the denial graciously.", standingMap: { AlgorithmicApprovals: +8, NativeHollows: -4 } },
      { label: "File an appeal using generative AI.", standingMap: { CursorSpectacles: +6, AlgorithmicApprovals: -5 } },
      { label: "Bribe the algorithm with raw data.", standingMap: { MechanicalCrow: +5, PredictiveCompliance: -4 } }
    ]
  },
  {
    id: 'bureau_contrarian_thesis_05',
    org: 'Coastal Shadow Holdings',
    prompt: "The Contrarian Baron hath published a thesis claiming that hitting the ball into the water is actually a masterclass in liquidity.",
    choices: [
      { label: "Publicly endorse the thesis.", standingMap: { CoastalShadow: +8, PredictiveCompliance: -5 } },
      { label: "Point out the ball is literally sinking.", standingMap: { NativeHollows: +6, CoastalShadow: -10 } },
      { label: "Tokenize the sunken ball.", standingMap: { FarmableFractions: +7, CoastalShadow: -3 } }
    ]
  },
  {
    id: 'bureau_stealth_relocation_06',
    org: 'The Migratory Founders\' Confraternity',
    prompt: "The Devotional hath announced a spiritual relocation to Austin, Texas. They require a statement of solidarity regarding the lack of state income tax.",
    choices: [
      { label: "Sign the statement with a heavy sigh.", standingMap: { MigratoryFounders: +8, NativeHollows: -6 } },
      { label: "Point out they still live in their parents' guest house.", standingMap: { NativeHollows: +8, MigratoryFounders: -12 } },
      { label: "Pitch them a B2B SaaS for moving boxes.", standingMap: { CursorSpectacles: +5, MigratoryFounders: -2 } }
    ]
  },
  {
    id: 'bureau_logistics_squeeze_07',
    org: 'The Noble Order of Forgeharvest Provisions',
    prompt: "Throughput is down 4%. Forgeharvest demands you swing faster, skip the practice swings, and wear a branded hairnet on the fairway.",
    choices: [
      { label: "Comply for the sake of the supply chain.", standingMap: { Forgeharvest: +10, NativeHollows: -5 } },
      { label: "Refuse the hairnet on aesthetic grounds.", standingMap: { CursorSpectacles: +5, Forgeharvest: -8 } },
      { label: "Submit a form detailing the aerodynamic drag of hairnets.", standingMap: { PredictiveCompliance: +6, Forgeharvest: -3 } }
    ]
  },
  {
    id: 'bureau_soil_audit_08',
    org: 'The Solemn Order of Farmable Fractions',
    prompt: "Brother Tillage is auditing your divots. He claims each chunk of displaced earth represents an unregistered security.",
    choices: [
      { label: "Apologize and mint the divot as an NFT.", standingMap: { FarmableFractions: +8, PredictiveCompliance: -6 } },
      { label: "Replace the divot. Physically.", standingMap: { NativeHollows: +7, FarmableFractions: -8 } },
      { label: "Claim the divot is a tax write-off.", standingMap: { CommitteeUnnecessarySynergy: +6, FarmableFractions: -4 } }
    ]
  },
  {
    id: 'bureau_hype_cycle_09',
    org: 'The Lone Hooded Figure',
    prompt: "The Confraternity has declared that physical golf is dead. We are now pivoting to 'Spatial Computing Leisure Activities.' Update your LinkedIn.",
    choices: [
      { label: "Update title to 'Spatial Leisure Architect'.", standingMap: { CursorSpectacles: +10, NativeHollows: -8 } },
      { label: "Ignore them and keep swinging.", standingMap: { NativeHollows: +6, CursorSpectacles: -10 } },
      { label: "Ask if they actually have a VR headset yet.", standingMap: { MigratoryFounders: +5, CursorSpectacles: -5 } }
    ]
  },
  {
    id: 'bureau_predictive_penalty_10',
    org: 'The Ordinanced Ministry of Predictive Compliance',
    prompt: "Magistrate Ledger notes that based on your trajectory, you are 88% likely to commit a dress code violation on the 18th hole. Pay the fine now.",
    choices: [
      { label: "Pay the pre-fine to clear the ledger.", standingMap: { PredictiveCompliance: +10, CommitteeUnnecessarySynergy: -4 } },
      { label: "Dispute the algorithmic certainty.", standingMap: { AlgorithmicApprovals: -8, PredictiveCompliance: -6 } },
      { label: "Change clothes immediately.", standingMap: { NativeHollows: +5, PredictiveCompliance: -2 } }
    ]
  },
  {
    id: 'bureau_tea_room_gossip_11',
    org: 'Goodwife Henrietta\'s Coalition',
    prompt: "Goodwife Henrietta casually mentions that Vastcart buyers were seen inspecting the local community center with tape measures.",
    choices: [
      { label: "Warn the community.", standingMap: { NativeHollows: +12, Vastcart: -15 } },
      { label: "Tip off the Vastcart buyers to a cheaper lot.", standingMap: { Vastcart: +10, NativeHollows: -12 } },
      { label: "Do nothing. Feign ignorance.", standingMap: { MigratoryFounders: +4, NativeHollows: -4 } }
    ]
  },
  {
    id: 'bureau_synergy_retreat_12',
    org: 'Committee for Unnecessary Synergy',
    prompt: "Sir Wastrel is hosting a mandatory 'Vulnerability and Taxation' retreat in a cave. Attendance is required for next quarter's spoon eligibility.",
    choices: [
      { label: "Attend and weep over a K-1 form.", standingMap: { CommitteeUnnecessarySynergy: +10, PredictiveCompliance: -5 } },
      { label: "Send an intern in your place.", standingMap: { Forgeharvest: +4, CommitteeUnnecessarySynergy: -8 } },
      { label: "Decline, citing actual work.", standingMap: { Vastcart: +6, CommitteeUnnecessarySynergy: -10 } }
    ]
  },
  {
    id: 'bureau_drone_delivery_13',
    org: 'Lord Buzzwick\'s Mechanical Crow Syndicate',
    prompt: "A drone attempts to deliver a lukewarm burrito to your caddy mid-backswing. It requires a digital signature.",
    choices: [
      { label: "Sign digitally while swinging.", standingMap: { CursorSpectacles: +5, MechanicalCrow: +5 } },
      { label: "Swat the drone with a 9-iron.", standingMap: { NativeHollows: +8, MechanicalCrow: -12 } },
      { label: "Report the safety violation.", standingMap: { PredictiveCompliance: +8, MechanicalCrow: -6 } }
    ]
  },
  {
    id: 'bureau_margin_call_14',
    org: 'The Most Serene Company of Vastcart & Sons',
    prompt: "The Home Office requests that you retroactively discount your last three birdies by 12% to align with holiday promotional pricing.",
    choices: [
      { label: "Accept the margin compression.", standingMap: { Vastcart: +12, CursorSpectacles: -6 } },
      { label: "Hold firm on your par value.", standingMap: { Forgeharvest: +5, Vastcart: -10 } },
      { label: "Complain to the local paper.", standingMap: { NativeHollows: +10, Vastcart: -15 } }
    ]
  },
  {
    id: 'bureau_prior_auth_15',
    org: 'The Bespoke Apothecary of Algorithmic Approvals',
    prompt: "Your request to use a golf cart has been flagged as 'not medically necessary.' You must walk, or submit 400 pages of biometric data.",
    choices: [
      { label: "Walk in silence.", standingMap: { NativeHollows: +5, AlgorithmicApprovals: +2 } },
      { label: "Submit the biometric data.", standingMap: { MechanicalCrow: +6, AlgorithmicApprovals: +8 } },
      { label: "Hire a lawyer.", standingMap: { PredictiveCompliance: +8, AlgorithmicApprovals: -10 } }
    ]
  },
  {
    id: 'bureau_contrarian_putt_16',
    org: 'Coastal Shadow Holdings',
    prompt: "The Baron argues that putting toward the hole is 'consensus thinking' and suggests aiming for the bunker to demonstrate alpha.",
    choices: [
      { label: "Aim for the bunker.", standingMap: { CoastalShadow: +12, NativeHollows: -8 } },
      { label: "Putt normally.", standingMap: { NativeHollows: +5, CoastalShadow: -10 } },
      { label: "Write a medium post about the bunker.", standingMap: { CursorSpectacles: +6, CoastalShadow: -2 } }
    ]
  },
  {
    id: 'bureau_fractional_caddy_17',
    org: 'The Solemn Order of Farmable Fractions',
    prompt: "Brother Tillage suggests tokenizing your caddy's advice. Every tip will be minted as a micro-asset on a bespoke ledger.",
    choices: [
      { label: "Mint the caddy.", standingMap: { FarmableFractions: +10, PredictiveCompliance: -6 } },
      { label: "Refuse this horrific commodification.", standingMap: { NativeHollows: +8, FarmableFractions: -10 } },
      { label: "Pivot to an AI caddy instead.", standingMap: { CursorSpectacles: +8, FarmableFractions: -4 } }
    ]
  },
  {
    id: 'bureau_stealth_launch_18',
    org: 'The Migratory Founders\' Confraternity',
    prompt: "The Devotional is finally launching their product. It is a PDF of a manifesto about living in stealth mode.",
    choices: [
      { label: "Invest $50k in the PDF.", standingMap: { MigratoryFounders: +12, Vastcart: -8 } },
      { label: "Call it a scam.", standingMap: { NativeHollows: +8, MigratoryFounders: -15 } },
      { label: "Harvest the loss.", standingMap: { CommitteeUnnecessarySynergy: +10, MigratoryFounders: -2 } }
    ]
  },
  {
    id: 'bureau_throughput_crisis_19',
    org: 'The Noble Order of Forgeharvest Provisions',
    prompt: "A logjam at the 9th hole is delaying the poultry trucks. You are ordered to play through the foursome ahead of you using physical force if necessary.",
    choices: [
      { label: "Drive the ball into the foursome.", standingMap: { Forgeharvest: +12, NativeHollows: -15 } },
      { label: "Wait patiently.", standingMap: { NativeHollows: +6, Forgeharvest: -12 } },
      { label: "File a noise complaint.", standingMap: { PredictiveCompliance: +8, Forgeharvest: -6 } }
    ]
  },
  {
    id: 'bureau_compliance_audit_20',
    org: 'The Ordinanced Ministry of Predictive Compliance',
    prompt: "Magistrate Ledger arrives with a clipboard. He notes your socks do not match the hex code of the corporate brand guidelines.",
    choices: [
      { label: "Submit to a fine.", standingMap: { PredictiveCompliance: +10, CursorSpectacles: -4 } },
      { label: "Claim the socks are 'disruptive'.", standingMap: { CursorSpectacles: +8, PredictiveCompliance: -12 } },
      { label: "Change socks on the fairway.", standingMap: { NativeHollows: -2, PredictiveCompliance: +4 } }
    ]
  },
  {
    id: 'bureau_local_zoning_21',
    org: 'Goodwife Henrietta\'s Coalition',
    prompt: "The town council is voting on rezoning the back nine into a fulfillment center. Henrietta asks you to speak at the hearing.",
    choices: [
      { label: "Speak against the fulfillment center.", standingMap: { NativeHollows: +15, Vastcart: -20, Forgeharvest: -10 } },
      { label: "Speak in favor of the fulfillment center.", standingMap: { Vastcart: +15, Forgeharvest: +10, NativeHollows: -25 } },
      { label: "Send a junior associate.", standingMap: { MigratoryFounders: +5, NativeHollows: -8 } }
    ]
  },
  {
    id: 'bureau_spoon_inventory_22',
    org: 'Committee for Unnecessary Synergy',
    prompt: "An emergency audit reveals the Committee is short by exactly one Ceremonial Spoon. They ask if you have seen it.",
    choices: [
      { label: "Return the spoon you stole.", standingMap: { CommitteeUnnecessarySynergy: +8, PredictiveCompliance: +4 } },
      { label: "Deny everything.", standingMap: { CoastalShadow: +5, CommitteeUnnecessarySynergy: -8 } },
      { label: "Blame the drone syndicate.", standingMap: { MechanicalCrow: -10, CommitteeUnnecessarySynergy: +4 } }
    ]
  },
  {
    id: 'bureau_drone_swarm_23',
    org: 'Lord Buzzwick\'s Mechanical Crow Syndicate',
    prompt: "The sky darkens. A swarm of drones spells out 'SYNERGY' in the clouds, blocking the sun and terrifying the local livestock.",
    choices: [
      { label: "Applaud the technological marvel.", standingMap: { MechanicalCrow: +10, NativeHollows: -8 } },
      { label: "Complain about the lack of sunlight.", standingMap: { NativeHollows: +6, MechanicalCrow: -6 } },
      { label: "Point out the kerning is off.", standingMap: { CursorSpectacles: +5, MechanicalCrow: -2 } }
    ]
  },
  {
    id: 'bureau_vendor_squeeze_24',
    org: 'The Most Serene Company of Vastcart & Sons',
    prompt: "Vastcart demands you switch to their proprietary brand of golf tees. They shatter instantly upon impact, but cost $0.01 less.",
    choices: [
      { label: "Use the brittle tees.", standingMap: { Vastcart: +12, NativeHollows: -4 } },
      { label: "Smuggle in good tees.", standingMap: { NativeHollows: +5, Vastcart: -12 } },
      { label: "Write a whitepaper on tee disruption.", standingMap: { CursorSpectacles: +6, Vastcart: -5 } }
    ]
  },
  {
    id: 'bureau_algorithmic_diagnosis_25',
    org: 'The Bespoke Apothecary of Algorithmic Approvals',
    prompt: "The AI has diagnosed you with 'Pre-Fatigue.' It prescribes a mandatory 2-hour webinar on resilience.",
    choices: [
      { label: "Watch the webinar.", standingMap: { AlgorithmicApprovals: +10, CommitteeUnnecessarySynergy: +5 } },
      { label: "Hack the AI to mark it complete.", standingMap: { CursorSpectacles: +8, AlgorithmicApprovals: -12 } },
      { label: "Refuse. Go play golf.", standingMap: { NativeHollows: +6, AlgorithmicApprovals: -8 } }
    ]
  },
  {
    id: 'bureau_contrarian_clothing_26',
    org: 'Coastal Shadow Holdings',
    prompt: "The Baron is wearing winter coats in July to prove he is immune to macroeconomic seasons. He insists you do the same.",
    choices: [
      { label: "Sweat in a parka.", standingMap: { CoastalShadow: +12, NativeHollows: -5 } },
      { label: "Wear a sensible polo.", standingMap: { NativeHollows: +6, CoastalShadow: -10 } },
      { label: "File a medical exemption.", standingMap: { AlgorithmicApprovals: +5, CoastalShadow: -6 } }
    ]
  },
  {
    id: 'bureau_fractional_water_27',
    org: 'The Solemn Order of Farmable Fractions',
    prompt: "Brother Tillage has tokenized the water hazard. If you hit the ball in, you owe a micro-royalty to 400 anonymous investors.",
    choices: [
      { label: "Pay the royalty.", standingMap: { FarmableFractions: +10, Vastcart: -4 } },
      { label: "Refuse to pay. It's a puddle.", standingMap: { NativeHollows: +8, FarmableFractions: -12 } },
      { label: "Report it as an unregistered exchange.", standingMap: { PredictiveCompliance: +12, FarmableFractions: -15 } }
    ]
  },
  {
    id: 'bureau_hype_house_28',
    org: 'The Lone Hooded Figure',
    prompt: "The Confraternity has rented a massive mansion to 'collab.' They want you to move your corporate headquarters to their living room.",
    choices: [
      { label: "Move into the hype house.", standingMap: { CursorSpectacles: +15, PredictiveCompliance: -10, NativeHollows: -8 } },
      { label: "Politely decline.", standingMap: { PredictiveCompliance: +5, CursorSpectacles: -10 } },
      { label: "Call the landlord.", standingMap: { NativeHollows: +10, CursorSpectacles: -15 } }
    ]
  },
  {
    id: 'bureau_stealth_vacation_29',
    org: 'The Migratory Founders\' Confraternity',
    prompt: "The Devotional is taking a 'stealth vacation' to Aspen. They want to use your company credit card, calling it a 'strategic integration expense.'",
    choices: [
      { label: "Give them the card.", standingMap: { MigratoryFounders: +15, PredictiveCompliance: -15 } },
      { label: "Refuse the card.", standingMap: { PredictiveCompliance: +8, MigratoryFounders: -12 } },
      { label: "Log it as a tax loss.", standingMap: { CommitteeUnnecessarySynergy: +10, MigratoryFounders: +2 } }
    ]
  },
  {
    id: 'bureau_throughput_bonus_30',
    org: 'The Noble Order of Forgeharvest Provisions',
    prompt: "Forgeharvest offers a $5,000 bonus if you can finish the next three holes in under 90 seconds. Collateral damage is pre-approved.",
    choices: [
      { label: "Accept the bloody sprint.", standingMap: { Forgeharvest: +15, PredictiveCompliance: -10, NativeHollows: -10 } },
      { label: "Reject the unsafe conditions.", standingMap: { NativeHollows: +10, Forgeharvest: -15 } },
      { label: "Ask for it in writing.", standingMap: { PredictiveCompliance: +8, Forgeharvest: -5 } }
    ]
  }
];

function triggerBureaucracyEvent() {
  const ev = BUREAUCRACY_EVENTS[Math.floor(Math.random() * BUREAUCRACY_EVENTS.length)];
  
  if (ev.choices && ev.choices.length > 0) {
    // New GP-2 format (interactive overlay)
    st.currentBureaucracyEvent = ev;
    st.prevScreen = st.screen;
    st.screen = 'bureaucracy';
    playClick();
  } else if (ev.effect) {
    // Legacy format (inline effect)
    ev.effect(st);
    addPopup(`📜 ${ev.name.toUpperCase()}`, W / 2, H / 2 - 60, COL.cyan, 14, 3.0);
    addPopup(ev.desc, W / 2, H / 2 - 30, COL.white, 8, 3.0);
    logStory(`${ev.name}: ${ev.flavor}`);
    playHit();
  }
}

// ── GP-2: BUREAUCRACY OVERLAY ────────────────────────────────────────────────

function drawBureaucracy() {
  rect(0, 0, W, H, 'rgba(15,20,18,0.96)');
  panel(60, 50, W - 120, H - 100, '📜 OFFICIAL WRIT');
  const ev = st.currentBureaucracyEvent;
  if (!ev) { onBureaucracyResolved(null); return; }

  // Org Name
  txt(ev.org ? ev.org.toUpperCase() : ev.name.toUpperCase(), W / 2, 94, 9, COL.gold, true);

  // Prompt / Desc
  const promptText = ev.prompt || ev.desc || "";
  const promptLines = wrapLines(promptText, 52).slice(0, 4);
  rect(80, 120, W - 160, 24 + promptLines.length * 18, 'rgba(0,0,0,0.35)', 6, COL.dim, 1);
  promptLines.forEach((l, i) => txt(l, W / 2, 138 + i * 18, 6.5, COL.white, false));

  // Choices
  const choicesY = 120 + 24 + promptLines.length * 18 + 24;
  if (ev.choices) {
    ev.choices.forEach((c, i) => {
      const cy = choicesY + i * 50;
      const hovered = st.mouseX > 100 && st.mouseX < W - 100 && st.mouseY > cy && st.mouseY < cy + 38;
      rect(100, cy, W - 200, 38, hovered ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)', 6, hovered ? COL.gold : COL.cyan, 1);
      
      // Choice Label
      const cLines = wrapLines(c.label, 48).slice(0, 2);
      cLines.forEach((l, j) => txt(l, W / 2, cy + 13 + j * 12, 5.5, hovered ? COL.white : COL.cyan, false));
    });
  }
}

function clickBureaucracy(mx, my) {
  const ev = st.currentBureaucracyEvent;
  if (!ev || !ev.choices) return;

  const promptLines = wrapLines(ev.prompt || ev.desc || "", 52).slice(0, 4);
  const choicesY = 120 + 24 + promptLines.length * 18 + 24;

  ev.choices.forEach((c, i) => {
    const cy = choicesY + i * 50;
    if (mx > 100 && mx < W - 100 && my > cy && my < cy + 38) {
      onBureaucracyResolved(c, ev.id);
    }
  });
}

function onBureaucracyResolved(choice, eventId) {
  if (choice) {
    // Apply embedded standingMap
    if (choice.standingMap) {
      for (const [faction, delta] of Object.entries(choice.standingMap)) {
        adjustStanding(faction, delta);
      }
    }
    // Also trigger the central mapper if this choice corresponds to an ID in the map
    // We assume choice objects might optionally have an 'id' string (e.g. 'comply') for the map.
    if (choice.id && eventId) {
      onBureaucracyResponse(eventId, choice.id);
    }
    
    // Optional stat changes attached to the choice
    if (choice.effect) choice.effect(st);

    logStory(`[Bureaucracy] Responded: ${choice.label}`);
    addPopup(`RESPONSE RECORDED`, W / 2, H / 2 - 30, COL.gold, 13, 3.5);
    playSuccess();
  }

  st.currentBureaucracyEvent = null;
  st.screen = 'playing';
  
  if (st.swingPhase === 'ready' && !st.ballFlying) {
    // idle, ok
  } else {
    resetBall();
  }
  
  checkPivotCrisis();
  saveRun();
}
// ── END BUREAUCRACY OVERLAY ──────────────────────────────────────────────────

// ============================================================
// PITCH GAUNTLET DATA
// ============================================================
const PITCH_DECK = [
  { 
    title: "Uber for Artisanal Dirt", 
    proposer: "Brother Tillage",
    pitch: "We tokenize the soil. Each shovelful is a unique digital asset on the FarmChain.",
    outcomes: {
      invest: { text: "You funded the dirt. The soil is now 'smart.'", effect: s => { s.money -= 500; s.hype += 15; adjustStanding('FarmableFractions', 10); } },
      decline: { text: "You rejected the dirt. Tillage calls you an 'urbanite.'", effect: s => { adjustStanding('FarmableFractions', -5); } },
      roast: { text: "You called it 'muddy logic.' The crowd roars.", effect: s => { s.reputation += 10; s.hype += 5; adjustStanding('FarmableFractions', -15); adjustStanding('NativeHollows', 5); } }
    }
  },
  {
    title: "The Unmanned Lunchbox",
    proposer: "Lord Buzzwick",
    pitch: "Drones that hover over your head and drop snacks based on your heart rate.",
    outcomes: {
      invest: { text: "The drones are live. Watch your head.", effect: s => { s.money -= 800; s.hype += 20; adjustStanding('MechanicalCrow', 12); } },
      decline: { text: "Buzzwick's crows are watching you now. Closely.", effect: s => { adjustStanding('MechanicalCrow', -5); } },
      roast: { text: "You mocked the 'snack-surveillance' state. Heroic.", effect: s => { s.reputation += 15; adjustStanding('MechanicalCrow', -20); adjustStanding('NativeHollows', 10); } }
    }
  },
  {
    title: "Schedule C Consulting",
    proposer: "Sir Wastrel",
    pitch: "We help you turn your personal hobby into a corporate loss-leader.",
    outcomes: {
      invest: { text: "Your yacht is now a 'floating research lab.' Success!", effect: s => { s.money -= 1000; s.auditRisk += 30; adjustStanding('CommitteeUnnecessarySynergy', 15); } },
      decline: { text: "Sir Wastrel calls your lack of imagination 'quaint.'", effect: s => { adjustStanding('CommitteeUnnecessarySynergy', -5); } },
      roast: { text: "You called him a 'tax-evading alchemist.'", effect: s => { s.reputation += 12; adjustStanding('CommitteeUnnecessarySynergy', -25); adjustStanding('NativeHollows', 8); } }
    }
  },
  {
    title: "Vibe-Check Prior Auth",
    proposer: "The Bespoke Apothecary",
    pitch: "An AI that denies medical claims based on the patient's LinkedIn activity.",
    outcomes: {
      invest: { text: "Profit margins are soaring! Ethics? Never heard of her.", effect: s => { s.money += 1500; s.reputation -= 20; adjustStanding('AlgorithmicApprovals', 15); } },
      decline: { text: "The Apothecary notes your 'unhelpful empathy.'", effect: s => { adjustStanding('AlgorithmicApprovals', -10); } },
      roast: { text: "You called it 'algorithmic cruelty.' The locals cheer.", effect: s => { s.reputation += 20; adjustStanding('NativeHollows', 15); adjustStanding('AlgorithmicApprovals', -30); } }
    }
  },
  // ── GP-3: THIRTY-PLUS INVESTOR PITCH SCENARIOS ──────────────────────────────
  {
    id: 'pitch_farmtoken_01',
    pitchLine: "We tokenize the FRACTIONAL OWNERSHIP of soil moisture. It's like farmland, but you can never touch it and it might be a JPEG.",
    founderArchetype: 'web3RePivoter',
    branches: {
      invest:  { text: "Sir Reginald: 'Bold. Illiquid. I adore it.'", standingMap: { FarmableFractions: 10, NativeHollows: -6 } },
      decline: { text: "Sir Reginald: 'I decline, as one declines a damp handshake.'", standingMap: { CoastalShadow: 5 } },
      counter: { text: "Counter: 'Halve the valuation, double the buzzwords.'", standingMap: { CursorSpectacles: 4 } }
    }
  },
  {
    id: 'pitch_sleep_monetization_02',
    pitchLine: "An app that inserts micro-transactions into your REM cycle. Why dream for free when you could be earning?",
    founderArchetype: 'brotherHustleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'Finally, the subconscious is monetized!'", standingMap: { CursorSpectacles: 8, NativeHollows: -10 } },
      decline: { text: "Sir Reginald: 'I prefer my dreams unbranded.'", standingMap: { NativeHollows: 5, CursorSpectacles: -4 } },
      counter: { text: "Counter: 'We only charge for the nightmares.'", standingMap: { PredictiveCompliance: 5, CoastalShadow: 3 } }
    }
  },
  {
    id: 'pitch_synergistic_tea_03',
    pitchLine: "We are disrupting local tea rooms with an algorithmic pricing model based on the customer's perceived desperation.",
    founderArchetype: 'youngMasterReginald',
    branches: {
      invest:  { text: "Sir Reginald: 'Dynamic pricing for emotional states. Excellent.'", standingMap: { Vastcart: 8, NativeHollows: -15 } },
      decline: { text: "Sir Reginald: 'I wouldn't cross Goodwife Henrietta.'", standingMap: { NativeHollows: 8, Vastcart: -5 } },
      counter: { text: "Counter: 'Just buy the tea room and burn it.'", standingMap: { CoastalShadow: 6, NativeHollows: -20 } }
    }
  },
  {
    id: 'pitch_drone_umbrella_04',
    pitchLine: "A personal swarm of micro-drones that act as an umbrella, while simultaneously recording your metadata.",
    founderArchetype: 'greatPioneer',
    branches: {
      invest:  { text: "Sir Reginald: 'Dryness and surveillance. A perfect pair.'", standingMap: { MechanicalCrow: 10, PredictiveCompliance: -5 } },
      decline: { text: "Sir Reginald: 'I prefer to get wet without being watched.'", standingMap: { PredictiveCompliance: 4, MechanicalCrow: -6 } },
      counter: { text: "Counter: 'Make the drones play ads loudly.'", standingMap: { Vastcart: 6, NativeHollows: -8 } }
    }
  },
  {
    id: 'pitch_loss_as_service_05',
    pitchLine: "We offer Loss-as-a-Service. You pay us to fail spectacularly, offsetting your capital gains with bespoke incompetence.",
    founderArchetype: 'sirWastrel',
    branches: {
      invest:  { text: "Sir Reginald: 'A masterpiece of fiscal tragedy.'", standingMap: { CommitteeUnnecessarySynergy: 12, PredictiveCompliance: -10 } },
      decline: { text: "Sir Reginald: 'I prefer to lose money organically.'", standingMap: { PredictiveCompliance: 5, CommitteeUnnecessarySynergy: -5 } },
      counter: { text: "Counter: 'Can you fail even faster?'", standingMap: { CursorSpectacles: 5, CommitteeUnnecessarySynergy: 4 } }
    }
  },
  {
    id: 'pitch_stealth_pizza_06',
    pitchLine: "A pizza delivery startup that operates entirely in stealth mode. No one knows when the pizza will arrive, or if it is pizza.",
    founderArchetype: 'brotherIdleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'The ambiguity commands a premium.'", standingMap: { MigratoryFounders: 10, Forgeharvest: -8 } },
      decline: { text: "Sir Reginald: 'I require tangible pepperoni.'", standingMap: { Forgeharvest: 6, MigratoryFounders: -5 } },
      counter: { text: "Counter: 'Deliver empty boxes. Sell the anticipation.'", standingMap: { CoastalShadow: 8, NativeHollows: -6 } }
    }
  },
  {
    id: 'pitch_agile_funerals_07',
    pitchLine: "We are bringing the agile methodology to end-of-life care. Two-week sprints. Daily stand-ups with the bereaved.",
    founderArchetype: 'pivotAddict',
    branches: {
      invest:  { text: "Sir Reginald: 'Disrupting grief. Very high margin.'", standingMap: { AlgorithmicApprovals: 8, NativeHollows: -12 } },
      decline: { text: "Sir Reginald: 'Some things should remain waterfall.'", standingMap: { NativeHollows: 6, AlgorithmicApprovals: -4 } },
      counter: { text: "Counter: 'Pivot to an MVP funeral.'", standingMap: { CursorSpectacles: 5, CommitteeUnnecessarySynergy: -3 } }
    }
  },
  {
    id: 'pitch_compliance_roulette_08',
    pitchLine: "An app that randomly deletes one required compliance form per day. It adds excitement to the bureaucratic process.",
    founderArchetype: 'web3RePivoter',
    branches: {
      invest:  { text: "Sir Reginald: 'Chaos as a service. I'm in.'", standingMap: { CoastalShadow: 10, PredictiveCompliance: -15 } },
      decline: { text: "Sir Reginald: 'Magistrate Ledger would have my head.'", standingMap: { PredictiveCompliance: 8, CoastalShadow: -5 } },
      counter: { text: "Counter: 'Sell the deleted forms as NFTs.'", standingMap: { FarmableFractions: 6, PredictiveCompliance: -10 } }
    }
  },
  {
    id: 'pitch_fractional_caddies_09',
    pitchLine: "You don't hire a caddy. You lease 1/1000th of a caddy's advice, delivered via blockchain three holes too late.",
    founderArchetype: 'greatPioneer',
    branches: {
      invest:  { text: "Sir Reginald: 'Inefficient and expensive. Brilliant.'", standingMap: { FarmableFractions: 8, NativeHollows: -5 } },
      decline: { text: "Sir Reginald: 'I prefer my advice to be actionable.'", standingMap: { Vastcart: 5, FarmableFractions: -4 } },
      counter: { text: "Counter: 'Replace the caddy with a chatbot.'", standingMap: { AlgorithmicApprovals: 6, NativeHollows: -8 } }
    }
  },
  {
    id: 'pitch_synergy_drink_10',
    pitchLine: "A caffeinated beverage that tastes like a quarterly review. We call it 'Liquid Alignment.'",
    founderArchetype: 'youngMasterReginald',
    branches: {
      invest:  { text: "Sir Reginald: 'It tastes like anxiety. Mass produce it.'", standingMap: { Vastcart: 10, NativeHollows: -6 } },
      decline: { text: "Sir Reginald: 'I only drink things that spark joy.'", standingMap: { NativeHollows: 5, Vastcart: -5 } },
      counter: { text: "Counter: 'Make it mandatory for all employees.'", standingMap: { CommitteeUnnecessarySynergy: 6, PredictiveCompliance: 4 } }
    }
  },
  {
    id: 'pitch_algo_apologies_11',
    pitchLine: "An AI that generates deeply insincere apologies for corporate blunders, optimized for SEO.",
    founderArchetype: 'pivotAddict',
    branches: {
      invest:  { text: "Sir Reginald: 'Finally, scalable contrition.'", standingMap: { AlgorithmicApprovals: 10, PredictiveCompliance: -6 } },
      decline: { text: "Sir Reginald: 'I never apologize. It shows weakness.'", standingMap: { CoastalShadow: 6, AlgorithmicApprovals: -4 } },
      counter: { text: "Counter: 'Can it also shift blame to interns?'", standingMap: { CommitteeUnnecessarySynergy: 5, NativeHollows: -8 } }
    }
  },
  {
    id: 'pitch_drone_dog_walker_12',
    pitchLine: "Why walk your dog when a swarm of military-grade drones can drag it around the block?",
    founderArchetype: 'brotherHustleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'Efficient, terrifying, and loud. Yes.'", standingMap: { MechanicalCrow: 12, NativeHollows: -10 } },
      decline: { text: "Sir Reginald: 'The liability insurance would be astronomical.'", standingMap: { PredictiveCompliance: 8, MechanicalCrow: -5 } },
      counter: { text: "Counter: 'Have the drones walk the owners instead.'", standingMap: { CoastalShadow: 8, NativeHollows: -12 } }
    }
  },
  {
    id: 'pitch_stealth_logistics_13',
    pitchLine: "A supply chain company that refuses to disclose what it ships, how it ships it, or if it even exists.",
    founderArchetype: 'brotherIdleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'The ultimate dark pattern.'", standingMap: { MigratoryFounders: 10, Forgeharvest: -10 } },
      decline: { text: "Sir Reginald: 'I need to know where my caviar is.'", standingMap: { Forgeharvest: 8, MigratoryFounders: -6 } },
      counter: { text: "Counter: 'Charge a subscription just to guess.'", standingMap: { CursorSpectacles: 6, NativeHollows: -5 } }
    }
  },
  {
    id: 'pitch_artisanal_audits_14',
    pitchLine: "We hand-craft bespoke audits. Our accountants use fountain pens and write their findings in haiku.",
    founderArchetype: 'sirWastrel',
    branches: {
      invest:  { text: "Sir Reginald: 'A beautiful waste of time and money.'", standingMap: { CommitteeUnnecessarySynergy: 10, PredictiveCompliance: -12 } },
      decline: { text: "Sir Reginald: 'I prefer my audits cold and binary.'", standingMap: { PredictiveCompliance: 8, CommitteeUnnecessarySynergy: -6 } },
      counter: { text: "Counter: 'Make them write in Latin.'", standingMap: { CoastalShadow: 5, PredictiveCompliance: -8 } }
    }
  },
  {
    id: 'pitch_retail_therapy_vr_15',
    pitchLine: "A VR headset that simulates the experience of browsing a big-box store, complete with fluorescent lighting and existential dread.",
    founderArchetype: 'web3RePivoter',
    branches: {
      invest:  { text: "Sir Reginald: 'We can monetize the despair!'", standingMap: { Vastcart: 12, CursorSpectacles: 6 } },
      decline: { text: "Sir Reginald: 'I pay people to shop for me.'", standingMap: { NativeHollows: 4, Vastcart: -5 } },
      counter: { text: "Counter: 'Add a mandatory in-app purchase to leave.'", standingMap: { AlgorithmicApprovals: 8, NativeHollows: -10 } }
    }
  },
  {
    id: 'pitch_hollows_gentrification_16',
    pitchLine: "We are rebranding the Native Hollows as 'The Artisan Trough.' We plan to sell overpriced mason jars.",
    founderArchetype: 'youngMasterReginald',
    branches: {
      invest:  { text: "Sir Reginald: 'Gentrification as a service. Classic.'", standingMap: { Vastcart: 10, NativeHollows: -25 } },
      decline: { text: "Sir Reginald: 'Goodwife Henrietta would literally end me.'", standingMap: { NativeHollows: 12, Vastcart: -8 } },
      counter: { text: "Counter: 'Just buy the tea room and burn it.'", standingMap: { CoastalShadow: 8, NativeHollows: -30 } }
    }
  },
  {
    id: 'pitch_predictive_firing_17',
    pitchLine: "An algorithm that fires employees three weeks before they realize they want to quit. Huge savings on severance.",
    founderArchetype: 'pivotAddict',
    branches: {
      invest:  { text: "Sir Reginald: 'Proactive restructuring. I love it.'", standingMap: { AlgorithmicApprovals: 12, PredictiveCompliance: 6 } },
      decline: { text: "Sir Reginald: 'I enjoy seeing the fear in their eyes personally.'", standingMap: { CommitteeUnnecessarySynergy: 4, AlgorithmicApprovals: -5 } },
      counter: { text: "Counter: 'Can it also automate their tears?'", standingMap: { CoastalShadow: 6, NativeHollows: -10 } }
    }
  },
  {
    id: 'pitch_drone_golf_balls_18',
    pitchLine: "The golf balls are tiny drones. You don't swing, you just use an app to fly them into the hole.",
    founderArchetype: 'brotherHustleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'Finally, golf without the physical exertion.'", standingMap: { MechanicalCrow: 10, CursorSpectacles: 6 } },
      decline: { text: "Sir Reginald: 'It ruins the satisfying thwack.'", standingMap: { NativeHollows: 5, MechanicalCrow: -6 } },
      counter: { text: "Counter: 'Make the app cost $50 per flight.'", standingMap: { Vastcart: 8, MechanicalCrow: 4 } }
    }
  },
  {
    id: 'pitch_farm_to_table_data_19',
    pitchLine: "We harvest data from smart-tractors and sell it back to the farmers at a 400% markup.",
    founderArchetype: 'greatPioneer',
    branches: {
      invest:  { text: "Sir Reginald: 'The circle of exploitation is complete.'", standingMap: { FarmableFractions: 12, NativeHollows: -15 } },
      decline: { text: "Sir Reginald: 'I prefer to exploit tech workers, not farmers.'", standingMap: { NativeHollows: 6, FarmableFractions: -5 } },
      counter: { text: "Counter: 'Make them subscribe to their own soil.'", standingMap: { Vastcart: 8, FarmableFractions: 5 } }
    }
  },
  {
    id: 'pitch_stealth_charity_20',
    pitchLine: "A philanthropic fund that donates money, but refuses to say to whom, why, or if the money is real.",
    founderArchetype: 'brotherIdleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'The tax benefits without the PR hassle!'", standingMap: { MigratoryFounders: 10, CommitteeUnnecessarySynergy: 8 } },
      decline: { text: "Sir Reginald: 'I demand a plaque with my name on it.'", standingMap: { CoastalShadow: 4, MigratoryFounders: -6 } },
      counter: { text: "Counter: 'Just keep the money and say we donated it.'", standingMap: { PredictiveCompliance: -15, CoastalShadow: 10 } }
    }
  },
  {
    id: 'pitch_synergistic_silence_21',
    pitchLine: "We sell an enterprise software suite that literally just mutes everyone's microphone in every meeting. Permanently.",
    founderArchetype: 'sirWastrel',
    branches: {
      invest:  { text: "Sir Reginald: 'The greatest productivity hack of the decade.'", standingMap: { CommitteeUnnecessarySynergy: -10, NativeHollows: 15 } },
      decline: { text: "Sir Reginald: 'But how will I hear myself talk?'", standingMap: { CommitteeUnnecessarySynergy: 8, NativeHollows: -5 } },
      counter: { text: "Counter: 'Only the CEO's mic should work.'", standingMap: { CursorSpectacles: 8, PredictiveCompliance: 4 } }
    }
  },
  {
    id: 'pitch_metaverse_logistics_22',
    pitchLine: "We ship virtual goods between virtual warehouses using virtual trucks. It solves a supply chain crisis that doesn't exist.",
    founderArchetype: 'web3RePivoter',
    branches: {
      invest:  { text: "Sir Reginald: 'Solving imaginary problems is our core business.'", standingMap: { CursorSpectacles: 10, Forgeharvest: -10 } },
      decline: { text: "Sir Reginald: 'Forgeharvest would crush you.'", standingMap: { Forgeharvest: 8, CursorSpectacles: -6 } },
      counter: { text: "Counter: 'Make the virtual trucks run on real diesel.'", standingMap: { CoastalShadow: 6, Forgeharvest: 5 } }
    }
  },
  {
    id: 'pitch_algorithmic_tea_23',
    pitchLine: "An AI that tells you exactly how much you will hate your tea before you even drink it.",
    founderArchetype: 'pivotAddict',
    branches: {
      invest:  { text: "Sir Reginald: 'Pre-emptive disappointment. Very efficient.'", standingMap: { AlgorithmicApprovals: 8, NativeHollows: -8 } },
      decline: { text: "Sir Reginald: 'I will drink Goodwife Henrietta's tea and I will like it.'", standingMap: { NativeHollows: 10, AlgorithmicApprovals: -5 } },
      counter: { text: "Counter: 'Can it predict the ruin of my enemies?'", standingMap: { CoastalShadow: 8, AlgorithmicApprovals: 4 } }
    }
  },
  {
    id: 'pitch_compliance_as_service_24',
    pitchLine: "We will fill out your compliance forms with randomly generated corporate buzzwords. It works 60% of the time.",
    founderArchetype: 'youngMasterReginald',
    branches: {
      invest:  { text: "Sir Reginald: 'A gamble, but the savings are immense.'", standingMap: { CursorSpectacles: 8, PredictiveCompliance: -15 } },
      decline: { text: "Sir Reginald: 'Magistrate Ledger does not accept buzzwords.'", standingMap: { PredictiveCompliance: 10, CursorSpectacles: -6 } },
      counter: { text: "Counter: 'Make the buzzwords rhyme.'", standingMap: { CommitteeUnnecessarySynergy: 8, PredictiveCompliance: -10 } }
    }
  },
  {
    id: 'pitch_drone_board_members_25',
    pitchLine: "Replace your board of directors with a flock of aggressive drones. They vote by swooping.",
    founderArchetype: 'brotherHustleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'More decisive than the current board.'", standingMap: { MechanicalCrow: 12, PredictiveCompliance: -8 } },
      decline: { text: "Sir Reginald: 'I prefer my board members to wear suits.'", standingMap: { PredictiveCompliance: 6, MechanicalCrow: -5 } },
      counter: { text: "Counter: 'Arm the drones with proxy votes.'", standingMap: { CoastalShadow: 8, MechanicalCrow: 5 } }
    }
  },
  {
    id: 'pitch_fractional_sleep_26',
    pitchLine: "You don't sleep 8 hours. You sleep 800 micro-naps throughout the day, managed by a smart contract.",
    founderArchetype: 'greatPioneer',
    branches: {
      invest:  { text: "Sir Reginald: 'Maximum productivity! Zero REM sleep!'", standingMap: { FarmableFractions: 8, NativeHollows: -10 } },
      decline: { text: "Sir Reginald: 'I enjoy my uninterrupted slumber.'", standingMap: { NativeHollows: 6, FarmableFractions: -4 } },
      counter: { text: "Counter: 'Monetize the waking micro-seconds.'", standingMap: { Vastcart: 8, FarmableFractions: 4 } }
    }
  },
  {
    id: 'pitch_stealth_audits_27',
    pitchLine: "We audit your company, but we don't tell you the results. We just silently judge you.",
    founderArchetype: 'brotherIdleworth',
    branches: {
      invest:  { text: "Sir Reginald: 'The anxiety will drive performance.'", standingMap: { MigratoryFounders: 8, PredictiveCompliance: -12 } },
      decline: { text: "Sir Reginald: 'I pay for my panic attacks to be documented.'", standingMap: { PredictiveCompliance: 10, MigratoryFounders: -5 } },
      counter: { text: "Counter: 'Sell the judgment as a subscription.'", standingMap: { CursorSpectacles: 6, MigratoryFounders: 4 } }
    }
  },
  {
    id: 'pitch_loss_leader_golf_28',
    pitchLine: "A golf course where every hole is a par 12, ensuring maximum time wasted and minimum efficiency.",
    founderArchetype: 'sirWastrel',
    branches: {
      invest:  { text: "Sir Reginald: 'A cathedral of inefficiency.'", standingMap: { CommitteeUnnecessarySynergy: 12, Forgeharvest: -15 } },
      decline: { text: "Sir Reginald: 'I have tee times to keep.'", standingMap: { Forgeharvest: 8, CommitteeUnnecessarySynergy: -6 } },
      counter: { text: "Counter: 'Make the holes move dynamically.'", standingMap: { CoastalShadow: 6, CommitteeUnnecessarySynergy: 5 } }
    }
  },
  {
    id: 'pitch_metaverse_retail_29',
    pitchLine: "A digital big-box store where you can buy digital pallets of digital mayonnaise.",
    founderArchetype: 'web3RePivoter',
    branches: {
      invest:  { text: "Sir Reginald: 'The margins on digital mayo are staggering.'", standingMap: { Vastcart: 10, CursorSpectacles: 8 } },
      decline: { text: "Sir Reginald: 'Vastcart will crush you in the real world.'", standingMap: { Forgeharvest: 6, Vastcart: -4 } },
      counter: { text: "Counter: 'Make the mayonnaise NFTs.'", standingMap: { FarmableFractions: 8, Vastcart: 5 } }
    }
  },
  {
    id: 'pitch_algorithmic_synergy_30',
    pitchLine: "An AI that automatically schedules meetings to discuss the lack of synergy in previous automated meetings.",
    founderArchetype: 'pivotAddict',
    branches: {
      invest:  { text: "Sir Reginald: 'A perpetual motion machine of corporate waste.'", standingMap: { AlgorithmicApprovals: 10, CommitteeUnnecessarySynergy: 10 } },
      decline: { text: "Sir Reginald: 'I prefer human-led time wasting.'", standingMap: { CommitteeUnnecessarySynergy: 5, AlgorithmicApprovals: -5 } },
      counter: { text: "Counter: 'Can it also order the catering?'", standingMap: { Vastcart: 6, AlgorithmicApprovals: 4 } }
    }
  }
];

function triggerPitchGauntlet() {
  // Pick a pitch that wasn't the last one shown (simple anti-repeat)
  let pick;
  do { pick = PITCH_DECK[Math.floor(Math.random() * PITCH_DECK.length)]; }
  while (PITCH_DECK.length > 1 && pick === st.currentPitch);
  st.currentPitch = pick;
  st.prevScreen = st.screen;
  st.screen = 'pitch';
  playClick();
}

// ── GP-5: CEREMONIAL SPOON ACHIEVEMENTS ───────────────────────────────────────
// Spoons are awarded by the Committee for Unnecessary Synergy at the end of a hole.
// Only one spoon is awarded at a time. The check function evaluates game state.
const CEREMONIAL_SPOONS = [
  { id: 'spoon_01', name: 'The Teaspoon of Tentative Promise', unlock: 'Complete Hole 1',
    flavor: "A spoon so small it implies the Committee isn't sure about you yet.",
    check: s => s.totalHolesCleared >= 1 },
  { id: 'spoon_02', name: 'The Muted Spork of Acceptable Performance', unlock: 'Reach Q2',
    flavor: "Awarded to founders who survive Q1. It is structurally compromised, much like your cap table.",
    check: s => s.quarter >= 2 },
  { id: 'spoon_03', name: 'The Soup Spoon of Synergistic Silence', unlock: 'Reach Q3',
    flavor: "A large, shallow spoon. Perfect for holding nothing while pretending you are busy.",
    check: s => s.quarter >= 3 },
  { id: 'spoon_04', name: 'The Dessert Spoon of Deferred Equity', unlock: 'Reach Q4',
    flavor: "It is plated in gold, but the core is entirely lead. The metaphor is intentional.",
    check: s => s.quarter >= 4 },
  { id: 'spoon_05', name: 'The Absinthe Spoon of Existential Dread', unlock: 'Reach Q5',
    flavor: "A slotted spoon. The Committee suggests you use it to filter out your bad ideas. It will take time.",
    check: s => s.quarter >= 5 },
  { id: 'spoon_06', name: 'The Ladle of Unearned Confidence', unlock: 'Decline 3 pitches in a row',
    flavor: "Large. Hollow. Ceremonially useless. Like the meeting that awarded it.",
    check: s => s.consecutiveDeclines >= 3 },
  { id: 'spoon_07', name: 'The Grapefruit Spoon of Acidic Reality', unlock: 'First Blood Feud',
    flavor: "Serrated on the edges. The Committee issues this when you first truly anger someone important.",
    check: s => Object.values(s.ledger).some(v => v <= COLLAPSE_THRESHOLD) },
  { id: 'spoon_08', name: 'The Demitasse Spoon of Diminishing Returns', unlock: 'Three Blood Feuds',
    flavor: "Very small. Very bitter. Awarded when you are fighting a war on three fronts.",
    check: s => Object.values(s.ledger).filter(v => v <= COLLAPSE_THRESHOLD).length >= 3 },
  { id: 'spoon_09', name: 'The Serving Spoon of Plausible Deniability', unlock: 'Reach Patron status',
    flavor: "A massive spoon designed to scoop up credit for things you did not do.",
    check: s => Object.values(s.ledger).some(v => v >= 60) },
  { id: 'spoon_10', name: 'The Sugar Spoon of Sweet Illusions', unlock: 'Two Patrons',
    flavor: "Awarded when you have convinced two separate factions that you are their best friend.",
    check: s => Object.values(s.ledger).filter(v => v >= 60).length >= 2 },
  { id: 'spoon_11', name: 'The Salt Spoon of Bitter Compromise', unlock: 'Three Patrons',
    flavor: "You are liked by many. The Committee assumes you stand for nothing.",
    check: s => Object.values(s.ledger).filter(v => v >= 60).length >= 3 },
  { id: 'spoon_12', name: 'The Bouillon Spoon of Concentrated Anxiety', unlock: 'Burn rate > $1000',
    flavor: "A tiny spoon used to stir an overwhelming broth of financial panic.",
    check: s => s.burnRate > 1000 },
  { id: 'spoon_13', name: 'The Marrow Spoon of Deep Extraction', unlock: 'Wealth > $20000',
    flavor: "Long and thin. Perfect for scraping the last bit of value from a dying market.",
    check: s => s.money > 20000 },
  { id: 'spoon_14', name: 'The Caviar Spoon of Unjustified Luxury', unlock: 'Hype > 80',
    flavor: "Made of mother-of-pearl, because metal taints the flavor of the hype.",
    check: s => s.hype > 80 },
  { id: 'spoon_15', name: 'The Measuring Spoon of Pedantic Compliance', unlock: 'Compliance > 80',
    flavor: "Exactly one teaspoon. Not a grain more, not a grain less. Magistrate Ledger wept upon seeing it.",
    check: s => s.compliance > 80 },
  { id: 'spoon_16', name: 'The Wooden Spoon of Abrasive Truth', unlock: 'Reputation > 80',
    flavor: "Rough, cheap, and surprisingly effective at getting the locals to like you.",
    check: s => s.reputation > 80 },
  { id: 'spoon_17', name: 'The Slotted Spoon of Failed Retention', unlock: 'Hype < 20',
    flavor: "Everything you try to hold simply falls through. The Committee offers its tepid condolences.",
    check: s => s.hype < 20 && s.totalHolesCleared > 3 },
  { id: 'spoon_18', name: 'The Grapefruit Spoon of Aggressive Reorg', unlock: 'Compliance < 20',
    flavor: "You have torn the company apart. The edges are jagged. Everyone is bleeding.",
    check: s => s.compliance < 20 && s.totalHolesCleared > 3 },
  { id: 'spoon_19', name: 'The Iced Tea Spoon of Long Runways', unlock: 'Runway > 40',
    flavor: "Extraordinarily long. You have bought yourself time. Do not waste it.",
    check: s => s.runway > 40 },
  { id: 'spoon_20', name: 'The Moka Spoon of Micro-Management', unlock: 'Runway < 5',
    flavor: "A tiny spoon for stirring up trouble when you should be looking for funding.",
    check: s => s.runway < 5 && s.totalHolesCleared > 3 },
  { id: 'spoon_21', name: 'The Olive Spoon of Pierced Illusions', unlock: 'Audit Risk > 80',
    flavor: "It has holes in it, much like your financial statements.",
    check: s => s.auditRisk > 80 },
  { id: 'spoon_22', name: 'The Grapefruit Spoon of Market Disruption', unlock: 'Audit Risk < 10, Quarter > 3',
    flavor: "You have somehow avoided the IRS. The Committee is taking notes.",
    check: s => s.auditRisk < 10 && s.quarter > 3 },
  { id: 'spoon_23', name: 'The Soup Spoon of Complete Capitulation', unlock: 'Equity < 20',
    flavor: "You own nothing, but you get to hold this spoon. Congratulations.",
    check: s => s.equity < 20 },
  { id: 'spoon_24', name: 'The Master Ladle of the Quillhaven Oligarchy', unlock: 'Reach World 8',
    flavor: "You are the machine now. You are the system. Scoop deeply.",
    check: s => s.currentWorld >= 8 },
  { id: 'spoon_25', name: 'The Great Spoon of Quillhaven Itself', unlock: 'Reach Patron with 6 factions',
    flavor: "Forged from melted-down lesser spoons. You have peaked. The Committee weeps with pride and mild resentment.",
    check: s => Object.values(s.ledger).filter(v => v >= 60).length >= 6 }
];

const SPOON_CEREMONY_COPY_BY_TIER = Object.freeze({
  common: Object.freeze({
    label: 'PROVISIONAL HONORS',
    intro: 'The Committee for Unnecessary Synergy is convened. Papers are shuffled with ceremonial gravity.',
    decree: 'For services judged provisionally adequate, the Chair permits a spoon to enter thy custody.',
    closing: 'Applause is polite, brief, and still awaiting budget approval.',
    toast: 'Toast: decent work. keep cooking.'
  }),
  uncommon: Object.freeze({
    label: 'FORMAL RECOGNITION',
    intro: 'The Committee for Unnecessary Synergy is convened. A hush is requested and, after two reminders, achieved.',
    decree: 'For meaningful contributions to the quarterly theatre, the Chair doth authorize this utensil-bearing distinction.',
    closing: 'A clerk strikes the gong with a teaspoon. Minutes shall be circulated by decree.',
    toast: 'Toast: you cooked. unfortunately, that counts now.'
  }),
  rare: Object.freeze({
    label: 'AUGUST DISTINCTION',
    intro: 'The Committee for Unnecessary Synergy is convened in full memorandum dress. A gavel that is itself a small spoon is produced.',
    decree: 'For services to ambition, optics, and outcomes nobody can quite audit, the Chair bestows this implement with measurable pomp.',
    closing: 'Mandatory applause swells with investor-grade sincerity and light legal concern.',
    toast: 'Toast: absurd win. posture accordingly.'
  }),
  epic: Object.freeze({
    label: 'HIGH CEREMONIAL OBSERVANCE',
    intro: 'The Committee for Unnecessary Synergy is convened beneath banners of compliance and sponsored light. Even Sir Wastrel rises.',
    decree: 'For exemplary service to scale, spectacle, and the profitable rearrangement of responsibility, the Chair commands that this spoon be laid upon thy record.',
    closing: 'A notary nods. A choir of middle managers describes the moment as transformational.',
    toast: 'Toast: elite nonsense. generational spooning.'
  }),
  legendary: Object.freeze({
    label: 'EXTRAORDINARY CANONIZATION',
    intro: 'The Committee for Unnecessary Synergy is convened in extraordinary session. The chandeliers tremble. The bylaws are read aloud as prophecy.',
    decree: 'For achievements so overfunded, over-certified, and spiritually over-leveraged that Quillhaven itself must pretend to approve, the Chair ordains an immortal spooning.',
    closing: 'Applause is mandatory, pre-recorded, and echoed by the city ledger until morale improves.',
    toast: 'Toast: historic behavior. touch grass, then monetize it.'
  })
});

function getSpoonCeremonyTier(spoon) {
  const num = Number(String(spoon?.id || '').split('_')[1] || 0);
  if (num >= 21) return 'legendary';
  if (num >= 16) return 'epic';
  if (num >= 11) return 'rare';
  if (num >= 6) return 'uncommon';
  return 'common';
}

function getSpoonCeremonyCopy(spoon) {
  const rarity = getSpoonCeremonyTier(spoon);
  const variant = SPOON_CEREMONY_COPY_BY_TIER[rarity] || SPOON_CEREMONY_COPY_BY_TIER.common;
  return {
    rarity,
    label: variant.label,
    intro: variant.intro,
    decree: `"${variant.decree}" intones the Chair, regarding ${spoon.name} as though it were binding law.`,
    closing: variant.closing,
    toast: variant.toast
  };
}

function checkSpoonAwards() {
  if (!st.spoonState) return null;
  // Find the first spoon whose conditions are met and which hasn't been awarded yet
  for (const spoon of CEREMONIAL_SPOONS) {
    if (!st.spoonState.awarded.includes(spoon.id) && spoon.check && spoon.check(st)) {
      return spoon;
    }
  }
  return null;
}

function triggerSpoonCeremony(spoon) {
  st.currentSpoon = spoon;
  st.prevScreen = st.screen;
  st.screen = 'spoon_ceremony';
  playSuccess(); // small triumph sound
}
// ── END SPOONS ───────────────────────────────────────────────────────────────

// QUARTERLY_TEMPLATES: starter pool, expanded by Prompt 15 (GP-4).
// Each template: { id, karenLine, metricRoast[], vulnerabilityBeat?, standingMap? }
// standingMap keys MUST be frozen faction keys.
const QUARTERLY_TEMPLATES = [
  {
    id: 'qr_default_01',
    karenLine: "Per my last memo, which I accept you have not read: your performance this quarter was, and I quote the dashboard, 'present.' Let us discuss what that means going forward.",
    metricRoast: ["Stakeholder delight: immeasurable, and not in the good way.", "Velocity: the board has asked me to stop using that word."],
    standingMap: { CommitteeUnnecessarySynergy: 3 }
  },
  {
    id: 'qr_default_02',
    karenLine: "I have reviewed your metrics. I have also reviewed my life choices. Both require further action.",
    metricRoast: ["Your burn rate is, technically, a strategy.", "NPS: the survey was sent. Responses are pending. They have been pending since Q2."],
    standingMap: { PredictiveCompliance: 2 }
  },
  {
    id: 'qr_default_03',
    karenLine: "Congratulations on completing another quarter. The Committee has convened, reviewed the numbers, and agreed to disagree about what the numbers mean.",
    metricRoast: ["Compliance: aspirational.", "Runway: the board prefers not to discuss it at this time."],
    vulnerabilityBeat: "...I used to believe in these dashboards. (pause) I still do. That is the problem.",
    standingMap: { CommitteeUnnecessarySynergy: 2, NativeHollows: 1 }
  },
  {
    id: 'qr_synergy_04',
    karenLine: "Your 'synergy' this quarter was, and I quote my own notes, 'attempted.' The Committee has issued a Certificate of Attempted Synergy. It is not a compliment.",
    metricRoast: ["Output: directionally correct, if you squint.", "Collaboration score: one person said 'sure' in Slack. That counts."],
    standingMap: { CommitteeUnnecessarySynergy: 5, Vastcart: -2 }
  },
  {
    id: 'qr_compliance_05',
    karenLine: "Magistrate Ledger has requested a copy of your roadmap. He has also requested that it contain, and I am quoting directly, 'actual dates.' This is not a standard request. It is a warning.",
    metricRoast: ["Audit risk: elevated, though the audit team describes it as 'interesting.'", "Process adherence: the process was followed in spirit, if not in practice, form, or outcome."],
    standingMap: { PredictiveCompliance: -4, CommitteeUnnecessarySynergy: 2 }
  },
  // ── GP-4: THIRTY-PLUS QUARTERLY REVIEW TEMPLATES ──────────────────────────
  {
    id: 'qr_synergy_12',
    karenLine: "Per my last memo, which you will not have read: your 'synergy' this quarter was, and I quote my own dashboard, 'aspirational.' Let's circle back to your circling back.",
    metricRoast: [ "Stakeholder delight: pending.", "Velocity: spiritually present." ],
    vulnerabilityBeat: "...I used to believe in dashboards. (pause) I still do. That's the problem.",
    standingMap: { CommitteeUnnecessarySynergy: 5 }
  },
  {
    id: 'qr_vastcart_01',
    karenLine: "The Home Office has reviewed your vendor compliance score. They described it as 'courageous.' This is not a term Vastcart uses as a compliment.",
    metricRoast: [ "Margin compression: terrifying.", "Shelf stability: none." ],
    standingMap: { Vastcart: -8, CursorSpectacles: 3 }
  },
  {
    id: 'qr_forgeharvest_01',
    karenLine: "Your throughput this quarter resembled a clogged conveyor belt. The Noble Order of Forgeharvest has asked me to remind you that time is poultry, and poultry is money.",
    metricRoast: [ "Efficiency: anecdotal.", "Volume: artisanal." ],
    standingMap: { Forgeharvest: -6, NativeHollows: 4 }
  },
  {
    id: 'qr_crow_01',
    karenLine: "Lord Buzzwick's analytics indicate your heart rate spikes whenever I mention the burn rate. Let us discuss the burn rate.",
    metricRoast: [ "Data collection: invasive but unprofitable.", "Privacy compliance: accidentally stellar." ],
    vulnerabilityBeat: "...Do the crows watch me while I sleep? I feel like they do.",
    standingMap: { MechanicalCrow: 5, PredictiveCompliance: -2 }
  },
  {
    id: 'qr_coastal_01',
    karenLine: "The Contrarian Baron has praised your performance. Given that he invests exclusively in failures that sound smart, I advise you to panic.",
    metricRoast: [ "Consensus alignment: zero.", "Alpha generation: negative, but boldly so." ],
    standingMap: { CoastalShadow: 8, NativeHollows: -5 }
  },
  {
    id: 'qr_farmable_01',
    karenLine: "Brother Tillage has inquired about your 'soil engagement.' I told him you occasionally hit the ground with a metal stick. He was not satisfied.",
    metricRoast: [ "Fractional yield: entirely theoretical.", "Root depth: shallow." ],
    standingMap: { FarmableFractions: -4, Vastcart: 2 }
  },
  {
    id: 'qr_predictive_01',
    karenLine: "Magistrate Ledger's algorithms have predicted your Q4 failure with 98% certainty. I am required to schedule your exit interview now to save time.",
    metricRoast: [ "Predictability: tragically high.", "Form submission rate: abysmal." ],
    standingMap: { PredictiveCompliance: -10, CommitteeUnnecessarySynergy: -4 }
  },
  {
    id: 'qr_algo_01',
    karenLine: "The Bespoke Apothecary has denied your request for a successful quarter. The denial is final and the appeals process is currently offline.",
    metricRoast: [ "Approval rate: mathematically impossible.", "Diagnostic clarity: opaque." ],
    vulnerabilityBeat: "...I tried to appeal a papercut once. The system suggested I amputate.",
    standingMap: { AlgorithmicApprovals: 6, NativeHollows: -3 }
  },
  {
    id: 'qr_cursor_01',
    karenLine: "The Confraternity has noted your lack of presence in the group chat. If you do not use at least three rocket emojis by Friday, you will be considered 'legacy tech.'",
    metricRoast: [ "Hype velocity: stagnant.", "Thought leadership: silent." ],
    standingMap: { CursorSpectacles: -8, MigratoryFounders: -4 }
  },
  {
    id: 'qr_migratory_01',
    karenLine: "The Devotional has described your strategy as 'too tethered to reality.' They suggest you pivot to something that doesn't actually exist.",
    metricRoast: [ "Tangibility: alarmingly high.", "Stealth coefficient: compromised." ],
    standingMap: { MigratoryFounders: -5, Forgeharvest: 4 }
  },
  {
    id: 'qr_native_01',
    karenLine: "Goodwife Henrietta asked if you are okay. When the local tea room pities a corporate entity, the corporate entity has fundamentally failed.",
    metricRoast: [ "Community impact: pitiable.", "Locally sourced dignity: depleted." ],
    standingMap: { NativeHollows: 8, Vastcart: -10 }
  },
  {
    id: 'qr_synergy_02',
    karenLine: "Sir Wastrel is thrilled. Your inability to generate positive cash flow is, in his words, 'a masterclass in structural poetry.'",
    metricRoast: [ "EBITDA: conceptual.", "Burn rate: spectacular." ],
    standingMap: { CommitteeUnnecessarySynergy: 12, PredictiveCompliance: -8 }
  },
  {
    id: 'qr_vastcart_02',
    karenLine: "The Home Office has noticed you using non-standard font sizes in your reports. This has been escalated to a Vice President.",
    metricRoast: [ "Formatting compliance: chaotic.", "Brand alignment: deeply offensive." ],
    standingMap: { Vastcart: -5, CursorSpectacles: 2 }
  },
  {
    id: 'qr_forgeharvest_02',
    karenLine: "Forgeharvest Provisions has categorized your recent swing as 'Grade D byproduct.' It is barely suitable for the secondary market.",
    metricRoast: [ "Trajectory: poultry-adjacent.", "Impact: soft." ],
    vulnerabilityBeat: "...I haven't eaten a chicken nugget in years. I know too much.",
    standingMap: { Forgeharvest: -4, NativeHollows: 2 }
  },
  {
    id: 'qr_crow_02',
    karenLine: "Lord Buzzwick requests that you smile more during your backswing. The drones find your current facial expressions 'unmarketable.'",
    metricRoast: [ "Aesthetic output: grim.", "Surveillance value: low." ],
    standingMap: { MechanicalCrow: -3, CoastalShadow: 2 }
  },
  {
    id: 'qr_farmable_02',
    karenLine: "Brother Tillage has offered to tokenize your poor performance and sell it as a cautionary asset. It is currently oversubscribed.",
    metricRoast: [ "Failure utility: surprisingly high.", "Growth mindset: barren." ],
    standingMap: { FarmableFractions: 6, PredictiveCompliance: -4 }
  },
  {
    id: 'qr_algo_02',
    karenLine: "The algorithm has determined that your recent bogeys were a pre-existing condition and are not covered by our synergy policy.",
    metricRoast: [ "Coverage: denied.", "Appeal status: laughed at by machines." ],
    standingMap: { AlgorithmicApprovals: 8, NativeHollows: -5 }
  },
  {
    id: 'qr_cursor_02',
    karenLine: "Your latest pitch deck was described by the Confraternity as 'text-heavy.' Please replace all words with gradients immediately.",
    metricRoast: [ "Visual disruption: lacking.", "Vibe check: failed." ],
    standingMap: { CursorSpectacles: -6, CommitteeUnnecessarySynergy: 4 }
  },
  {
    id: 'qr_migratory_02',
    karenLine: "The Devotional is concerned that you actually shipped a feature this quarter. This violates the core tenet of eternal potential.",
    metricRoast: [ "Delivery: unfortunately real.", "Mystique: shattered." ],
    standingMap: { MigratoryFounders: -8, Forgeharvest: 6 }
  },
  {
    id: 'qr_native_02',
    karenLine: "The locals have started a betting pool on when your runway ends. Goodwife Henrietta has the over.",
    metricRoast: [ "Community trust: speculative.", "Financial stability: an open joke." ],
    vulnerabilityBeat: "...I put twenty dollars on the under. Don't tell management.",
    standingMap: { NativeHollows: 10, Vastcart: -6 }
  },
  {
    id: 'qr_synergy_03',
    karenLine: "The Committee for Unnecessary Synergy has noted your recent attempts at efficiency. We consider this a hostile act.",
    metricRoast: [ "Wasted motion: insufficient.", "Bureaucratic bloat: dangerously low." ],
    standingMap: { CommitteeUnnecessarySynergy: -10, PredictiveCompliance: 8 }
  },
  {
    id: 'qr_predictive_02',
    karenLine: "Magistrate Ledger has fined us because your future performance is projected to be slightly below average. The fine is payable in advance.",
    metricRoast: [ "Future outlook: mediocre.", "Compliance trajectory: expensive." ],
    standingMap: { PredictiveCompliance: -6, CommitteeUnnecessarySynergy: -2 }
  },
  {
    id: 'qr_coastal_02',
    karenLine: "The Contrarian Baron suggests that your terrible accuracy is actually a brilliant critique of the concept of 'targets.'",
    metricRoast: [ "Accuracy: delightfully absent.", "Subversive value: noted." ],
    standingMap: { CoastalShadow: 6, Forgeharvest: -5 }
  },
  {
    id: 'qr_vastcart_03',
    karenLine: "Vastcart & Sons expects you to smile while you miss the putt. The consumer must never see the effort, only the seamless failure.",
    metricRoast: [ "Performance theater: lacking.", "Emotional labor: inadequate." ],
    standingMap: { Vastcart: -4, NativeHollows: 3 }
  },
  {
    id: 'qr_crow_03',
    karenLine: "The drones have recorded you muttering to yourself. This data has been sold to a targeted advertising firm specializing in despair.",
    metricRoast: [ "Internal monologue: monetized.", "Sanity metrics: trending downward." ],
    vulnerabilityBeat: "...I whisper to the spreadsheet sometimes. It never answers.",
    standingMap: { MechanicalCrow: 8, NativeHollows: -4 }
  },
  {
    id: 'qr_forgeharvest_03',
    karenLine: "Your recent divot was deemed 'non-compliant biomass' by Forgeharvest. Please refrain from altering the agricultural topology.",
    metricRoast: [ "Biomass disruption: flagged.", "Fairway integration: poor." ],
    standingMap: { Forgeharvest: -5, FarmableFractions: 4 }
  },
  {
    id: 'qr_algo_03',
    karenLine: "The Apothecary's AI has optimized your swing by removing the follow-through. It saves 0.4 seconds, though it looks horrific.",
    metricRoast: [ "Aesthetic grace: terminated.", "Algorithmic efficiency: maximized." ],
    standingMap: { AlgorithmicApprovals: 6, CursorSpectacles: -5 }
  },
  {
    id: 'qr_cursor_03',
    karenLine: "The Confraternity advises you to add 'AI-powered' to your golf bag. It won't change the clubs, but it will improve the optics.",
    metricRoast: [ "Buzzword density: tragically low.", "Hardware narrative: weak." ],
    standingMap: { CursorSpectacles: -5, PredictiveCompliance: 2 }
  },
  {
    id: 'qr_migratory_03',
    karenLine: "The Devotional asks why you are playing golf in a physical location. Have you considered golfing in the metaverse?",
    metricRoast: [ "Physicality: stubborn.", "Digital nomadism: failing." ],
    standingMap: { MigratoryFounders: -4, NativeHollows: 4 }
  },
  {
    id: 'qr_native_03',
    karenLine: "Goodwife Henrietta says your swing looks like someone trying to assemble IKEA furniture in the dark. It was not meant as a compliment.",
    metricRoast: [ "Kinetic coherence: shattered.", "Local respect: none." ],
    standingMap: { NativeHollows: -3, Vastcart: 2 }
  },
  {
    id: 'qr_synergy_04',
    karenLine: "Sir Wastrel is demanding a 40-page report on why your last shot was so remarkably mediocre. He wants it bound in leather.",
    metricRoast: [ "Mediocrity index: elevated.", "Leather budget: approved." ],
    vulnerabilityBeat: "...I spent three hours choosing the leather binding. It was the best part of my week.",
    standingMap: { CommitteeUnnecessarySynergy: 6, PredictiveCompliance: -4 }
  }
];

// Pick a quarterly template not shown in the last review
let _lastQuarterlyId = null;
function pickQuarterlyTemplate() {
  const pool = QUARTERLY_TEMPLATES.filter(t => t.id !== _lastQuarterlyId);
  const t = pool[Math.floor(Math.random() * pool.length)];
  _lastQuarterlyId = t.id;
  return t;
}

const CHARACTER_INTERACTION_MATRIX = Object.freeze({
  brotherIdleworth:    Object.freeze({ sirWastrel:true, greatPioneer:true, youngMasterReginald:false, brotherHustleworth:true, pivotAddict:true, web3RePivoter:false }),
  sirWastrel:          Object.freeze({ brotherIdleworth:true, greatPioneer:true, youngMasterReginald:true, brotherHustleworth:false, pivotAddict:true, web3RePivoter:true }),
  greatPioneer:        Object.freeze({ brotherIdleworth:true, sirWastrel:true, youngMasterReginald:true, brotherHustleworth:true, pivotAddict:false, web3RePivoter:false }),
  youngMasterReginald: Object.freeze({ brotherIdleworth:false, sirWastrel:true, greatPioneer:true, brotherHustleworth:true, pivotAddict:true, web3RePivoter:false }),
  brotherHustleworth:  Object.freeze({ brotherIdleworth:true, sirWastrel:false, greatPioneer:true, youngMasterReginald:true, pivotAddict:true, web3RePivoter:true }),
  pivotAddict:         Object.freeze({ brotherIdleworth:true, sirWastrel:true, greatPioneer:false, youngMasterReginald:true, brotherHustleworth:true, web3RePivoter:true }),
  web3RePivoter:       Object.freeze({ brotherIdleworth:false, sirWastrel:true, greatPioneer:false, youngMasterReginald:false, brotherHustleworth:true, pivotAddict:true })
});

const CHARACTER_CONVERSATIONS_BY_PAIR = Object.freeze({
  'brotherIdleworth__sirWastrel': {
    id: 'conv_wastrel_idleworth',
    archetypes: ['brotherIdleworth', 'sirWastrel'],
    lines: [
      { who: 'Brother Idleworth', line: "I am in stealth mode." },
      { who: 'Sir Wastrel', line: "And I in tax mode. Between us, a business almost occurs." },
      { who: 'Brother Idleworth', line: "That is uncomfortably accurate, Sir." }
    ]
  },
  'brotherIdleworth__greatPioneer': {
    id: 'conv_idleworth_pioneer',
    archetypes: ['brotherIdleworth', 'greatPioneer'],
    lines: [
      { who: 'The Pioneer', line: "Young man, thy company lacks grit, revenue, and a family office." },
      { who: 'Brother Idleworth', line: "We have a values deck and two candles. The office is implied." },
      { who: 'The Pioneer', line: "Excellent. Poverty cosplay with premium trim." }
    ]
  },
  'brotherIdleworth__brotherHustleworth': {
    id: 'conv_idleworth_hustleworth',
    archetypes: ['brotherIdleworth', 'brotherHustleworth'],
    lines: [
      { who: 'Brother Hustleworth', line: "I wake at four to monetize dawn itself." },
      { who: 'Brother Idleworth', line: "I wake at ten to protect the stealth from sunlight." },
      { who: 'Brother Hustleworth', line: "Two broken men. Two premium newsletters." }
    ]
  },
  'brotherIdleworth__pivotAddict': {
    id: 'conv_idleworth_pivot',
    archetypes: ['brotherIdleworth', 'pivotAddict'],
    lines: [
      { who: 'The Pivot Addict', line: "We pivoted before launch. Safer that way." },
      { who: 'Brother Idleworth', line: "We never launched at all. Safer still." },
      { who: 'The Pivot Addict', line: "At last: a founder who respects pure potential." }
    ]
  },
  'sirWastrel__greatPioneer': {
    id: 'conv_wastrel_pioneer',
    archetypes: ['sirWastrel', 'greatPioneer'],
    lines: [
      { who: 'The Pioneer', line: "A positive balance sheet builds character, Sir." },
      { who: 'Sir Wastrel', line: "A negative one builds legend." },
      { who: 'The Pioneer', line: "We are both allergic to humility, only in different tax brackets." }
    ]
  },
  'sirWastrel__youngMasterReginald': {
    id: 'conv_wastrel_reginald',
    archetypes: ['sirWastrel', 'youngMasterReginald'],
    lines: [
      { who: 'Young Master Reginald', line: "Uncle says our losses should feel intentional." },
      { who: 'Sir Wastrel', line: "Then thy uncle and I share a liturgy." },
      { who: 'Young Master Reginald', line: "Wonderful. I knew the pastries were strategic." }
    ]
  },
  'sirWastrel__pivotAddict': {
    id: 'conv_pivot_wastrel',
    archetypes: ['sirWastrel', 'pivotAddict'],
    lines: [
      { who: 'The Pivot Addict', line: "We have pivoted to a subscription-based loss-leader model." },
      { who: 'Sir Wastrel', line: "Finally: strategy shaped like an invoice and a cry for help." },
      { who: 'The Pivot Addict', line: "The board called it visionary. The staff called a lawyer." }
    ]
  },
  'sirWastrel__web3RePivoter': {
    id: 'conv_wastrel_web3',
    archetypes: ['sirWastrel', 'web3RePivoter'],
    lines: [
      { who: 'The Web3 Re-Pivoter', line: "We tokenized the debt and community-owned the downside." },
      { who: 'Sir Wastrel', line: "Ghastly ethics. Superb structure." },
      { who: 'The Web3 Re-Pivoter', line: "Thank you. We call it decentralized blame." }
    ]
  },
  'greatPioneer__youngMasterReginald': {
    id: 'conv_pioneer_reginald',
    archetypes: ['greatPioneer', 'youngMasterReginald'],
    lines: [
      { who: 'The Pioneer', line: "When I was thy age, I had already inherited a full sense of destiny." },
      { who: 'Young Master Reginald', line: "I have inherited a title and mild confusion. Is that adjacent?" },
      { who: 'The Pioneer', line: "Near enough for management." }
    ]
  },
  'greatPioneer__brotherHustleworth': {
    id: 'conv_pioneer_hustleworth',
    archetypes: ['greatPioneer', 'brotherHustleworth'],
    lines: [
      { who: 'Brother Hustleworth', line: "I built my empire one rent hike at a time." },
      { who: 'The Pioneer', line: "Charming. I outsourced mine in bulk." },
      { who: 'Brother Hustleworth', line: "So we agree: suffering is for downstream users." }
    ]
  },
  'youngMasterReginald__brotherHustleworth': {
    id: 'conv_reginald_hustleworth',
    archetypes: ['youngMasterReginald', 'brotherHustleworth'],
    lines: [
      { who: 'Brother Hustleworth', line: "My morning routine has fourteen steps and no mercy." },
      { who: 'Young Master Reginald', line: "Mine has matcha and a scheduled panic. We all optimize." },
      { who: 'Brother Hustleworth', line: "Nepotism with calendar discipline. Respect." }
    ]
  },
  'youngMasterReginald__pivotAddict': {
    id: 'conv_reginald_pivot',
    archetypes: ['youngMasterReginald', 'pivotAddict'],
    lines: [
      { who: 'Young Master Reginald', line: "Could we pivot to vibes? I already manage those." },
      { who: 'The Pivot Addict', line: "At last, a moat with no product burden." },
      { who: 'Young Master Reginald', line: "Splendid. I'll schedule a launch party for the concept of launch." }
    ]
  },
  'brotherHustleworth__pivotAddict': {
    id: 'conv_hustleworth_pivot',
    archetypes: ['brotherHustleworth', 'pivotAddict'],
    lines: [
      { who: 'Brother Hustleworth', line: "Consistency compounds wealth." },
      { who: 'The Pivot Addict', line: "Inconsistency compounds intrigue." },
      { who: 'Brother Hustleworth', line: "Between us sits a podcast nobody should hear." }
    ]
  },
  'brotherHustleworth__web3RePivoter': {
    id: 'conv_hustleworth_web3',
    archetypes: ['brotherHustleworth', 'web3RePivoter'],
    lines: [
      { who: 'Brother Hustleworth', line: "I sell courses, leverage, and spiritual dehydration." },
      { who: 'The Web3 Re-Pivoter', line: "I sell tokens, agents, and ornate insolvency." },
      { who: 'Brother Hustleworth', line: "Brother, we are different fonts on the same scam-adjacent banner." }
    ]
  },
  'pivotAddict__web3RePivoter': {
    id: 'conv_pivot_web3',
    archetypes: ['pivotAddict', 'web3RePivoter'],
    lines: [
      { who: 'The Pivot Addict', line: "We pivoted to AI because the drones stopped clapping for crypto." },
      { who: 'The Web3 Re-Pivoter', line: "We kept the crypto and renamed it infrastructure." },
      { who: 'The Pivot Addict', line: "Magnificent. Fraud, but with roadmapping." }
    ]
  }
});

const CHARACTER_CONVERSATIONS = Object.freeze(Object.values(CHARACTER_CONVERSATIONS_BY_PAIR));

function pickQuarterlyVoiceCalibrationLine() {
  // 15% chance of a character interaction (GP-1: Cross-Character Dialogue)
  if (Math.random() < 0.15) {
    const conv = CHARACTER_CONVERSATIONS[Math.floor(Math.random() * CHARACTER_CONVERSATIONS.length)];
    return conv.lines; // quarterly review draw expects either a string or an array of lines
  }

  const weightedPools = [
    { character: 'brotherIdleworth', situation: 'smalltalk' },
    { character: 'sirWastrel', situation: 'pitching' },
    { character: 'greatPioneer', situation: 'whenChallenged' },
    { character: 'youngMasterReginald', situation: 'smalltalk' },
    { character: 'brotherHustleworth', situation: 'vulnerability' },
    { character: 'pivotAddict', situation: 'reactionToPlayerSuccess' },
    { character: 'web3RePivoter', situation: 'smalltalk' }
  ];
  const picked = weightedPools[(st.quarter + st.totalHolesCleared) % weightedPools.length];
  return pickGatedDialogue(picked.character, picked.situation);
}

function triggerQuarterlyReview() {
  // Pick and cache the template for this review session
  const t = pickQuarterlyTemplate();
  st.currentReviewTemplate = t;
  st.currentReviewVoiceLine = pickQuarterlyVoiceCalibrationLine();

  // Apply standing changes from the template's standingMap immediately
  // so they persist even if the overlay is dismissed via reload.
  if (t && t.standingMap) {
    for (const [faction, delta] of Object.entries(t.standingMap)) {
      adjustStanding(faction, delta);
    }
  }

  // Apply a small reputation nudge based on current standing
  const grade = st.reputation > 80 ? 'exceptional' : st.reputation > 50 ? 'acceptable' : 'concerning';
  if (grade === 'exceptional')  adjustStanding('Vastcart', 3);
  if (grade === 'concerning')   adjustStanding('NativeHollows', 4); // locals notice when the corp struggles

  st.prevScreen = st.screen;
  st.screen = 'review';
  playClick();
}

// CS-2: onQuarterlyResolved — single named exit point.
function onQuarterlyResolved() {
  st.currentReviewTemplate = null;
  st.currentReviewVoiceLine = null;
  st.currentReviewDebtLine = null;
  st.screen = 'playing';

  // Same double-reset guard as onPitchResolved
  if (st.swingPhase === 'ready' && !st.ballFlying) {
    // ball already reset — do nothing
  } else {
    resetBall();
  }

  checkPivotCrisis();
  playClick();
  saveRun();
}

// ============================================================
// PIVOT TABLE DATA
// ============================================================
// CS-3: PIVOT_OPTIONS — starter 4, expanded to 12 by Prompt 18 (GP-10).
// Each entry: { id, name, desc, effect(s), factionSwap? }
// effect applies stat changes; factionSwap (GP-10) applies standing changes.
// The effect functions here also call adjustStanding directly using frozen keys.
const PIVOT_OPTIONS = [
  {
    id: 'lean',
    name: 'The Lean Startup',
    desc: 'Cut burn, cut hype, cut everything. The numbers will thank you. The team will not.',
    effect: s => {
      s.burnRate = Math.max(120, s.burnRate - 100);
      s.hype = clamp(s.hype - 20, 0, 100);
      s.compliance = clamp(s.compliance + 10, 0, 100);
      adjustStanding('NativeHollows', 8);      // locals respect the restraint
      adjustStanding('CursorSpectacles', -6);  // hype crowd moves on
    }
  },
  {
    id: 'blitz',
    name: 'Blitzscaling',
    desc: 'Burn the house down for growth. Move fast, break things, invoice later.',
    effect: s => {
      s.burnRate += 200;
      s.hype = clamp(s.hype + 40, 0, 100);
      s.auditRisk = clamp(s.auditRisk + 20, 0, 100);
      adjustStanding('CursorSpectacles', 12);
      adjustStanding('NativeHollows', -8);
      adjustStanding('PredictiveCompliance', -5); // compliance notices the chaos
    }
  },
  {
    id: 'ethical',
    name: 'B-Corp Rebrand',
    desc: 'Pretend the soul is for sale. Spoiler: the press release costs more than the soul.',
    effect: s => {
      s.reputation = clamp(s.reputation + 30, 0, 100);
      s.money -= 500;
      s.hype = clamp(s.hype - 10, 0, 100);
      adjustStanding('NativeHollows', 15);
      adjustStanding('Vastcart', -5);           // Vastcart dislikes the optics
      adjustStanding('CommitteeUnnecessarySynergy', 4); // committee loves the copy
    }
  },
  {
    id: 'stealth',
    name: 'Permanent Stealth',
    desc: 'Silence is investable. Nobody can criticise what nobody can see.',
    effect: s => {
      s.hype = clamp(s.hype + 20, 0, 100);
      s.compliance = clamp(s.compliance - 20, 0, 100);
      s.auditRisk = clamp(s.auditRisk + 10, 0, 100);
      adjustStanding('MigratoryFounders', 10);
      adjustStanding('PredictiveCompliance', -8); // ministry hates the opacity
      adjustStanding('CoastalShadow', 5);          // contrarian baron approves
    }
  },
  {
    id: 'ai_wrapper',
    name: 'AI Wrapper',
    desc: 'Slap a UI on an LLM and call it synthetic consciousness. Fast, cheap, and entirely derivative.',
    effect: s => {
      s.hype = clamp(s.hype + 30, 0, 100);
      s.auditRisk = clamp(s.auditRisk + 15, 0, 100);
      adjustStanding('CursorSpectacles', 15);
      adjustStanding('PredictiveCompliance', -10);
    }
  },
  {
    id: 'crypto_revival',
    name: 'Web3 Re-Pivoter',
    desc: 'Return to the blockchain. The tokens are sad but the investors are still trapped in the discord.',
    effect: s => {
      s.money += 800;
      s.reputation = clamp(s.reputation - 20, 0, 100);
      s.burnRate += 50;
      adjustStanding('MigratoryFounders', 12);
      adjustStanding('NativeHollows', -15);
    }
  },
  {
    id: 'defense_tech',
    name: 'Dual-Use Defense Tech',
    desc: 'The drones are now "tactical spatial assets". The margins are patriotic.',
    effect: s => {
      s.burnRate += 100;
      s.compliance = clamp(s.compliance + 20, 0, 100);
      adjustStanding('MechanicalCrow', 15);
      adjustStanding('CoastalShadow', 10);
      adjustStanding('NativeHollows', -20);
    }
  },
  {
    id: 'fractional',
    name: 'Fractional Dirt',
    desc: 'Slice the unsliceable. Sell shards of a concept. Dirt is now a micro-asset.',
    effect: s => {
      s.equity = Math.max(0, s.equity - 5);
      s.money += 600;
      s.auditRisk = clamp(s.auditRisk + 10, 0, 100);
      adjustStanding('FarmableFractions', 18);
      adjustStanding('PredictiveCompliance', -5);
    }
  },
  {
    id: 'b2b_saas',
    name: 'Enterprise SaaS',
    desc: 'Boring, but it pays. The sales cycle will outlive you, but Vastcart might buy it.',
    effect: s => {
      s.hype = clamp(s.hype - 30, 0, 100);
      s.reputation = clamp(s.reputation + 15, 0, 100);
      s.burnRate = Math.max(50, s.burnRate - 20);
      adjustStanding('Vastcart', 15);
      adjustStanding('CursorSpectacles', -15);
    }
  },
  {
    id: 'wellness',
    name: 'Bespoke Wellness',
    desc: 'Pivot to optimization. The app now legally judges the user\'s sleep and assigns a moral score.',
    effect: s => {
      s.compliance = clamp(s.compliance - 10, 0, 100);
      s.hype = clamp(s.hype + 15, 0, 100);
      adjustStanding('AlgorithmicApprovals', 15);
      adjustStanding('NativeHollows', -10);
    }
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle Cult',
    desc: 'Sell the vibe. The product is just merchandise for the newsletter.',
    effect: s => {
      s.reputation = clamp(s.reputation - 10, 0, 100);
      s.money += 400;
      s.hype = clamp(s.hype + 10, 0, 100);
      adjustStanding('MigratoryFounders', 15);
      adjustStanding('CommitteeUnnecessarySynergy', 8);
    }
  },
  {
    id: 'supply_chain',
    name: 'Logistics Pivot',
    desc: 'Stop pretending it\'s software. You just move boxes around. Lean into the meat-and-metal.',
    effect: s => {
      s.burnRate -= 50;
      s.auditRisk = clamp(s.auditRisk - 10, 0, 100);
      s.reputation = clamp(s.reputation + 10, 0, 100);
      adjustStanding('Forgeharvest', 20);
      adjustStanding('CoastalShadow', -10);
    }
  }
];

// CS-3: triggerPivotTable — records the source ('hotkey' or 'crisis') so
// drawPivot can show the correct context banner
function triggerPivotTable(source = 'hotkey') {
  st.pivotSource = source; // 'hotkey' | 'crisis'
  st.prevScreen = st.screen;
  st.screen = 'pivot';
  playClick();
}

// CS-3: canOpenOverlay — single gate for all overlay triggers.
// Blocks overlays during other overlays, minigames, pause, and game-over.
function canOpenOverlay() {
  // CS-6: also block when ledger overlay is open (it's not a screen change)
  if (st.ledgerOverlayOpen) return false;
  return !['pitch', 'review', 'pivot', 'bureaucracy', 'spoon_ceremony', 'pregate', 'chaos', 'paused', 'gameover'].includes(st.screen);
}

// CS-3: checkPivotCrisis — fires the pivot table once per crisis.
// A crisis is: any faction at or below COLLAPSE_THRESHOLD, OR 2+ consecutive losses.
// The latch prevents re-opening mid-crisis; it resets only when ALL collapsed
// factions recover above the threshold AND consecutive losses drop below 2.
function checkPivotCrisis() {
  if (st.pivotCrisisLatched) {
    // Unlatch only when the situation genuinely resolves
    const allRecovered = Object.values(st.ledger).every(v => v > COLLAPSE_THRESHOLD);
    if (allRecovered && st.consecutiveLosses < 2) {
      st.pivotCrisisLatched = false;
    }
    return; // still latched — do not re-open
  }

  const collapsedFaction = Object.entries(st.ledger).find(([, v]) => v <= COLLAPSE_THRESHOLD);
  const lossStreak = st.consecutiveLosses >= 2;

  if ((collapsedFaction || lossStreak) && canOpenOverlay()) {
    st.pivotCrisisLatched = true;

    // Build a specific crisis message
    let crisisMsg = '⚠ CRISIS DETECTED';
    if (collapsedFaction) {
      const fname = FACTIONS[collapsedFaction[0]]?.short || collapsedFaction[0];
      crisisMsg = `⚠ BLOOD FEUD: ${fname.toUpperCase()}`;
    } else if (lossStreak) {
      crisisMsg = '⚠ LOSING STREAK — PIVOT!';
    }

    addPopup(crisisMsg, W / 2, H / 2 - 60, COL.red, 13, 4.0);
    addPopup('The Pivot Table demands thy attention.', W / 2, H / 2 - 36, COL.ora, 7, 4.0);
    triggerPivotTable('crisis');
  }
}

// CS-3: onPivotResolved — single named exit point for the pivot overlay.
// id: the chosen PIVOT_OPTIONS id, or null for cancel / hotkey-close.
// CS-5 can hook additional standing logic here.
function onPivotResolved(id) {
  if (id) {
    const opt = PIVOT_OPTIONS.find(o => o.id === id);
    if (opt) {
      opt.effect(st);
      // Record pivot history for CS-8 save state
      if (!st.pivotHistory) st.pivotHistory = [];
      st.pivotHistory.push({ id: opt.id, hole: st.totalHolesCleared, source: st.pivotSource });
      st.pivotHistory = st.pivotHistory.slice(-20); // cap history length

      addPopup(`🔄 ${opt.name.toUpperCase()}`, W / 2, H / 2 - 30, COL.gold, 13, 3.5);
      logStory(`[Pivot] ${opt.name}: ${opt.desc}`);
      playSuccess();
    }
  } else {
    // Cancelled — if crisis-triggered, log but don't force another immediate open
    if (st.pivotSource === 'crisis') {
      logStory('[Pivot] Crisis deferred. Quillhaven notes this with interest.');
    }
    playClick();
  }

  st.pivotSource = null;
  st.screen = 'playing';

  // After a chosen pivot, re-check crisis (the pivot may have resolved it)
  if (id) checkPivotCrisis();

  saveRun();
}

// ============================================================
// PHASE 4 — THE LEDGER OF QUILLHAVEN & CANON
// CS-4 KEYSTONE — faction keys FROZEN from this point forward.
// Every downstream prompt (GP, GPT, CS-5 onward) must use these
// exact 11 strings. Do not rename them.
//
// FROZEN KEY LIST:
//   Vastcart | Forgeharvest | MechanicalCrow | CoastalShadow
//   FarmableFractions | PredictiveCompliance | AlgorithmicApprovals
//   CursorSpectacles | MigratoryFounders | NativeHollows
//   CommitteeUnnecessarySynergy
// ============================================================

// Standing bands: -100..100 mapped to named tiers
const STANDING_BANDS = [
  { min: -100, max: -60, name: 'Blood Feud'  },
  { min:  -59, max: -25, name: 'Frosty'      },
  { min:  -24, max:  24, name: 'Neutral'     },
  { min:   25, max:  59, name: 'Warm'        },
  { min:   60, max: 100, name: 'Patron'      }
];

// The threshold below which a faction collapse triggers the pivot crisis
const COLLAPSE_THRESHOLD = -60;

// Canonical faction display data keyed by the 11 frozen keys
const FACTIONS = {
  Vastcart: {
    name: "The Most Serene Company of Vastcart & Sons",
    short: "Vastcart",
    color: "#1a4d8f",
    description: "The retail empire. Scale at all costs.",
    likes: "consistency, volume, compliance",
    dislikes: "artisanal thinking, transparency"
  },
  Forgeharvest: {
    name: "The Noble Order of Forgeharvest Provisions",
    short: "Forgeharvest",
    color: "#8f3a1a",
    description: "The food-processing empire.",
    likes: "throughput, efficiency",
    dislikes: "transparency, slow players"
  },
  MechanicalCrow: {
    name: "Lord Buzzwick's Mechanical Crow Syndicate",
    short: "Mechanical Crow",
    color: "#2a2a3a",
    description: "Drone-tech surveillance.",
    likes: "compliance, surveillance",
    dislikes: "ethics, civil liberties"
  },
  CoastalShadow: {
    name: "Coastal Shadow Holdings",
    short: "Coastal Shadow",
    color: "#1a1a2e",
    description: "His Eminence the Contrarian Baron's vehicle.",
    likes: "contrarianism, secrecy",
    dislikes: "consensus, transparency"
  },
  FarmableFractions: {
    name: "The Solemn Order of Farmable Fractions",
    short: "Farmable Fractions",
    color: "#5a8f3a",
    description: "Brother Tillage's farmland-tokenization concern.",
    likes: "agricultural metaphors, dirt",
    dislikes: "urban thinking, audits"
  },
  PredictiveCompliance: {
    name: "The Ordinanced Ministry of Predictive Compliance",
    short: "Predictive Compliance",
    color: "#4a4a5a",
    description: "Magistrate Ledger's govtech-AI concern.",
    likes: "process, prediction",
    dislikes: "exceptions, journalism"
  },
  AlgorithmicApprovals: {
    name: "The Bespoke Apothecary of Algorithmic Approvals",
    short: "Algorithmic Approvals",
    color: "#8f8f3a",
    description: "The AI-prior-auth medtech.",
    likes: "high denial rates, ambiguity",
    dislikes: "patient advocacy, doctors"
  },
  CursorSpectacles: {
    name: "The Lone Hooded Figure with a Single Pair of Cursor Spectacles",
    short: "Cursor Spectacles",
    color: "#5d3a8f",
    description: "The hype-startup accelerator and its LARPers.",
    likes: "hype, energy, networking",
    dislikes: "skepticism, day jobs"
  },
  MigratoryFounders: {
    name: "The Migratory Founders' Confraternity",
    short: "Migratory Founders",
    color: "#8f5d3a",
    description: "Transplant founders. Infinite runway. No office.",
    likes: "vagueness, infinite runway",
    dislikes: "deadlines, delivery, specifics"
  },
  NativeHollows: {
    name: "Goodwife Henrietta's Coalition of the Native Hollows",
    short: "Native Hollows",
    color: "#3a8f5d",
    description: "The local skeptics and small business owners.",
    likes: "honesty, durability, kindness",
    dislikes: "performative founders, transplants"
  },
  CommitteeUnnecessarySynergy: {
    name: "The Committee for Unnecessary Synergy",
    short: "Committee",
    color: "#3a8f8f",
    description: "Sir Wastrel's tax-shelter and loss-harvesting network. Also runs the spoon programme.",
    likes: "elaborate losses, K-1s, spoon ceremonies",
    dislikes: "actual revenue, IRS attention, brevity"
  }
};

// Asymmetric conflict matrix — depth-1 ripple only (noRipple guard in adjustStanding).
// Helping ROW shifts COLUMN by factor × delta.
const FACTION_CONFLICTS = {
  Vastcart:               { Forgeharvest: 0.4, NativeHollows: -0.6, CursorSpectacles: 0.2, MigratoryFounders: -0.3 },
  Forgeharvest:           { Vastcart: 0.4, NativeHollows: -0.5, AlgorithmicApprovals: 0.3, FarmableFractions: -0.3 },
  MechanicalCrow:         { NativeHollows: -0.8, PredictiveCompliance: 0.6, CoastalShadow: 0.4, CursorSpectacles: 0.2 },
  CoastalShadow:          { CursorSpectacles: -0.5, PredictiveCompliance: 0.3, MigratoryFounders: 0.3 },
  FarmableFractions:      { NativeHollows: 0.3, Forgeharvest: -0.3, AlgorithmicApprovals: -0.2 },
  PredictiveCompliance:   { MechanicalCrow: 0.6, CoastalShadow: 0.3, NativeHollows: -0.6, AlgorithmicApprovals: 0.3 },
  AlgorithmicApprovals:   { Forgeharvest: 0.3, PredictiveCompliance: 0.3, NativeHollows: -0.5, FarmableFractions: -0.2 },
  CursorSpectacles:       { CoastalShadow: -0.4, MigratoryFounders: 0.5, NativeHollows: -0.5 },
  MigratoryFounders:      { CursorSpectacles: 0.5, NativeHollows: -0.6, CommitteeUnnecessarySynergy: 0.3 },
  NativeHollows:          { Vastcart: -0.4, Forgeharvest: -0.3, CursorSpectacles: -0.5, MigratoryFounders: -0.6, MechanicalCrow: -0.7, PredictiveCompliance: -0.4, AlgorithmicApprovals: -0.4, CoastalShadow: -0.3 },
  CommitteeUnnecessarySynergy: { MigratoryFounders: 0.4, PredictiveCompliance: 0.2, NativeHollows: -0.2 }
};

const DIALOGUE_POOLS = {
  brotherIdleworth: {
    intro: [
      "Brother Idleworth whispers: \"One does not speak of the stealth... the stealth speaks through silence... and my parents' guest house.\"",
      "Brother Idleworth: \"I am pre-launch. The launch is... spiritually imminent.\"",
      "Brother Idleworth: \"My co-founder and I haven't spoken in four months. This is the discipline. Also he blocked me.\"",
      "Brother Idleworth: \"Our product is still in stealth, though the landlord hath seen most of it through the window.\"",
      "Brother Idleworth: \"I founded this company to escape meetings. We now only make meetings.\"",
      "Brother Idleworth: \"The deck is complete. The product remains in a more conceptual condition.\""
    ],
    smalltalk: [
      "Brother Idleworth: \"I cannot say what we are building. I can only say it will be huge. And probably not real.\"",
      "Brother Idleworth: \"My parents are extraordinarily supportive. They ask every Sunday when I'm moving out. I call it love.\"",
      "Brother Idleworth: \"We are pre-revenue, pre-product, and, if counsel is correct, slightly pre-permitted.\"",
      "Brother Idleworth: \"I have replaced deadlines with moon phases. The team hates this.\"",
      "Brother Idleworth: \"The fewer specifics I provide, the more spiritual the company becomes.\"",
      "Brother Idleworth: \"Our cap table is tidy. Our purpose is less so.\"",
      "Brother Idleworth: \"We took venture debt because equity felt emotionally invasive. Debt, at least, is honest about wanting blood.\"",
      "Brother Idleworth: \"I told the lender we were still in stealth. He said stealth accrues interest.\"",
      "Brother Idleworth: \"The runway report says eighteen months. The bank says two quarters. I find spreadsheets so judgmental.\"",
      "Brother Idleworth: \"We are pre-profit, pre-liquidity, and now, apparently, post-negotiation.\""
    ],
    vulnerability: [
      "Brother Idleworth, quietly: \"...sometimes I miss having a performance review.\"",
      "Brother Idleworth, after three ales: \"I left a six-figure job for this. My dad still thinks I'm 'figuring things out.'\"",
      "Brother Idleworth, staring into the fog: \"...I tell everyone we're in stealth. Truthfully, I do not know how to emerge from it.\"",
      "Brother Idleworth: \"...If this fails, I shall have to become a person with a résumé. I dread that more than death.\""
    ]
  },
  sirWastrel: {
    intro: [
      "Sir Wastrel: \"I own nine concerns. All of them lose money. Beautifully. Artistically.\"",
      "Sir Wastrel: \"My alpacas have sold exactly two units in seven years. The losses are generational.\"",
      "Sir Wastrel: \"Revenue is vulgar. A refined enterprise aspires to deduction.\"",
      "Sir Wastrel: \"I commissioned a sculpture of my last write-off. It lacked ambition.\""
    ],
    pitching: [
      "Sir Wastrel: \"I'm raising capital for my film concern. The film will lose money. This is the business plan. It's working.\"",
      "Sir Wastrel: \"I seek patrons for a startup whose sole output is elegant disappointment.\"",
      "Sir Wastrel: \"This venture monetizes absence. The numbers are dreadful. You can see why I adore it.\"",
      "Sir Wastrel: \"Our debt is short-term, our delusion is long-term, and our governance is decorative. We are oversubscribed.\"",
      "Sir Wastrel: \"I have secured a bridge note against a company that remains, in every meaningful sense, a rumor.\"",
      "Sir Wastrel: \"The lender described our cap table as 'lively.' I choose to hear that as praise.\"",
      "Sir Wastrel: \"Quarterly interest is merely rent paid to the future for arriving too soon.\""
    ],
    vulnerability: [
      "Sir Wastrel, quietly: \"My father said the alpacas were his proudest achievement. I still don't know if he meant the alpacas or the tax write-off.\"",
      "Sir Wastrel: \"...There are moments when I suspect I have confused taste with grief.\"",
      "Sir Wastrel, swirling something expensive: \"...If one loses magnificently for long enough, one begins to fear a modest success.\""
    ]
  },
  // GP-1 additions
  greatPioneer: {
    intro: [
      "The Pioneer: \"I built all this with my own two hands. Well, these hands, and a modest eight-figure inheritance I never mention.\"",
      "The Pioneer: \"Nobody handed me anything. Except the company. And the house. And the introductions. Anyway: grit.\"",
      "The Pioneer: \"I am a self-made titan of the fairway. My caddy is an independent contractor.\"",
      "The Pioneer: \"They say privilege helps. I say grit. Grit and an airtight trust fund.\""
    ],
    smalltalk: [
      "The Pioneer: \"Back in my day we didn't HAVE bootstraps, so we had the family cobbler forge us some.\"",
      "The Pioneer: \"I summered in hardship. Character-building. The yacht had only one deck.\"",
      "The Pioneer: \"You must embrace the grind. Have you tried simply buying more capital?\"",
      "The Pioneer: \"My father warned me about people who need paychecks. Unfocused.\"",
      "The Pioneer: \"The secret to discipline is simple: outsource discomfort and call it character.\"",
      "The Pioneer: \"I rise at four each morning to review the labor of people with fewer options.\"",
      "The Pioneer: \"Nothing sharpens grit like being gently insulated from consequence.\""
    ],
    whenChallenged: [
      "The Pioneer: \"Are you implying I had ADVANTAGES? Sir, I had a VISION, and a trust that merely de-risked the vision.\"",
      "The Pioneer: \"I pulled myself up by bootstraps my father's bootmaker installed. Self-made, fundamentally.\"",
      "The Pioneer: \"Do not speak to me of privilege! I had to wait three entire days for my Series A to clear.\"",
      "The Pioneer: \"I earned this. Every inherited penny of it.\"",
      "The Pioneer: \"Debt is a discipline tool. One simply points it at the future and calls oneself hungry.\"",
      "The Pioneer: \"A bridge loan builds character, provided one is not the bridge.\"",
      "The Pioneer: \"If your note matures before your product, that is merely the market asking sharper questions.\"",
      "The Pioneer: \"Liquidity pressure is excellent for morale. The staff become positively aerodynamic.\""
    ],
    vulnerability: [
      "The Pioneer, quietly: \"...Sometimes I look at my own hands and wonder what a shovel actually feels like. (pause) Bah! A shovel is just a low-margin lever.\"",
      "The Pioneer, quietly: \"...I have never actually failed. It is quietly terrifying. What if I am just a passenger?\"",
      "The Pioneer, quietly: \"...My therapist suggested my 'grit' is just generational wealth wearing a half-zip fleece.\"",
      "The Pioneer, quietly: \"...If the trust fund freezes, who am I? A man with mere opinions!\""
    ],
    reactionToPlayerSuccess: [
      "The Pioneer: \"You succeeded through merit? How gauche. In my day we succeeded through merit AND a board seat we were born holding.\"",
      "The Pioneer: \"Hah! A lucky swing. Let us see how you handle a market downturn and a frozen trust account.\"",
      "The Pioneer: \"Impressive. I shall buy the company that makes your golf clubs and raise the prices.\"",
      "The Pioneer: \"Good form. I am claiming credit for mentoring you.\""
    ],
    exitLines: [
      "The Pioneer: \"I must away. The self-made-man documentary crew needs my approval on the bootstrap re-enactment.\"",
      "The Pioneer: \"The self-made titan documentary crew awaits my heroic silhouette.\"",
      "The Pioneer: \"I go now to advise the poor on the virtues of waking up at 4 AM.\"",
      "The Pioneer: \"Pardon me, I must go complain about estate taxes.\""
    ]
  },
  youngMasterReginald: {
    intro: [
      "Young Master Reginald: \"Greetings! Uncle put me in charge of synergy, alignment, and ordering the matcha!\"",
      "Young Master Reginald: \"I am the Chief Vibes Officer! It is a very real title with a very real salary!\"",
      "Young Master Reginald: \"Uncle says I am 'developmental.' I think that means I am growing!\"",
      "Young Master Reginald: \"Hello! I am here to disrupt the paradigm, whatever that means!\""
    ],
    smalltalk: [
      "Young Master Reginald: \"I asked the developers if they could just code faster. They wept. I assume from gratitude!\"",
      "Young Master Reginald: \"We are pivoting to a four-day weekend! Uncle does not know yet!\"",
      "Young Master Reginald: \"My greatest synergy this week was combining the beanbags with the espresso machine.\"",
      "Young Master Reginald: \"I read a book on leadership. Well, the summary. Well, a TikTok about the summary.\"",
      "Young Master Reginald: \"The lender brought pastries to the board meeting. Is that what due diligence means?\"",
      "Young Master Reginald: \"Uncle says bridge financing is normal. Why then did Karen sigh like a church organ?\"",
      "Young Master Reginald: \"I offered to repay the note with merch. Legal made a face I had not seen before.\"",
      "Young Master Reginald: \"Our cash position is 'complex,' which I gather is executive for 'please stop ordering cushions.'\""
    ],
    whenChallenged: [
      "Young Master Reginald: \"My title is entirely earned. I took a weekend course in Vibrational Leadership.\"",
      "Young Master Reginald: \"Uncle says if I break anything else, he will send me to business school!\"",
      "Young Master Reginald: \"You doubt my value? I organized the mandatory fun Friday. Everyone smiled. Mandatorily.\"",
      "Young Master Reginald: \"I will have you know I successfully forwarded an email today!\"",
      "Young Master Reginald: \"I bring strategic warmth to the room. Also pastries. Mostly pastries.\"",
      "Young Master Reginald: \"A title is merely a promise management made to itself.\"",
      "Young Master Reginald: \"If morale mattered not, why then hath Uncle funded the kombucha budget?\""
    ],
    vulnerability: [
      "Young Master Reginald, dropping the smile: \"...Does Uncle actually want me here? Or am I just a tax write-off disguised as a nephew? (pause) Anyway, who wants kombucha!\"",
      "Young Master Reginald, looking lost: \"...The engineers stop talking when I walk into the room. I don't think it's out of respect.\"",
      "Young Master Reginald, whispering: \"...I tried to do real work yesterday. I just broke the staging environment.\"",
      "Young Master Reginald, sighing: \"...Sometimes I think my only real skill is choosing the catering.\""
    ],
    reactionToPlayerSuccess: [
      "Young Master Reginald: \"Incredible metric velocity! I don't know what that means but I am clapping!\"",
      "Young Master Reginald: \"You hit the ball into the designated hole! Maximum synergy!\"",
      "Young Master Reginald: \"Uncle will be so pleased! I am putting this in my weekly updates!\"",
      "Young Master Reginald: \"A triumph of vibes over physics!\""
    ],
    exitLines: [
      "Young Master Reginald: \"I must dash! The beanbags in the ideation pod require fluffing.\"",
      "Young Master Reginald: \"I go to schedule a meeting about the previous meeting!\"",
      "Young Master Reginald: \"Farewell! I must go practice my active listening face.\"",
      "Young Master Reginald: \"The matcha delivery has arrived. Crisis averted!\""
    ]
  },
  brotherHustleworth: {
    intro: [
      "Brother Hustleworth: \"Rise before the sun! Monetize the dawn! Rent out your mattress while you work standing up!\"",
      "Brother Hustleworth: \"You are playing golf while I am trading futures on the fairway grass.\"",
      "Brother Hustleworth: \"I am a founder. I am an investor. I am a lifestyle brand. I am exhausted.\"",
      "Brother Hustleworth: \"Welcome to the grindset. Entrance fee is $997 for my masterclass.\""
    ],
    smalltalk: [
      "Brother Hustleworth: \"If you aren't listening to an audiobook on 3x speed during your backswing, you are losing.\"",
      "Brother Hustleworth: \"I own the apartment you sleep in. I bought it while you were dreaming.\"",
      "Brother Hustleworth: \"Every breath is an opportunity for arbitrage.\"",
      "Brother Hustleworth: \"I optimize my meals by eating them in pill form while yelling at interns.\"",
      "Brother Hustleworth: \"My morning routine now contains fourteen steps and not one human feeling.\"",
      "Brother Hustleworth: \"Cash flow is a mindset. Sleep is a rumor.\"",
      "Brother Hustleworth: \"If a tenant complains in the night and no investor hears it, hath value not still been extracted?\""
    ],
    whenChallenged: [
      "Brother Hustleworth: \"You mock the grind, yet you pay rent. To me. Because I bought your building while you slept.\"",
      "Brother Hustleworth: \"My course is not a scam! It is a high-ticket networking opportunity!\"",
      "Brother Hustleworth: \"You lack the mindset! Your aura is strictly W-2!\"",
      "Brother Hustleworth: \"I have 400 doors. You have a putter. Do not speak to me of strategy.\""
    ],
    vulnerability: [
      "Brother Hustleworth, twitching: \"...I haven't slept a full night since 2018. My blood is mostly espresso and anxiety. (pause) Keep grinding!\"",
      "Brother Hustleworth, staring into the distance: \"...I own 400 doors, but I don't feel at home behind any of them.\"",
      "Brother Hustleworth, quietly: \"...If I stop posting inspirational quotes, the silence is deafening.\"",
      "Brother Hustleworth, rubbing his temples: \"...I think my audience hates me. I think I hate me.\"",
      "Brother Hustleworth: \"...I took out a bridge loan to pay for the private jet lease. The irony is not lost on me, but the jet is very fast.\"",
      "Brother Hustleworth: \"...Sometimes I wish I was just a tenant. Just for an hour. To know what it feels like to have a ceiling that doesn't belong to me.\"",
      "Brother Hustleworth, whispering: \"...If the course sales dip, I'm just a man in a rented suit. And the suit is starting to itch.\""
    ],
    reactionToPlayerSuccess: [
      "Brother Hustleworth: \"A good drive. But did you monetize the kinetic energy? No? Amateur.\"",
      "Brother Hustleworth: \"You made the shot, but missed the content opportunity. Where is the ring light?\"",
      "Brother Hustleworth: \"Impressive output. You should buy my platinum tier course on scaling that output.\"",
      "Brother Hustleworth: \"Success is just failure that hasn't been audited yet.\""
    ],
    exitLines: [
      "Brother Hustleworth: \"I leave you now to film a podcast in a rented sports car.\"",
      "Brother Hustleworth: \"The dawn awaits monetizing. Farewell.\"",
      "Brother Hustleworth: \"I must go evict a single mother. It is the grind.\"",
      "Brother Hustleworth: \"Remember: sleep is just death being shy. Stay awake!\""
    ]
  },
  pivotAddict: {
    intro: [
      "The Pivot Addict: \"Forget what we did yesterday. Today, we are the Uber of fractional artisanal goat leasing!\"",
      "The Pivot Addict: \"We burned the old codebase. We rebuild in Rust every Tuesday.\"",
      "The Pivot Addict: \"We are no longer a B2B SaaS. We are a B2C hardware lifestyle cult.\"",
      "The Pivot Addict: \"Our roadmap is just a circle. It implies infinite momentum.\""
    ],
    smalltalk: [
      "The Pivot Addict: \"The old idea was stagnant. The new idea is identical, but the font is purple.\"",
      "The Pivot Addict: \"Investors love agility. I am so agile I have forgotten our core product.\"",
      "The Pivot Addict: \"We fired the marketing team and hired a shaman. Huge CAC reduction.\"",
      "The Pivot Addict: \"If you pivot fast enough, the auditors cannot catch you.\""
    ],
    whenChallenged: [
      "The Pivot Addict: \"It is not a chaotic flail! It is agile course-correction based on vibes!\"",
      "The Pivot Addict: \"You call it indecision. I call it dynamic market responsiveness.\"",
      "The Pivot Addict: \"We are merely iterating! Fifty times a fiscal quarter!\"",
      "The Pivot Addict: \"A roadmap is just a suggestion. We navigate by panic.\""
    ],
    vulnerability: [
      "The Pivot Addict, shuddering: \"...If I stop pivoting, I might have to actually finish a product. I don't know how to do that.\"",
      "The Pivot Addict, wide-eyed: \"...I am terrified of launching. A pivot is a safe harbor of perpetual potential.\"",
      "The Pivot Addict, whispering: \"...My engineers are crying in the stairwell. I think I broke them.\"",
      "The Pivot Addict, looking lost: \"...What if the first idea was actually the best one?\""
    ],
    reactionToPlayerSuccess: [
      "The Pivot Addict: \"You sank the putt! But what if you pivoted and turned the hole into a premium subscription?\"",
      "The Pivot Addict: \"Great shot! Now abandon that strategy and try hitting it backwards!\"",
      "The Pivot Addict: \"You reached the goal. How boring. The journey of the pivot is the true reward.\"",
      "The Pivot Addict: \"Success? Time to burn it down and start over.\"",
      "The Pivot Addict: \"A win! Excellent. We shall now reposition victory as a discovery platform.\"",
      "The Pivot Addict: \"That shot had traction. Naturally we must ruin it with a rebrand.\"",
      "The Pivot Addict: \"Marvelous. The board shall call this proof that our sixth strategy was the first correct one.\"",
      "The Pivot Addict: \"You cleared the quarter! We celebrate by firing the caddy and hiring an AI-powered dog.\"",
      "The Pivot Addict: \"The lender is calling. Quick, pivot to a defensive tech narrative!\"",
      "The Pivot Addict: \"We owe interest. Let us pivot to a business model where debt is considered a growth hack.\""
    ],
    exitLines: [
      "The Pivot Addict: \"Excuse me, I just had an idea involving drones and mayonnaise. The deck must be rewritten!\"",
      "The Pivot Addict: \"I must go. The board needs a new vision by lunch.\"",
      "The Pivot Addict: \"Farewell! I am pivoting to the parking lot.\"",
      "The Pivot Addict: \"I must announce our re-re-re-brand on LinkedIn.\""
    ]
  },
  web3RePivoter: {
    intro: [
      "The Web3 Re-Pivoter: \"We are building an agentic AI that lives on the blockchain in the metaverse. It is completely decentralized. And centralized.\"",
      "The Web3 Re-Pivoter: \"Our smart contracts now hallucinate. It is a feature.\"",
      "The Web3 Re-Pivoter: \"I sold apes, then I sold virtual land, now I sell neural networks. Same Discord server.\"",
      "The Web3 Re-Pivoter: \"We are completely decentralized. Except for the cap table. That is very centralized.\""
    ],
    smalltalk: [
      "The Web3 Re-Pivoter: \"My apes are now intelligent agents. They hallucinate wildly, but the smart contract mandates it.\"",
      "The Web3 Re-Pivoter: \"We are putting LLMs on chain. Why? Because the VCs asked.\"",
      "The Web3 Re-Pivoter: \"The community is engaged. Mostly demanding refunds, but engagement is engagement.\"",
      "The Web3 Re-Pivoter: \"We use zero-knowledge proofs to hide our lack of revenue.\"",
      "The Web3 Re-Pivoter: \"We tokenized the debt. Now 400 strangers in a DAO own thy financial anxiety.\"",
      "The Web3 Re-Pivoter: \"The quarterly interest is paid in a governance token that currently only exists in my mind.\"",
      "The Web3 Re-Pivoter: \"The lender is threatening a margin call on the metaverse warehouse. We are pivoting to a reality-based narrative until the wire clears.\"",
      "The Web3 Re-Pivoter: \"If the note matures before the mainnet launch, we simply fork the treasury. Simple!\"",
      "The Web3 Re-Pivoter: \"Our cap table is on-chain. It's public, but nobody has the gas fees to look at it.\""
    ],
    whenChallenged: [
      "The Web3 Re-Pivoter: \"You don't understand the tech. I don't understand the tech. That's why the valuation is astronomical.\"",
      "The Web3 Re-Pivoter: \"It is not a rug pull! It is a liquidity re-alignment event!\"",
      "The Web3 Re-Pivoter: \"The whitepaper clearly stated that nothing was guaranteed. Especially the product.\"",
      "The Web3 Re-Pivoter: \"You lack vision! The blockchain-AI-metaverse synergy is inevitable!\""
    ],
    vulnerability: [
      "The Web3 Re-Pivoter, wistfully: \"...I miss the days when we just sold JPEGs. It was so much easier to explain to my mother.\"",
      "The Web3 Re-Pivoter, rubbing eyes: \"...I don't know what a neural network actually is. I just import the library.\"",
      "The Web3 Re-Pivoter, shuddering: \"...The Discord server is just people yelling 'wen token'. It haunts my dreams.\"",
      "The Web3 Re-Pivoter, sighing: \"...If the crypto market crashes again, I will have to learn how to code.\""
    ],
    reactionToPlayerSuccess: [
      "The Web3 Re-Pivoter: \"Airdrop this success! Mint it on the ledger! Prompt the chain!\"",
      "The Web3 Re-Pivoter: \"A verified transaction! Your swing is immutable!\"",
      "The Web3 Re-Pivoter: \"Your form is decentralized and highly scalable.\"",
      "The Web3 Re-Pivoter: \"I am generating a derivative NFT collection based on that shot.\""
    ],
    exitLines: [
      "The Web3 Re-Pivoter: \"I must return to Discord. The community has realized we have no product.\"",
      "The Web3 Re-Pivoter: \"Farewell. I have a court date regarding an unregistered security.\"",
      "The Web3 Re-Pivoter: \"I go to prompt the void. And perhaps flee the jurisdiction.\"",
      "The Web3 Re-Pivoter: \"The token generation event awaits. Goodbye.\""
    ]
  }
};

// CS-4/GP-6: spawn rate modifiers referencing frozen ledger keys and game state.
// Base weights sum to 1.0. Rarer archetypes have stronger modifiers.
const ARCHETYPE_SPAWN_RATES = {
  brotherIdleworth:    { base: 0.18, modifier: (s) => (s.ledger?.MigratoryFounders || 0) < 30 ? 1.4 : 1.0 }, // Shows up when the stealth crew ignores you
  sirWastrel:          { base: 0.14, modifier: (s) => s.money > 8000 ? 1.5 : 1.0 },                          // Drawn to excess capital to harvest losses
  greatPioneer:        { base: 0.16, modifier: (s) => s.money < 2000 ? 1.5 : 1.0 },                          // Appears when you are broke to lecture you on grit
  youngMasterReginald: { base: 0.12, modifier: (s) => s.quarter <= 2 ? 1.4 : 1.0 },                          // Appears early in the run before things get too serious
  brotherHustleworth:  { base: 0.16, modifier: (s) => s.hype < 40 ? 1.5 : 1.0 },                             // Detects low aura and tries to sell you a course
  pivotAddict:         { base: 0.14, modifier: (s) => s.consecutiveLosses > 0 ? 1.5 : 1.0 },                 // Smells failure and suggests burning it all down
  web3RePivoter:       { base: 0.10, modifier: (s) => (s.ledger?.CursorSpectacles || 0) > 40 ? 1.6 : 1.0 }   // Rarest; only emerges when the hype ecosystem is thriving
};

// CS-4: LEDGER_FLAVOR_POOLS keyed by the 11 frozen faction keys.
// up/down arrays are expanded by Prompt 17 (GP-7).
const LEDGER_FLAVOR_POOLS = {
  Vastcart: {
    up: [
      "The Most Serene Company hath, by ledger, made a note.",
      "A buyer at the home office hath inscribed thy name.",
      "Thy volume is pleasing unto the algorithms of Bentonville.",
      "An impossible vendor term hath been slightly relaxed in thy favor.",
      "The grand spreadsheet acknowledges thy margin sacrifice.",
      "A regional vice-manager hath smiled upon thy pallet stacking.",
      "Thy logistics yield hath appeased the Serene Shareholders."
    ],
    down: [
      "The Most Serene Company hath, by ledger, made a most unflattering note.",
      "A buyer hath struck thy name from the vendor file.",
      "Thy margins are insufficient. The home office demands restitution.",
      "A chargeback hath been issued for thy spiritual inefficiency.",
      "Thou hast displeased the great retail monolith.",
      "The Serene Company finds thy supply chain lacking in subservience.",
      "A regional director hath frowned upon thy lack of scale."
    ]
  },
  Forgeharvest: {
    up: [
      "The Noble Order of Forgeharvest hath acknowledged thy throughput.",
      "Thy vertical integration brings joy to the processing line.",
      "A shift supervisor hath praised thy meat-and-metal efficiency.",
      "The industrial euphemisms flow favorably in thy direction.",
      "Thy logistical pressures are deemed satisfactory.",
      "The supply chain lords nod at thy raw output.",
      "Throughput is up. Forgeharvest is appeased."
    ],
    down: [
      "Forgeharvest notes thy inefficiency. The notes are not flattering.",
      "The processing line hath stalled, and thy name was whispered as cause.",
      "Thy lack of vertical integration is a logistical embarrassment.",
      "The Noble Order finds thy output spiritually sluggish.",
      "A supply chain disruption bears thy name.",
      "The meat-and-metal empire rejects thy delays.",
      "Thy throughput is offensive to the Order."
    ]
  },
  MechanicalCrow: {
    up: [
      "Lord Buzzwick's drones have begun surveilling thee favourably.",
      "The aerial data extraction finds thy metrics soothing.",
      "A mechanical crow hath landed nearby, observing thy compliance.",
      "Thy frictionless intrusion score is rising.",
      "Lord Buzzwick terms this 'customer intimacy.'",
      "The lenses in the sky focus upon thee with warmth.",
      "Surveillance capitalism hath ruled in thy favor."
    ],
    down: [
      "Lord Buzzwick's crows are watching thee. Not favourably.",
      "The aerial data extraction hath flagged thy anomalies.",
      "A drone hovers too closely. The lens is judging thee.",
      "Thy lack of frictionless metrics angers the Syndicate.",
      "Lord Buzzwick hath deemed thee 'resistant to intimacy.'",
      "The sky hums with mechanical disappointment.",
      "The monitoring grid finds thy behavior suspicious."
    ]
  },
  CoastalShadow: {
    up: [
      "Coastal Shadow Holdings hath, by encrypted wire, expressed cautious esteem.",
      "The Contrarian Baron agrees with thy deeply unpopular position.",
      "A memo of luxury anti-consensus ideology hath praised thy name.",
      "Thy secrecy is recognized as high-status.",
      "An encrypted letter commends thy disregard for the mainstream.",
      "The Shadow Holdings find thy edge suitably sharp.",
      "Thou art fashionable in the darkest of capital circles."
    ],
    down: [
      "The Contrarian Baron hath noted thine existence unfavourably in his private ledger.",
      "Thy position is too mainstream. Coastal Shadow is disgusted.",
      "An encrypted wire hath mocked thy lack of edge.",
      "The Baron finds thy consensus-seeking pathetic.",
      "A memo of dissent hath specifically cited thy failures.",
      "Thy luxury ideology is deemed derivative.",
      "Thou art considered basic by the darkest of capital circles."
    ]
  },
  FarmableFractions: {
    up: [
      "Brother Tillage hath blessed thy furrow. The soil appreciates thee.",
      "Thy dirt metaphors are financially sound.",
      "The assetization of thy land is proceeding gracefully.",
      "A fractional token of agricultural mysticism hath been issued in thy name.",
      "The Solemn Order finds thy spreadsheet suitably earthy.",
      "The soil as spreadsheet yields a bountiful margin.",
      "Brother Tillage nods. Thy tokens are sprouting."
    ],
    down: [
      "Brother Tillage hath revoked the blessing. The soil is indifferent. Thou art not.",
      "Thy dirt metaphors lack financial rigor.",
      "The Solemn Order rejects thy fractional offerings.",
      "The agricultural mysticism hath soured against thee.",
      "Thy land is deemed an un-assetizable burden.",
      "The soil spreadsheet shows a tragic deficit.",
      "Brother Tillage weeps for thy barren tokens."
    ]
  },
  PredictiveCompliance: {
    up: [
      "Magistrate Ledger hath logged thy compliance in the good column.",
      "Thy pre-violations are surprisingly minimal.",
      "The bureaucratic prophecy foretells thy regulatory success.",
      "An audit of thy future actions reveals acceptable risk.",
      "The Ministry finds thy paperwork terrifyingly calm and correct.",
      "Magistrate Ledger hath nodded before thou even submitted the form.",
      "Everything is logged before it happens, and it looks good."
    ],
    down: [
      "Magistrate Ledger hath opened a new sub-ledger. It is entirely about thee. This is not a compliment.",
      "The Ministry foresees a pre-violation of magnitude.",
      "Thy future paperwork is already deemed insufficient.",
      "A bureaucratic prophecy of doom surrounds thy filings.",
      "The Ordinanced Ministry finds thy chaos unacceptable.",
      "Magistrate Ledger sighs. The form was late before it was due.",
      "Thy regulatory doom was logged three weeks ago."
    ]
  },
  AlgorithmicApprovals: {
    up: [
      "The Algorithmic Apothecary hath pre-approved thy standing. Digitally. Without reading it.",
      "Thy request is deemed sufficiently inevitable.",
      "The automated ambiguity hath ruled in thy favor.",
      "A profitable delay was avoided. The algorithm smiles.",
      "Thy clinical language is flawlessly faux.",
      "The healthcare denial machinery skips over thy name.",
      "The Bespoke Apothecary finds thy metrics healthy."
    ],
    down: [
      "Thy standing claim hath been denied pending further review. The algorithm is disappointed.",
      "Your request was denied for being insufficiently inevitable.",
      "The automated ambiguity hath swallowed thy appeal.",
      "A highly profitable delay hath been applied to thy standing.",
      "The Bespoke Apothecary finds thy clinical language lacking.",
      "The denial machinery processes thy failure with cold politeness.",
      "The algorithm regrets to inform thee of thy doom."
    ]
  },
  CursorSpectacles: {
    up: [
      "The Confraternity hath added thee to their group chat. The gif frequency alone is an honour.",
      "Thy demo theater is vibrating with founder energy.",
      "A lone hooded figure nodded at thy AI wrapper.",
      "The networking rituals have blessed thy hustle.",
      "Thy hoodie is recognized as authentic by the hype-accelerator.",
      "The investor lighting shines favorably upon thy earnest nonsense.",
      "The group chat mythology now includes thy name."
    ],
    down: [
      "The Confraternity hath removed thee from the group chat. The gif frequency is now someone else's honour.",
      "Thy founder energy is deemed low-vibration.",
      "A lone hooded figure scoffed at thy demo theater.",
      "Thy AI wrapper was exposed as a simple if-statement.",
      "The hype-accelerator finds thy earnest nonsense lacking lighting.",
      "The networking rituals reject thy presence.",
      "The group chat mythology has erased thy contributions."
    ]
  },
  MigratoryFounders: {
    up: [
      "The Devotional hath acknowledged thy stealth. Or thy lack of output. They find both spiritual.",
      "Thy infinite runway is admired by the Confraternity.",
      "A newsletter hath praised thy coworking mysticism.",
      "Thy lack of a specific product is seen as visionary.",
      "The Transplant founders nod at thy lifestyle entrepreneurship.",
      "Thou art successfully always arriving, never delivering.",
      "Thy vagueness is an inspiration to the pre-launch faithful."
    ],
    down: [
      "The Devotional hath quietly unfollowed thee. The silence is louder than anything they have ever shipped.",
      "Thy runway looks suspiciously finite.",
      "The coworking mysticism hath turned against thee.",
      "The Transplant founders demand an actual product.",
      "Thy lifestyle entrepreneurship is deemed unspiritual.",
      "Thou art arriving too slowly and delivering too little.",
      "Thy vagueness is no longer visionary, just confusing."
    ]
  },
  NativeHollows: {
    up: [
      "Goodwife Henrietta nodded. The tea is on the house.",
      "The hollows have, by quiet decree, accepted thee.",
      "A local skeptic admitted thy latest pitch was 'not entirely stupid.'",
      "The small business owners respect thy grounded ethics.",
      "Henrietta sees through thy deck, but likes thee anyway.",
      "The Native Hollows appreciate thy lack of drone metaphors.",
      "A rare moment of durable honesty is recorded in thy favor."
    ],
    down: [
      "Goodwife Henrietta sighed. She hath Seen This Before.",
      "The native hollows decline to claim thee.",
      "A local skeptic laughed openly at thy business model.",
      "Henrietta notes thy pitch deck is entirely buzzwords.",
      "The small business owners find thy ethics lacking gravity.",
      "The hollows recognize thee as just another wealthy LARPer.",
      "Henrietta poured thy tea down the sink."
    ]
  },
  CommitteeUnnecessarySynergy: {
    up: [
      "Sir Wastrel hath certified thy contribution as artistically credible. A spoon may be forthcoming.",
      "Thy elaborate loss is celebrated as high art.",
      "The Committee for Unnecessary Synergy finds thy inefficiency exquisite.",
      "A tax-loss hobby hath been validated in thy name.",
      "The process-for-process network hums with thy approval.",
      "Sir Wastrel applauds thy lack of revenue.",
      "Thy ceremonial bureaucracy is an inspiration to the Committee."
    ],
    down: [
      "The Committee hath convened an emergency session about thee. The spoon has been withheld.",
      "Sir Wastrel finds thy revenue stream offensively practical.",
      "Thy lack of elaborate losses is a disappointment.",
      "The Committee for Unnecessary Synergy rejects thy efficiency.",
      "A tax-loss hobbyist scoffed at thy profit margins.",
      "Thy process actually produced a result. The Committee is horrified.",
      "Sir Wastrel weeps for thy lack of ceremonial waste."
    ]
  }
};

const FUNDING_ROUNDS = ['Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Pre-IPO', 'IPO'];

const DIALOGUE = {
  marquee: [
    'INSERT COIN... OR VENTURE CAPITAL',
    'THE WESTERN SUN-COAST SENDS ITS REGARDS AND NO USEFUL PRODUCT',
    'CURSOR SPECTACLES CERTIFIED • LOCALLY DOUBTED',
    'FORTNIGHT LAST, THY RUNWAY LOOKED LONGER',
    'THE CEREMONIAL SPOON REMAINS SOCIALLY MANDATORY',
    'DISRUPTING THE DISRUPTION INDUSTRY',
    'THE BOARD IS WATCHING YOUR SWING',
    'FUNDED BY QUESTIONABLE OPTIMISM',
    'SATIRIZING STARTUP CULTURE ONE HOLE AT A TIME',
    'YOUR BURN RATE IS SOMEONE ELSE\'S DREAM',
    'PIVOT HARDER. PIVOT FASTER. PIVOT FOREVER.',
    // HUMOR-SHARPEN — new marquee punch, incl. the official regional satire name
    'WELCOME TO THE OZARK AMBITION CORRIDOR™ — WHERE EVERY POND IS A PORTFOLIO',
    'THE CORRIDOR: TWO EMPIRES, ONE UNIVERSITY, INFINITE DECKS',
    'THY EXIT STRATEGY IS ANOTHER MAN\'S ONBOARDING',
    'THE SPOON IS NOT A METAPHOR. STOP ASKING.',
    'LOCALS 1, NARRATIVE 0 — FULL COVERAGE AT ELEVEN'
  ],
  titleAttract: [
    'Arcade golf meets civic capture, ceremonial bureaucracy, and startup collapse in Quillhaven.',
    'A mock-medieval venture farce wherein thy backswing is audited, thy hype is priced, and thy spoon eligibility is always under review.'
  ],
  loading: [
    'Securing Series A from a man who introduces himself as pre-revenue but post-vibes...',
    'Goodwife Henrietta is steeping a tea that knows what you did...',
    'The Architect is writing a footnote about this loading screen...',
    'Polishing the Ceremonial Spoon to a degree no result has ever justified...',
    'Cursor Spectacles hath approved thy aura and rejected thy business model...',
    'Rehearsing a keynote for the Western Sun-Coast investors and their expensive humility...',
    'Fetching a revised forecast from fortnight last, when the runway still felt theoretical...',
    'Lord Buzzwick is calibrating the crows for premium customer intimacy...',
    'Sir Wastrel is framing thy losses as a lifestyle asset...',
    'Brother Idleworth remains in stealth, though the landlord hath entered the chat...',
    'Lady Synergy Karen is aligning the metrics until they resemble a threat...',
    'Pre-denying a future request for speed, clarity, or mercy...',
    'Vastcart is describing extraction as community-forward retail stewardship...',
    'Forgeharvest is optimizing throughput and several human feelings out of the process...',
    'The Committee for Unnecessary Synergy is convened, catered, and accomplishing nothing at scale...',
    'Rebranding the same bad idea in a richer font for the Cursor Spectacles...',
    'The Western Sun-Coast is arriving in plain clothes that cost more than the tea room...',
    'Checking whether thy Ceremonial Spoon tier still outranks thy actual solvency...',
    'Fortnight last, this deck was called agri-fintech. Today it is mobility for dirt...',
    'Brother Hustleworth is monetizing dawn, dusk, and a legally uncertain lunch break...',
    'The Pivot Addict hath pivoted the loading screen into a discovery surface...',
    'The Web3 Re-Pivoter is putting the delay on-chain for transparency theatre...',
    'Magistrate Ledger hath filed a pre-violation against thy optimism...',
    'The Native Hollows have seen this pitch before and liked the tea better...',
    'Quillhaven is pretending not to notice another founder from the Western Sun-Coast...',
    'Rendering a city where the spoon matters, the product does not, and both are taxed emotionally...'
  ],
  board: [
    'Where is the hockey-stick growth?',
    'We need to see a path to liquidity by Q4.',
    'Your burn rate is spiritually concerning.',
    'Have you considered adding AI to the putter?',
    'The board would like fewer bogeys and more EBITDA.',
    'Someone from Bentonville called. They sounded disappointed.'
  ],
  quarters: [
    'Q1 opened with a visionary town hall and no product roadmap.',
    'Q2 began after leadership described a birdie as a scalable adjacency.',
    'Q3 arrived with fresh synergies, fresh debt, and fresh branded vests.',
    'Q4 closed under dramatic lighting while legal quietly muted Slack channels.'
  ],
  audit: [
    'Audit committee wants receipts for the innovation yacht retreat.',
    'Compliance noticed your KPI dashboard is mostly gradients and hope.',
    'A procurement VP asked why the fairway budget includes a chief evangelist.',
    'Finance found twelve subscriptions labeled mission critical vibes.'
  ],
  initiatives: [
    'Leadership pivoted the deck from golf-tech to golf-adjacent lifestyle AI.',
    'A wellness rebrand turned burnout into a premium operating philosophy.',
    'The company launched a stealth skunkworks lab inside a refurbished boutique hotel.',
    'Your growth team replaced product discovery with an espresso-powered war room.'
  ],
  credits: [
    'Built in the shadow of ambition and delusion.',
    'No actual chickens were processed during development.',
    'Every repo uploaded bravely served the cause.',
    'Corporate culture: lovingly roasted.',
    'Your equity is worth exactly what we said it was.'
  ]
};

Object.assign(DIALOGUE, {
  boardroom_v2: BOARDROOM_LINES_V2,
  boardroom_default: [{ who:'Narrator', line:"The boardroom is silent. Someone's phone vibrates. Nobody admits it's theirs." }],
  minigame_intro: QUIPS,
  minigame_win: WIN_FLAVOR,
  minigame_loss: LOSS_FLAVOR,
  touch_onboarding: TOUCH_TOOLTIPS
});

const STRATEGY_CARDS = [
  {
    id: 'ai_pivot',
    title: 'AI Pivot Week',
    icon: '🧠',
    desc: 'Rebrand the deck around frontier intelligence and several unverified demos.',
    effect: { hype: 16, reputation: 4, burnRate: 110, auditRisk: 8 }
  },
  {
    id: 'cost_cut',
    title: 'Operational Discipline',
    icon: '✂️',
    desc: 'Freeze snacks, freeze travel, and call it focus.',
    effect: { burnRate: -120, morale: -10, compliance: 6, reputation: -3 }
  },
  {
    id: 'quiet_layoff',
    title: 'Silent Reorg',
    icon: '🪓',
    desc: 'Rename layoffs to portfolio simplification and hope no one notices.',
    effect: { burnRate: -170, hype: -8, reputation: -10, auditRisk: 10 }
  },
  {
    id: 'community_push',
    title: 'Ozark Brand Tour',
    icon: '🎪',
    desc: 'Do founder selfies, community panels, and deeply sponsored optimism.',
    effect: { reputation: 12, hype: 7, compliance: -3 }
  },
  {
    id: 'enterprise_sprint',
    title: 'Enterprise Sprint',
    icon: '📈',
    desc: 'Promise three retailers custom dashboards by next Tuesday.',
    effect: { money: 850, hype: 9, auditRisk: 6, compliance: -4 }
  },
  {
    id: 'legal_cleanup',
    title: 'Legal Cleanup',
    icon: '⚖️',
    desc: 'Hire actual adults to review contracts and stop improvising governance.',
    effect: { money: -500, compliance: 14, auditRisk: -12, reputation: 5 }
  }
];

const MILESTONE_DEFS = [
  { id: 'hype_hero', label: 'Hype Hero', check: st => st.hype >= 80, reward: { score: 1800 }, text: 'Your brand aura is now measurable and unfortunately taxable.' },
  { id: 'clean_books', label: 'Clean Books', check: st => st.compliance >= 80 && st.auditRisk <= 20, reward: { money: 1200 }, text: 'For one shining quarter, the receipts actually matched the narrative.' },
  { id: 'retail_darling', label: 'Retail Darling', check: st => st.reputation >= 75, reward: { score: 1200, money: 600 }, text: 'Bentonville finally stopped introducing you as a fun little experiment.' },
  { id: 'quarter_machine', label: 'Quarter Machine', check: st => st.quarter >= 5, reward: { score: 2400 }, text: 'You survived enough quarters to develop a strategic thousand-yard stare.' },
  { id: 'chaos_operator', label: 'Chaos Operator', check: st => st.totalHolesCleared >= 12 && st.auditRisk >= 45, reward: { money: 900 }, text: 'You proved explosive growth and operational confusion can, in fact, coexist.' },
];

const EPILOGUE_MILESTONES = [
  { id: 'ep_runway_emperor', label: 'Runway Emperor', desc: 'Reached 30+ runway without being repossessed.', check: s => s.runway >= 30 },
  { id: 'ep_spoon_cabinet', label: 'Spoon Cabinet', desc: 'Collected 5 or more Ceremonial Spoons.', check: s => (s.spoonState?.count || 0) >= 5 },
  { id: 'ep_quarterly_survivor', label: 'Quarterly Survivor', desc: 'Endured at least five quarters of managed panic.', check: s => s.quarter >= 5 },
  { id: 'ep_patron_operator', label: 'Patron Operator', desc: 'Won over two or more factions at patron standing.', check: s => Object.values(s.ledger || {}).filter(v => v >= 60).length >= 2 },
  { id: 'ep_feud_collector', label: 'Feud Collector', desc: 'Made three or more factions openly despise you.', check: s => Object.values(s.ledger || {}).filter(v => v <= COLLAPSE_THRESHOLD).length >= 3 },
  { id: 'ep_clean_exit', label: 'Clean Exit', desc: 'Kept audit risk under control through the closing bell.', check: s => s.auditRisk <= 20 },
  { id: 'ep_people_person', label: 'People Person, Somehow', desc: 'Finished with reputation at 70 or higher.', check: s => s.reputation >= 70 },
  { id: 'ep_hype_engine', label: 'Hype Engine', desc: 'Finished with hype at 70 or higher.', check: s => s.hype >= 70 },
  { id: 'ep_worldwalker', label: 'Worldwalker', desc: 'Reached World 8 and saw the full machine.', check: s => s.currentWorld >= 8 },
  { id: 'ep_architects_margin', label: 'The Architect\'s Margin', desc: 'Unlocked at least 12 Architect footnotes.', check: s => (s.footnoteState?.unlocked?.length || 0) >= 12 },
  { id: 'ep_leveraged_soul', label: 'Leveraged Soul', desc: 'Took venture debt and still made it to the epilogue.', check: s => !!s.everTookDebt },
  { id: 'ep_boardroom_golfer', label: 'Boardroom Golfer', desc: 'Cleared 18 or more holes in one doomed civic performance.', check: s => s.totalHolesCleared >= 18 },
];

const CADDIES = [
  {
    name: 'AI Intern',
    icon: '🤖',
    tips: [
      'My model says aim 3.4 degrees left. Confidence unjustifiably high.',
      'We should add blockchain to the backswing.',
      'Your grip lacks observability.',
      'I trained on golf. Possibly mini-golf.'
    ]
  },
  {
    name: 'Late Questions',
    icon: '❓',
    tips: [
      'Did you want me to mention the wind earlier?',
      'Quick thought on the last hole: too late now.',
      'Were you aiming for that hazard?',
      'I had feedback, then the swing happened.'
    ]
  },
  {
    name: 'Will Writing Ward',
    icon: '✍️',
    tips: [
      'Please update your beneficiaries before the next tee box.',
      'A miss like that complicates the estate.',
      'I have pre-drafted your graceful exit statement.',
      'You may wish to assign a successor putter.'
    ]
  },
  {
    name: 'React Randy',
    icon: '⚛️',
    tips: [
      'This swing needs fewer side effects.',
      'Have you tried a custom hook for power timing?',
      'You are over-rendering the follow-through.',
      'The bunker is just unmanaged state.'
    ]
  },
  {
    name: 'Docker Dave',
    icon: '🐳',
    tips: [
      'Works on my course.',
      'Containerize the tee shot.',
      'It\'s probably DNS. Even here.',
      'The fairway has config drift.'
    ]
  },
  {
    name: 'Agile Alice',
    icon: '📋',
    tips: [
      'Let\'s retrospective that shank after this sprint.',
      'Your swing is an epic. Break it down.',
      'The burndown chart for this hole is bleak.',
      'As a golfer, I want a birdie, so that the board calms down.'
    ]
  }
];

const DEFAULT_SPONSORS = [
  { name: 'Breaking Artificial Glass', icon: '🤖', desc: 'Series Z funding secured', rarity: 'legendary' },
  { name: 'Natural Disasters VC', icon: '🌪️', desc: 'Cap table crime scene', rarity: 'legendary' },
  { name: 'Money Printers Ltd', icon: '🖨️', desc: 'Long inflation, short runway', rarity: 'epic' },
  { name: 'Land Traitors Fund', icon: '🏴‍☠️', desc: 'Trade acres, trade dignity', rarity: 'epic' },
  { name: 'Garage Door Angels', icon: '🏠', desc: 'Literally in a garage', rarity: 'common' },
  { name: 'Uncle\'s IRAs', icon: '👴', desc: 'Family money, family drama', rarity: 'common' }
];

const DEFAULT_COMPETITORS = [
  { name: 'YAML Mountain', icon: '☸️', desc: '47 config files deep', threat: 25 },
  { name: 'Copycat Corp', icon: '🐱', desc: 'Your idea but funded', threat: 18 },
  { name: 'Blockchain Burrito', icon: '🌯', desc: 'Decentralized lunch', threat: 33 },
  { name: 'Overfunded Inc', icon: '🔥', desc: 'Burning cash since 2021', threat: 40 },
];

const POWERUPS = [
  { id: 'skip', name: 'Skip Minigame', icon: '⏭️', cost: 300, desc: 'Auto-pass the next pre-swing gate', owned: false },
  { id: 'life', name: 'Extra Life', icon: '❤️', cost: 700, desc: '+1 max strikes', owned: false },
  { id: 'accuracy', name: 'Accuracy Boost', icon: '🎯', cost: 450, desc: 'Wider accuracy sweet spot', owned: false },
  { id: 'coffee', name: 'Espresso Shot', icon: '☕', cost: 220, desc: 'Instant +$500', owned: false },
  // USER-PLAYTEST-FIX — "not enough powerups": four new one-use items
  { id: 'mulligan', name: 'Mulligan Memo', icon: '🔁', cost: 500, desc: 'Next missed shot costs no strike', owned: false },
  { id: 'umbrella', name: 'Lobbyist Umbrella', icon: '🌂', cost: 350, desc: 'Cancels wind on the next swing', owned: false },
  { id: 'prblast', name: 'PR Blast', icon: '📣', cost: 380, desc: 'Instant +10 HYPE', owned: false },
  { id: 'shredder', name: 'Shredder Hour', icon: '🗑️', cost: 600, desc: 'Instant −12 audit risk', owned: false },
];

const EQUIPMENT = [
  { id: 'putter', name: 'Golden Putter', icon: '🏌️', cost: 900, desc: '+10% accuracy', owned: false, equipped: false },
  { id: 'driver', name: 'Rocket Driver', icon: '🚀', cost: 1200, desc: '+15% power', owned: false, equipped: false },
  { id: 'gloves', name: 'Zen Gloves', icon: '🧤', cost: 650, desc: 'Slower meters', owned: false, equipped: false },
  { id: 'cap', name: 'Lucky Cap', icon: '🧢', cost: 700, desc: 'Slight crit chance', owned: false, equipped: false },
  { id: 'shades', name: 'Founder Shades', icon: '🕶️', cost: 550, desc: '+5% hype per hole', owned: false, equipped: false },
  { id: 'vest', name: 'Branded Vest', icon: '🦺', cost: 800, desc: '+3 rep per clear', owned: false, equipped: false },
  { id: 'watch', name: 'Status Watch', icon: '⌚', cost: 1100, desc: 'Longer runway', owned: false, equipped: false },
  { id: 'shoes', name: 'Sprint Kicks', icon: '👟', cost: 400, desc: 'Faster recovery', owned: false, equipped: false },
];

const ARCHETYPE_STATS = {
  bentonville_chad: { name: 'Sales Chad', role: 'Sales', base: 78, hireCost: 2200, color: '#7dd3fc', accent: '#1d4ed8', quote: 'My dad knows a guy who knows a guy.' },
  fayetteville_fran: { name: 'Founder Fran', role: 'Founder', base: 66, hireCost: 1600, color: '#f9a8d4', accent: '#be185d', quote: 'The vibes are chaotic but investable.' },
  burnout_becky: { name: 'Burnout Becky', role: 'Ops', base: 58, hireCost: 900, color: '#cbd5e1', accent: '#64748b', quote: 'I have three hours of sleep and excellent instincts.' },
  springdale_sergio: { name: 'Stealth Sergio', role: 'Engineering', base: 72, hireCost: 1450, color: '#a7f3d0', accent: '#047857', quote: 'Actually competent. Deeply underpromoted.' },
  lowell_larry: { name: 'Logistics Larry', role: 'Logistics', base: 74, hireCost: 1900, color: '#fde68a', accent: '#b45309', quote: 'Thirty years hauling. Nothing surprises me.' },
  rogers_rachel: { name: 'Rebrand Rachel', role: 'Marketing', base: 48, hireCost: 700, color: '#fbcfe8', accent: '#db2777', quote: 'Let\'s manifest a stronger CAC:LTV ratio.' },
  poultry_pete: { name: 'Pipeline Pete', role: 'Processing', base: 68, hireCost: 1300, color: '#fdba74', accent: '#c2410c', quote: 'This is still calmer than my last company.' },
  remote_rick: { name: 'Remote Rick', role: 'DevOps', base: 60, hireCost: 1000, color: '#bfdbfe', accent: '#2563eb', quote: 'I can join, but my camera stays off.' },
  jira_jenny: { name: 'Jira Jenny', role: 'PM', base: 55, hireCost: 850, color: '#86efac', accent: '#16a34a', quote: 'I will close every ticket. Fear me.' },
  consultant_craig: { name: 'Consultant Craig', role: 'Strategy', base: 65, hireCost: 1500, color: '#ddd6fe', accent: '#7c3aed', quote: 'I bill in fifteen-minute increments.' },
  delivery_dave: { name: 'Delivery Dave', role: 'Field Ops', base: 45, hireCost: 500, color: '#fecaca', accent: '#dc2626', quote: 'I know every back alley in this zip code.' },
  fast_food_fiona: { name: 'Fast-Food Fiona', role: 'Speed', base: 42, hireCost: 400, color: '#fef08a', accent: '#ca8a04', quote: 'The lunch rush made me fearless.' },
};

const ARCHETYPE_VOICE_BUNDLES = {
  bentonville_chad: {
    brag: [
      "Sales is trust, brother. Trust is golf, lunch, and returning a call before the other guy's khakis cool down.",
      "I don't chase deals. I attend the same charity breakfast as the deal until it signs itself.",
      "My CRM is mostly memory and two hundred men named Doug."
    ],
    taunt: [
      "You came to negotiate with a spreadsheet. I came with three cousins, a buyer, and tee times through October.",
      "That pitch might play in a city. Around here, folks still ask who vouched for you.",
      "You brought a deck. Cute. I brought distribution."
    ],
    praise: [
      "Now that's clean. Buyer-friendly, board-safe, and just arrogant enough to close.",
      "That's how you do it — no drama, no sermon, just a signed understanding and decent posture.",
      "Good swing. You looked like somebody whose calls get returned."
    ],
    vulnerability: "Bentonville runs on relationships, brother. Handshakes, golf rounds, little miracles in khakis. ...Truth is, if my phone ever stops ringing, I don't know whether I'm a rainmaker or just a man who was standing near the right money for a very long time. Anyway. Circle back with me after lunch. I know a guy."
  },
  fayetteville_fran: {
    brag: [
      "We're not building a company. We're curating an inevitability with strong founder energy and a suspiciously good logo.",
      "I can turn one decent idea, two coffees, and a mural wall into six months of momentum.",
      "Pre-revenue is just post-shame if you say it confidently enough."
    ],
    taunt: [
      "Your problem is you're trying to be real too early. Let the narrative breathe, babe.",
      "That swing had no story architecture. Where is the conviction? Where is the deck-adjacent yearning?",
      "You keep asking whether the business works. I keep asking whether it feels fundable."
    ],
    praise: [
      "Oh, that was gorgeous. Messy, brave, and somehow impossible to ignore — classic founder ball.",
      "That shot had pitch-night electricity. I would absolutely overcommit to that energy.",
      "Now that's traction. Dubious, emotional, highly presentable traction."
    ],
    vulnerability: "The vision is still absolutely electric. Founder-led, culture-first, category-creating stuff. ...I keep calling it a journey because if I call it what it is, I might have to admit I'm burning out in public with a branded tote bag on my shoulder. But hey. The vibes remain, technically, investable."
  },
  burnout_becky: {
    brag: [
      "I don't need recognition. I need one quiet hour, a functioning payroll file, and for nobody to invent a crisis before noon.",
      "Ops is just motherhood for corporations that don't deserve it.",
      "If this place still stands, it's because I keep duct-taping process to panic."
    ],
    taunt: [
      "Sure, keep ideating. I'll be in the back turning your little vision quest into something that can survive Tuesday.",
      "You call it innovation. I call it three more Slack channels and a ruined evening.",
      "Please pivot one more time. I haven't updated enough broken workflows this week."
    ],
    praise: [
      "Nice. Efficient, unsentimental, and blessedly light on cleanup for once.",
      "That was solid. Not flashy — useful. Real adults love to see it.",
      "Good shot. I might actually not have to mop up after that one."
    ],
    vulnerability: "No, no, I've got it. Ops always has it. I can patch payroll, reroute the shipment, calm the client, and find the charger you lost. ...I am so tired I can hear my own eye twitch. If I sit down too long, I might become a historical object. ANYWAY. Send me the spreadsheet. I'll save the quarter again."
  },
  springdale_sergio: {
    brag: [
      "I don't need a keynote. I need repo access, version history, and ten minutes without a founder breathing optimism into the server room.",
      "Everybody loves disruption until they need somebody who can actually read the logs.",
      "Competence is not glamorous, but it does restart production."
    ],
    taunt: [
      "Did you deploy that on purpose, or was the outage part of the brand strategy?",
      "Amazing confidence. Shame about the architecture.",
      "You can call it scrappy if you want. The machine still knows when it's nonsense."
    ],
    praise: [
      "There it is. Clean line, no wasted motion, no mystical thinking.",
      "Good shot. Reproducible, stable, and weirdly elegant under load.",
      "Nice work. You solved the problem instead of hosting a panel about it."
    ],
    vulnerability: "It's fine. I can fix it. I usually do. Give me the logs, ten minutes, and one honest answer about what got deployed. ...Sometimes I wonder whether being competent is just a trick people use to keep handing you heavier things. Cool. Awesome. Love that for me. Pushing a patch now."
  },
  lowell_larry: {
    brag: [
      "Freight don't care about your brand voice. Freight cares about weather, weight, timing, and whether somebody lied on a form.",
      "I've moved things through worse roads, worse forecasts, and worse management than this.",
      "Logistics is just reality with a clipboard."
    ],
    taunt: [
      "That plan looks great until it meets a loading dock and a man named Earl who has heard every excuse before breakfast.",
      "You can manifest all you like. Pallets still have mass.",
      "I've seen smoother operations in storm season with two blown tires and a missing manifest."
    ],
    praise: [
      "That's a working shot. Direct, balanced, and not trying to become a philosophy.",
      "Good line. Gets there without asking the road to admire it.",
      "Nicely done. That's the kind of move that actually survives contact with the route."
    ],
    vulnerability: "Freight moves or it don't. That's the whole sermon. Weather, fuel, managers, optimism — none of that changes the axle count. ...What wears on you is watching people with clean shoes call a delay 'a narrative issue' when you know somebody down the line missed supper over it. But sure. Let's manifest delivery by EOD."
  },
  rogers_rachel: {
    brag: [
      "I can make a collapse look premium if you give me a hex code, a landing page, and fifteen reckless minutes.",
      "Brand is not decoration. Brand is how you apologize to the market before the product does.",
      "I've rescued uglier quarters with fewer adjectives."
    ],
    taunt: [
      "That wasn't a miss — it was an unpositioned experience with no audience clarity whatsoever.",
      "Your shot lacked aspiration. Where was the emotional hook? The tasteful lie?",
      "I've seen stronger messaging on a clearance endcap."
    ],
    praise: [
      "Oh, that's sellable. Clean silhouette, clear promise, just enough danger to feel expensive.",
      "Lovely. The market won't understand it, but it will absolutely repeat it.",
      "That had campaign energy. I can already hear three executives misusing it in a meeting."
    ],
    vulnerability: "The rebrand is working. The palette is aspirational, the copy is intimate, and the audience sentiment is trending from confused to premium confused. ...I know sometimes I'm just putting better lipstick on a worse quarter and calling it storytelling. That part keeps me up a little. Anyway! New tagline dropped. You're gonna hate how much it converts."
  },
  poultry_pete: {
    brag: [
      "Processing is rhythm. Keep the line honest, the timing tighter than management likes, and the excuses out of the room.",
      "I've worked places where the floor told the truth long before the executives did.",
      "You learn a lot in production — mostly who thinks throughput is a number instead of a cost."
    ],
    taunt: [
      "That move had all the grace of a quarterly memo in steel-toe boots.",
      "Management would love that shot. It looked efficient from far enough away not to inspect.",
      "I've seen cleaner execution from a line running double speed and half staffed."
    ],
    praise: [
      "That's proper. Tight, practical, and not pretending to be prettier than it is.",
      "Good one. Honest work, clean result.",
      "Now that's a shot with line discipline. Respect."
    ],
    vulnerability: "Processing is simple if you stay honest: line speed, temperature, timing, don't let management invent a synonym for gravity. ...You learn real fast which people think efficiency is a number and which people know it's somebody's wrists, somebody's back, somebody trying not to fall behind. But that's enough truth for one shift. Let's keep it moving."
  },
  remote_rick: {
    brag: [
      "I can fix your cloud bill, your CI pipeline, and your spiritual dependence on saying 'it's probably fine' before lunch.",
      "The best infrastructure is invisible, which is why nobody notices me until something expensive starts screaming.",
      "I keep the whole castle upright from a hoodie, a terminal, and selective emotional distance."
    ],
    taunt: [
      "That shot had the same energy as a Friday deploy from somebody about to go camping offline.",
      "Looks stable in local, huh?",
      "Love the confidence. Hate the environment parity."
    ],
    praise: [
      "Nice. Quiet, resilient, and almost suspiciously free of side effects.",
      "Good shot. That'll hold in production.",
      "Clean execution. No drama, no rollback, no emergency call. Rare stuff."
    ],
    vulnerability: "Yeah, I can hop on. Camera still busted. Crazy how that keeps happening. I'll fix the deploy, the pipeline, the secrets leak, whatever caught fire this time. ...Some days I wonder if staying off-camera is the only way I still feel like a person and not just a floating pair of emergency hands. Anyway. I pushed the hotfix. If prod dies again, ping me twice."
  },
  jira_jenny: {
    brag: [
      "If it matters, it gets a ticket. If it gets a ticket, it joins the order of things.",
      "Chaos hates me because I name it, date it, assign it, and demand updates by close of business.",
      "A well-maintained board is the last cathedral left in modern management."
    ],
    taunt: [
      "Wonderful improvisation. Should I log that under 'bold' or 'preventable'?",
      "You keep calling it agile like the word itself will close the blocker.",
      "That shot is now in backlog, awaiting clarity, ownership, and divine intervention."
    ],
    praise: [
      "Excellent. Clear scope, proper follow-through, no hidden dependencies.",
      "That was beautiful. Small enough to ship, strong enough to matter.",
      "Nice work. I can put that directly into done without adding three caveats."
    ],
    vulnerability: "I have already made the ticket, tagged the owner, linked the blocker, and scheduled the follow-up nobody will read. Structure is mercy. Process is mercy. ...If I stop organizing all this, then I have to admit how much of it is just panic wearing a neat little checkbox. But good news: I made us a board for that. Please update your statuses."
  },
  consultant_craig: {
    brag: [
      "I do not solve problems. I translate them into invoices the powerful can emotionally process.",
      "Give me one executive panic attack and I will return by sunset with a framework, three swimlanes, and a polite alibi.",
      "Any mess becomes strategy if the deck is expensive enough."
    ],
    taunt: [
      "That was less a decision than a premium misunderstanding with a budget.",
      "I could explain why that failed, but unfortunately the truth is in phase two billing.",
      "You keep treating symptoms like vision. Very market-standard of you."
    ],
    praise: [
      "Strong move. Elegant, legible, and just ambiguous enough to survive committee review.",
      "Excellent. That's the sort of result a board can misunderstand in your favor.",
      "Nicely done. I could put two arrows and a matrix around that and charge six figures."
    ],
    vulnerability: "Let's not overreact. What you have here is a solvable alignment issue with a billing code. I can turn this disaster into a framework by close of business. ...The unpleasant part is that I sometimes know exactly what's wrong and also know no one is paying me to tell the whole truth, only the expensive slice of it. Anyway. I've prepared a deck with twelve arrows on it. You'll feel better temporarily."
  },
  delivery_dave: {
    brag: [
      "Addresses lie, customers improvise, and docks vanish, but I still get the box where it needs to go.",
      "Field ops is just urban prophecy with a dolly.",
      "I know shortcuts the mapping software hasn't earned yet."
    ],
    taunt: [
      "That route was nonsense. I've seen drunk navigation apps make a stronger case.",
      "You planned that like someone who's never had to carry the consequences up three flights of stairs.",
      "Pretty move. Shame it wouldn't survive one locked gate and a bad apartment buzzer."
    ],
    praise: [
      "Good shot. Straight there, no romance, no extra mileage.",
      "That's how you do it — practical, quick, and hard to mess up downstream.",
      "Nice. Delivered on the first attempt. The saints themselves take notice."
    ],
    vulnerability: "I can get it there. That's the job. Doesn't matter if the address is fake, the dock is blocked, or the customer thinks 'urgent' is a personality trait. ...After a while you get tired of being the last person in the chain, the one who has to make everybody else's bad decisions arrive on time. But sure. Throw it in the van. I'll work a miracle."
  },
  fast_food_fiona: {
    brag: [
      "Lunch rush trained me better than any accelerator. I can hear disaster coming by the shape of the silence.",
      "Speed is a craft. Anybody can panic fast. I can move fast and keep the tray level.",
      "I was forged in fryer light and metric abuse. This little game ain't pressure."
    ],
    taunt: [
      "You call that urgency? Honey, I've seen toddlers, tourists, and regional management hit harder at once.",
      "That move had the confidence of somebody who's never had a line to the door and one register alive.",
      "I've cleaned up spills with more discipline than that swing."
    ],
    praise: [
      "Now that's quick. Tight, fearless, and not one wasted gesture.",
      "Good shot. You moved like the timer was real and the excuses weren't.",
      "Beautiful. That's rush-hour form right there."
    ],
    vulnerability: "Rush doesn't scare me. Rush is honest. Rush tells you exactly how bad it is and then keeps coming. I can move. I can smile. I can carry six things and remember eight more. ...What gets you is when people act like speed means you don't feel it, like being good under pressure means you were built for pressure. Anyway! Put me in, coach. I was forged in fryer light."
  }
};

const ARCHETYPE_SCORE_REACTIONS = {
  bentonville_chad: {
    ace: ["Hole-in-one, brother. That'll close deals through Christmas."],
    eagle: ["That's two under and three favors earned."],
    birdie: ["Birdie. Clean enough to mention before dessert."],
    par: ["Par travels well. Nobody panics, everybody signs."],
    bogey: ["Bogey's survivable. Smile, blame weather, call the buyer back."],
    double: ["Double bogey. That's the kind of quarter you explain over barbecue."]
  },
  fayetteville_fran: {
    ace: ["Hole-in-one. That's not product-market fit, that's a religious experience."],
    eagle: ["Eagle. The narrative just raised its own seed round."],
    birdie: ["Birdie, babe. Messy, magnetic, fundable."],
    par: ["Par. Not iconic, but still deck-safe."],
    bogey: ["Bogey. We call that an honest beta."],
    double: ["Double bogey. Reframe it as a vulnerability-forward founder moment."]
  },
  burnout_becky: {
    ace: ["Hole-in-one. Great, maybe nobody will invent a follow-up task."],
    eagle: ["Eagle. Efficient. Suspiciously efficient."],
    birdie: ["Birdie. Thank God, one clean thing today."],
    par: ["Par works. Stable is sexy when you've seen the backend."],
    bogey: ["Bogey. Fine. I'll mop it up."],
    double: ["Double bogey. Cool. Add it to the pile with payroll and the roof leak."]
  },
  springdale_sergio: {
    ace: ["Hole-in-one. Finally, a one-shot fix that actually held in production."],
    eagle: ["Eagle. Clean execution. No rollback required."],
    birdie: ["Birdie. Reproducible success. Rare."],
    par: ["Par. Functional, boring, correct."],
    bogey: ["Bogey. That's what happens when confidence outruns debugging."],
    double: ["Double bogey. Congratulations on deploying directly to consequence."]
  },
  lowell_larry: {
    ace: ["Hole-in-one. Straight through like freight with honest paperwork."],
    eagle: ["Eagle. That's route discipline."],
    birdie: ["Birdie. In and out, no wasted miles."],
    par: ["Par. Shipment arrived. Nobody threw a parade, which means it worked."],
    bogey: ["Bogey. One delay ain't a collapse."],
    double: ["Double bogey. That's a whole dock backed up behind one bad decision."]
  },
  rogers_rachel: {
    ace: ["Hole-in-one. Gorgeous. I'd keep the logo exactly as is."],
    eagle: ["Eagle. Premium result, premium silhouette."],
    birdie: ["Birdie. Strong messaging. Clear arc. Sellable."],
    par: ["Par. Competent, if a little underbranded."],
    bogey: ["Bogey. The swing was fine. The positioning was tragic."],
    double: ["Double bogey. The market will read that as confusion."]
  },
  poultry_pete: {
    ace: ["Hole-in-one. That's line speed without blood on the floor."],
    eagle: ["Eagle. Tight timing. Respect."],
    birdie: ["Birdie. Clean work."],
    par: ["Par. The line kept moving. Good enough."],
    bogey: ["Bogey. Sloppy, but not a stoppage."],
    double: ["Double bogey. That's what management calls a learning opportunity from behind glass."]
  },
  remote_rick: {
    ace: ["Hole-in-one. Deployed once, worked once, no incident report."],
    eagle: ["Eagle. Nice. Production-grade."],
    birdie: ["Birdie. Clean commit."],
    par: ["Par. Stable enough to leave running."],
    bogey: ["Bogey. It passed local, huh?"],
    double: ["Double bogey. That's a Friday rollback with human cost."]
  },
  jira_jenny: {
    ace: ["Hole-in-one. Closed in a single sprint. Miracles remain possible."],
    eagle: ["Eagle. Excellent. Clear owner, clear outcome."],
    birdie: ["Birdie. I can mark that done without flinching."],
    par: ["Par. Acceptable. Moving to resolved."],
    bogey: ["Bogey. Logging as avoidable."],
    double: ["Double bogey. This is now an incident, a retro, and three sub-tasks."]
  },
  consultant_craig: {
    ace: ["Hole-in-one. Extraordinary. I can bill that as transformational."],
    eagle: ["Eagle. Elegant. The board will misunderstand it in your favor."],
    birdie: ["Birdie. Strong result. Very presentation-ready."],
    par: ["Par. Solid enough to survive committee review."],
    bogey: ["Bogey. Not fatal, merely expensive."],
    double: ["Double bogey. Ah. A premium opportunity to diagnose the obvious."]
  },
  delivery_dave: {
    ace: ["Hole-in-one. First-attempt delivery. That's saint work."],
    eagle: ["Eagle. Fast route, no stairs, no nonsense."],
    birdie: ["Birdie. Nice. Got it there clean."],
    par: ["Par. Delivered on time. Nobody notices, which is how you know it's real."],
    bogey: ["Bogey. Missed once. Happens."],
    double: ["Double bogey. That's two wrong turns and a locked gate."]
  },
  fast_food_fiona: {
    ace: ["Hole-in-one. Rush-hour perfect. No dropped trays."],
    eagle: ["Eagle. Fast hands, clean line, love to see it."],
    birdie: ["Birdie. That's lunch-rush form."],
    par: ["Par. Kept pace. Stayed alive."],
    bogey: ["Bogey. You hesitated. The timer smelled fear."],
    double: ["Double bogey. That's what happens when the line is ten deep and somebody freezes."]
  }
};

function pickRandom(arr, fallback = '') {
  return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : fallback;
}

function getArchetypeVoiceBundle(id) {
  return ARCHETYPE_VOICE_BUNDLES[id] || null;
}

function getArchetypeVoiceLine(id, mood = 'brag') {
  const bundle = getArchetypeVoiceBundle(id);
  const fallback = ARCHETYPE_STATS[id]?.quote || '';
  if (!bundle) return fallback;
  if (mood === 'vulnerability') return bundle.vulnerability || fallback;
  return pickRandom(bundle[mood], fallback);
}

function getJobOfferLine(id) {
  return getArchetypeVoiceLine(id, 'brag');
}

function getBenchVoiceLine(id, t = null) {
  if (!id) return '';
  const stats = t || st.teamStats?.[id] || null;
  if (stats && stats.morale < 28) return getArchetypeVoiceLine(id, 'vulnerability');
  if (stats && stats.stamina < 35) return getArchetypeVoiceLine(id, 'taunt');
  return getArchetypeVoiceLine(id, 'praise');
}

function getActiveArchetypeHudLine() {
  const activeId = st.roster[0];
  if (!activeId) return `${st.caddy.icon} ${getCurrentCaddyTip()}`;
  const activeStats = st.teamStats?.[activeId];
  const mood = !activeStats ? 'brag' : activeStats.morale < 28 ? 'vulnerability' : activeStats.stamina < 35 ? 'taunt' : 'praise';
  return `${ARCHETYPE_STATS[activeId].name}: ${getArchetypeVoiceLine(activeId, mood)}`;
}

function getBottomHudLine() {
  return Math.floor(st.time / 6) % 2 === 0
    ? `${st.caddy.icon} ${getCurrentCaddyTip()}`
    : getActiveArchetypeHudLine();
}

function classifyGolfScoreOutcome(strokes, par) {
  if (strokes <= 1) return 'ace';
  const delta = strokes - par;
  if (delta <= -2) return 'eagle';
  if (delta === -1) return 'birdie';
  if (delta === 0) return 'par';
  if (delta === 1) return 'bogey';
  return 'double';
}

function getHolePar(world = getWorld(), holeNumber = st.holeInWorld) {
  const pars = world?.pars;
  if (!Array.isArray(pars) || !pars.length) return 4;
  return pars[clamp((holeNumber || 1) - 1, 0, pars.length - 1)] || 4;
}

function getShotReactionLine(id, scoreOutcome, result) {
  if (!id) return '';
  const scoreBundle = ARCHETYPE_SCORE_REACTIONS[id];
  const scoreLine = scoreBundle?.[scoreOutcome];
  if (scoreLine && scoreLine.length) {
    return `${ARCHETYPE_STATS[id]?.name || 'Archetype'}: ${pickRandom(scoreLine)}`;
  }
  const mood = (result === 'great' || result === 'good') ? 'praise' : 'taunt';
  return `${ARCHETYPE_STATS[id]?.name || 'Archetype'}: ${getArchetypeVoiceLine(id, mood)}`;
}

const TRAINING_DRILLS = [
  { id: 'pong', name: 'Customer Pong', mini: 'pong', desc: 'Rally complaints back at the AI. Service is a contact sport.' },
  { id: 'catch', name: 'Nugget Catcher', mini: 'catch', desc: 'Catch falling work items before they hit prod.' },
  { id: 'breakout', name: 'KPI Breakout', mini: 'breakout', desc: 'Smash quarterly goals with a bouncing ball.' },
  { id: 'flappy', name: 'Drone Flappy', mini: 'flappy', desc: 'Navigate bureaucratic gaps at altitude.' },
  { id: 'memory', name: 'Password Memory', mini: 'memory', desc: 'Match pairs before IT resets them.' },
  { id: 'tetris', name: 'Org Tetris', mini: 'tetris', desc: 'Stack departments. Clear lines. Survive reorg.' },
];

const FUNDING_THRESHOLDS = [0, 5000, 12000, 25000, 50000, 90000, 150000, 300000];

const WORLDS = [
  {
    id: 1,
    name: 'The Grease Trap',
    tag: 'Bootstrapped',
    fundingReq: 0,
    holes: 3,
    pars: [4, 3, 5],
    difficulty: 1.0,
    sky: ['#ff7a18', '#ffd36e'],
    ground: '#486b19',
    holeX: 610,
    holeY: 195,
    hazards: [
      { x: 410, y: 250, rx: 52, ry: 24, type: 'sand' },
      { x: 520, y: 190, rx: 58, ry: 26, type: 'water' },
    ],
    pregate: ['catch', 'pong'],
    chaos: ['pong'],
  },
  {
    id: 2,
    name: 'Fluorescent Purgatory',
    tag: 'Pre-Seed',
    fundingReq: 1,
    holes: 4,
    pars: [4, 5, 3, 4],
    difficulty: 1.2,
    sky: ['#4a90e2', '#9bd8ff'],
    ground: '#1b5e20',
    holeX: 650,
    holeY: 185,
    hazards: [
      { x: 370, y: 250, rx: 45, ry: 20, type: 'sand' },
      { x: 540, y: 225, rx: 60, ry: 28, type: 'water' },
    ],
    pregate: ['memory', 'pong'],
    chaos: ['pong', 'catch'],
  },
  {
    id: 3,
    name: 'Last Mile Limbo',
    tag: 'Seed',
    fundingReq: 2,
    holes: 4,
    pars: [5, 4, 3, 4],
    difficulty: 1.35,
    sky: ['#667eea', '#9cbafc'],
    ground: '#1f4334',
    holeX: 625,
    holeY: 200,
    hazards: [
      { x: 330, y: 210, rx: 54, ry: 22, type: 'water' },
      { x: 470, y: 285, rx: 46, ry: 20, type: 'sand' },
    ],
    pregate: ['flappy', 'memory'],
    chaos: ['pong', 'catch'],
  },
  {
    id: 4,
    name: 'The Rebrand Asylum',
    tag: 'Series A',
    fundingReq: 3,
    holes: 4,
    pars: [4, 4, 5, 3],
    difficulty: 1.6,
    sky: ['#f857a6', '#ffb7d5'],
    ground: '#29411d',
    holeX: 640,
    holeY: 190,
    hazards: [
      { x: 430, y: 210, rx: 58, ry: 24, type: 'water' },
      { x: 570, y: 275, rx: 42, ry: 18, type: 'sand' },
    ],
    pregate: ['twentyforty', 'tetris'],
    chaos: ['memory', 'flappy'],
  },
  {
    id: 5,
    name: 'Whiteboard Thunderdome',
    tag: 'Series B',
    fundingReq: 4,
    holes: 4,
    pars: [5, 4, 4, 3],
    difficulty: 1.9,
    sky: ['#141e30', '#243b55'],
    ground: '#23321d',
    holeX: 620,
    holeY: 180,
    hazards: [
      { x: 350, y: 250, rx: 48, ry: 20, type: 'sand' },
      { x: 520, y: 200, rx: 60, ry: 26, type: 'water' },
    ],
    pregate: ['twentyforty', 'breakout', 'ttt'],
    chaos: ['pong', 'flappy'],
  },
  {
    id: 6,
    name: 'The Algorithm Séance',
    tag: 'Series C',
    fundingReq: 5,
    holes: 5,
    pars: [4, 5, 4, 3, 4],
    difficulty: 2.1,
    sky: ['#66a6ff', '#89f7fe'],
    ground: '#164449',
    holeX: 660,
    holeY: 205,
    hazards: [
      { x: 310, y: 250, rx: 62, ry: 28, type: 'water' },
      { x: 490, y: 215, rx: 42, ry: 20, type: 'sand' },
      { x: 570, y: 285, rx: 45, ry: 18, type: 'sand' },
    ],
    pregate: ['breakout', 'memory', 'rps'],
    chaos: ['breakout', 'memory'],
  },
  {
    id: 7,
    name: 'Sand Hill Hunger Games',
    tag: 'Pre-IPO',
    fundingReq: 6,
    holes: 5,
    pars: [5, 4, 4, 3, 5],
    difficulty: 2.35,
    sky: ['#f7971e', '#ffd200'],
    ground: '#2f3a12',
    holeX: 650,
    holeY: 175,
    hazards: [
      { x: 390, y: 230, rx: 58, ry: 24, type: 'water' },
      { x: 540, y: 265, rx: 48, ry: 20, type: 'sand' },
    ],
    pregate: ['rps', 'tetris', 'ttt'],
    chaos: ['flappy', 'rps'],
  },
  {
    id: 8,
    name: 'The Golden Parachute Open',
    tag: 'IPO',
    fundingReq: 7,
    holes: 5,
    pars: [4, 5, 4, 4, 3],
    difficulty: 2.65,
    sky: ['#4b134f', '#c94b4b'],
    ground: '#1a2a1c',
    holeX: 680,
    holeY: 185,
    hazards: [
      { x: 320, y: 215, rx: 50, ry: 22, type: 'sand' },
      { x: 450, y: 250, rx: 60, ry: 26, type: 'water' },
      { x: 580, y: 230, rx: 45, ry: 18, type: 'sand' },
    ],
    pregate: ['rps', 'ttt', 'twentyforty'],
    chaos: ['rps', 'ttt'],
  }
];

const WORLD_REQUIREMENTS = {
  1: { rep: 0, hype: 0, compliance: 0, quarter: 1, note: 'Open to reckless founders.' },
  2: { rep: 45, hype: 35, compliance: 0, quarter: 1, note: 'Need modest corporate credibility.' },
  3: { rep: 52, hype: 40, compliance: 0, quarter: 2, note: 'Regional buzz required.' },
  4: { rep: 58, hype: 44, compliance: 45, quarter: 2, note: 'Marketing demands safe chaos.' },
  5: { rep: 62, hype: 55, compliance: 48, quarter: 3, note: 'Clout and performative rigor.' },
  6: { rep: 68, hype: 58, compliance: 55, quarter: 3, note: 'The suits want adults in the room.' },
  7: { rep: 74, hype: 68, compliance: 60, quarter: 4, note: 'VCs require polished delusion.' },
  8: { rep: 80, hype: 72, compliance: 68, quarter: 5, note: 'Governance must look real now.' },
};

function clonePowerups() {
  return POWERUPS.map(item => ({ ...item }));
}

function cloneEquipment() {
  return EQUIPMENT.map(item => ({ ...item }));
}

function getMetaDefaults() {
  return {
    unlockedWorlds: [1],
    leaderboard: [],
    trainingBest: {},
    arcadeBest: {},
    wealth: 0,
    settings: { music: true, sfx: true },
    uploadedRepos: [],
    discovered: { sponsors: [], competitors: [], hires: [] },
    touchOnboardingShown: false,
  };
}

function getFreshState() {
  return {
    screen: 'menu',
    menuIndex: 0,
    mouseX: W / 2,
    mouseY: H / 2,
    time: 0,
    lastTime: 0,
    shake: 0,
    autosaveTimer: 0,
    popups: [],
    particles: [],
    marqueeIndex: 0,
    runActive: false,
    continueAvailable: false,

    money: 5000,
    score: 0,
    totalStrokes: 0,
    totalMoneyEarned: 0,
    totalScoreEarned: 0,
    strikes: 0,
    maxStrikes: 3,
    streak: 0,
    burnRate: 500,
    runway: 24,
    valuation: 10000,
    equity: 100,
    funding: 0,
    ventureDebt: {
      active: false,
      principal: 0,
      rate: 0,
      originationQuarter: null,
      dueQuarter: null
    },

    totalHolesCleared: 0,
    currentWorld: 1,
    worldsUnlocked: [1],
    worldProgress: {},
    holeInWorld: 1,

    caddy: CADDIES[0],
    sponsors: DEFAULT_SPONSORS.map(v => ({ ...v })),
    competitors: DEFAULT_COMPETITORS.map(v => ({ ...v })),
    uploadedRepos: [],
    discovered: { sponsors: [], competitors: [], hires: [] },
    touchOnboardingShown: false,

    roster: [],
    bench: [],
    teamStats: {},
    jobOffers: [],
    jobFairScroll: 0, // USER-PLAYTEST-FIX — job fair scroll offset
    selectedBench: null,

    powerups: clonePowerups(),
    equipment: cloneEquipment(),

    swingPhase: 'ready',
    power: 0,
    acc: 50,
    dir: 1,
    windX: 0,
    club: 'Iron',
    swingAnim: 0,

    ballX: 150,
    ballY: 350,
    ballZ: 0,
    ballVX: 0,
    ballVY: 0,
    ballVZ: 0,
    ballFlying: false,
    ballSpin: 0,

    oppX: 150,
    oppY: 360,
    oppZ: 0,
    oppVX: 0,
    oppVY: 0,
    oppVZ: 0,
    oppFlying: false,
    oppSpin: 0,
    oppStrokes: 0,
    oppTimer: 2.0 + Math.random(),
    oppFinished: false,
    oppFinalStrokes: 0,

    camX: 0,
    camY: 0,

    prevScreen: null,

    pregateActive: false,
    pregateMini: null,
    pregateModifier: null,
    pregateTimer: 0,
    pregateWindow: { ...MINI_WINDOW_STANDARD },

    ipoIndex: 0,
    ipoFactions: [],
    ipoComplete: false,

    chaosActive: false,
    chaosMini: null,
    chaosTimer: 0,
    chaosLandingMod: { x: 0, y: 0 },
    chaosWindow: { ...MINI_WINDOW_CHAOS },

    boardMessage: '',
    boardOpen: false,
    boardImpact: null,

    quarter: 1,
    quarterProgress: 0,
    quarterGoal: 3,
    reputation: 52,
    hype: 46,
    compliance: 58,
    auditRisk: 12,
    strategyOffers: [],
    activeInitiatives: [],
    milestones: {},
    storyLog: ['The founders promised disciplined growth and immediately bought fog machines for the launch deck.'],

    trainingSelection: 0,
    trainingMini: null,
    trainingDrill: null,
    trainingTimer: 0,
    trainingScore: 0,
    trainingBest: {},

    arcadeSelection: 0,
    arcadePhase: 'select',
    arcadeGameId: null,
    arcadeMini: null,
    arcadeTimer: 0,
    arcadeScore: 0,
    arcadeBest: {},

    watch: null,

    repoStatus: '',
    shopTab: 'powerups',

    settings: { music: true, sfx: true },
    leaderboard: [],
    wealth: 0,
    // CS-4 FROZEN KEYS — must match FACTIONS object exactly
    ledger: {
      Vastcart: 0, Forgeharvest: 0, MechanicalCrow: 0, CoastalShadow: 0,
      FarmableFractions: 0, PredictiveCompliance: 0, AlgorithmicApprovals: 0,
      CursorSpectacles: 0, MigratoryFounders: 0,
      NativeHollows: 10, // player starts with a little goodwill from the locals
      CommitteeUnnecessarySynergy: 0
    },
    ledgerPopups: [],
    ledgerOverlayOpen: false,
    // CS-6 crisis tracking: set of faction keys currently in Blood Feud territory.
    // Prevents re-firing the crisis popup on every subsequent adjustStanding call.
    ledgerCrisisActive: {},
    // FIX B — bureaucracyTimer explicitly in state so resets on new run
    bureaucracyTimer: 0,
    // Phase 4 overlay tracking
    pitchShownForHole: {},   // { [holeNum]: true } — idempotency guard
    quarterlyShownForHole: {}, // { [holeNum]: true } — idempotency guard
    consecutiveLosses: 0,      // pivot crisis counter
    consecutiveDeclines: 0,    // spoon tracker for declining pitches
    everTookDebt: false,       // GP-1: Track if debt was ever utilized
    pivotCrisisLatched: false, // prevents re-opening pivot mid-crisis
    pivotSource: null,         // 'hotkey' | 'crisis' — set by triggerPivotTable
    pivotHistory: [],          // [{ id, hole, source }] — CS-8 persists this
    currentPitch: null,
    currentReviewTemplate: null,
    currentReviewVoiceLine: null,
    currentReviewDebtLine: null,
    currentBureaucracyEvent: null, // GP-2: active choice-based bureaucracy event
    lastQuarterDebtEvent: null,
    lastQuarterDebtEventQuarter: null,
    // CS-8 v4 locked sub-objects — initialised empty for new runs
    footnoteState: { unlocked: [], unread: [] }, // GP-1: Architect footnote IDs unlocked this run
    currentFootnote: null,                        // GP-1: Active Architect footnote object
    footnoteTimer: 0,                             // GP-1: Time remaining for current footnote display
    footnoteLedgerScroll: 0,                      // Narrative UI: scroll offset for the footnote ledger
    footnoteLedgerFocusId: null,                  // Narrative UI: focused ledger entry for deliberate reading
    spoonState:    { awarded: [], count: 0 }, // GP-5: Ceremonial Spoon award tracking
    // pivotState is derived from pivotHistory at save time; no separate live field needed
    // CS-7: endgame political ceremony
    gameOverCeremony: null,  // set by computeCeremony() in endRun()
    ceremonyPhase: 0,        // 0=stats  1=ledger summary  2=identity verdict
    liquidationSummary: null, // { principal, interest, flavor }
    previewOverlay: null, // 'epilogue' | 'spoon' for menu-only visual inspection shortcuts
    // Screen transition
    transition: 0,        // 0 = no transition, >0 = fade progress (0→1→0)
    transitionDir: 0,     // 1 = fading out, -1 = fading in
    transitionTarget: null,
  };
}

let meta = loadMeta();
let st = getFreshState();
applyMetaToState();
refreshMenuContinueState();

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {}
}

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function loadMeta() {
  const merged = { ...getMetaDefaults(), ...(safeGet(META_KEY) || {}) };
  if (!Array.isArray(merged.unlockedWorlds) || merged.unlockedWorlds.length === 0) merged.unlockedWorlds = [1];
  if (!Array.isArray(merged.leaderboard)) merged.leaderboard = [];
  if (!merged.trainingBest) merged.trainingBest = {};
  if (!merged.arcadeBest) merged.arcadeBest = {};
  if (!merged.settings) merged.settings = { music: true, sfx: true };
  if (!merged.discovered) merged.discovered = { sponsors: [], competitors: [], hires: [] };
  if (!Array.isArray(merged.uploadedRepos)) merged.uploadedRepos = [];
  merged.touchOnboardingShown = !!merged.touchOnboardingShown;
  return merged;
}

function saveMeta() {
  meta.unlockedWorlds = [...new Set(st.worldsUnlocked)].sort((a, b) => a - b);
  meta.leaderboard = st.leaderboard.slice(0, 12);
  meta.trainingBest = { ...st.trainingBest };
  meta.arcadeBest = { ...st.arcadeBest };
  meta.settings = { ...st.settings };
  meta.wealth = st.wealth;
  meta.uploadedRepos = st.uploadedRepos.map(r => ({ ...r }));
  meta.discovered = {
    sponsors: st.discovered.sponsors.map(v => ({ ...v })),
    competitors: st.discovered.competitors.map(v => ({ ...v })),
    hires: st.discovered.hires.map(v => ({ ...v })),
  };
  meta.touchOnboardingShown = !!st.touchOnboardingShown;
  safeSet(META_KEY, meta);
}

function applyMetaToState() {
  st.worldsUnlocked = [...new Set(meta.unlockedWorlds)].sort((a, b) => a - b);
  st.leaderboard = meta.leaderboard.slice();
  st.trainingBest = { ...meta.trainingBest };
  st.arcadeBest = { ...meta.arcadeBest };
  st.settings = { ...meta.settings };
  st.wealth = meta.wealth || 0;
  st.uploadedRepos = meta.uploadedRepos.map(v => ({ ...v }));
  st.discovered = {
    sponsors: meta.discovered.sponsors.map(v => ({ ...v })),
    competitors: meta.discovered.competitors.map(v => ({ ...v })),
    hires: meta.discovered.hires.map(v => ({ ...v })),
  };
  st.touchOnboardingShown = !!meta.touchOnboardingShown;
  st.sponsors.push(...st.discovered.sponsors);
  st.competitors.push(...st.discovered.competitors);
}

// ── CS-8: SAVE FORMAT v4 ──────────────────────────────────────────────────────
// Internal version history (stored in save.version):
//   v1 — original Phase 1/2 shape (pre-Phase 4)
//   v2 — added ledger, Phase 4 overlay state (CS-1/2/3)
//   v3 — added bureaucracyTimer, ledgerCrisisActive (CS-5/6)
//   v4 — LOCKED SHAPE: adds footnoteState, spoonState, pivotState sub-objects
//          footnoteState: { unlocked: [] }        — GP-1 Architect footnote tracking
//          spoonState:    { awarded: [], count: 0 } — GP-5 Ceremonial Spoon tracking
//          pivotState:    { history: [], lastId: null, totalCount: 0 }
//                                                   — CS-3 pivot history (replaces raw array)
//
// Migration ladder in loadRun() fills any missing field with a safe default,
// so ALL older saves (v1–v3) reload cleanly into the v4 shape.
// ── END VERSION HISTORY ───────────────────────────────────────────────────────

function saveRun() {
  if (!st.runActive) return;

  // CS-8: build the three locked sub-objects from live state
  const footnoteUnlocked = Array.isArray(st.footnoteState?.unlocked)
    ? st.footnoteState.unlocked
    : Array.isArray(st.footnoteState?.seen)
      ? st.footnoteState.seen
      : [];
  const footnoteUnread = Array.isArray(st.footnoteState?.unread)
    ? st.footnoteState.unread
    : [];
  const footnoteState = {
    unlocked: footnoteUnlocked.slice(),
    unread: footnoteUnread.filter(id => footnoteUnlocked.includes(id)).slice()
  };

  const spoonState = st.spoonState
    ? {
        awarded:  Array.isArray(st.spoonState.awarded) ? st.spoonState.awarded.slice() : [],
        count:    typeof st.spoonState.count === 'number' ? st.spoonState.count : 0
      }
    : { awarded: [], count: 0 };

  // pivotState absorbs the old flat pivotHistory array
  const pivotState = {
    history:    Array.isArray(st.pivotHistory) ? st.pivotHistory.slice(-20) : [],
    lastId:     st.pivotHistory?.length ? st.pivotHistory[st.pivotHistory.length - 1]?.id ?? null : null,
    totalCount: Array.isArray(st.pivotHistory) ? st.pivotHistory.length : 0
  };

  safeSet(SAVE_KEY, {
    version: 4,                         // CS-8: locked v4 shape
    money: st.money,
    score: st.score,
    strikes: st.strikes,
    maxStrikes: st.maxStrikes,
    streak: st.streak,
    burnRate: st.burnRate,
    runway: st.runway,
    valuation: st.valuation,
    equity: st.equity,
    funding: st.funding,
    ventureDebt: st.ventureDebt,
    totalHolesCleared: st.totalHolesCleared,
    currentWorld: st.currentWorld,
    worldsUnlocked: st.worldsUnlocked,
    worldProgress: st.worldProgress,
    holeInWorld: st.holeInWorld,
    roster: st.roster,
    bench: st.bench,
    teamStats: st.teamStats,
    sponsors: st.sponsors,
    competitors: st.competitors,
    caddyIndex: CADDIES.findIndex(c => c.name === st.caddy.name),
    powerups: st.powerups,
    equipment: st.equipment,
    wealth: st.wealth,
    quarter: st.quarter,
    quarterProgress: st.quarterProgress,
    quarterGoal: st.quarterGoal,
    reputation: st.reputation,
    hype: st.hype,
    compliance: st.compliance,
    auditRisk: st.auditRisk,
    strategyOffers: st.strategyOffers,
    activeInitiatives: st.activeInitiatives,
    milestones: st.milestones,
    ballSpin: st.ballSpin,
    oppX: st.oppX,
    oppY: st.oppY,
    oppZ: st.oppZ,
    oppVX: st.oppVX,
    oppVY: st.oppVY,
    oppVZ: st.oppVZ,
    oppFlying: st.oppFlying,
    oppSpin: st.oppSpin,
    oppStrokes: st.oppStrokes,
    prevScreen: st.prevScreen,
    ledger: st.ledger,
    // Phase 4 overlay idempotency guards
    currentPitchId:           st.currentPitch ? st.currentPitch.title : null,
    currentReviewTemplateId:  st.currentReviewTemplate ? st.currentReviewTemplate.id : null,
    currentReviewVoiceLine:   st.currentReviewVoiceLine,
    currentReviewDebtLine:    st.currentReviewDebtLine,
    currentBureaucracyEventId: st.currentBureaucracyEvent ? st.currentBureaucracyEvent.id : null,
    pitchShownForHole:        st.pitchShownForHole,
    quarterlyShownForHole:    st.quarterlyShownForHole,
    consecutiveLosses:        st.consecutiveLosses,
    consecutiveDeclines:      st.consecutiveDeclines,
    pivotCrisisLatched:       st.pivotCrisisLatched,
    // CS-3 (now via pivotState): keep raw array for backward compat reads
    pivotHistory:             pivotState.history,
    // CS-6 Phase 4 timers
    bureaucracyTimer:         st.bureaucracyTimer || 0,
    ledgerCrisisActive:       st.ledgerCrisisActive || {},
    // CS-8 v4 locked sub-objects
    footnoteState,
    spoonState,
    pivotState,
  });
  refreshMenuContinueState();
}

function loadRun() {
  let save = safeGet(SAVE_KEY);

  // ── Legacy key migration: old skydisorder_v4_run → current key ──────────────
  if (!save) {
    const legacy = safeGet(SAVE_KEY_LEGACY_V4);
    if (legacy) {
      console.log('[save] CS-8: migrating legacy key save → current key');
      save = { ...legacy }; // version field inside will drive the ladder below
      safeSet(SAVE_KEY, save);
      try { localStorage.removeItem(SAVE_KEY_LEGACY_V4); } catch (e) {}
    }
  }
  if (!save) return false;

  const ver = save.version ?? 1;
  if (ver < 4) console.log(`[save] CS-8: migrating save v${ver} → v4`);

  // ── Core fields (present in all versions) ───────────────────────────────────
  st.runActive          = true;
  st.money              = save.money              ?? 5000;
  st.score              = save.score              ?? 0;
  st.strikes            = save.strikes            ?? 0;
  st.maxStrikes         = save.maxStrikes         ?? 3;
  st.streak             = save.streak             ?? 0;
  st.burnRate           = save.burnRate           ?? 500;
  st.runway             = save.runway             ?? 24;
  st.valuation          = save.valuation          ?? 10000;
  st.equity             = save.equity             ?? 100;
  st.funding            = save.funding            ?? 0;
  st.ventureDebt        = {
    active: !!save.ventureDebt?.active,
    principal: save.ventureDebt?.principal ?? 0,
    rate: save.ventureDebt?.rate ?? 0,
    originationQuarter: save.ventureDebt?.originationQuarter ?? null,
    dueQuarter: save.ventureDebt?.dueQuarter ?? null
  };
  st.totalHolesCleared  = save.totalHolesCleared  ?? 0;
  st.currentWorld       = save.currentWorld       ?? 1;
  st.worldsUnlocked     = save.worldsUnlocked     || st.worldsUnlocked;
  st.worldProgress      = save.worldProgress      || {};
  st.holeInWorld        = save.holeInWorld        || 1;
  st.roster             = save.roster             || [];
  st.bench              = save.bench              || [];
  st.teamStats          = save.teamStats          || {};
  st.sponsors           = (save.sponsors    || DEFAULT_SPONSORS).map(v => ({ ...v }));
  st.competitors        = (save.competitors || DEFAULT_COMPETITORS).map(v => ({ ...v }));
  st.caddy              = CADDIES[Math.max(0, save.caddyIndex || 0)] || CADDIES[0];
  // USER-PLAYTEST-FIX — merge saved powerups with the current catalog so saves
  // made before new powerups existed still see the full shop roster.
  const savedPowerups = (save.powerups || []).map(v => ({ ...v }));
  st.powerups           = clonePowerups().map(def => savedPowerups.find(p => p.id === def.id) || def);
  st.equipment          = (save.equipment  || cloneEquipment()).map(v => ({ ...v }));
  st.wealth             = save.wealth             || st.wealth;
  st.quarter            = save.quarter            ?? 1;
  st.quarterProgress    = save.quarterProgress    ?? 0;
  st.quarterGoal        = save.quarterGoal        ?? 3;
  st.reputation         = save.reputation         ?? 52;
  st.hype               = save.hype               ?? 46;
  st.compliance         = save.compliance         ?? 58;
  st.auditRisk          = save.auditRisk          ?? 12;
  st.strategyOffers     = Array.isArray(save.strategyOffers)    ? save.strategyOffers.map(v => ({ ...v }))    : [];
  st.activeInitiatives  = Array.isArray(save.activeInitiatives) ? save.activeInitiatives.map(v => ({ ...v })) : [];
  st.milestones         = save.milestones         || {};
  st.storyLog           = Array.isArray(save.storyLog) && save.storyLog.length
                            ? save.storyLog.slice(0, 18) : st.storyLog;
  st.oppX               = save.oppX               ?? 150;
  st.oppY               = save.oppY               ?? 360;
  st.oppZ               = save.oppZ               ?? 0;
  st.oppVX              = save.oppVX              ?? 0;
  st.oppVY              = save.oppVY              ?? 0;
  st.oppVZ              = save.oppVZ              ?? 0;
  st.oppFlying          = save.oppFlying          ?? false;
  st.oppSpin            = save.oppSpin            ?? 0;
  st.oppStrokes         = save.oppStrokes         ?? 0;
  st.prevScreen         = save.prevScreen         ?? null;

  // ── Ledger: migrate old camelCase keys → frozen PascalCase (CS-4) ───────────
  const rawLedger = save.ledger || {};
  const oldToNew = {
    vastcart: 'Vastcart', forgeharvest: 'Forgeharvest', mechanicalCrows: 'MechanicalCrow',
    coastalShadow: 'CoastalShadow', solemnOrderFractions: 'FarmableFractions',
    ordinancedMinistry: 'PredictiveCompliance', bespokeApothecary: 'AlgorithmicApprovals',
    foundersRow: 'CursorSpectacles', trustFundDevotional: 'MigratoryFounders',
    nativeHollows: 'NativeHollows', lossHarvesting: 'CommitteeUnnecessarySynergy'
  };
  const migratedLedger = {};
  for (const frozen of Object.keys(FACTIONS)) {
    migratedLedger[frozen] = rawLedger[frozen]
      ?? rawLedger[Object.keys(oldToNew).find(k => oldToNew[k] === frozen)]
      ?? 0;
  }
  // NativeHollows starts at +10 for new saves only
  if (migratedLedger.NativeHollows === 0 && !rawLedger.NativeHollows && !rawLedger.nativeHollows) {
    migratedLedger.NativeHollows = 10;
  }
  st.ledger = migratedLedger;

  // ── v2+ fields: Phase 4 overlay state (CS-1/2/3) ────────────────────────────
  st.pitchShownForHole     = save.pitchShownForHole     || {};
  st.quarterlyShownForHole = save.quarterlyShownForHole || {};
  st.consecutiveLosses     = save.consecutiveLosses     ?? 0;
  st.consecutiveDeclines   = save.consecutiveDeclines   ?? 0;
  st.pivotCrisisLatched    = save.pivotCrisisLatched    ?? false;

  st.currentPitch = save.currentPitchId
    ? (PITCH_DECK.find(p => p.title === save.currentPitchId) || null)
    : null;
  if (save.prevScreen === 'pitch' || save.screen === 'pitch') st.currentPitch = null;

  st.currentReviewTemplate = save.currentReviewTemplateId
    ? (QUARTERLY_TEMPLATES.find(t => t.id === save.currentReviewTemplateId) || null)
    : null;
  st.currentReviewVoiceLine = save.currentReviewVoiceLine ?? null;
  st.currentReviewDebtLine = save.currentReviewDebtLine ?? null;
  if (save.prevScreen === 'review' || save.screen === 'review') {
    st.currentReviewTemplate = null;
    st.currentReviewVoiceLine = null;
    st.currentReviewDebtLine = null;
  }

  st.currentBureaucracyEvent = save.currentBureaucracyEventId
    ? (BUREAUCRACY_EVENTS.find(e => e.id === save.currentBureaucracyEventId) || null)
    : null;
  if (save.prevScreen === 'bureaucracy' || save.screen === 'bureaucracy') st.currentBureaucracyEvent = null;

  st.pivotSource = null; // never resume mid-pivot-open

  // ── v3+ fields: CS-5/6 timers ───────────────────────────────────────────────
  st.bureaucracyTimer = save.bureaucracyTimer ?? 0;
  // ledgerCrisisActive is always reconstructed from ledger (never trust the save)
  st.ledgerCrisisActive = {};
  for (const [key, val] of Object.entries(st.ledger)) {
    if (val <= COLLAPSE_THRESHOLD) st.ledgerCrisisActive[key] = true;
  }

  // ── v4 locked sub-objects (CS-8) ─────────────────────────────────────────────
  // footnoteState — safe default if absent, with migration from older { seen: [] } saves
  const rawFootnote = save.footnoteState;
  const migratedFootnotes = Array.isArray(rawFootnote?.unlocked)
    ? rawFootnote.unlocked
    : Array.isArray(rawFootnote?.seen)
      ? rawFootnote.seen
      : [];
  const migratedUnread = Array.isArray(rawFootnote?.unread)
    ? rawFootnote.unread.filter(id => migratedFootnotes.includes(id))
    : [];
  st.footnoteState = {
    unlocked: migratedFootnotes.slice(),
    unread: migratedUnread.slice()
  };
  st.footnoteLedgerScroll = 0;

  // spoonState — safe default if absent
  const rawSpoon = save.spoonState;
  st.spoonState = {
    awarded: Array.isArray(rawSpoon?.awarded) ? rawSpoon.awarded.slice() : [],
    count:   typeof rawSpoon?.count === 'number' ? rawSpoon.count : 0
  };

  // pivotState — prefer the structured sub-object; fall back to flat pivotHistory array
  const rawPivot = save.pivotState;
  if (rawPivot && Array.isArray(rawPivot.history)) {
    st.pivotHistory = rawPivot.history.slice(-20);
  } else {
    // v2/v3 saves stored a flat pivotHistory array at the top level
    st.pivotHistory = Array.isArray(save.pivotHistory) ? save.pivotHistory.slice(-20) : [];
  }

  // ── Final setup ──────────────────────────────────────────────────────────────
  if (!st.strategyOffers.length) refreshStrategyOffers();
  st.screen = 'playing';
  resetBall();
  refreshMenuContinueState();
  return true;
}

function clearRun() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_LEGACY_V4);
  } catch (err) {}
  refreshMenuContinueState();
}

function refreshMenuContinueState() {
  st.continueAvailable = !!(safeGet(SAVE_KEY) || safeGet(SAVE_KEY_LEGACY_V4));
}

function ensureAudio() {
  if (!AC) return;
  if (AC.state === 'suspended') AC.resume().catch(() => {});
  startMusic(); // JUICE — music starts on first user gesture, idempotent
}

function beep(freq = 440, dur = 0.08, type = 'square', gainVal = 0.06) {
  if (!AC || !st.settings.sfx) return;
  const osc = AC.createOscillator();
  const gain = AC.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainVal, AC.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
  osc.connect(gain);
  gain.connect(AC._sfx || AC.destination);
  osc.start();
  osc.stop(AC.currentTime + dur);
}

function playClick() { beep(700, 0.03, 'square', 0.04); }
function playSwing() { beep(180, 0.06, 'sawtooth', 0.06); setTimeout(() => beep(120, 0.1, 'sawtooth', 0.05), 35); }
function playHit() { beep(860, 0.04, 'square', 0.05); setTimeout(() => beep(530, 0.05, 'square', 0.04), 20); }
function playSuccess() { 
  duckSfx(0.15, 0.6); // Duck any other SFX slightly for the jingle
  beep(523, 0.07, 'triangle', 0.06); 
  setTimeout(() => beep(659, 0.07, 'triangle', 0.06), 70); 
  setTimeout(() => beep(784, 0.12, 'triangle', 0.06), 140); 
}
function playFail() { 
  duckSfx(0.15, 0.5);
  beep(180, 0.1, 'sawtooth', 0.06); 
  setTimeout(() => beep(130, 0.15, 'sawtooth', 0.05), 90); 
}
// FIX A — playExplode was called in landOpponent() but was never defined
function playExplode() { beep(120, 0.18, 'sawtooth', 0.08); setTimeout(() => beep(80, 0.22, 'sawtooth', 0.06), 60); setTimeout(() => beep(55, 0.28, 'sawtooth', 0.05), 140); }

// ============================================================
// JUICE — PROCEDURAL MUSIC ("The Quillhaven Court Minstrel")
// Buildless chiptune loop: no assets, pure WebAudio scheduling.
// A mock-medieval minor-key arpeggio over a droning bass — a town
// charter hummed by an elevator. Gated by st.settings.music.
// To swap in real music later: replace musicTick()'s scheduling
// with a looping AudioBufferSourceNode routed through MUSIC.gain.
// ============================================================
const MUSIC = { timer: null, step: 0, nextTime: 0, gain: null };
const MUSIC_BASS = [110, 110, 87.31, 98];                                   // A2 A2 F2 G2 — solemn civic drone
const MUSIC_ARP  = [220, 261.63, 329.63, 261.63, 293.66, 220, 329.63, 392]; // A-minor noodle with delusions of grandeur
function musicNote(freq, when, dur, type, vol) {
  const osc = AC.createOscillator();
  const g = AC.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(MUSIC.gain);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}
function musicTick() {
  if (!AC) return;
  if (!st.settings.music) { MUSIC.nextTime = AC.currentTime; return; } // stay in sync while muted
  const lookahead = 0.45;
  while (MUSIC.nextTime < AC.currentTime + lookahead) {
    const stepDur = 0.22; // ~136bpm eighths
    const s = MUSIC.step;
    if (s % 2 === 0) musicNote(MUSIC_BASS[Math.floor(s / 8) % MUSIC_BASS.length], MUSIC.nextTime, 0.34, 'triangle', 0.045);
    musicNote(MUSIC_ARP[s % MUSIC_ARP.length] * (s % 32 >= 16 ? 1.5 : 1), MUSIC.nextTime, 0.17, 'square', 0.02);
    if (s % 16 === 12) musicNote(MUSIC_ARP[(s + 3) % MUSIC_ARP.length] * 2, MUSIC.nextTime, 0.32, 'sine', 0.028);
    MUSIC.nextTime += stepDur;
    MUSIC.step++;
  }
}
function startMusic() {
  if (!AC || MUSIC.timer) return;
  if (!MUSIC.gain) {
    MUSIC.gain = AC.createGain();
    MUSIC.gain.gain.value = 0.9;
    MUSIC.gain.connect(AC._master || AC.destination);
  }
  MUSIC.nextTime = AC.currentTime + 0.1;
  MUSIC.timer = setInterval(musicTick, 120);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function rect(x, y, w, h, color, radius = 0, stroke = null, line = 1) {
  X.save();
  if (radius > 0) {
    roundRectPath(X, x, y, w, h, radius);
    X.fillStyle = color;
    X.fill();
    if (stroke) {
      X.strokeStyle = stroke;
      X.lineWidth = line;
      X.stroke();
    }
  } else {
    X.fillStyle = color;
    X.fillRect(x, y, w, h);
    if (stroke) {
      X.strokeStyle = stroke;
      X.lineWidth = line;
      X.strokeRect(x, y, w, h);
    }
  }
  X.restore();
}

function txt(text, x, y, size, color, outline = true, align = 'center') {
  X.save();
  X.font = `bold ${size}px "Press Start 2P","Courier New",monospace`;
  X.textAlign = align;
  X.textBaseline = 'middle';
  if (outline) {
    X.lineWidth = Math.max(2, size / 5);
    X.strokeStyle = 'rgba(0,0,0,0.9)';
    X.strokeText(text, x, y);
  }
  X.fillStyle = color;
  X.fillText(text, x, y);
  X.restore();
}

// CS-10 PERF: wrapLines is called every frame by many static-text overlays
// (bureaucracy, pitch, review, pivot, spoon ceremony, epilogue, IPO, gameover,
// boardroom, HUD footnote toast). Each call previously allocated a split array,
// intermediate strings, and a result array on EVERY frame the overlay was open,
// producing steady GC pressure. Since the input text and wrap width are constant
// while an overlay is up, we memoize by "text|maxChars" so a cache hit returns
// the same array with zero allocations. Behavior/output is identical.
const _wrapCache = new Map();
const _WRAP_CACHE_LIMIT = 400;
function computeWrapLines(text, maxChars) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function wrapLines(text, maxChars) {
  const key = maxChars + '|' + text;
  const cached = _wrapCache.get(key);
  if (cached) return cached;
  const lines = computeWrapLines(text, maxChars);
  // Simple size cap to prevent unbounded growth from highly dynamic text.
  if (_wrapCache.size >= _WRAP_CACHE_LIMIT) _wrapCache.clear();
  _wrapCache.set(key, lines);
  return lines;
}

function panel(x, y, w, h, title = '') {
  rect(x, y, w, h, 'rgba(10,20,16,0.92)', 8, COL.cyan, 2);
  if (title) {
    rect(x, y, w, 24, 'rgba(58,24,64,0.95)', 8);
    txt(title, x + w / 2, y + 12, 8, COL.cyan, false);
  }
}

function drawButton(x, y, w, h, label, active = false, color = COL.yel, pulse = false) {
  const hovered = st.mouseX > x && st.mouseX < x + w && st.mouseY > y && st.mouseY < y + h;
  const actualColor = hovered ? COL.white : color;
  const fill = active ? actualColor : (hovered ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.65)');
  const fg = active ? '#111' : actualColor;
  const glow = pulse ? 8 + Math.sin(st.time * 7) * 4 : (hovered ? 6 : 0);
  X.save();
  if (glow > 0) {
    X.shadowColor = actualColor;
    X.shadowBlur = glow;
  }
  rect(x, y, w, h, fill, 5, active ? actualColor : (hovered ? COL.white : '#4a4a4a'), active || hovered ? 2 : 1);
  X.restore();
  const fontSize = clamp(Math.min(10, w / Math.max(5, label.length * 0.8)), 5, 10);
  txt(label, x + w / 2, y + h / 2, fontSize, fg, false);
}

// ============================================================
// PHASE 2 — OBJECT POOLING & OPTIMIZATION (B.1)
// ============================================================
class Pool {
  constructor(factory, reset, initial = 32) {
    this._free = []; this._factory = factory; this._reset = reset;
    for (let i = 0; i < initial; i++) this._free.push(factory());
  }
  acquire() { return this._free.length ? this._free.pop() : this._factory(); }
  release(obj) { this._reset(obj); this._free.push(obj); }
}
const particlePool = new Pool(
  () => ({ x:0, y:0, vx:0, vy:0, life:0, maxLife:1, size:2, color:'#fff', spin:0, rot:0, gravity:100, world:true, _dead:false }),
  (p) => { p._dead = false; p.life = 0; },
  128
);
const popupPool = new Pool(
  () => ({ text:'', x:0, y:0, vy:-28, life:0, maxLife:1.6, color:'#fff', size:14, world:true, _dead:false }),
  (p) => { p._dead = false; p.text=''; p.life=0; }
);

function spawnParticle(x, y, opts = {}) {
  const p = particlePool.acquire();
  Object.assign(p, opts);
  p.x = x; p.y = y;
  p.maxLife = opts.maxLife || 1.1;
  p.life = p.maxLife; // We'll count down since that's what the current system does
  p.rot = opts.rot || rand(0, Math.PI * 2);
  p.spin = opts.spin || rand(-8, 8);
  p.gravity = opts.gravity || rand(90, 180);
  p.world = opts.world !== undefined ? opts.world : true;
  st.particles.push(p);
}

function spawnPopup(text, x, y, opts = {}) {
  const p = popupPool.acquire();
  p.text = text; p.x = x; p.y = y;
  p.maxLife = opts.life || 1.6;
  p.life = p.maxLife;
  p.color = opts.color || COL.white;
  p.size = opts.size || 14;
  p.world = opts.world !== undefined ? opts.world : true;
  p.vy = opts.vy || -28;
  st.popups.push(p);
}

function addPopup(text, x, y, color = COL.white, size = 14, life = 1.6, world = true) {
  spawnPopup(text, x, y, { color, size, life, world });
}

function addBurst(x, y, color = COL.yel, count = 16, speed = 140, world = true) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    spawnParticle(x, y, {
      vx: Math.cos(a) * rand(speed * 0.4, speed),
      vy: Math.sin(a) * rand(speed * 0.4, speed),
      maxLife: rand(0.4, 1.1),
      size: rand(2, 6),
      color,
      world
    });
  }
}

function updateFx(dt) {
  // Update popups
  for (let i = st.popups.length - 1; i >= 0; i--) {
    const p = st.popups[i];
    p.life -= dt;
    p.y += p.vy * dt;
    if (p.life <= 0) {
      popupPool.release(st.popups.splice(i, 1)[0]);
    }
  }

  // Update particles
  for (let i = st.particles.length - 1; i >= 0; i--) {
    const p = st.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.rot += p.spin * dt;
    if (p.life <= 0) {
      particlePool.release(st.particles.splice(i, 1)[0]);
    }
  }

  if (st.shake > 0) st.shake *= 0.92;
  if (st.shake < 0.15) st.shake = 0;
}

function drawFx() {
  X.save();
  for (const p of st.particles) {
    X.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    X.translate(p.x, p.y);
    X.rotate(p.rot);
    X.fillStyle = p.color;
    X.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
    X.rotate(-p.rot);
    X.translate(-p.x, -p.y);
  }
  X.restore();

  for (const p of st.popups) {
    X.save();
    X.globalAlpha = clamp(p.life / Math.min(0.45, p.maxLife), 0, 1);
    txt(p.text, p.x, p.y, p.size, p.color, true);
    X.restore();
  }
}

function gaussian(mean, std) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// CS-10 PERF: non-allocating blood-feud test. The playing-screen background
// draws every frame and previously called Object.values(st.ledger).some(...),
// which allocates a fresh array 60x/sec. This iterates the object in place with
// no allocation. Same result.
function hasBloodFeud() {
  const ledger = st.ledger;
  for (const k in ledger) {
    if (ledger[k] <= COLLAPSE_THRESHOLD) return true;
  }
  return false;
}

function getWorld() {
  return WORLDS.find(w => w.id === st.currentWorld) || WORLDS[0];
}

function currentWorldProgress() {
  return st.worldProgress[st.currentWorld] || 0;
}

function getRarityColor(r) {
  if (r === 'legendary') return COL.gold;
  if (r === 'epic') return COL.pur;
  if (r === 'rare') return COL.cyan;
  if (r === 'uncommon') return COL.grn;
  return '#888';
}

function getCurrentSponsor() {
  return st.sponsors[(st.totalHolesCleared || 0) % st.sponsors.length] || DEFAULT_SPONSORS[0];
}

function getCurrentCaddyTip() {
  const tips = st.caddy.tips;
  return tips[Math.floor(st.time / 4) % tips.length];
}

function resetBall() {
  const world = getWorld();
  const startX = Math.max(150, world.holeX - 450 + Math.random() * 50);
  const startY = world.holeY + 150 + Math.random() * 50; // Dynamic starting position

  st.ballX = startX;
  st.ballY = startY;
  st.ballZ = 0;
  st.ballVX = 0;
  st.ballVY = 0;
  st.ballVZ = 0;
  st.ballFlying = false;
  st.ballSpin = 0;
  // USER-PLAYTEST-FIX — golfer stands at the tee; he no longer flies with the ball
  st.golferX = startX;
  st.golferY = startY;

  if (!st.oppFinished) {
    st.oppX = startX + 10 + Math.random() * 20;
    st.oppY = startY - 10 + Math.random() * 20;
    st.oppZ = 0;
    st.oppVX = 0;
    st.oppVY = 0;
    st.oppVZ = 0;
    st.oppFlying = false;
    st.oppSpin = 0;
  }

  // st.camX = 0; // REMOVED to allow smooth lerping
  // st.camY = 0; // REMOVED to allow smooth lerping

  st.swingPhase = 'ready';
  st.power = 0;
  st.acc = 50;
  st.dir = 1;
  st.swingAnim = 0;
  st.windX = rand(-1.8, 1.8) * world.difficulty;
  st.club = st.club || 'Iron';
  st.pregateModifier = null;
  st.chaosLandingMod = { x: 0, y: 0 };
  st.chaosActive = false;
  st.chaosMini = null;
}

function initTeam() {
  st.roster = ['bentonville_chad', 'fayetteville_fran', 'burnout_becky'];
  st.bench = [];
  st.teamStats = {};
  for (const id of st.roster) {
    st.teamStats[id] = { stamina: 100, morale: 75, loyalty: 50 };
  }
}

function logStory(text) {
  st.storyLog.unshift(text);
  st.storyLog = st.storyLog.slice(0, 18);
}

// Fix #13 — Dialogue fallback
function getDialogue(key) {
  return DIALOGUE[key] || DIALOGUE.boardroom_default || [{ who:'Narrator', line:'The room goes quiet in the most expensive way possible.' }];
}

function maybeShowTouchOnboarding() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch || st.touchOnboardingShown) return;
  addPopup(pickTouchTooltip(), W / 2, H - 40, COL.cyan, 8, 4.5);
  st.touchOnboardingShown = true;
  saveMeta();
  saveRun();
}

// Fix #11 — lerp helper
function lerp(a, b, t) { return a + (b - a) * t; }

// Fix #5 — refreshStrategyOffers dedup
function refreshStrategyOffers() {
  const seen = new Set();
  st.strategyOffers = STRATEGY_CARDS
    .slice()
    .sort(() => Math.random() - 0.5)
    .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .slice(0, 3)
    .map(card => ({ ...card }));
}

function adjustTeamMorale(delta) {
  for (const id of [...st.roster, ...st.bench]) {
    if (!st.teamStats[id]) continue;
    st.teamStats[id].morale = clamp(st.teamStats[id].morale + delta, 0, 100);
  }
}

function applyStatChange(key, value) {
  if (!value) return;
  if (key === 'money') st.money += value;
  else if (key === 'burnRate') st.burnRate = Math.max(120, st.burnRate + value);
  else if (key === 'reputation') st.reputation = clamp(st.reputation + value, 0, 100);
  else if (key === 'hype') st.hype = clamp(st.hype + value, 0, 100);
  else if (key === 'compliance') st.compliance = clamp(st.compliance + value, 0, 100);
  else if (key === 'auditRisk') st.auditRisk = clamp(st.auditRisk + value, 0, 100);
  else if (key === 'morale') adjustTeamMorale(value);
}

function applyStrategyOffer(index) {
  const card = st.strategyOffers[index];
  if (!card) return;
  Object.entries(card.effect).forEach(([key, value]) => applyStatChange(key, value));
  st.activeInitiatives.unshift({ id: card.id, title: `${card.icon} ${card.title}`, duration: 3, effect: { ...card.effect } });
  st.activeInitiatives = st.activeInitiatives.slice(0, 4);
  logStory(card.desc);
  addPopup(`${card.icon} ${card.title}`, W / 2, 156, COL.gold, 12);
  if (card.effect.money) addPopup(`${card.effect.money > 0 ? '+' : ''}$${card.effect.money}`, W / 2, 182, card.effect.money > 0 ? COL.grn : COL.red, 10);
  playSuccess();
  refreshStrategyOffers();
  saveRun();
}

function processInitiativesAfterHole() {
  const remaining = [];
  for (const init of st.activeInitiatives) {
    if (init.id === 'ai_pivot') st.hype = clamp(st.hype + 2, 0, 100);
    if (init.id === 'cost_cut') st.burnRate = Math.max(120, st.burnRate - 8);
    if (init.id === 'community_push') st.reputation = clamp(st.reputation + 1, 0, 100);
    if (init.id === 'enterprise_sprint') st.money += 120;
    if (init.id === 'legal_cleanup') st.auditRisk = clamp(st.auditRisk - 2, 0, 100);
    init.duration -= 1;
    if (init.duration > 0) remaining.push(init);
  }
  st.activeInitiatives = remaining;
}

function updateQuarterProgress() {
  st.quarterProgress += 1;
  if (st.quarterProgress < st.quarterGoal) return;
  st.quarter += 1;
  st.quarterProgress = 0;
  st.quarterGoal = clamp(3 + Math.floor((st.quarter - 1) / 2), 3, 6);
  st.hype = clamp(st.hype - 8, 0, 100);
  st.compliance = clamp(st.compliance - 3, 0, 100);
  st.auditRisk = clamp(st.auditRisk + 6, 0, 100);
  st.runway += 1;

  let debtLine = null;
  let debtEvent = null;
  if (st.ventureDebt?.active) {
    const interestDue = Math.max(25, Math.round(st.ventureDebt.principal * st.ventureDebt.rate));
    st.money -= interestDue;
    st.runway = Math.max(0, st.runway - 1);
    debtLine = `The lender collected $${interestDue} in quarterly interest and described it as a vote of confidence. Nobody else used that phrase.`;
    debtEvent = 'interest';
    addPopup(`🏦 INTEREST -$${interestDue}`, W / 2, 174, COL.red, 10);
    adjustStanding('CoastalShadow', 4);
    adjustStanding('NativeHollows', -2);

    if (st.ventureDebt.dueQuarter !== null && st.quarter >= st.ventureDebt.dueQuarter) {
      const principalDue = st.ventureDebt.principal;
      st.money -= principalDue;
      addPopup(`📜 NOTE DUE -$${principalDue}`, W / 2, 198, COL.red, 11);
      debtLine = `${debtLine ? debtLine + ' ' : ''}The full note matured this quarter, so $${principalDue} of principal was vacuumed out of the treasury before anyone could say 'strategic flexibility.'`;
      debtEvent = 'maturity';
      adjustStanding('CoastalShadow', 6);
      adjustStanding('PredictiveCompliance', 3);
      adjustStanding('CommitteeUnnecessarySynergy', 2);
      st.ventureDebt = { active: false, principal: 0, rate: 0, originationQuarter: null, dueQuarter: null };
    }
  }

  if (!st.ventureDebt?.active && st.money < 2200 && st.quarter >= 2) {
    st.everTookDebt = true;
    const principal = 1400 + Math.floor(st.quarter * 250);
    const rate = clamp(0.12 + st.auditRisk / 400, 0.12, 0.32);
    st.money += principal;
    st.ventureDebt = {
      active: true,
      principal,
      rate,
      originationQuarter: st.quarter,
      dueQuarter: st.quarter + 2
    };
    debtLine = debtLine
      ? `${debtLine} To preserve the illusion of momentum, a fresh venture note of $${principal} arrived at ${(rate * 100).toFixed(0)}% quarterly interest, due in Q${st.ventureDebt.dueQuarter}.`
      : `A venture note of $${principal} arrived at ${(rate * 100).toFixed(0)}% quarterly interest, due in Q${st.ventureDebt.dueQuarter}. The term sheet smelled faintly of cologne, bridge financing, and conditional affection.`;
    debtEvent = debtEvent === 'maturity' ? 'rollover' : 'issued';
    addPopup(`🏦 VENTURE DEBT +$${principal}`, W / 2, 174, COL.gold, 10);
    adjustStanding('CoastalShadow', 8);
    adjustStanding('NativeHollows', -4);
  }

  st.currentReviewDebtLine = debtLine;
  st.lastQuarterDebtEvent = debtEvent;
  st.lastQuarterDebtEventQuarter = debtEvent ? st.quarter : null;

  refreshStrategyOffers();
  const line = DIALOGUE.quarters[(st.quarter - 1) % DIALOGUE.quarters.length];
  logStory(line);
  addPopup(`📆 QUARTER ${st.quarter}`, W / 2, 118, COL.gold, 15);
  addPopup(line, W / 2, 146, COL.cyan, 8);
  if (debtLine) {
    logStory(debtLine);
    addPopup(debtLine, W / 2, 224, COL.ora, 6, 4.2);
  }
  // CS-5 Hook 5 — new quarter: committee convenes; ministry watches the numbers
  adjustStanding('CommitteeUnnecessarySynergy', 3); // Committee loves a new quarter
  adjustStanding('PredictiveCompliance', 2);        // ministry updates its models
  // Each quarter Vastcart expects more — penalise if compliance is slipping
  if (st.compliance < 45) adjustStanding('Vastcart', -3);
}

function evaluateMilestones() {
  for (const milestone of MILESTONE_DEFS) {
    if (st.milestones[milestone.id]) continue;
    if (!milestone.check(st)) continue;
    st.milestones[milestone.id] = true;
    if (milestone.reward.score) st.score += milestone.reward.score;
    if (milestone.reward.money) st.money += milestone.reward.money;
    addPopup(`🏅 ${milestone.label}`, W / 2, 118, COL.gold, 12);
    logStory(milestone.text);
  }
}

function maybeAuditEvent() {
  const triggerChance = clamp((st.auditRisk - 38) / 120, 0, 0.45);
  if (Math.random() > triggerChance) return;
  const line = DIALOGUE.audit[Math.floor(Math.random() * DIALOGUE.audit.length)];
  const fine = 350 + Math.floor(Math.random() * 550);
  st.money -= fine;
  st.compliance = clamp(st.compliance - 6, 0, 100);
  st.reputation = clamp(st.reputation - 4, 0, 100);
  st.auditRisk = clamp(st.auditRisk - 10, 0, 100);
  logStory(`[Audit] ${line}`);
  addPopup(`🧾 AUDIT -$${fine}`, W / 2, 118, COL.red, 12);
  // CS-5 Hook 4 — audit fires: ministry satisfied; apothecary notes vulnerability
  adjustStanding('PredictiveCompliance', 5);   // Magistrate Ledger pleased
  adjustStanding('AlgorithmicApprovals', 3);   // algorithm notes the infraction
  adjustStanding('NativeHollows', 2);          // locals appreciate accountability
  adjustStanding('Vastcart', -4);              // home office is embarrassed
}

// ============================================================
// CS-5 — BUREAUCRACY_STANDING_MAP
// Keys here are the event IDs used in BUREAUCRACY_EVENTS.
// GP-2 (Prompt 13) must reuse these exact IDs when it generates
// the expanded 50+ bureaucracy events with standingMap fields.
// Structure: { [eventName]: { [choice]: { [frozenFactionKey]: delta } } }
// For the current inline-effect events that don't use choices, the
// standing changes are applied directly in the effect fn (frozen keys).
// GP-2 events that DO have choices must use this map pattern.
// ============================================================
const BUREAUCRACY_STANDING_MAP = {
  // Starter map — GP-2 extends this with its generated event IDs
  'committee_spoon_polishing':     { comply:   { Vastcart: 5, CommitteeUnnecessarySynergy: 3 },
                                     refuse:   { Vastcart: -3, NativeHollows: 4 } },
  'supply_chain_optimization':     { bikes:    { Forgeharvest: -5, NativeHollows: 6 },
                                     trucks:   { Forgeharvest: 3, NativeHollows: -3 } },
  'magistrate_disappointment':     { apologise:{ PredictiveCompliance: 4, CommitteeUnnecessarySynergy: 2 },
                                     ignore:   { PredictiveCompliance: -8, AlgorithmicApprovals: -3 } },
  'elaborate_loss':                { embrace:  { CommitteeUnnecessarySynergy: 10, NativeHollows: -4 },
                                     decline:  { CommitteeUnnecessarySynergy: -5, NativeHollows: 3 } },
  'pivot_to_ai_again':             { pivot:    { CursorSpectacles: 10, MigratoryFounders: 8, NativeHollows: -6 },
                                     resist:   { NativeHollows: 5, PredictiveCompliance: 3 } },
  'leaked_slack_logs':             { own_it:   { NativeHollows: 8, CommitteeUnnecessarySynergy: -4 },
                                     deny:     { PredictiveCompliance: -6, MigratoryFounders: -4 } },
  'stealth_wealth_gala':           { attend:   { MigratoryFounders: 10, CursorSpectacles: 6, NativeHollows: -8 },
                                     skip:     { NativeHollows: 5, Vastcart: 2 } },
};

// ============================================================
// LEDGER CORE LOGIC  (CS-4)
// ============================================================

// CS-5: onBureaucracyResponse — called when a player makes a choice in a
// bureaucracy event that has choice-driven standing changes.
// eventId must match a key in BUREAUCRACY_STANDING_MAP.
// choice must match a sub-key (e.g. 'comply', 'refuse').
// GP-2 expanded events call this from their choice callbacks.
function onBureaucracyResponse(eventId, choice) {
  const map = BUREAUCRACY_STANDING_MAP[eventId]?.[choice];
  if (!map) return;
  for (const [faction, delta] of Object.entries(map)) {
    adjustStanding(faction, delta);
  }
}

// bandOf: map a standing value to its named band
function bandOf(v) {
  return (STANDING_BANDS.find(b => v >= b.min && v <= b.max) || STANDING_BANDS[2]).name;
}

// ── FACTION CRISIS LINES ────────────────────────────────────────────────────
// One compact disgrace line per faction, fired when standing first crosses
// into Blood Feud territory (≤ COLLAPSE_THRESHOLD). Archaic Quillhaven register.
const FACTION_CRISIS_LINES = {
  Vastcart:                 "The Most Serene Company hath struck thy name from the vendor roll. The Home Office is displeased.",
  Forgeharvest:             "The Noble Order of Forgeharvest hath ceased to process thy contracts. The trucks are not coming.",
  MechanicalCrow:           "Lord Buzzwick's crows circle overhead. This is not a metaphor.",
  CoastalShadow:            "Coastal Shadow Holdings hath published a contrary position on thy existence. Entirely.",
  FarmableFractions:        "Brother Tillage hath salted the furrow. The soil rejects thee by name.",
  PredictiveCompliance:     "Magistrate Ledger hath opened a new ledger. It is titled after thee. This is not an honour.",
  AlgorithmicApprovals:     "Thy standing claim hath been denied, escalated, and then denied again, algorithmically.",
  CursorSpectacles:         "The Confraternity hath removed thee from the group chat and started a new one without thee.",
  MigratoryFounders:        "The Devotional hath quietly departed for another city. They did not mention thee in the newsletter.",
  NativeHollows:            "Goodwife Henrietta hath closed the tea room to thee. The hollows do not forget.",
  CommitteeUnnecessarySynergy: "Sir Wastrel hath convened an emergency session. The spoon hath been formally revoked."
};

// Recovery lines — fired when a faction climbs back above COLLAPSE_THRESHOLD.
const FACTION_RECOVERY_LINES = {
  Vastcart:                 "The Most Serene Company hath, cautiously, reopened the vendor file.",
  Forgeharvest:             "Forgeharvest Provisions hath resumed processing. The trucks approach.",
  MechanicalCrow:           "Lord Buzzwick's crows have returned to a neutral surveillance posture.",
  CoastalShadow:            "Coastal Shadow Holdings hath withdrawn the contrary position. For now.",
  FarmableFractions:        "Brother Tillage hath un-salted the furrow. Growth is, once again, possible.",
  PredictiveCompliance:     "Magistrate Ledger hath filed the ledger under 'Resolved, Pending Review.'",
  AlgorithmicApprovals:     "Thy standing claim hath been conditionally re-submitted for consideration.",
  CursorSpectacles:         "The Confraternity hath re-added thee to the group chat. The gifs resume.",
  MigratoryFounders:        "The Devotional hath returned from their undisclosed location and acknowledged thy existence.",
  NativeHollows:            "Goodwife Henrietta hath, with visible effort, re-opened the tea room.",
  CommitteeUnnecessarySynergy: "The Committee hath voted to table the revocation. The spoon is under review."
};
// ── END CRISIS LINES ─────────────────────────────────────────────────────────

// adjustStanding: the ONLY correct way to change a faction standing.
// opts.noRipple = true means depth-1 (called from ripple loop) — never recurse further.
function adjustStanding(faction, delta, opts = {}) {
  if (!Object.prototype.hasOwnProperty.call(st.ledger, faction)) return;

  const prevVal = st.ledger[faction];
  st.ledger[faction] = clamp(prevVal + delta, -100, 100);
  const newVal = st.ledger[faction];

  if (!opts.noRipple) {
    const row = FACTION_CONFLICTS[faction] || {};
    for (const [other, factor] of Object.entries(row)) {
      if (Object.prototype.hasOwnProperty.call(st.ledger, other)) {
        const rippleDelta = Math.round(delta * factor);
        if (rippleDelta !== 0) {
          // depth-1 only: noRipple guard prevents infinite recursion
          adjustStanding(other, rippleDelta, { noRipple: true });
        }
      }
    }
    // queue a flavor line for primary faction only (ripple targets are noise)
    queueLedgerFlavor(faction, delta);

    // ── Crisis threshold crossing detection ─────────────────────────────────
    if (!st.ledgerCrisisActive) st.ledgerCrisisActive = {};
    const fname = FACTIONS[faction]?.short || faction;

    if (prevVal > COLLAPSE_THRESHOLD && newVal <= COLLAPSE_THRESHOLD) {
      // Crossed INTO Blood Feud territory — fire crisis popup
      st.ledgerCrisisActive[faction] = true;
      const line = FACTION_CRISIS_LINES[faction] || `${fname} hath formally declared a Blood Feud.`;
      addPopup(`⚔ BLOOD FEUD: ${fname.toUpperCase()}`, W / 2, H / 2 - 55, COL.red, 12, 5.0, false);
      addPopup(line, W / 2, H / 2 - 30, '#ff8888', 6, 5.5, false);
      addPopup('[ L to open the Ledger ]', W / 2, H / 2 - 8, '#884444', 5, 4.5, false);
      st.shake = Math.max(st.shake, 7);
      playFail();

    } else if (prevVal <= COLLAPSE_THRESHOLD && newVal > COLLAPSE_THRESHOLD) {
      // Climbed BACK above threshold — fire recovery popup
      st.ledgerCrisisActive[faction] = false;
      const line = FACTION_RECOVERY_LINES[faction] || `${fname} hath lifted the Blood Feud. For now.`;
      addPopup(`✦ FEUD COOLING: ${fname.toUpperCase()}`, W / 2, H / 2 - 45, COL.grn, 10, 4.5, false);
      addPopup(line, W / 2, H / 2 - 22, '#88ffaa', 6, 4.5, false);
      playSuccess();
    }
    // ── End crisis detection ─────────────────────────────────────────────────
  }
}

// queueLedgerFlavor: push a flavor popup into the ledger popup queue
function queueLedgerFlavor(faction, delta) {
  const flavor = pickLedgerFlavor(faction, delta);
  if (!flavor) return;
  st.ledgerPopups.push({
    faction,
    delta,
    flavor,
    life: 3.5,
    maxLife: 3.5
  });
}

function pickLedgerFlavor(faction, delta) {
  const flavors = LEDGER_FLAVOR_POOLS[faction] || {};
  const pool = delta > 0 ? flavors.up : flavors.down;
  if (!pool || !pool.length) return '';
  return pool[(Math.random() * pool.length) | 0];
}

function pickGatedDialogue(character, situation, factionRequirements = null) {
  const pool = DIALOGUE_POOLS[character]?.[situation];
  if (!pool || !pool.length) return null;

  if (factionRequirements) {
    const eligible = pool.filter(line => {
      if (typeof line === 'string') return true;
      if (line.requires) {
        return Object.entries(line.requires).every(([f, min]) =>
          (st.ledger[f] || 0) >= min);
      }
      return true;
    });
    if (eligible.length === 0) return typeof pool[0] === 'string' ? pool[0] : pool[0].text;
    const picked = eligible[(Math.random() * eligible.length) | 0];
    return typeof picked === 'string' ? picked : picked.text;
  }

  const picked = pool[(Math.random() * pool.length) | 0];
  return typeof picked === 'string' ? picked : picked.text;
}

// computeBand: legacy alias — use bandOf() for new code
function computeBand(standing) { return bandOf(standing); }

// ── CS-7: POLITICAL IDENTITY TABLE ──────────────────────────────────────────
// Each entry: { id, title, color, desc, match(top, bottom, ledger) }
// match receives: top = highest-standing faction key,
//                 bottom = lowest-standing faction key,
//                 ledger = the full standings object.
// Entries are tested in order; first match wins.
const IDENTITY_TABLE = [];

IDENTITY_TABLE.push({
  id: 'identity_triply_damned',
  title: 'The Multi-Front Disaster',
  color: '#b22222',
  desc: "Thou hast achieved Blood Feuds with three or more factions at once. This is not coalition-building so much as a civic arson spree. The Committee has called it unsustainable. The crowd has called it memorable.",
  match: (top, bottom, s) => Object.values(s).filter(v => v <= COLLAPSE_THRESHOLD).length >= 3
});

IDENTITY_TABLE.push({
  id: 'identity_bipartisan_menace',
  title: 'Patron Saint of Mixed Signals',
  color: '#d18b2f',
  desc: "Two or more factions adore thee, and at least two others would gladly key thy carriage. Thou hast mistaken contradiction for strategy and, against all known rules of governance, it appears to have worked for a while.",
  match: (top, bottom, s) => Object.values(s).filter(v => v >= 60).length >= 2 && Object.values(s).filter(v => v <= COLLAPSE_THRESHOLD).length >= 2
});

IDENTITY_TABLE.push({
  id: 'identity_dual_patron',
  title: 'Patron of Two Houses',
  color: '#c8a84b',
  desc: "Thou hast achieved Patron standing with two or more factions. This is politically incoherent, diplomatically bewildering, and statistically improbable. The Architect's footnote 12 is simply an ellipsis.",
  match: (top, bottom, s) => Object.values(s).filter(v => v >= 60).length >= 2
});

IDENTITY_TABLE.push({
  id: 'identity_median_specter',
  title: 'The Most Poll-Tested Person Alive',
  color: '#8a8a8a',
  desc: "No faction loves thee enough to brag, and none hates thee enough to organize. Thou hast optimized thyself into a focus-group fog: safe, plausible, and impossible to remember five minutes after the catered lunch ends.",
  match: (top, bottom, s) => Object.values(s).every(v => v >= 35 && v <= 55)
});

IDENTITY_TABLE.push({
  id: 'identity_native_patron',
  title: 'The Honorary Local',
  color: '#3a8f5d',
  desc: "Goodwife Henrietta poured thee tea, twice. Thou camest as a transplant and leavest as something rarer: trusted. Vastcart now describes thee as 'community-forward,' which is how empires say they have lost.",
  match: (top, bottom, s) => top === 'NativeHollows' && bottom === 'Vastcart' && s.NativeHollows >= 60
});

IDENTITY_TABLE.push({
  id: 'identity_local_champion',
  title: "Goodwife Henrietta's Endorsed Founder",
  color: '#4ca26b',
  desc: "The hollows have kept thy name. Thou didst not disrupt the community, which in Quillhaven qualifies as both virtue and sorcery. Several founders are studying thee now like a failed monetization opportunity.",
  match: (top, bottom, s) => top === 'NativeHollows' && s.NativeHollows >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_vastcart_vassal',
  title: 'Vassal of the Most Serene Company',
  color: '#1a4d8f',
  desc: "The Home Office hath found thee shelf-stable. Thy smile has been approved, thy margins compressed, thy soul outsourced. The locals no longer wave; they scan.",
  match: (top, bottom, s) => top === 'Vastcart' && bottom === 'NativeHollows' && s.Vastcart >= 60
});

IDENTITY_TABLE.push({
  id: 'identity_corporate_vassal',
  title: 'Retail-Facing Serf Emeritus',
  color: '#285f9f',
  desc: "Thou hast pleased the retail empire. The lanyard is real, the dignity conditional, and the holiday pricing eternal. Bentonville calls this partnership. Historians may prefer other words.",
  match: (top, bottom, s) => top === 'Vastcart' && s.Vastcart >= 58
});

IDENTITY_TABLE.push({
  id: 'identity_forgeharvest_foreman',
  title: 'Foreman of the Throughput Gospel',
  color: '#8b4513',
  desc: "Forgeharvest hath judged thee suitably efficient. Time is poultry, poultry is margin, and margin is apparently thy denomination now. Thou movest with the confidence of one who mistakes urgency for ethics.",
  match: (top, bottom, s) => top === 'Forgeharvest' && s.Forgeharvest >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_fractional_steward',
  title: 'Steward of the Farmable Fractions',
  color: '#5a8f3a',
  desc: "Brother Tillage hath claimed thee as kin. Thou hast found a niche that is warm, largely unprofitable, and smells faintly of compost and cap tables. The dirt trusts thee more than the investors do.",
  match: (top, bottom, s) => top === 'FarmableFractions' && s.FarmableFractions >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_crow_adjunct',
  title: 'Adjunct of the Panopticon',
  color: '#2a2a3a',
  desc: "Lord Buzzwick's machines circle thee with professional warmth. Privacy has been downgraded to a luxury belief. Thou art no longer watched suspiciously; thou art watched with confidence.",
  match: (top, bottom, s) => top === 'MechanicalCrow' && s.MechanicalCrow >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_compliance_saint',
  title: 'Saint of Preemptive Paperwork',
  color: '#4a4a5a',
  desc: "Magistrate Ledger hath found thee adequately documented. Every form is filed, every filing cross-filed, every anxiety notarized. Thou hast become the sort of person an algorithm waves through with tears in its little metal eyes.",
  match: (top, bottom, s) => top === 'PredictiveCompliance' && s.PredictiveCompliance >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_hype_vessel',
  title: 'Vessel of the Cursor Spectacles',
  color: '#5d3a8f',
  desc: "The Confraternity hath elevated thee to keynote tier. Thou hast no product worth naming, no runway worth trusting, and astonishing brand energy. In several group chats, this now counts as industrial capacity.",
  match: (top, bottom, s) => top === 'CursorSpectacles' && s.CursorSpectacles >= 55 && s.NativeHollows < 30
});

IDENTITY_TABLE.push({
  id: 'identity_stealth_prophet',
  title: 'Prophet of Permanent Pre-Launch',
  color: '#8f5d3a',
  desc: "The Migratory Founders have cited thee in a newsletter nobody finished reading. Thou art spiritually pre-launch, fiscally evasive, and aesthetically overfunded. Thy product remains in stealth, where it can do the least harm and the most fundraising.",
  match: (top, bottom, s) => top === 'MigratoryFounders' && s.MigratoryFounders >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_contrarian_asset',
  title: 'Blue-Chip Contrarian Asset',
  color: '#1a1a2e',
  desc: "Coastal Shadow hath published a favorable thesis on thy existence, which is the nearest thing the Baron offers to affection. Thy failures now arrive with intellectual framing and a tasteful serif headline.",
  match: (top, bottom, s) => top === 'CoastalShadow' && s.CoastalShadow >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_algorithmic_approved',
  title: 'Pre-Approved by the Algorithmic Apothecary',
  color: '#8f8f3a',
  desc: "The Apothecary hath reviewed thy life and found it billable. The algorithm looked upon thy suffering, coded it as compliant, and offered thee a co-pay of dignity payable in installments.",
  match: (top, bottom, s) => top === 'AlgorithmicApprovals' && s.AlgorithmicApprovals >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_elaborate_loser',
  title: 'Artisan of the Elaborate Loss',
  color: '#3a8f8f',
  desc: "Sir Wastrel hath wept with pride. Thy losses were not merely losses; they were curated, plated, and presented with a note about long-term upside. The spoon hath been re-awarded. The audit team brought flowers.",
  match: (top, bottom, s) => top === 'CommitteeUnnecessarySynergy' && s.CommitteeUnnecessarySynergy >= 55
});

IDENTITY_TABLE.push({
  id: 'identity_zoned_for_disruption',
  title: 'Rezoned as a Human Externality',
  color: '#6f5631',
  desc: "Thou didst not merely disappoint the locals; thou didst become a planning document with shoes. Somewhere, a tasteful slide deck describes thy impact as redevelopment. Somewhere else, Henrietta is not impressed.",
  match: (top, bottom, s) => bottom === 'NativeHollows' && top !== 'NativeHollows'
});

IDENTITY_TABLE.push({
  id: 'identity_vendor_heretic',
  title: 'Vendor Heretic of Bentonville',
  color: '#3b6c91',
  desc: "Vastcart likes thee least, which in certain circles is a halo. Thou hast either defended thy margins, defended thy town, or simply forgotten how to bow correctly. In any case, procurement has taken it personally.",
  match: (top, bottom, s) => bottom === 'Vastcart' && top !== 'Vastcart'
});

// ── ARCHITECT FOOTNOTES ──────────────────────────────────────────────────────
const ARCHITECT_FOOTNOTE_DISPLAY_TIME = 8.5;

const ARCHITECT_FOOTNOTES = [
  { id: 1, trigger: "hole1", text: "1. The Architect notes your first swing. He notes everything. He has noted, for instance, that nobody reads footnotes until one begins to sound like a threat." },
  { id: 2, trigger: "shot2", text: "2. The Architect considers momentum a cousin of denial. Both travel farther than they ought to when struck cleanly." },
  { id: 3, trigger: "world1_jobfair", text: "3. The job fair is not a market so much as a velvet-lined auction of exhaustion. The Architect admires the lighting." },
  { id: 4, trigger: "hazard_water1", text: "4. The water hazard was placed exactly where panic prefers to land. The Architect insists this was topography, not policy." },
  { id: 5, trigger: "caddy1", text: "5. Caddies speak in proverbs because direct warnings are expensive. The Architect once priced one." },
  { id: 6, trigger: "hire1", text: "6. Your first hire smiles with the brittle confidence of somebody who has already rehearsed their own exit interview." },
  { id: 7, trigger: "hole3", text: "7. In Quillhaven, even encouragement arrives with an invoice attached. The Architect did not invent this. He merely indexed it." },
  { id: 8, trigger: "world2", text: "8. The second district glows the way bad ideas do: fluorescent, underfunded, and impossible to ignore once installed." },
  { id: 9, trigger: "bureaucracy1", text: "9. The forms are not meant to be completed. They are meant to confirm that completion remains theoretically possible." },
  { id: 10, trigger: "quarter1", text: "10. A quarter begins the moment leadership decides that time itself should be measured against targets." },
  { id: 11, trigger: "bunker1", text: "11. Some bunkers began as decorative features. Then a committee discovered they could also symbolize accountability." },
  { id: 12, trigger: "pitch1", text: "12. Pitch decks are a liturgy for people who would rather worship forecasts than weather." },
  { id: 13, trigger: "bench1", text: "13. The bench is where charisma goes to develop a limp. The Architect recommends cushions and fewer delusions." },
  { id: 14, trigger: "birdie1", text: "14. A birdie creates a brief silence in the ecosystem. Everyone pauses to see whether competence was intentional." },
  { id: 15, trigger: "world2_review", text: "15. Reviews do not measure value. They measure how politely value agreed to be flattened into columns." },
  { id: 16, trigger: "drone1", text: "16. The drones mistake the Architect for weather. This is one of the kinder errors committed in his vicinity." },
  { id: 17, trigger: "ledger1", text: "17. The ledger remembers what the people involved are paid to forget. This is why it sits so confidently in the dark." },
  { id: 18, trigger: "world3", text: "18. Logistics taught Quillhaven a cruel philosophy: if suffering moves fast enough, someone will call it efficiency." },
  { id: 19, trigger: "tea1", text: "19. Goodwife Henrietta's tea room has outlasted three accelerators, two rebrands, and an extremely sincere blockchain. The Architect takes notes there." },
  { id: 20, trigger: "feud1", text: "20. The first blood feud is always educational. At last the ecosystem stops pretending it is a network and admits it is a mouth." },
  { id: 21, trigger: "quarter2", text: "21. The Architect once drafted a cap table the way monks illuminate a manuscript: carefully, devotionally, and with no practical expectation of mercy." },
  { id: 22, trigger: "pitch2", text: "22. Every founder claims to be building the future. Most are merely leasing vocabulary from it." },
  { id: 23, trigger: "map3", text: "23. Nobody asks who designed the fairways. This suits the Architect, who has long preferred influence to applause." },
  { id: 24, trigger: "sand2", text: "24. Sand remembers shoes. The Architect has seen auditors leave sharper prints than golfers." },
  { id: 25, trigger: "hire2", text: "25. Some hires arrive with talent. Others arrive with survivable damage and excellent posture. Quillhaven values both." },
  { id: 26, trigger: "review2", text: "26. Lady Synergy Karen suspects the margins are watching back. She is more correct than policy permits." },
  { id: 27, trigger: "pivot1", text: "27. Every pivot leaves behind a ghost of the sentence that was once going to explain everything." },
  { id: 28, trigger: "world4", text: "28. Rebranding is the civic religion of people who have misplaced causality. The Architect observes holy days reluctantly." },
  { id: 29, trigger: "audit1", text: "29. An audit is merely panic with stationery. The Architect respects stationery more than panic, but only slightly." },
  { id: 30, trigger: "midgame", text: "30. The Architect was once a founder too. He does not speak of the pivot. He speaks only of the footnote that survived it." },
  { id: 31, trigger: "watch1", text: "31. Watch mode resembles a board meeting in one key respect: everyone is wagering against the body while praising the strategy." },
  { id: 32, trigger: "training1", text: "32. Training is what institutions call repetition when they need it to sound aspirational." },
  { id: 33, trigger: "hole12", text: "33. You are not the first to drag solvency across grass and call it sport. The Architect has archived others." },
  { id: 34, trigger: "world5", text: "34. Whiteboards encourage a dangerous fiction: that a mess becomes a plan if surrounded by enough arrows." },
  { id: 35, trigger: "pitch3", text: "35. The Architect can identify a doomed venture by font choice alone. He wishes this were a joke and not a professional scar." },
  { id: 36, trigger: "henrietta1", text: "36. Goodwife Henrietta once asked the Architect whether he was building something or erasing something. He requested more tea instead of answering." },
  { id: 37, trigger: "bureaucracy2", text: "37. The kettle hissed like counsel. The footnote remained unresolved." },
  { id: 38, trigger: "ledger2", text: "38. Faction standings are not alliances. They are weather reports filed by the wounded." },
  { id: 39, trigger: "bench2", text: "39. If you bench enough voices, they begin to sound like an archive. The Architect finds this familiar." },
  { id: 40, trigger: "watch2", text: "40. Spectators prefer collapse at a tasteful distance. It allows them to call themselves analytical." },
  { id: 41, trigger: "hire3", text: "41. Hireable archetypes are how Quillhaven launders grief into banter. The Architect approves of the craftsmanship, not the need." },
  { id: 42, trigger: "audit2", text: "42. Compliance was allegedly built to protect people. Then it discovered revenue, and developed a personality disorder." },
  { id: 43, trigger: "quarter3", text: "43. Some quarters end. Others simply receive new names, cleaner slides, and the exact same fear." },
  { id: 44, trigger: "world6", text: "44. By the sixth district, the course begins to resemble a diagram of somebody's private apology." },
  { id: 45, trigger: "map6", text: "45. World maps imply conquest. This one is closer to an after-action report written by someone trying, with mixed success, to sound unemotional." },
  { id: 46, trigger: "unlock7", text: "46. Each newly opened region was once a sentence the Architect removed for clarity. The trouble with clarity, he learned, is that it makes certain cruelties look efficient." },
  { id: 47, trigger: "ipoRumor", text: "47. An IPO is only panic taught posture. Dress it in valuation, powder its nose, and suddenly the same fear is invited on television." },
  { id: 48, trigger: "menuEcho", text: "48. If you hear a tapping beneath the menu glass, do not be alarmed. That is merely a footnote discovering it has been carrying too much weight to remain decorative." },
  { id: 49, trigger: "architectNear", text: "49. The Architect built margins wide enough to hide inside. At the time this felt prudent. Later it became biography." },
  { id: 50, trigger: "quarter4", text: "50. He has been moving one line closer to the main text each quarter. Everyone called it polish because institutions will rename any approach that makes them nervous." },
  { id: 51, trigger: "hole24", text: "51. By now you have noticed that score behaves less like glory and more like evidence. The ecosystem prefers evidence that flatters the people billing for it." },
  { id: 52, trigger: "world7", text: "52. The ball obeys physics. The system obeys appetite. Only one of these, notably, claims to be meritocratic." },
  { id: 53, trigger: "blueprint", text: "53. There was an original blueprint: cleaner lines, fewer locals, nicer margins, almost no friction from inconvenient humanity. It would have scaled beautifully. It would have been monstrous." },
  { id: 54, trigger: "warmth", text: "54. The Architect damaged that blueprint by meeting the people it intended to erase into customer segments, labor pools, and acceptable loss." },
  { id: 55, trigger: "seams", text: "55. This is why Quillhaven still leaks warmth through the satire. Somebody failed—deliberately, repeatedly—to finish sanding the human edges off." },
  { id: 56, trigger: "glass", text: "56. Once, between shots, someone saw the Architect in the reflection and filed a rendering bug. He was too tired to correct them, and too amused not to save the note." },
  { id: 57, trigger: "promotion", text: "57. Later the bug was escalated, workshopped, and reclassified as a feature. This is how systems apologize when they cannot afford remorse." },
  { id: 58, trigger: "endgame1", text: "58. When the final ledgers open, do not ask whether the Architect built the machine. Ask what the machine kept asking him to cut away, and how long he managed to refuse." },
  { id: 59, trigger: "endgame2", text: "59. He has not been watching you to judge you. He has been watching to see whether anyone still notices the seams, the people inside them, and the cost of calling that cost 'strategy'." },
  { id: 60, trigger: "endgame3", text: "60. The Architect closes the ledger at last. 'I was not the system,' he writes. 'I was the tired little part of it that kept leaving room in the margins for people to remain people. If this place feels warmer than it was designed to be, that was me. And now, a little, it is you.'" }
];

function architectStoryMention(s, pattern) {
  return Array.isArray(s.storyLog) && s.storyLog.some(line => pattern.test(String(line)));
}

function architectStoryMentionCount(s, pattern) {
  return Array.isArray(s.storyLog)
    ? s.storyLog.reduce((count, line) => count + (pattern.test(String(line)) ? 1 : 0), 0)
    : 0;
}

function architectRosterCount(s) {
  return (s.roster?.length || 0) + (s.bench?.length || 0);
}

function architectTriggerMet(trigger, s) {
  switch (trigger) {
    case 'hole1': return s.totalStrokes >= 1 || s.totalHolesCleared >= 1;
    case 'shot2': return s.totalStrokes >= 2;
    case 'world1_jobfair': return s.screen === SCREEN.JOBFAIR || s.jobOffers.length > 0 || architectRosterCount(s) >= 1;
    case 'hazard_water1': return s.strikes >= 1;
    case 'caddy1': return s.totalHolesCleared >= 1 || s.totalStrokes >= 3;
    case 'hire1': return architectRosterCount(s) >= 1;
    case 'hole3': return s.totalHolesCleared >= 3;
    case 'world2': return s.currentWorld >= 2 || s.worldsUnlocked.includes(2);
    case 'bureaucracy1': return !!s.currentBureaucracyEvent || architectStoryMentionCount(s, /^\[Bureaucracy\]/) >= 1;
    case 'quarter1': return s.quarter >= 1 && s.totalHolesCleared >= 2;
    case 'bunker1': return s.strikes >= 2;
    case 'pitch1': return !!s.currentPitch || s.totalHolesCleared >= 4;
    case 'bench1': return s.screen === SCREEN.BENCH || (s.bench?.length || 0) >= 1;
    case 'birdie1': return s.totalHolesCleared >= 4;
    case 'world2_review': return !!s.currentReviewTemplate || s.quarter >= 2;
    case 'drone1': return architectStoryMention(s, /Buzzwick|crow|drone/i) || (s.ledger?.MechanicalCrow || 0) !== 0;
    case 'ledger1': return !!s.ledgerOverlayOpen || Object.values(s.ledger || {}).some(v => v !== 0);
    case 'world3': return s.currentWorld >= 3 || s.worldsUnlocked.includes(3);
    case 'tea1': return architectStoryMention(s, /Henrietta|tea/i) || (s.ledger?.NativeHollows || 0) >= 14;
    case 'feud1': return Object.values(s.ledger || {}).some(v => v <= COLLAPSE_THRESHOLD);
    case 'quarter2': return s.quarter >= 2;
    case 'pitch2': return (!!s.currentPitch && s.quarter >= 2) || s.totalHolesCleared >= 8;
    case 'map3': return s.screen === SCREEN.WORLD_MAP || s.currentWorld >= 3 || s.worldsUnlocked.length >= 3;
    case 'sand2': return s.strikes >= 3;
    case 'hire2': return architectRosterCount(s) >= 2;
    case 'review2': return (!!s.currentReviewTemplate && s.quarter >= 2) || s.totalHolesCleared >= 8;
    case 'pivot1': return (s.pivotHistory?.length || 0) >= 1;
    case 'world4': return s.currentWorld >= 4 || s.worldsUnlocked.includes(4);
    case 'audit1': return architectStoryMentionCount(s, /^\[Audit\]/) >= 1;
    case 'midgame': return s.totalHolesCleared >= 10;
    case 'watch1': return s.screen === SCREEN.WATCH || !!s.watch;
    case 'training1': return s.screen === SCREEN.TRAINING || !!s.trainingMini || Object.keys(s.trainingBest || {}).length >= 1;
    case 'hole12': return s.totalHolesCleared >= 12;
    case 'world5': return s.currentWorld >= 5 || s.worldsUnlocked.includes(5);
    case 'pitch3': return (!!s.currentPitch && s.totalHolesCleared >= 12) || s.quarter >= 3;
    case 'henrietta1': return architectStoryMentionCount(s, /Henrietta|tea/i) >= 1 || (s.ledger?.NativeHollows || 0) >= 20;
    case 'bureaucracy2': return architectStoryMentionCount(s, /^\[Bureaucracy\]/) >= 2 || s.quarter >= 3;
    case 'ledger2': return (!!s.ledgerOverlayOpen && s.totalHolesCleared >= 10) || Object.values(s.ledger || {}).some(v => v >= 60 || v <= COLLAPSE_THRESHOLD);
    case 'bench2': return (s.screen === SCREEN.BENCH && s.totalHolesCleared >= 10) || (s.bench?.length || 0) >= 2;
    case 'watch2': return (s.screen === SCREEN.WATCH && s.watch?.phase === 'result') || (s.watch?.hole || 0) >= 2 || s.totalHolesCleared >= 14;
    case 'hire3': return architectRosterCount(s) >= 3;
    case 'audit2': return architectStoryMentionCount(s, /^\[Audit\]/) >= 2 || (s.auditRisk >= 60 && s.quarter >= 3);
    case 'quarter3': return s.quarter >= 3;
    case 'world6': return s.currentWorld >= 6 || s.worldsUnlocked.includes(6);
    case 'map6': return s.screen === SCREEN.WORLD_MAP || s.currentWorld >= 6 || s.worldsUnlocked.includes(6);
    case 'unlock7': return s.worldsUnlocked.includes(7);
    case 'ipoRumor': return s.currentWorld >= 7 || s.funding >= 6 || s.quarter >= 4;
    case 'menuEcho': return (s.screen === SCREEN.MAIN_MENU && s.totalHolesCleared >= 18) || s.quarter >= 4;
    case 'architectNear': return s.totalHolesCleared >= 18 || s.currentWorld >= 6;
    case 'quarter4': return s.quarter >= 4;
    case 'hole24': return s.totalHolesCleared >= 24;
    case 'world7': return s.currentWorld >= 7 || s.worldsUnlocked.includes(7);
    case 'blueprint': return s.currentWorld >= 7 || s.totalHolesCleared >= 24;
    case 'warmth': return (s.ledger?.NativeHollows || 0) >= 25 || architectStoryMentionCount(s, /Henrietta|tea/i) >= 2;
    case 'seams': return s.totalHolesCleared >= 26;
    case 'glass': return s.currentWorld >= 8 || s.quarter >= 5;
    case 'promotion': return s.screen === SCREEN.IPO || s.currentWorld >= 8;
    case 'endgame1': return s.screen === SCREEN.IPO || s.totalHolesCleared >= 28 || s.currentWorld >= 8;
    case 'endgame2': return s.screen === SCREEN.IPO || s.totalHolesCleared >= 29 || s.quarter >= 5;
    case 'endgame3': return s.screen === SCREEN.IPO || !!s.gameOverCeremony || !!s.ipoComplete;
    default: return false;
  }
}

function updateArchitectFootnote(dt) {
  if (st.footnoteTimer > 0) {
    st.footnoteTimer -= dt;
    if (st.footnoteTimer <= 0) st.currentFootnote = null;
    return;
  }
  const unlocked = Array.isArray(st.footnoteState?.unlocked) ? st.footnoteState.unlocked : [];
  const unread = Array.isArray(st.footnoteState?.unread) ? st.footnoteState.unread : [];
  const nextFootnote = ARCHITECT_FOOTNOTES.find(f => !unlocked.includes(f.id) && architectTriggerMet(f.trigger, st));
  if (!nextFootnote) return;
  st.currentFootnote = nextFootnote;
  st.footnoteTimer = ARCHITECT_FOOTNOTE_DISPLAY_TIME;
  unlocked.push(nextFootnote.id);
  if (!unread.includes(nextFootnote.id)) unread.push(nextFootnote.id);
  st.footnoteState.unlocked = unlocked;
  st.footnoteState.unread = unread;
  saveRun();
}

function getUnlockedArchitectFootnotes() {
  const unlockedIds = Array.isArray(st.footnoteState?.unlocked) ? st.footnoteState.unlocked : [];
  return ARCHITECT_FOOTNOTES.filter(f => unlockedIds.includes(f.id));
}

function getUnreadArchitectFootnoteIds() {
  return Array.isArray(st.footnoteState?.unread) ? st.footnoteState.unread : [];
}

function hasUnreadArchitectFootnotes() {
  return getUnreadArchitectFootnoteIds().length > 0;
}

function isArchitectFootnoteUnread(id) {
  return id != null && getUnreadArchitectFootnoteIds().includes(id);
}

function markArchitectFootnotesRead() {
  if (!Array.isArray(st.footnoteState?.unread) || st.footnoteState.unread.length === 0) return;
  st.footnoteState.unread = [];
  saveRun();
}

function markArchitectFootnoteRead(id) {
  if (!Array.isArray(st.footnoteState?.unread) || id == null) return false;
  const nextUnread = st.footnoteState.unread.filter(unreadId => unreadId !== id);
  if (nextUnread.length === st.footnoteState.unread.length) return false;
  st.footnoteState.unread = nextUnread;
  saveRun();
  return true;
}

function markArchitectFootnotesReadByIds(ids) {
  if (!Array.isArray(ids) || !ids.length || !Array.isArray(st.footnoteState?.unread) || st.footnoteState.unread.length === 0) return false;
  const idSet = new Set(ids);
  const nextUnread = st.footnoteState.unread.filter(unreadId => !idSet.has(unreadId));
  if (nextUnread.length === st.footnoteState.unread.length) return false;
  st.footnoteState.unread = nextUnread;
  saveRun();
  return true;
}

function getLatestUnlockedArchitectFootnote() {
  const footnotes = getUnlockedArchitectFootnotes();
  return footnotes.length ? footnotes[footnotes.length - 1] : null;
}

function getLatestUnreadArchitectFootnote() {
  const unreadIds = new Set(getUnreadArchitectFootnoteIds());
  const footnotes = getUnlockedArchitectFootnotes();
  for (let i = footnotes.length - 1; i >= 0; i--) {
    if (unreadIds.has(footnotes[i].id)) return footnotes[i];
  }
  return null;
}

function getRelevantArchitectFootnote() {
  return getLatestUnreadArchitectFootnote() || getLatestUnlockedArchitectFootnote();
}

function getFootnoteLedgerScrollForId(targetId, align = 'center') {
  const metrics = getFootnoteLedgerMetrics();
  const { footnotes, viewH, maxScroll, entryGap } = metrics;
  let offset = 0;

  for (let i = 0; i < footnotes.length; i++) {
    const footnote = footnotes[i];
    const lines = wrapLines(footnote.text, 62);
    const entryH = 28 + Math.max(1, lines.length) * 14 + 14;
    if (footnote.id === targetId) {
      if (align === 'start') return clamp(offset, 0, maxScroll);
      if (align === 'end') return clamp(offset - Math.max(0, viewH - entryH), 0, maxScroll);
      return clamp(offset - Math.max(0, (viewH - entryH) * 0.5), 0, maxScroll);
    }
    offset += entryH + (i < footnotes.length - 1 ? entryGap : 0);
  }

  return null;
}

function jumpFootnoteLedgerToId(targetId, align = 'center') {
  const scroll = getFootnoteLedgerScrollForId(targetId, align);
  if (scroll == null) return false;
  st.footnoteLedgerScroll = scroll;
  st.footnoteLedgerFocusId = targetId;
  return true;
}

function clearFootnoteLedgerFocus() {
  st.footnoteLedgerFocusId = null;
}

function focusLatestUnreadArchitectFootnote() {
  const unreadIds = new Set(getUnreadArchitectFootnoteIds());
  const footnotes = getUnlockedArchitectFootnotes();
  for (let i = footnotes.length - 1; i >= 0; i--) {
    if (unreadIds.has(footnotes[i].id)) {
      return jumpFootnoteLedgerToId(footnotes[i].id, 'center');
    }
  }
  return false;
}

function focusLatestArchitectFootnote() {
  const latest = getLatestUnlockedArchitectFootnote();
  if (!latest) return false;
  return jumpFootnoteLedgerToId(latest.id, 'end');
}

function getFootnoteLedgerMetrics() {
  const PX = 62, PY = 42, PW = W - 124, PH = H - 84;
  // USER-PLAYTEST-FIX — headerH must clear the title block AND the
  // "currently open / latest entry" desk preview (which ends at PY+152).
  // It was 72, which drew the scrolling entries underneath the preview box.
  const headerH = 162;
  const footerH = 52;
  const viewY = PY + headerH;
  const viewH = PH - headerH - footerH;
  const entryGap = 14;
  const footnotes = getUnlockedArchitectFootnotes();
  let contentH = 0;

  footnotes.forEach((footnote, index) => {
    const lines = wrapLines(footnote.text, 62);
    const entryH = 28 + Math.max(1, lines.length) * 14 + 14;
    contentH += entryH;
    if (index < footnotes.length - 1) contentH += entryGap;
  });

  return {
    PX, PY, PW, PH,
    headerH,
    footerH,
    viewX: PX + 18,
    viewY,
    viewW: PW - 36,
    viewH,
    contentH,
    maxScroll: Math.max(0, contentH - viewH),
    entryGap,
    footnotes,
  };
}

function clampFootnoteLedgerScroll() {
  const metrics = getFootnoteLedgerMetrics();
  st.footnoteLedgerScroll = clamp(st.footnoteLedgerScroll || 0, 0, metrics.maxScroll);
  return metrics;
}

function scrollFootnoteLedger(delta) {
  const metrics = clampFootnoteLedgerScroll();
  if (metrics.maxScroll <= 0) {
    st.footnoteLedgerScroll = 0;
    clearFootnoteLedgerFocus();
    return;
  }
  st.footnoteLedgerScroll = clamp((st.footnoteLedgerScroll || 0) + delta, 0, metrics.maxScroll);
  clearFootnoteLedgerFocus();
}

function drawFootnoteLedger() {
  rect(0, 0, W, H, 'rgba(6,8,14,0.95)');
  const metrics = clampFootnoteLedgerScroll();
  const { PX, PY, PW, PH, viewX, viewY, viewW, viewH, footnotes, contentH, maxScroll, entryGap } = metrics;
  const latestFootnote = getLatestUnlockedArchitectFootnote();
  const latestUnreadFootnote = getLatestUnreadArchitectFootnote();
  const previewFootnote = latestUnreadFootnote || latestFootnote;
  const focusedFootnote = footnotes.find(footnote => footnote.id === st.footnoteLedgerFocusId) || null;
  const unreadCount = getUnreadArchitectFootnoteIds().length;
  const focusedFootnoteIsUnread = focusedFootnote ? isArchitectFootnoteUnread(focusedFootnote.id) : false;

  const panelGrad = X.createLinearGradient(PX, PY, PX, PY + PH);
  panelGrad.addColorStop(0, '#17110b');
  panelGrad.addColorStop(0.45, '#100b06');
  panelGrad.addColorStop(1, '#0b0804');
  roundRectPath(X, PX, PY, PW, PH, 10);
  X.fillStyle = panelGrad;
  X.fill();
  X.strokeStyle = '#c8a84b';
  X.lineWidth = 2;
  X.stroke();

  X.strokeStyle = 'rgba(200,168,75,0.22)';
  X.lineWidth = 1;
  roundRectPath(X, PX + 6, PY + 6, PW - 12, PH - 12, 8);
  X.stroke();

  txt('ARCHITECT FOOTNOTE LEDGER', W / 2, PY + 22, 11, '#c8a84b', false);
  txt('Unlocked marginalia, preserved as a scrollable civic record.', W / 2, PY + 42, 5, '#8a6e2a', false);
  txt(`${footnotes.length} / ${ARCHITECT_FOOTNOTES.length} UNLOCKED`, PX + 22, PY + 62, 5, COL.cyan, false, 'left');
  txt(unreadCount > 0 ? `${unreadCount} NEW` : 'ALL READ', PX + PW / 2, PY + 62, 5, unreadCount > 0 ? COL.gold : COL.dim, false);
  txt('Mouse wheel / ↑↓ to scroll', PX + PW - 22, PY + 62, 5, '#b8a374', false, 'right');

  const latestPreviewText = previewFootnote
    ? previewFootnote.text.replace(/^\d+\.\s*/, '')
    : 'No recovered marginalia yet. Continue the round and the archive will begin answering back.';
  const focusedPreviewText = focusedFootnote ? focusedFootnote.text.replace(/^\d+\.\s*/, '') : latestPreviewText;
  const deskH = 74;
  rect(PX + 18, PY + 78, PW - 36, deskH, 'rgba(200,168,75,0.08)', 8, unreadCount > 0 ? 'rgba(255,215,0,0.3)' : 'rgba(200,168,75,0.18)', unreadCount > 0 ? 2 : 1);
  txt(focusedFootnote ? 'CURRENTLY OPEN' : unreadCount > 0 ? 'LATEST UNREAD ENTRY' : 'LATEST FILED ENTRY', PX + 32, PY + 92, 4.5, focusedFootnote ? COL.cyan : unreadCount > 0 ? COL.gold : '#b8a374', false, 'left');
  txt((focusedFootnote || previewFootnote) ? `#${(focusedFootnote || previewFootnote).id.toString().padStart(2, '0')}` : 'ARCHIVE IDLE', PX + PW - 32, PY + 92, 4.5, (focusedFootnote || previewFootnote) ? COL.cyan : COL.dim, false, 'right');
  txt(wrapLines(focusedPreviewText, 70)[0] || '', PX + 32, PY + 108, 4.5, '#d4d8dd', false, 'left');
  if (focusedFootnote) {
    txt(focusedFootnoteIsUnread ? 'OPEN NOW • CLICK AGAIN OR PRESS ENTER TO FILE THIS ENTRY' : 'OPEN FILE • PRESS L TO JUMP TO THE MOST RELEVANT ENTRY', PX + 32, PY + 122, 4.5, focusedFootnoteIsUnread ? COL.gold : '#b8a374', false, 'left');
    txt(focusedFootnoteIsUnread ? 'Unread state remains until you deliberately file it.' : 'This file is already cleared from the unread stack.', PX + 32, PY + 136, 4.5, focusedFootnoteIsUnread ? '#d4c27e' : '#8c9298', false, 'left');
  } else {
    txt(unreadCount > 0 ? 'Select a file once to open it. Select it again to file it.' : 'Newest filed material is staged here for review.', PX + 32, PY + 122, 4.5, '#b8a374', false, 'left');
    txt(unreadCount > 0 ? 'Unread material stays marked until you deliberately clear each entry.' : 'Press LATEST to jump to the newest recovered note.', PX + 32, PY + 136, 4.5, '#8c9298', false, 'left');
  }

  rect(viewX, viewY, viewW, viewH, 'rgba(0,0,0,0.38)', 8, 'rgba(200,168,75,0.14)', 1);

  X.save();
  X.beginPath();
  X.rect(viewX, viewY, viewW, viewH);
  X.clip();

  const baseY = viewY + 14 - (st.footnoteLedgerScroll || 0);
  if (!footnotes.length) {
    txt('No unlocked footnotes yet.', W / 2, viewY + viewH / 2 - 8, 7, COL.dim, false);
    txt('Keep playing, and the margins will begin speaking.', W / 2, viewY + viewH / 2 + 16, 5, '#8c9298', false);
  } else {
    const unreadIds = new Set(getUnreadArchitectFootnoteIds());
    let y = baseY;
    footnotes.forEach((footnote, index) => {
      const lines = wrapLines(footnote.text, 62);
      const actionHintLines = [];
      const isUnread = unreadIds.has(footnote.id);
      const isFocused = st.footnoteLedgerFocusId === footnote.id;
      if (isFocused && isUnread) actionHintLines.push('OPEN NOW — CLICK AGAIN OR PRESS ENTER TO FILE');
      else if (isFocused) actionHintLines.push('OPEN FILE — ALREADY FILED');
      else if (isUnread) actionHintLines.push('CLICK TO OPEN');
      const entryH = 28 + Math.max(1, lines.length) * 14 + 14 + (actionHintLines.length ? 16 : 0);
      const entryY = y;
      const visible = entryY + entryH >= viewY && entryY <= viewY + viewH;

      if (visible) {
        rect(viewX + 10, entryY, viewW - 32, entryH, isFocused ? 'rgba(79,195,247,0.08)' : index % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.02)', 6, isFocused ? 'rgba(79,195,247,0.48)' : isUnread ? 'rgba(255,215,0,0.28)' : 'rgba(79,195,247,0.08)', isFocused ? 2 : isUnread ? 2 : 1);
        txt(`#${footnote.id.toString().padStart(2, '0')}`, viewX + 26, entryY + 14, 6, COL.gold, false, 'left');
        if (isUnread) txt('NEW', viewX + viewW - 136, entryY + 14, 5, COL.gold, false, 'right');
        if (isFocused) txt('OPEN', viewX + viewW - 88, entryY + 14, 5, COL.cyan, false, 'right');
        txt('ARCHITECT', viewX + viewW - 48, entryY + 14, 5, COL.cyan, false, 'right');
        lines.forEach((line, lineIndex) => {
          txt(line, viewX + 26, entryY + 34 + lineIndex * 14, 5, '#d4d8dd', false, 'left');
        });
        if (actionHintLines.length) {
          txt(actionHintLines[0], viewX + 26, entryY + entryH - 12, 4.25, isFocused && isUnread ? COL.gold : isFocused ? '#8c9298' : '#b8a374', false, 'left');
        }
      }

      y += entryH + entryGap;
    });
  }
  X.restore();

  if (maxScroll > 0) {
    const trackX = PX + PW - 18;
    const trackY = viewY + 10;
    const trackH = viewH - 20;
    const thumbH = Math.max(26, trackH * (viewH / Math.max(viewH, contentH)));
    const thumbY = trackY + ((trackH - thumbH) * ((st.footnoteLedgerScroll || 0) / maxScroll));
    rect(trackX, trackY, 6, trackH, 'rgba(255,255,255,0.08)', 3);
    rect(trackX, thumbY, 6, thumbH, 'rgba(255,215,0,0.8)', 3);
  }

  // USER-PLAYTEST-FIX — buttons raised clear of the panel edge; the ESC hint sits
  // in its own strip below them in a readable gold instead of near-black.
  const btnY = PY + PH - 44;
  drawButton(PX + 18, btnY, 132, 24, '↑  SCROLL', true, COL.cyan);
  drawButton(PX + 160, btnY, 132, 24, '↓  SCROLL', true, COL.cyan);
  drawButton(PX + 302, btnY, 132, 24, 'LATEST', true, unreadCount > 0 ? COL.gold : '#b8a374');
  drawButton(PX + PW - 126, btnY, 108, 24, 'BACK', true, '#8a6e2a');
  txt(unreadCount > 0 ? 'ESC returns • OPEN ONCE, FILE ON SECOND CLICK / ENTER' : 'ESC returns • LATEST jumps to newest file', W / 2, PY + PH - 10, 4.5, '#c8a84b', false);
}

function clickFootnoteLedger(mx, my) {
  const metrics = clampFootnoteLedgerScroll();
  const { PX, PY, PW, PH, viewX, viewY, viewW, viewH, footnotes, entryGap } = metrics;
  const btnY = PY + PH - 44; // USER-PLAYTEST-FIX — matches raised button row

  if (mx > PX + 18 && mx < PX + 150 && my > btnY && my < btnY + 24) {
    scrollFootnoteLedger(-110);
    playClick();
    return true;
  }
  if (mx > PX + 160 && mx < PX + 292 && my > btnY && my < btnY + 24) {
    scrollFootnoteLedger(110);
    playClick();
    return true;
  }
  if (mx > PX + 302 && mx < PX + 434 && my > btnY && my < btnY + 24) {
    const focused = focusLatestUnreadArchitectFootnote() || focusLatestArchitectFootnote();
    if (focused) playClick();
    return true;
  }
  if (mx > PX + PW - 126 && mx < PX + PW - 18 && my > btnY && my < btnY + 24) {
    transitionTo('menu');
    playClick();
    return true;
  }
  if (mx < PX || mx > PX + PW || my < PY || my > PY + PH) {
    transitionTo('menu');
    playClick();
    return true;
  }

  if (mx >= viewX && mx <= viewX + viewW && my >= viewY && my <= viewY + viewH) {
    let y = viewY + 14 - (st.footnoteLedgerScroll || 0);
    const unreadIds = new Set(getUnreadArchitectFootnoteIds());
    for (let i = 0; i < footnotes.length; i++) {
      const footnote = footnotes[i];
      const lines = wrapLines(footnote.text, 62);
      const isUnread = unreadIds.has(footnote.id);
      const isFocused = st.footnoteLedgerFocusId === footnote.id;
      const entryH = 28 + Math.max(1, lines.length) * 14 + 14 + ((isFocused || isUnread) ? 16 : 0);
      const entryY = y;
      const entryX = viewX + 10;
      const entryW = viewW - 32;
      if (mx >= entryX && mx <= entryX + entryW && my >= entryY && my <= entryY + entryH) {
        if (isFocused) {
          const didMarkRead = markArchitectFootnoteRead(footnote.id);
          clearFootnoteLedgerFocus();
          const focused = focusLatestUnreadArchitectFootnote() || focusLatestArchitectFootnote();
          if (didMarkRead || focused) playClick();
        } else {
          const focused = jumpFootnoteLedgerToId(footnote.id, 'center');
          if (focused) playClick();
        }
        return true;
      }
      y += entryH + (i < footnotes.length - 1 ? entryGap : 0);
    }
  }

  return true;
}

// CS-10 PERF: hoisted the terminal-screen suppression set so drawArchitectFootnote
// (called every frame from drawScreen) no longer rebuilds an 8-element array + runs
// a linear .includes() each frame. Same screens suppressed as before.
const FOOTNOTE_SUPPRESS_SCREENS = new Set([
  'boot', SCREEN.FOOTNOTES, SCREEN.MAIN_MENU, SCREEN.EPILOGUE, SCREEN.IPO,
  'spoon_ceremony', 'credits', 'gameover'
]);

function drawArchitectFootnote() {
  if (!st.currentFootnote || FOOTNOTE_SUPPRESS_SCREENS.has(st.screen)) return;
  const life = Math.min(1.0, st.footnoteTimer, ARCHITECT_FOOTNOTE_DISPLAY_TIME - st.footnoteTimer);
  const alpha = clamp(life * 2, 0, 1);
  const lines = wrapLines(st.currentFootnote.text, 90).slice(0, 6);
  const boxW = W - 40;
  const boxH = 22 + lines.length * 12;
  const boxX = 20;
  const boxY = H - boxH - 10;

  X.save();
  X.globalAlpha = alpha * 0.92;
  rect(boxX, boxY, boxW, boxH, 'rgba(0,0,0,0.82)', 6, 'rgba(255,215,0,0.18)', 1);
  txt(`ARCHITECT FOOTNOTE #${st.currentFootnote.id}`, W / 2, boxY + 10, 5.5, COL.cyan, false);
  lines.forEach((line, idx) => txt(line, W / 2, boxY + 24 + idx * 12, 5, COL.dim, false));
  X.restore();
}


// Fallback identity — always safe.
const IDENTITY_TABLE_DEFAULT = {
  id: 'identity_default',
  title: "The Most Indeterminate Founder of Quillhaven",
  color: '#aaaaaa',
  desc: "Thy political position is unclear. Thou hast pleased some, displeased others, and remained perfectly ambiguous. The Architect's footnote 53 reads simply: 'Hmm.' The Committee convened to discuss this and reached no conclusion."
};

function determinePoliticalIdentity() {
  const s = st.ledger;
  const sorted = Object.entries(s).sort((a, b) => b[1] - a[1]);
  const top    = sorted[0]?.[0];
  const bottom = sorted[sorted.length - 1]?.[0];
  return IDENTITY_TABLE.find(entry => entry.match(top, bottom, s)) || IDENTITY_TABLE_DEFAULT;
}

// CS-7: computeCeremony — snapshot the full political reading at run end.
// Called by endRun() before clearRun() wipes the save, so ledger is still live.
// Result stored in st.gameOverCeremony for drawGameOver() to consume.
function computeCeremony() {
  const identity = determinePoliticalIdentity();
  const ledger   = { ...st.ledger }; // snapshot — state will be wiped by clearRun()

  const sorted   = Object.entries(ledger).sort((a, b) => b[1] - a[1]);
  const patrons  = sorted.filter(([, v]) => v >= 60).map(([k]) => FACTIONS[k]?.short || k);
  const feuds    = sorted.filter(([, v]) => v <= COLLAPSE_THRESHOLD).map(([k]) => FACTIONS[k]?.short || k);
  const topEntry = sorted[0];
  const botEntry = sorted[sorted.length - 1];
  const epilogueMilestones = EPILOGUE_MILESTONES.filter(m => m.check(st));
  const avgStrokes = st.totalStrokes / Math.max(1, st.totalHolesCleared);

  return {
    identity,
    ledger,
    patrons,
    feuds,
    topFaction:    topEntry ? (FACTIONS[topEntry[0]]?.short || topEntry[0]) : '—',
    topVal:        topEntry ? topEntry[1] : 0,
    bottomFaction: botEntry ? (FACTIONS[botEntry[0]]?.short || botEntry[0]) : '—',
    bottomVal:     botEntry ? botEntry[1] : 0,
    epilogue: {
      stats: [
        { label: 'Holes Cleared', value: `${st.totalHolesCleared}` },
        { label: 'Total Strokes', value: `${st.totalStrokes}` },
        { label: 'Avg Strokes / Hole', value: `${avgStrokes.toFixed(2)}` },
        { label: 'Final Score', value: `${Math.round(st.score).toLocaleString()}` },
        { label: 'Cash on Hand', value: `$${Math.floor(st.money).toLocaleString()}` },
        { label: 'Lifetime Wealth', value: `$${Math.floor(st.wealth + st.money).toLocaleString()}` },
        { label: 'Quarter Reached', value: `Q${st.quarter}` },
        { label: 'World Reached', value: `${st.currentWorld}` },
        { label: 'Ceremonial Spoons', value: `${st.spoonState?.count || 0}` },
        { label: 'Run Milestones', value: `${Object.keys(st.milestones || {}).length}` },
        { label: 'Patrons / Feuds', value: `${patrons.length} / ${feuds.length}` },
        { label: 'Architect Footnotes', value: `${st.footnoteState?.unlocked?.length || 0}` },
      ],
      milestones: epilogueMilestones,
      headline: epilogueMilestones.length >= 8
        ? 'Quillhaven will remember this with dangerous enthusiasm.'
        : epilogueMilestones.length >= 5
          ? 'A respectable civic wreckage, tastefully documented.'
          : epilogueMilestones.length >= 2
            ? 'The project concludes with mixed metrics and excellent posture.'
            : 'A modest ending, though still expensive to everyone involved.'
    }
  };
}

function buildPreviewCeremony() {
  const ledger = {
    Vastcart: 34,
    Forgeharvest: 48,
    MechanicalCrow: 61,
    CoastalShadow: 72,
    FarmableFractions: 67,
    PredictiveCompliance: 12,
    AlgorithmicApprovals: 28,
    CursorSpectacles: 84,
    MigratoryFounders: 58,
    NativeHollows: 76,
    CommitteeUnnecessarySynergy: 64,
  };
  const sorted = Object.entries(ledger).sort((a, b) => b[1] - a[1]);
  const patrons = sorted.filter(([, v]) => v >= 60).map(([k]) => FACTIONS[k]?.short || k);
  const feuds = sorted.filter(([, v]) => v <= COLLAPSE_THRESHOLD).map(([k]) => FACTIONS[k]?.short || k);
  const identity = IDENTITY_TABLE.find(entry => entry.match(sorted[0]?.[0], sorted[sorted.length - 1]?.[0], ledger)) || IDENTITY_TABLE_DEFAULT;
  const milestones = EPILOGUE_MILESTONES.slice(0, 8);
  return {
    identity,
    ledger,
    patrons,
    feuds,
    topFaction: FACTIONS[sorted[0][0]]?.short || sorted[0][0],
    topVal: sorted[0][1],
    bottomFaction: FACTIONS[sorted[sorted.length - 1][0]]?.short || sorted[sorted.length - 1][0],
    bottomVal: sorted[sorted.length - 1][1],
    epilogue: {
      stats: [
        { label: 'Holes Cleared', value: '29' },
        { label: 'Total Strokes', value: '94' },
        { label: 'Avg Strokes / Hole', value: '3.24' },
        { label: 'Final Score', value: '184,200' },
        { label: 'Cash on Hand', value: '$24,800' },
        { label: 'Lifetime Wealth', value: '$61,400' },
        { label: 'Quarter Reached', value: 'Q6' },
        { label: 'World Reached', value: '8' },
        { label: 'Ceremonial Spoons', value: '7' },
        { label: 'Run Milestones', value: '13' },
        { label: 'Patrons / Feuds', value: `${patrons.length} / ${feuds.length}` },
        { label: 'Architect Footnotes', value: '17' },
      ],
      milestones,
      headline: 'A respectable civic wreckage, tastefully documented.'
    }
  };
}
// ── END CS-7 IDENTITY TABLE ──────────────────────────────────────────────────

function startNewRun(worldId = 1) {
  Object.assign(st, getFreshState());
  // GP-8-EXT / FINAL: reset the once-per-session reskin announcement so a fresh
  // run re-announces the first variant. (_variantRewardApplied and
  // _lastPivotChoiceId live on the per-spawn mini instance created by
  // createMinigameInstance, so they reset automatically every new minigame and
  // need no explicit clearing here.)
  _variantAnnouncedOnce = false;
  applyMetaToState();
  st.runActive = true;
  st.currentWorld = clamp(worldId, 1, WORLDS.length);
  if (!st.worldsUnlocked.includes(st.currentWorld)) st.worldsUnlocked.push(st.currentWorld);
  st.worldProgress = {};
  st.holeInWorld = 1;
  st.caddy = CADDIES[0];
  st.screen = 'playing';
  initTeam();
  refreshStrategyOffers();
  logStory(DIALOGUE.initiatives[Math.floor(Math.random() * DIALOGUE.initiatives.length)]);
  st.oppFinished = false;
  resetBall();
  maybeShowTouchOnboarding();
  addPopup('⛳ TEE OFF!', W / 2, H / 2 - 40, COL.gold, 18, 1.8);
  addBurst(W / 2, H / 2 - 10, COL.gold, 22);
  playSuccess();
  saveRun();
}

function updateFunding() {
  let tier = 0;
  for (let i = 0; i < FUNDING_THRESHOLDS.length; i++) {
    if (st.money >= FUNDING_THRESHOLDS[i]) tier = i;
  }
  const prev = st.funding;
  st.funding = clamp(tier, 0, FUNDING_ROUNDS.length - 1);
  if (st.funding > prev) {
    addPopup(`📈 ${FUNDING_ROUNDS[st.funding]}!`, W / 2, 130, COL.gold, 14);
    addBurst(W / 2, 150, COL.gold, 18);
    playSuccess();
  }
}

function getClubPowerBonus() {
  return st.equipment.find(e => e.id === 'driver' && e.equipped) ? 0.15 : 0;
}

function getAccuracyBonus() {
  let bonus = st.equipment.find(e => e.id === 'putter' && e.equipped) ? 10 : 0;
  if (st.powerups.find(p => p.id === 'accuracy' && p.owned)) bonus += 8;
  return bonus;
}

// ── FACTION CRISIS DEBUFFS ───────────────────────────────────────────────────
// computeCrisisDebuff() surveys all collapsed factions (≤ COLLAPSE_THRESHOLD)
// and returns a combined debuff applied to meter speed, swing power, aim, and burn.
//
// Per-faction debuffs when in Blood Feud:
//   Vastcart            → +20 meter speed  (retail empire withdraws pace-setting support)
//   Forgeharvest        → -15% power       (supply chain failures sap your reach)
//   MechanicalCrow      → +8° aim scatter  (drone jamming throws your aim off)
//   PredictiveCompliance→ +$60/hole burn   (Magistrate issues compliance fines)
//   AlgorithmicApprovals→ +10 meter speed  (all approvals denied — you're working blind)
//   NativeHollows       → +10° aim scatter (locals actively impede you)
//   CommitteeUnnecessarySynergy → -10% power (spoon revoked = morale collapse)
//   Any other collapsed → +5 meter speed each (ambient political static)
//
// Returns { meterSpeedPenalty, powerMultiplier, anglePenalty, burnPenalty }
// ============================================================
// IPO FINALE — THE SHAREHOLDER ROLL CALL
// ============================================================
const IPO_JUDGMENTS = {
  Vastcart: {
    patron: "Your volume was legendary. Bentonville has already named a wing of the Home Office after your runway.",
    neutral: "We'll stock your tokens, but only on the bottom shelf. Consistency is your only saving grace.",
    feud: "The chargebacks are coming. We've already moved your inventory into a furnace."
  },
  Forgeharvest: {
    patron: "The yield was sublime. Every chicken nugget in Quillhaven now bears your digital signature.",
    neutral: "Throughput was acceptable. You didn't break the supply chain, and for that, we thank you.",
    feud: "Your inefficiency was an insult to the Noble Order. Expect a logjam at every exit."
  },
  MechanicalCrow: {
    patron: "The surveillance was perfect. Lord Buzzwick has thousands of hours of your backswing. It is beautiful.",
    neutral: "The data was adequate. The crows are mostly satisfied with your heart rate telemetry.",
    feud: "We've recorded every violation. Your reputation is a digital wreckage. Watch your head."
  },
  CoastalShadow: {
    patron: "The Contrarian Baron is weeping. He has never seen such a magnificent failure package. You are a genius.",
    neutral: "You were somewhat consensus-driven, but your liquidity remained interesting. Acceptable.",
    feud: "Consensus thinking. Mediocrity. You are dead to the Baron. Liquidation is pending."
  },
  FarmableFractions: {
    patron: "The dirt is yours! Every fractional shovelful has been successfully minted. Tillage is proud.",
    neutral: "Your agricultural engagement was sufficient. The soil remains tokenized and mostly stable.",
    feud: "Urbanite arrogance. You've poisoned the FarmChain. The Solemn Order will never forget."
  },
  PredictiveCompliance: {
    patron: "The ledger is clean. Magistrate Ledger has archived your performance as 'The Perfect Algorithm.'",
    neutral: "Your process adherence was within acceptable parameters. No emergency audits... for now.",
    feud: "Dress code violations. Regulatory anarchy. The Ministry is coming for your exit package."
  },
  AlgorithmicApprovals: {
    patron: "High denial rates, high margins. The Apothecary's AI has pre-approved your retirement.",
    neutral: "Your diagnostic ambiguity was helpful. We've algorithmically approved your survival.",
    feud: "Excessive empathy. The system has denied your IPO on the grounds of pre-existing ethics."
  },
  CursorSpectacles: {
    patron: "HYPE UNLIMITED! You are the rocket ship, the moon, and the entire galaxy of disruptors.",
    neutral: "The vibes were good. You networked adequately. Your thought leadership was directionally correct.",
    feud: "Legacy tech. No rocket emojis. You've been unfollowed by the entire Confraternity."
  },
  MigratoryFounders: {
    patron: "Infinite potential achieved. You have transcended location and taxes. Aspen awaits.",
    neutral: "You kept the runway long enough. The Devotional acknowledges your strategic ambiguity.",
    feud: "Too tangible. You actually shipped things. The mystique is gone. You're just a worker now."
  },
  NativeHollows: {
    patron: "Goodwife Henrietta has poured the finest tea. You are a local hero, a true neighbor.",
    neutral: "You didn't pave the tea room. That's more than we expected from a corporate entity.",
    feud: "Corporate vulture. You've sold out the Hollows. Henrietta's petunias will never forgive you."
  },
  CommitteeUnnecessarySynergy: {
    patron: "The Great Spoon of Quillhaven is yours! A masterpiece of fiscal tragedy and structural poetry.",
    neutral: "Acceptable synergy. The Committee awards you a commemorative lead-plated napkin.",
    feud: "You made a profit. You were efficient. You've destroyed the art of the elaborate loss."
  }
};

function triggerIPO() {
  st.ipoIndex = 0;
  st.ipoFactions = Object.keys(FACTIONS);
  st.ipoComplete = false;
  st.screen = 'ipo';
  playSuccess();
}

function drawIPO() {
  const world = WORLDS[7]; // IPO World background
  const g = X.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, world.sky[0]);
  g.addColorStop(1, world.sky[1]);
  X.fillStyle = g;
  X.fillRect(0, 0, W, H);

  // CRT Overlay effect
  X.fillStyle = 'rgba(0,0,0,0.4)';
  X.fillRect(0, 0, W, H);

  if (st.ipoIndex < st.ipoFactions.length) {
    const factionKey = st.ipoFactions[st.ipoIndex];
    const faction = FACTIONS[factionKey];
    const standing = st.ledger[factionKey] || 0;
    const grade = standing >= 60 ? 'patron' : (standing <= COLLAPSE_THRESHOLD ? 'feud' : 'neutral');
    const msg = IPO_JUDGMENTS[factionKey][grade];
    const portrait = getPortrait(factionKey);

    panel(W / 2 - 250, H / 2 - 180, 500, 360, "🏛️ SHAREHOLDER ROLL CALL");
    
    // Portrait
    X.fillStyle = 'black';
    X.fillRect(W / 2 - 60, H / 2 - 130, 120, 120);
    drawSprite(portrait, W / 2 - 60, H / 2 - 130, 120, 120);
    rect(W / 2 - 60, H / 2 - 130, 120, 120, 'transparent', 2, COL.cyan, 2);

    // Faction Name & Standing
    txt(faction.name.toUpperCase(), W / 2, H / 2 + 10, 8, COL.gold, true);
    txt(`STANDING: ${standing.toFixed(0)} (${grade.toUpperCase()})`, W / 2, H / 2 + 30, 7, standing >= 0 ? COL.grn : COL.red, true);

    // Judgment Message
    const lines = wrapLines(msg, 50);
    lines.forEach((l, i) => txt(l, W / 2, H / 2 + 60 + i * 20, 7, COL.white, false));

    txt("CLICK TO ADVANCE", W / 2, H / 2 + 150, 6, COL.dim, true);
  } else {
    // Final Summary / Post-Game Statistics Dashboard
    panel(W / 2 - 320, H / 2 - 220, 640, 440, "📈 IPO STRATEGIC DASHBOARD");
    
    const totalWealth = st.wealth + st.money;
    const patrons = Object.entries(st.ledger).filter(([k,v]) => v >= 60);
    const feuds = Object.entries(st.ledger).filter(([k,v]) => v <= COLLAPSE_THRESHOLD);

    let rank = "FAILED EXIT";
    let rankCol = COL.red;
    if (patrons.length >= 8) { rank = "UNICORN ASCENDANT"; rankCol = COL.gold; }
    else if (patrons.length >= 5) { rank = "STRATEGIC ACQUISITION"; rankCol = COL.cyan; }
    else if (feuds.length < 3) { rank = "LIFESTYLE BUSINESS"; rankCol = COL.grn; }
    else if (feuds.length >= 6) { rank = "CRIMINAL INVESTIGATION"; rankCol = COL.ora; }

    // Rank Header
    txt("IPO FINAL VALUATION:", W / 2, H / 2 - 180, 8, COL.dim, true);
    txt(`$${(totalWealth * 1.5).toFixed(0)}`, W / 2, H / 2 - 150, 22, rankCol, true);
    txt(`MARKET STATUS: ${rank}`, W / 2, H / 2 - 120, 10, COL.white, true);

    // Grid Layout for Stats
    const colLeft = W / 2 - 280;
    const colRight = W / 2 + 30;
    const rowY = H / 2 - 80;

    // LEFT COLUMN: Faction Sentiment
    X.fillStyle = 'rgba(0,0,0,0.3)';
    rect(colLeft, rowY, 250, 240, 'rgba(0,0,0,0.4)', 6, COL.dim, 1);
    txt("FACTION SENTIMENT", colLeft + 125, rowY + 20, 7, COL.gold, true);
    
    // Sort all factions by standing
    const sortedFactions = Object.entries(st.ledger).sort((a,b) => b[1] - a[1]);
    sortedFactions.slice(0, 4).forEach((f, i) => {
      const fname = FACTIONS[f[0]].short;
      txt(`${fname}:`, colLeft + 20, rowY + 50 + i * 25, 6, COL.white, false, 'left');
      txt(`${f[1].toFixed(0)}`, colLeft + 230, rowY + 50 + i * 25, 6, f[1] >= 60 ? COL.grn : COL.white, false, 'right');
    });
    txt("...", colLeft + 125, rowY + 150, 6, COL.dim, true);
    sortedFactions.slice(-2).forEach((f, i) => {
      const fname = FACTIONS[f[0]].short;
      txt(`${fname}:`, colLeft + 20, rowY + 175 + i * 25, 6, COL.red, false, 'left');
      txt(`${f[1].toFixed(0)}`, colLeft + 230, rowY + 175 + i * 25, 6, COL.red, false, 'right');
    });

    // RIGHT COLUMN: Corporate Metrics
    rect(colRight, rowY, 250, 240, 'rgba(0,0,0,0.4)', 6, COL.dim, 1);
    txt("CORPORATE PERFORMANCE", colRight + 125, rowY + 20, 7, COL.gold, true);

    const stats = [
      { l: "Total Strokes", v: st.totalStrokes },
      { l: "Avg Strokes/Hole", v: (st.totalStrokes / Math.max(1, st.totalHolesCleared)).toFixed(2) },
      { l: "Total Revenue", v: `$${st.totalMoneyEarned}` },
      { l: "Total Hype Built", v: `+${st.totalScoreEarned}` },
      { l: "Vesting Periods", v: st.quarter },
      { l: "Holes Cleared", v: st.totalHolesCleared }
    ];

    stats.forEach((s, i) => {
      txt(s.l + ":", colRight + 20, rowY + 50 + i * 30, 6, COL.dim, false, 'left');
      txt(s.v, colRight + 230, rowY + 50 + i * 30, 6, COL.white, false, 'right');
    });

    txt("THE QUILLHAVEN SAGA CONCLUDES.", W / 2, H - 70, 7, COL.dim, true);
    drawButton(W / 2 - 100, H - 55, 200, 32, "EXIT SIMULATION", true, COL.cyan, true);
  }
}

function clickIPO() {
  if (st.ipoIndex < st.ipoFactions.length) {
    st.ipoIndex++;
    playClick();
  } else {
    st.ipoComplete = true;
    st.gameOverCeremony = computeCeremony();
    st.ceremonyPhase = 0;
    clearRun();
    st.screen = SCREEN.EPILOGUE;
    playSuccess();
  }
}

function computeCrisisDebuff() {
  const result = { meterSpeedPenalty: 0, powerMultiplier: 1.0, anglePenalty: 0, burnPenalty: 0 };
  if (!st.ledger) return result;

  // CS-10 PERF: this runs every frame (via getMeterSpeed + drawCrisisDebuffHUD).
  // Switched Object.entries() to a plain for-in loop to avoid allocating an
  // array of [key,val] pairs each frame. Same logic and result.
  for (const key in st.ledger) {
    const val = st.ledger[key];
    if (val > COLLAPSE_THRESHOLD) continue; // not in Blood Feud
    switch (key) {
      case 'Vastcart':
        result.meterSpeedPenalty += 35; // Increased from 20
        break;
      case 'Forgeharvest':
        result.powerMultiplier *= 0.75; // Increased penalty from 0.85
        break;
      case 'MechanicalCrow':
        result.anglePenalty += 12; // Increased from 8
        break;
      case 'PredictiveCompliance':
        result.burnPenalty += 250; // Increased significantly from 60
        break;
      case 'AlgorithmicApprovals':
        result.meterSpeedPenalty += 20; // Increased from 10
        break;
      case 'NativeHollows':
        result.anglePenalty += 15; // Increased from 10
        break;
      case 'CommitteeUnnecessarySynergy':
        result.powerMultiplier *= 0.80; // Increased penalty from 0.90
        break;
      default:
        // CoastalShadow, FarmableFractions, CursorSpectacles, MigratoryFounders
        result.meterSpeedPenalty += 10; // Increased from 5
        break;
    }
  }
  return result;
}
// ── END FACTION CRISIS DEBUFFS ───────────────────────────────────────────────

function getMeterSpeed() {
  let speed = 150;
  if (st.equipment.find(e => e.id === 'gloves' && e.equipped)) speed -= 28;
  const active = st.roster[0];
  if (active && active === 'fast_food_fiona') speed -= 12;
  // CS-6: crisis debuff — collapsed factions speed up the meter (harder to stop)
  const debuff = computeCrisisDebuff();
  speed += debuff.meterSpeedPenalty;
  return speed;
}

function meetsWorldRequirement(id) {
  const req = WORLD_REQUIREMENTS[id] || WORLD_REQUIREMENTS[1];
  return st.reputation >= req.rep && st.hype >= req.hype && st.compliance >= req.compliance && st.quarter >= req.quarter;
}

function canEnterWorld(id) {
  const world = WORLDS.find(w => w.id === id);
  if (!world) return false;
  if (st.funding < world.fundingReq) return false;
  if (!meetsWorldRequirement(id)) return false;
  if (id === 1) return true;
  const prev = WORLDS.find(w => w.id === id - 1);
  return (st.worldProgress[prev.id] || 0) >= prev.holes;
}

function enterWorld(id) {
  if (!canEnterWorld(id)) {
    const req = WORLD_REQUIREMENTS[id] || WORLD_REQUIREMENTS[1];
    addPopup('WORLD LOCKED', W / 2, 170, COL.red, 14);
    addPopup(`Need REP ${req.rep} • HYPE ${req.hype} • COMP ${req.compliance} • Q${req.quarter}`, W / 2, 196, COL.ora, 7);
    playFail();
    return;
  }
  if (!st.runActive) startNewRun(id);
  st.currentWorld = id;
  if (!st.worldsUnlocked.includes(id)) st.worldsUnlocked.push(id);
  st.holeInWorld = (st.worldProgress[id] || 0) + 1;
  st.screen = 'playing';
  st.oppFinished = false;
  resetBall();
  maybeShowTouchOnboarding();
  addPopup(`WORLD ${id}: ${getWorld().name.toUpperCase()}`, W / 2, 130, COL.gold, 12);
  logStory(`Entered ${getWorld().name}. ${WORLD_REQUIREMENTS[id]?.note || 'Another terrible strategic decision.'}`);
  playClick();
  saveMeta();
  saveRun();
}

function refreshJobOffers() {
  const allIds = Object.keys(ARCHETYPE_STATS);
  const taken = new Set([...st.roster, ...st.bench, ...st.discovered.hires.map(h => h.id)]);
  const pool = allIds.filter(id => !taken.has(id));
  pool.sort(() => Math.random() - 0.5);
  // USER-PLAYTEST-FIX — 9 offers fill the full 3×3 fair (scrollable), and the
  // voice line is cached per offer: it was re-randomized EVERY FRAME, which is
  // what made the grey text "glitch out" unreadably.
  st.jobOffers = pool.slice(0, 9).map(id => ({
    id,
    cost: ARCHETYPE_STATS[id].hireCost,
    signingBonus: Math.random() < 0.3 ? 200 + Math.floor(Math.random() * 350) : 0,
    line: getJobOfferLine(id),
  }));
  st.jobFairScroll = 0;
}

// USER-PLAYTEST-FIX — scroll support so the third fair row is reachable
function clampJobFairScroll() {
  const rows = Math.ceil(st.jobOffers.length / 3);
  const contentH = rows * 180;
  const viewH = 412; // cards visible between y≈88 and y≈500
  const maxScroll = Math.max(0, contentH - viewH);
  st.jobFairScroll = clamp(st.jobFairScroll || 0, 0, maxScroll);
  return { maxScroll, contentH, viewH };
}

function hireCharacter(id, cost, signingBonus = 0) {
  if (st.money < cost) {
    addPopup('CAN\'T AFFORD', W / 2, H / 2, COL.red, 12);
    playFail();
    return;
  }
  if (st.roster.length >= 4 && st.bench.length >= 6) {
    addPopup('TEAM FULL', W / 2, H / 2, COL.red, 12);
    playFail();
    return;
  }
  st.money -= cost;
  st.money += signingBonus;
  if (st.roster.length < 4) st.roster.push(id);
  else st.bench.push(id);
  st.teamStats[id] = { stamina: 100, morale: 75, loyalty: 55 };
  addPopup(`HIRED: ${ARCHETYPE_STATS[id].name}`, W / 2, H / 2 - 20, COL.grn, 13);
  addPopup(getArchetypeVoiceLine(id, 'brag'), W / 2, H / 2 + 10, COL.cyan, 8, 4.2);
  if (signingBonus > 0) addPopup(`+$${signingBonus} signing bonus`, W / 2, H / 2 + 34, COL.gold, 10);
  addBurst(W / 2, H / 2 + 20, COL.grn, 14);
  playSuccess();
  refreshJobOffers();
  saveRun();
}

function moveRosterToBench(index) {
  if (index < 0 || index >= st.roster.length || st.bench.length >= 6) return;
  const id = st.roster.splice(index, 1)[0];
  st.bench.push(id);
  addPopup(`${ARCHETYPE_STATS[id].name} benched`, W / 2, 170, COL.ora, 10);
  playClick();
  saveRun();
}

function moveBenchToRoster(index) {
  if (index < 0 || index >= st.bench.length || st.roster.length >= 4) return;
  const id = st.bench.splice(index, 1)[0];
  st.roster.push(id);
  addPopup(`${ARCHETYPE_STATS[id].name} activated`, W / 2, 170, COL.grn, 10);
  playClick();
  saveRun();
}

function fireBenchCharacter(index) {
  if (index < 0 || index >= st.bench.length) return;
  const id = st.bench.splice(index, 1)[0];
  delete st.teamStats[id];
  addPopup(`🔥 ${ARCHETYPE_STATS[id].name} fired`, W / 2, 170, COL.red, 11);
  if (Math.random() < 0.25) {
    const damages = 400 + Math.floor(Math.random() * 1400);
    st.money -= damages;
    addPopup(`⚖️ lawsuit: -$${damages}`, W / 2, 196, COL.ora, 10);
    playFail();
  } else {
    playClick();
  }
  saveRun();
}

function updateTeamAfterHole(result) {
  const active = st.roster[0];
  if (!active || !st.teamStats[active]) return;
  const t = st.teamStats[active];
  const moraleDelta = result === 'great' ? 7 : result === 'good' ? 3 : result === 'bad' ? -7 : -12;
  const staminaDelta = result === 'great' ? -6 : result === 'good' ? -9 : result === 'bad' ? -14 : -18;
  t.morale = clamp(t.morale + moraleDelta, 0, 100);
  t.stamina = clamp(t.stamina + staminaDelta, 0, 100);

  for (const id of st.bench) {
    const bt = st.teamStats[id];
    if (!bt) continue;
    bt.stamina = clamp(bt.stamina + 24, 0, 100);
    bt.morale = clamp(bt.morale + 2, 0, 100);
  }

  if (t.stamina <= 0 && st.bench.length > 0) {
    const reserve = st.bench.shift();
    st.bench.push(active);
    st.roster[0] = reserve;
    addPopup(`${ARCHETYPE_STATS[reserve].name} subbed in`, W / 2, 160, COL.cyan, 10);
  }

  if (t.morale < 18 && Math.random() < (18 - t.morale) / 45) {
    const quitType = ['rage', 'silent', 'linkedin'][Math.floor(Math.random() * 3)];
    const quitMsg = quitType === 'rage' ? 'rage quit' : quitType === 'silent' ? 'ghosted the org chart' : 'took a better LinkedIn offer';
    const idx = st.roster.indexOf(active);
    if (idx >= 0) st.roster.splice(idx, 1);
    delete st.teamStats[active];
    addPopup(`${ARCHETYPE_STATS[active].name} ${quitMsg}!`, W / 2, 145, COL.red, 11);
    if (st.bench.length > 0) st.roster.push(st.bench.shift());
  }
}

function getMinigamePool(phase) {
  const world = getWorld();
  if (phase === 'pregate') {
    const p2pool = getWorldMinigamePool(world.id);
    return p2pool.length ? p2pool : world.pregate;
  }
  return world.chaos;
}

function chooseGame(pool) {
  const picked = pool[Math.floor(Math.random() * pool.length)];
  // GP-8-EXT / POLISH: gate variants behind a single tunable chance. If the
  // pool hands us a reskin but the roll fails, fall back to its plain base game
  // so VARIANT_SPAWN_CHANCE is the one real knob controlling reskin frequency.
  if (GP8_VARIANT_IDS.has(picked)) {
    if (Math.random() < VARIANT_SPAWN_CHANCE) {
      // A variant genuinely spawns — announce it once so the player notices.
      if (!_variantAnnouncedOnce && typeof addPopup === 'function') {
        _variantAnnouncedOnce = true;
        // GP-8-EXT / FINAL: clearer, more archaic announcer beat so players notice the reskin.
        addPopup('⚠ A REBRAND is upon thee — same toil, freshly monetised.', W / 2, 104, COL.gold, 7, 4.0);
      }
      return picked;
    }
    return MINIGAME_ALIAS[picked] || picked; // degrade to base game
  }
  return picked;
}

// GP-8-EXT / FINAL: title for a minigame window. If the instance is an active
// GP-8 reskin, show the variant label with a ★ cue so the player can see, at a
// glance, that they are in a rebranded minigame; otherwise the plain base title.
function miniDisplayLabel(mini, fallback) {
  if (!mini) return fallback;
  if (mini.variant && GP8_VARIANT_IDS.has(mini.variant)) {
    return '★ ' + (MINIGAME_LABELS[mini.variant] || mini.label || fallback);
  }
  return MINIGAME_LABELS[mini.id] || fallback;
}

// ============================================================
// PHASE 2 — MINIGAME LABELS (unified)
// ============================================================
const MINIGAME_LABELS = {
  pong:        'Vastcart Vendor Defense',
  breakout:    'Algorithmic Prior Auth',
  catch:       'Forgeharvest Yield Sorting',
  flappy:      'Mechanical Crow Navigation',
  memory:      'Predictive Ledger Audit',
  rps:         'Coastal Shadow Term Sheet',
  tetris:      'Synergy Reorganization',
  ttt:         'Stealth Founder Vibe Check',
  twentyforty: 'Fractional Token Merger',
  // Variants (GP-8)
  tax_shelter_tetris: 'Tax Shelter Tetris',
  stealth_mode:        'Stealth Mode Memory',
  pivot_roulette:      'Pivot Roulette',
  // Legacy labels for backward compat
  reactionTimer: 'Deploy Reaction',
  nuggetCatcher: 'Yield Catcher',
  passwordMemory: 'Predictive Audit',
  customerPong: 'Vendor Pong',
  bugWhacker: 'Bug Whacker',
  deployReaction: 'Sweet Spot',
  officeFrogger: 'Office Frogger',
  meetingRunner: 'Meeting Runner',
};

// Legacy alias mapping
const MINIGAME_ALIAS = {
  reactionTimer: 'pong',
  nuggetCatcher: 'catch',
  passwordMemory: 'memory',
  customerPong: 'pong',
  bugWhacker: 'breakout',
  deployReaction: 'pong',
  officeFrogger: 'flappy',
  meetingRunner: 'pong',
  forkliftFrenzy: 'pong',
  droneFlappy: 'flappy',
  scopeSnake: 'tetris',
  emailInvaders: 'breakout',
  orgTetris: 'tetris',
  kpiBreakout: 'breakout',
  priorAuthChase: 'flappy',
  budgetAsteroids: 'breakout',
  pitchDeckSlider: 'twentyforty',
  // Variants (GP-8)
  tax_shelter_tetris: 'tetris',
  stealth_mode:        'memory',
  pivot_roulette:      'rps',
};

// GP-8: Minigame Variant Configurations
const MINIGAME_VARIANTS_CONFIG = {
  tax_shelter_tetris: {
    depts: ['LOSS', 'VOID', 'EXP', 'DEBT', 'SHELL', 'K-1', 'W-2'],
    skin: 'breakout', // reuse breakout colors
    archetype: 'sirWastrel'
  },
  stealth_mode: {
    pairs: ['Busywork', 'Deep Focus', 'Pre-Launch', 'Silent Audit', 'Shadow Task', 'Unseen KPI', 'Dark Vibe', 'Quiet Win'],
    skin: 'memory',
    archetype: 'brotherIdleworth'
  },
  pivot_roulette: {
    choices: [
      { id: 'rock', label: 'AI DIRT', beats: 'scissors' },
      { id: 'paper', label: 'CRYPTO', beats: 'rock' },
      { id: 'scissors', label: 'SAAS', beats: 'paper' }
    ],
    skin: 'rps',
    archetype: 'pivotAddict'
  }
};

// ============================================================
// PHASE 2 — createMinigameInstance factory
// ============================================================
function createMinigameInstance(id, ctx = {}) {
  // Resolve legacy IDs to Phase 2 IDs
  const resolved = MINIGAME_ALIAS[id] || id;
  const builders = {
    pong: buildPong, breakout: buildBreakout, catch: buildCatch,
    flappy: buildFlappy, memory: buildMemory, rps: buildRps,
    tetris: buildTetris, ttt: buildTtt, twentyforty: buildTwentyForty
  };
  const builder = builders[resolved];
  if (!builder) {
    console.warn('[minigame] unknown id', id, 'falling back to pong');
    return builders.pong(ctx);
  }
  
  // Pass the original ID as the variant in the context
  const minigameCtx = { ...ctx, variant: id };
  const inst = builder(minigameCtx);
  inst.id = resolved;
  inst.variant = id;
  inst.label = MINIGAME_LABELS[id] || MINIGAME_LABELS[resolved] || id;
  inst._startedAt = performance.now();
  inst._announcer = pickAnnouncerQuip(id, ctx.worldId || st.currentWorld);
  inst._timerVariantIdx = Math.floor(Math.random() * TIMER_VARIATIONS.length);
  return inst;
}

// ============================================================
// PHASE 2 — 9 FULLY-IMPLEMENTED ARCADE GAMES
// ============================================================

const HIERARCHY_2048 = [
  '', 'Dirt', 'Parcel', 'Plot', 'Acre',
  'Tract', 'Estate', 'Holding', 'Syndicate', 'Fiefdom', 'Token'
];
const KPI_BRICKS = [
  'Form 2B','Audit','Summons','Penalty','Writ',
  'Decree','Statute','Clause','Sub-Rule','Bylaw',
  'Code','Section','Article','Provision','Mandate',
  'Ruling','Edict','Injunction','Ordinance','Charter'
];
const TETRIS_DEPTS = ['SYN','OPT','VIB','HYPE','LED','GRW','SYC'];
const PASSWORD_PAIRS = [
  'EncryptedWire_01','Memo_Dissent','Ledger_Open','Prior_Auth_99',
  'Sub_Ledger_X','Oracle_Key_4','Void_Clause','Shadow_Holdings'
];
const FLAPPY_HAZARDS = [
  'COMMITTEE','THE BARON','LADY SYNERGY','MAGISTRATE',
  'LOCAL TEA','GOODWIFE','THE ALGORITHM','SIR WASTREL'
];
const RPS_CHOICES = [
  { id:'rock', label:'LAWYER', beats:'scissors' },
  { id:'paper', label:'SIGN', beats:'rock' },
  { id:'scissors', label:'WALK AWAY', beats:'paper' }
];
const TTT_QUESTIONS = [
  'Explain fractional dirt?','Reverse a synergy?','Design a stealth yacht?','Pre-violate an audit?','Roast a pitch deck?','Pivot to nowhere?'
];
const CATCH_ITEMS_FLAVOR = [
  { name:'Meat', pts:10, glyph:'🍖', rarity:0.55 },
  { name:'Metal', pts:15, glyph:'🔩', rarity:0.25 },
  { name:'Biomass', pts:5, glyph:'🌱', rarity:0.20 }
];
const KAREN_NAMES = [
  'Lady Synergy','Sister Metrics','Goodwife Forms',
  'The Regional Assessor','Magistrate Adjunct',
  'Compliance Observer','Audit Prefect','Vastcart Monitor'
];

const _sprites = {};
function loadSprite(path) {
  if (_sprites[path]) return _sprites[path];
  const img = new Image();
  img.src = path;
  _sprites[path] = img;
  return img;
}

function getActiveMini() {
  return st.pregateMini || st.chaosMini || st.trainingMini || st.arcadeMini;
}

function getActiveMiniWindow() {
  if (st.screen === SCREEN.PREGATE) return st.pregateWindow || MINI_WINDOW_STANDARD;
  if (st.screen === SCREEN.CHAOS) return st.chaosWindow || MINI_WINDOW_CHAOS;
  if (st.screen === SCREEN.TRAINING && st.trainingMini) return MINI_WINDOW_STANDARD;
  if (st.screen === SCREEN.ARCADE && st.arcadePhase === 'play' && st.arcadeMini) return MINI_WINDOW_STANDARD;
  return MINI_WINDOW_STANDARD;
}

function getCanvasPointer(evt) {
  if (!evt || typeof evt.clientX !== 'number' || typeof evt.clientY !== 'number') return null;
  const rect = C.getBoundingClientRect();
  return {
    mx: (evt.clientX - rect.left) * (W / rect.width),
    my: (evt.clientY - rect.top) * (H / rect.height),
    rect,
  };
}

function getMiniPointer(evt, fallbackWin = null) {
  const pointer = getCanvasPointer(evt);
  if (!pointer) return null;
  const win = fallbackWin || getActiveMiniWindow();
  return {
    mx: pointer.mx,
    my: pointer.my,
    x: pointer.mx - win.x,
    y: pointer.my - win.y,
    win,
  };
}

function getMiniWindowSkin(mini) {
  if (!mini) return MINI_WINDOW_SKINS.default;
  return MINI_WINDOW_SKINS[mini.variant] || MINI_WINDOW_SKINS[mini.id] || MINI_WINDOW_SKINS.default;
}

function cleanupMini(mini) {
  if (mini && typeof mini.cleanup === 'function') mini.cleanup();
}

function routeMiniMotion(mx, my) {
  if (st.screen === 'pregate') return forwardMiniMouse(st.pregateMini, 'move', mx, my, st.pregateWindow);
  if (st.screen === 'chaos') return forwardMiniMouse(st.chaosMini, 'move', mx, my, st.chaosWindow);
  if (st.screen === 'training') return forwardMiniMouse(st.trainingMini, 'move', mx, my, MINI_WINDOW_STANDARD);
  if (st.screen === 'arcade' && st.arcadePhase === 'play') return forwardMiniMouse(st.arcadeMini, 'move', mx, my, MINI_WINDOW_STANDARD);
  return false;
}

function forwardMiniMouse(mini, mode, mx, my, win) {
  if (!mini || typeof mini.handleMouse !== 'function') return false;
  const activeWin = win || getActiveMiniWindow();
  if (mx < activeWin.x || mx > activeWin.x + activeWin.w || my < activeWin.y || my > activeWin.y + activeWin.h) return false;
  mini.handleMouse(mode, mx - activeWin.x, my - activeWin.y);
  return true;
}

// --- CORPORATE TIMER OVERLAY (shared) ---
// Fix: use stable index instead of Math.random() per frame (caused flickering)
function drawCorporateTimer(a, b, c, d, e, f) {
  let ctx = X;
  let x = 0;
  let y = 0;
  let w = 300;
  let elapsed = 0;
  let timerMs = 0;
  let variantIdx = null;

  if (a && typeof a.fillText === 'function') {
    ctx = a;
    x = b || 0;
    y = c || 0;
    w = d || 300;
    elapsed = e || 0;
    timerMs = f || 0;
    const mini = getActiveMini();
    variantIdx = mini && typeof mini._timerVariantIdx === 'number' ? mini._timerVariantIdx : 0;
  } else {
    x = a || 0;
    timerMs = b || 0;
    w = c || 300;
    variantIdx = d;
  }

  const msRemaining = timerMs > 0 ? Math.max(0, timerMs - elapsed) : Math.max(0, b || 0);
  const sec = Math.max(0, Math.ceil(msRemaining / 1000));
  const idx = ((variantIdx != null ? variantIdx : 0) + TIMER_VARIATIONS.length) % TIMER_VARIATIONS.length;
  const text = TIMER_VARIATIONS[idx].replace('{X}', sec);

  ctx.fillStyle = sec <= 5 ? '#f33' : '#ff0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(text, x + w - 6, y + 14);
  ctx.textAlign = 'left';
}

// Helper: map raw 0-100 score to contract performance
function scoreToPerformance(score100) {
  const s = clamp(score100, 0, 100);
  return {
    angleDeviation: clamp((50 - s) * 0.5, -25, 25),
    powerBoost: clamp((s - 50) * 0.006, -0.30, 0.30),
    chaosFactor: clamp((100 - s) / 100, 0, 1)
  };
}

// 1. CUSTOMER SERVICE PONG
function buildPong(ctx) {
  const state = {
    ballX:150, ballY:100, vx:4.0, vy:3.0,
    playerY:80, aiY:80, paddleH:40,
    rallies:0, lives:3,
    karenSprite: loadSprite('assets/vendor_pong_paddle.webp'),
    karenName: KAREN_NAMES[Math.floor(Math.random()*KAREN_NAMES.length)],
    keys:{up:false,down:false}
  };
  const TIMER = 20000;
  return {
    id:'pong', label:MINIGAME_LABELS.pong, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      if (state.keys.up)   state.playerY -= 180*dt;
      if (state.keys.down) state.playerY += 180*dt;
      state.playerY = clamp(state.playerY, 0, 200-state.paddleH);
      const target = state.ballY - state.paddleH/2;
      state.aiY += (target - state.aiY) * 0.06;
      state.ballX += state.vx; state.ballY += state.vy;
      if (state.ballY < 0 || state.ballY > 196) state.vy *= -1;
      if (state.ballX < 14 && state.ballY > state.playerY && state.ballY < state.playerY+state.paddleH) {
        state.vx = Math.abs(state.vx)+0.1;
        state.rallies++; this._score = Math.min(100, state.rallies*8);
      }
      if (state.ballX > 286 && state.ballY > state.aiY && state.ballY < state.aiY+state.paddleH) {
        state.vx = -Math.abs(state.vx)-0.1;
      }
      if (state.ballX < 0 || state.ballX > 300) {
        state.lives--;
        state.ballX=150; state.ballY=100; state.vx=2.4*(Math.random()<.5?1:-1);
      }
      if (state.lives <= 0 || this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#0a1a2a'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#fff';
      ctx.fillRect(2, state.playerY, 8, state.paddleH);
      ctx.fillRect(290, state.aiY, 8, state.paddleH);
      ctx.beginPath(); ctx.arc(state.ballX, state.ballY, 4, 0, 6.28); ctx.fill();
      drawSprite(state.karenSprite, 282, state.aiY-12, 24, 12);
      ctx.font='8px monospace'; ctx.fillText(state.karenName, 200, 12);
      ctx.font='10px monospace';
      ctx.fillText('Lives: '+state.lives, 4, 12);
      ctx.fillText('Rallies: '+state.rallies, 4, 24);
      drawCorporateTimer(ctx, 0, 0, w, this._elapsed, this.timerMs);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        if (evt.key === 'ArrowUp')   state.keys.up = true;
        if (evt.key === 'ArrowDown') state.keys.down = true;
      } else if (evt.type === 'keyup') {
        if (evt.key === 'ArrowUp')   state.keys.up = false;
        if (evt.key === 'ArrowDown') state.keys.down = false;
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(15,-15,n), powerBoost:lerp(-0.15,0.20,n), chaosFactor:lerp(0.6,0.05,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

// 2. KPI BREAKOUT
function buildBreakout(ctx) {
  const bricks = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    bricks.push({ x: 4+c*36, y: 20+r*14, w: 34, h: 12, alive: true,
                  label: KPI_BRICKS[(r*8+c) % KPI_BRICKS.length] });
  }
  const state = { ballX:150, ballY:150, vx:3.5, vy:-4.0, paddleX:130, paddleW:50, broken:0 };
  const TIMER = 25000;
  return {
    id:'breakout', label:MINIGAME_LABELS.breakout, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      state.ballX += state.vx; state.ballY += state.vy;
      if (state.ballX < 4 || state.ballX > 296) state.vx *= -1;
      if (state.ballY < 4) state.vy *= -1;
      if (state.ballY > 180 && state.ballX > state.paddleX && state.ballX < state.paddleX+state.paddleW) {
        state.vy = -Math.abs(state.vy);
        const hit = (state.ballX - state.paddleX) / state.paddleW;
        state.vx = (hit - 0.5) * 5;
      }
      bricks.forEach(b => {
        if (!b.alive) return;
        if (state.ballX > b.x && state.ballX < b.x+b.w && state.ballY > b.y && state.ballY < b.y+b.h) {
          b.alive = false; state.broken++; state.vy *= -1;
          this._score = Math.min(100, state.broken * 4);
        }
      });
      if (state.ballY > 200 || this._elapsed >= TIMER || state.broken === 32) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#1a0a2a'; ctx.fillRect(0,0,w,h);
      bricks.forEach(b => {
        if (!b.alive) return;
        ctx.fillStyle='#3a8'; ctx.fillRect(b.x, b.y, b.w-2, b.h-2);
        ctx.fillStyle='#fff'; ctx.font='7px monospace';
        ctx.fillText(b.label, b.x+2, b.y+8);
      });
      ctx.fillStyle='#ff0'; ctx.fillRect(state.paddleX, 188, state.paddleW, 6);
      ctx.beginPath(); ctx.arc(state.ballX, state.ballY, 3, 0, 6.28); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('KPIs: '+state.broken+'/32', 4, 12);
      drawCorporateTimer(ctx, 0, 0, w, this._elapsed, this.timerMs);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft')  state.paddleX = Math.max(0, state.paddleX-16);
        if (evt.key === 'ArrowRight') state.paddleX = Math.min(250, state.paddleX+16);
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(20,-10,n), powerBoost:lerp(-0.20,0.25,n), chaosFactor:lerp(0.7,0.10,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

// 3. NUGGET CATCHER
function buildCatch(ctx) {
  const state = {
    basketX: 150, items: [], spawn: 0,
    caught: 0, missed: 0, basketW: 60,
    droneSprite: loadSprite('assets/drone.webp'),
    nuggetSprite: loadSprite('assets/forgeharvest_yield.webp')
  };
  const TIMER = 10000;
  return {
    id: 'catch', label: MINIGAME_LABELS.catch, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      this._elapsed += dt * 1000;
      if (this._elapsed >= TIMER) this._ended = true;
      if (this._ended) return;

      state.spawn -= dt;
      if (state.spawn <= 0) {
        state.spawn = rand(0.3, 0.6);
        const bad = Math.random() < 0.2;
        const item = bad
          ? { name:'Hazard', glyph: Math.random() < 0.5 ? '💀' : '☢️', bad:true }
          : { ...CATCH_ITEMS_FLAVOR[Math.floor(Math.random() * CATCH_ITEMS_FLAVOR.length)], bad:false, sprite:'forgeharvest' };
        state.items.push({ x: rand(24, 276), y: -8, vy: rand(60, 100), item, bad });
      }

      for (const n of state.items) {
        n.y += n.vy * dt;
        if (n.y > 168 && n.y < 188 && Math.abs(n.x - state.basketX) < (state.basketW / 2 + 10)) {
          n.dead = true;
          if (n.bad) {
            state.missed += 2;
            this._score = Math.max(0, this._score - 20);
          } else {
            state.caught += 1;
            this._score = Math.min(100, this._score + n.item.pts);
          }
        } else if (n.y > 208) {
          n.dead = true;
          if (!n.bad) state.missed += 1;
        }
      }
      state.items = state.items.filter(n => !n.dead);
      if (state.missed >= 5) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#503319');
      txt(this.label, x + w / 2, y + 16, 7, COL.yel, false);

      for (const n of state.items) {
        if (!n.bad && n.item.sprite === 'forgeharvest' && state.nuggetSprite.complete) {
          ctx.drawImage(state.nuggetSprite, x + n.x - 12, y + n.y - 12, 24, 24);
        } else {
          txt(n.item.glyph, x + n.x, y + n.y, 14, COL.white, false);
        }
      }

      if (state.droneSprite.complete) {
        ctx.drawImage(state.droneSprite, x + state.basketX - state.basketW / 2, y + 168, state.basketW, 20);
      } else {
        rect(x + state.basketX - state.basketW / 2, y + 172, state.basketW, 14, '#9a3412', 4, '#fff', 1);
        txt('🧺', x + state.basketX, y + 172, 10, COL.white, false);
      }

      txt(`${state.caught} caught / ${state.missed} missed`, x + w / 2, y + 196, 5, COL.cyan, false);
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended) return;
      if (evt.type === 'mousemove' || evt.type === 'mousedown') {
        const p = getMiniPointer(evt);
        if (!p) return;
        state.basketX = clamp(p.x, 30, 270);
      } else if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft') state.basketX -= 24;
        if (evt.key === 'ArrowRight') state.basketX += 24;
        state.basketX = clamp(state.basketX, 30, 270);
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

// 4. DRONE FLAPPY
function buildFlappy(ctx) {
  const state = {
    y: 100, vy: 0, x: 60, pipes: [], spawn: 0,
    passed: 0, hit: false,
    droneSprite: loadSprite('assets/drone.webp')
  };
  const TIMER = 15000;
  // seed initial pipes
  for (let i = 0; i < 3; i++) {
    const hazard = FLAPPY_HAZARDS[Math.floor(Math.random() * FLAPPY_HAZARDS.length)];
    state.pipes.push({ x: 200 + i * 85, gapY: rand(50, 140), gapH: 58, scored: false, hazard });
  }

  return {
    id: 'flappy', label: MINIGAME_LABELS.flappy, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      this._elapsed += dt * 1000;
      if (this._elapsed >= TIMER) this._ended = true;
      if (this._ended) return;

      // gravity
      state.vy += 380 * dt;
      state.y += state.vy * dt;
      if (state.y < 10) { state.y = 10; state.vy = 0; }
      if (state.y > 195) { 
        state.y = 195; 
        this._ended = true; 
        state.hit = true; 
      }
      
      // pipes
      for (const p of state.pipes) {
        p.x -= 90 * dt;
        if (!p.scored && p.x < state.x) {
          p.scored = true;
          state.passed += 1;
          this._score = Math.min(100, this._score + 25);
        }
        // collision (drone is ~14x14)
        if (Math.abs(p.x - state.x) < 16) {
          if (state.y < p.gapY || state.y > p.gapY + p.gapH) { 
            state.hit = true; 
            this._score = Math.max(0, this._score - 50);
            this._ended = true; 
          }
        }
      }
      state.pipes = state.pipes.filter(p => p.x > -30);
      
      // spawn new
      if (state.pipes.length < 3) {
        const lastX = state.pipes.length ? Math.max(...state.pipes.map(p => p.x)) : 200;
        const hazard = FLAPPY_HAZARDS[Math.floor(Math.random() * FLAPPY_HAZARDS.length)];
        state.pipes.push({ x: lastX + rand(90, 120), gapY: rand(40, 140), gapH: Math.max(42, 60 - state.passed * 1.5), scored: false, hazard });
      }
    },
    render(ctx, x, y, w, h) {
      const bg = ctx.createLinearGradient(x, y, x, y + h);
      bg.addColorStop(0, '#87CEEB'); bg.addColorStop(1, '#dbeafe');
      rect(x, y, w, h, bg);
      txt(this.label, x + w / 2, y + 12, 6, '#111', false);
      
      // pipes
      for (const p of state.pipes) {
        rect(x + p.x - 14, y + 20, 28, p.gapY - 20, '#2d8a4e', 2, '#14532d', 1);
        rect(x + p.x - 14, y + p.gapY + p.gapH, 28, h - p.gapY - p.gapH, '#2d8a4e', 2, '#14532d', 1);
        
        // Render hazard text vertically on the bottom pipe
        ctx.save();
        ctx.translate(x + p.x, y + p.gapY + p.gapH + 10);
        ctx.rotate(-Math.PI/2);
        txt(p.hazard, -20, 4, 6, '#fff', false);
        ctx.restore();
      }
      
      // drone
      if (state.droneSprite.complete) {
        ctx.drawImage(state.droneSprite, x + state.x - 12, y + state.y - 8, 24, 16);
      } else {
        txt('🛸', x + state.x, y + state.y, 14, COL.white, false);
      }
      
      // ground
      rect(x, y + h - 10, w, 10, '#14532d');
      
      if (state.hit) {
        txt('CRASH!', x + w / 2, y + h / 2, 10, COL.red, false);
      } else {
        txt(`${state.passed} gaps cleared`, x + w / 2, y + 196, 5, '#111', false);
      }
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended) return;
      if (evt.type === 'mousedown') {
        state.vy = -160;
      } else if (evt.type === 'keydown') {
        if (evt.key === ' ' || evt.key === 'ArrowUp' || evt.key === 'Enter') {
          state.vy = -160;
        }
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// 5. PASSWORD MEMORY
function buildMemory(ctx) {
  const cfg = MINIGAME_VARIANTS_CONFIG[ctx.variant];
  const emojis = (cfg && cfg.pairs) ? cfg.pairs.slice(0, 4) : PASSWORD_PAIRS.slice(0, 4);
  const deck = [...emojis, ...emojis].sort(() => Math.random() - 0.5).map((v, i) => ({ value: v, id: i, open: false, match: false }));
  const state = { deck, flip: [], matched: 0, lock: 0, attempts: 0 };
  const TIMER = 10000;
  
  return {
    id: 'memory', label: MINIGAME_LABELS.memory, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      this._elapsed += dt * 1000;
      if (this._elapsed >= TIMER) this._ended = true;
      if (this._ended) return;

      if (state.lock > 0) {
        state.lock -= dt;
        if (state.lock <= 0 && state.flip.length === 2) {
          state.deck[state.flip[0]].open = false;
          state.deck[state.flip[1]].open = false;
          state.flip = [];
        }
      }
      if (state.matched >= 4) {
        this._score = 100;
        this._ended = true;
      }
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#1a1230');
      txt(this.label, x + w / 2, y + 14, 7, COL.yel, false);
      for (let i = 0; i < state.deck.length; i++) {
        const c = state.deck[i];
        const bx = x + 20 + (i % 4) * 68;
        const by = y + 36 + Math.floor(i / 4) * 72;
        rect(bx, by, 58, 58, c.match ? 'rgba(74,222,128,0.25)' : c.open ? '#fff' : 'rgba(255,255,255,0.08)', 4, c.match ? COL.grn : '#666', 1);
        txt(c.open || c.match ? c.value : '?', bx + 29, by + 30, 18, c.match ? COL.grn : c.open ? '#111' : COL.cyan, false);
      }
      txt(`Pairs ${state.matched}/4 • ${state.attempts} tries`, x + w / 2, y + 196, 5, COL.cyan, false);
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended || state.lock > 0) return;
      if (evt.type === 'mousedown') {
        const p = getMiniPointer(evt);
        if (!p) return;

        for (let i = 0; i < state.deck.length; i++) {
          const bx = 20 + (i % 4) * 68;
          const by = 36 + Math.floor(i / 4) * 72;
          const c = state.deck[i];
          if (p.x > bx && p.x < bx + 58 && p.y > by && p.y < by + 58 && !c.open && !c.match) {
            c.open = true;
            state.flip.push(i);
            if (state.flip.length === 2) {
              state.attempts++;
              if (state.deck[state.flip[0]].value === state.deck[state.flip[1]].value) {
                state.deck[state.flip[0]].match = true;
                state.deck[state.flip[1]].match = true;
                state.flip = [];
                state.matched += 1;
                this._score += 25;
              } else {
                state.lock = 1.0;
              }
            }
            return;
          }
        }
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// 6. NEGOTIATION RPS
function buildRps(ctx) {
  const cfg = MINIGAME_VARIANTS_CONFIG[ctx.variant];
  const choices = (cfg && cfg.choices) ? cfg.choices : RPS_CHOICES;
  const state = {
    round: 0, maxRounds: 3, wins: 0, losses: 0, draws: 0,
    playerChoice: null, aiChoice: null, result: null, resultTimer: 0,
    opponent: KAREN_NAMES[Math.floor(Math.random() * KAREN_NAMES.length)]
  };
  const TIMER = 10000;
  return {
    id: 'rps', label: MINIGAME_LABELS.rps, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      if (this._ended) return;
      this._elapsed += dt * 1000;
      
      if (state.resultTimer > 0) {
        state.resultTimer -= dt;
        if (state.resultTimer <= 0) {
          state.playerChoice = null;
          state.aiChoice = null;
          state.result = null;
          if (state.round >= state.maxRounds) this._ended = true;
        }
      }
      
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#1a0d2e');
      txt(this.label, x + w / 2, y + 14, 7, COL.yel, false);
      txt(`vs ${state.opponent}`, x + w / 2, y + 30, 5, COL.pink, false);
      
      if (state.playerChoice && state.aiChoice) {
        txt(state.playerChoice.label, x + 75, y + 80, 10, COL.white, false);
        txt('VS', x + w / 2, y + 80, 10, COL.ora, false);
        txt(state.aiChoice.label, x + 225, y + 80, 10, COL.white, false);
        const rColor = state.result === 'WIN' ? COL.grn : state.result === 'LOSE' ? COL.red : COL.yel;
        txt(state.result, x + w / 2, y + 120, 12, rColor, true);
      } else if (!this._ended) {
        txt('Pick your move!', x + w / 2, y + 70, 7, COL.cyan, false);
        for (let i = 0; i < 3; i++) {
          const ch = choices[i];
          rect(x + 20 + i * 96, y + 90, 80, 60, 'rgba(255,255,255,0.08)', 6, COL.cyan, 1);
          txt(ch.label, x + 60 + i * 96, y + 118, 7, COL.white, false);
          txt(ch.id.toUpperCase(), x + 60 + i * 96, y + 142, 4, COL.dim, false);
        }
      }
      
      txt(`W${state.wins} L${state.losses} D${state.draws} • R${state.round}/${state.maxRounds}`, x + w / 2, y + 196, 5, COL.cyan, false);
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended || state.resultTimer > 0) return;
      if (evt.type === 'mousedown') {
        const p = getMiniPointer(evt);
        if (!p) return;

        for (let i = 0; i < 3; i++) {
          if (p.x > 20 + i * 96 && p.x < 100 + i * 96 && p.y > 90 && p.y < 150) {
            state.playerChoice = choices[i];
            this._lastPivotChoiceId = choices[i].id; // GP-8-EXT: last narrative for pivot_roulette reward
            state.aiChoice = choices[Math.floor(Math.random() * 3)];
            state.round++;
            if (state.playerChoice.id === state.aiChoice.id) {
              state.result = 'DRAW';
              state.draws++;
              this._score = Math.min(100, this._score + 10);
            }
            else if (state.playerChoice.beats === state.aiChoice.id) {
              state.result = 'WIN';
              state.wins++;
              this._score = Math.min(100, this._score + 34);
            }
            else {
              state.result = 'LOSE';
              state.losses++;
            }
            state.resultTimer = 1.3;
            return;
          }
        }
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// 7. ORG CHART TETRIS
function buildTetris(ctx) {
  const cfg = MINIGAME_VARIANTS_CONFIG[ctx.variant];
  const depts = (cfg && cfg.depts) ? cfg.depts : TETRIS_DEPTS;
  const COLS = 8, ROWS = 12, SZ = 14;
  const SHAPES = [
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[0,1,1],[1,1,0]],
    [[1,1,0],[0,1,1]],
    [[1,0],[1,0],[1,1]],
    [[0,1],[0,1],[1,1]],
    [[1,1,1],[0,1,0]],
  ];
  const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c'];
  const grid = Array.from({length:ROWS}, ()=>Array(COLS).fill(0));
  const colorGrid = Array.from({length:ROWS}, ()=>Array(COLS).fill(null));
  
  const fractionalSprite = loadSprite('assets/fractional_token.webp');
  
  function newPiece() {
    const idx = Math.floor(Math.random()*SHAPES.length);
    return { shape: SHAPES[idx].map(r=>[...r]), color: COLORS[idx], x: 3, y: 0, dept: depts[Math.floor(Math.random()*depts.length)] };
  }
  const state = { piece: newPiece(), score: 0, lines: 0, drop: 0, speed: 0.5 };
  const TIMER = 20000;
  
  function collides(piece, dx, dy) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const nx = piece.x + c + dx, ny = piece.y + r + dy;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && grid[ny][nx]) return true;
        }
    return false;
  }
  
  function lock() {
    for (let r = 0; r < state.piece.shape.length; r++)
      for (let c = 0; c < state.piece.shape[r].length; c++)
        if (state.piece.shape[r][c]) {
          const ny = state.piece.y + r, nx = state.piece.x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) { 
            grid[ny][nx] = 1; 
            colorGrid[ny][nx] = state.piece.color; 
          }
        }
    // clear lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(v => v)) {
        grid.splice(r, 1); colorGrid.splice(r, 1);
        grid.unshift(Array(COLS).fill(0)); colorGrid.unshift(Array(COLS).fill(null));
        cleared++; r++;
      }
    }
    if (cleared > 0) {
      state.lines += cleared;
      state.score += cleared * 100;
    }
    state.piece = newPiece();
    state.speed = Math.max(0.15, 0.5 - state.lines * 0.03);
    return collides(state.piece, 0, 0); // returns true if game over
  }
  
  function rotate() {
    const sh = state.piece.shape;
    const rotated = sh[0].map((_,i) => sh.map(row => row[i]).reverse());
    const old = state.piece.shape;
    state.piece.shape = rotated;
    if (collides(state.piece, 0, 0)) state.piece.shape = old;
  }

  return {
    id: 'tetris', label: MINIGAME_LABELS.tetris, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      if (this._ended) return;
      this._elapsed += dt * 1000;
      
      state.drop += dt;
      if (state.drop >= state.speed) {
        state.drop = 0;
        if (!collides(state.piece, 0, 1)) {
          state.piece.y++;
        } else {
          if (lock()) this._ended = true;
          this._score = Math.min(100, Math.floor((state.lines / 4) * 100));
        }
      }
      
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#0a0a1a');
      txt(this.label, x + w / 2, y + 12, 6, COL.yel, false);
      const ox = x + (w - COLS * SZ) / 2, oy = y + 22;
      // grid
      rect(ox - 1, oy - 1, COLS * SZ + 2, ROWS * SZ + 2, 'rgba(255,255,255,0.04)', 0, '#333', 1);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            if (fractionalSprite.complete) {
               ctx.drawImage(fractionalSprite, ox + c * SZ, oy + r * SZ, SZ - 1, SZ - 1);
            } else {
               rect(ox + c * SZ, oy + r * SZ, SZ - 1, SZ - 1, colorGrid[r][c] || '#888', 1);
            }
          }
        }
      }
      // current piece
      if (state.piece) {
        for (let r = 0; r < state.piece.shape.length; r++) {
          for (let c = 0; c < state.piece.shape[r].length; c++) {
            if (state.piece.shape[r][c]) {
              if (fractionalSprite.complete) {
                 ctx.drawImage(fractionalSprite, ox + (state.piece.x + c) * SZ, oy + (state.piece.y + r) * SZ, SZ - 1, SZ - 1);
              } else {
                 rect(ox + (state.piece.x + c) * SZ, oy + (state.piece.y + r) * SZ, SZ - 1, SZ - 1, state.piece.color, 1);
              }
            }
          }
        }
      }
      txt(`${state.lines} lines • ${state.piece.dept}`, x + w / 2, y + 196, 5, COL.cyan, false);
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended) return;
      if (evt.type === 'mousedown') {
        rotate();
      } else if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft' && !collides(state.piece, -1, 0)) state.piece.x--;
        if (evt.key === 'ArrowRight' && !collides(state.piece, 1, 0)) state.piece.x++;
        if (evt.key === 'ArrowDown') { if (!collides(state.piece, 0, 1)) state.piece.y++; }
        if (evt.key === 'ArrowUp' || evt.key === ' ') rotate();
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// 8. WHITEBOARD INTERVIEW (Tic-Tac-Toe)
function buildTtt(ctx) {
  const board = Array(9).fill(null); // 'X' = player, 'O' = AI
  const state = { 
    board, winner: null, turn: 'X', aiThinking: 0, 
    question: TTT_QUESTIONS[Math.floor(Math.random()*TTT_QUESTIONS.length)] 
  };
  const TIMER = 10000;
  
  function checkWin(b, mark) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(w => w.every(i => b[i] === mark));
  }
  
  function aiMove() {
    const empty = state.board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
    if (!empty.length) return;
    // win
    for (const i of empty) { state.board[i] = 'O'; if (checkWin(state.board, 'O')) return; state.board[i] = null; }
    // block
    for (const i of empty) { state.board[i] = 'X'; if (checkWin(state.board, 'X')) { state.board[i] = 'O'; return; } state.board[i] = null; }
    // center
    if (state.board[4] === null) { state.board[4] = 'O'; return; }
    // random
    state.board[empty[Math.floor(Math.random() * empty.length)]] = 'O';
  }

  return {
    id: 'ttt', label: MINIGAME_LABELS.ttt, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      if (this._ended) return;
      this._elapsed += dt * 1000;
      
      if (state.turn === 'O' && state.aiThinking > 0) {
        state.aiThinking -= dt;
        if (state.aiThinking <= 0) {
          aiMove();
          if (checkWin(state.board, 'O')) { state.winner = 'O'; this._ended = true; }
          else if (state.board.every(v => v !== null)) { 
            state.winner = 'draw'; 
            this._ended = true; 
            this._score = 55; 
          }
          else state.turn = 'X';
        }
      }
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#1a1a2e');
      txt(this.label, x + w / 2, y + 14, 6, COL.yel, false);
      txt(state.question, x + w / 2, y + 28, 4, COL.dim, false);
      const ox = x + 60, oy = y + 40;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const cx = ox + c * 62, cy = oy + r * 50;
        rect(cx, cy, 56, 44, 'rgba(255,255,255,0.06)', 4, '#555', 1);
        if (state.board[idx] === 'X') txt('X', cx + 28, cy + 22, 18, COL.cyan, true);
        else if (state.board[idx] === 'O') txt('O', cx + 28, cy + 22, 18, COL.red, true);
      }
      if (state.winner) {
        const msg = state.winner === 'X' ? 'YOU WIN!' : state.winner === 'O' ? 'AI WINS' : 'DRAW';
        txt(msg, x + w / 2, y + 196, 8, state.winner === 'X' ? COL.grn : state.winner === 'draw' ? COL.yel : COL.red, true);
      } else {
        txt(state.turn === 'X' ? 'Your move (X)' : 'AI thinking...', x + w / 2, y + 196, 5, COL.cyan, false);
      }
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended || state.turn !== 'X') return;
      if (evt.type === 'mousedown') {
        const p = getMiniPointer(evt);
        if (!p) return;

        const ox = 60, oy = 40;
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const cx = ox + col * 62, cy = oy + row * 50;
          if (p.x > cx && p.x < cx + 56 && p.y > cy && p.y < cy + 44) {
            const idx = row * 3 + col;
            if (state.board[idx] !== null) return;
            state.board[idx] = 'X';
            this._score += 15;
            if (checkWin(state.board, 'X')) {
              state.winner = 'X';
              this._score = 100;
              this._ended = true;
              return;
            }
            if (state.board.every(v => v !== null)) {
              state.winner = 'draw';
              this._score = 55;
              this._ended = true;
              return;
            }
            state.turn = 'O';
            state.aiThinking = 0.4;
            return;
          }
        }
      } else if (evt.type === 'keydown') {
        const num = parseInt(evt.key);
        if (num >= 1 && num <= 9 && state.board[num-1] === null) {
          const idx = num - 1;
          state.board[idx] = 'X';
          this._score += 15;
          if (checkWin(state.board, 'X')) { 
            state.winner = 'X'; 
            this._score = 100; 
            this._ended = true; 
            return; 
          }
          if (state.board.every(v => v !== null)) { 
            state.winner = 'draw'; 
            this._score = 55; 
            this._ended = true; 
            return; 
          }
          state.turn = 'O';
          state.aiThinking = 0.4;
        }
      }
    },
    getPerformance() { 
      if (state.winner === 'X') return scoreToPerformance(100);
      if (state.winner === 'draw') return scoreToPerformance(55);
      if (state.winner === 'O') return scoreToPerformance(25);
      return scoreToPerformance(this._score); 
    },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// 9. SPRINT PLANNING 2048
function buildTwentyForty(ctx) {
  const SIZE = 4;
  const grid = Array.from({length:SIZE}, ()=>Array(SIZE).fill(0));
  
  function addRandom() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) empty.push([r,c]);
    if (!empty.length) return false;
    const [r,c] = empty[Math.floor(Math.random()*empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }
  
  addRandom(); addRandom();
  
  function canMove() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      if (c < SIZE-1 && grid[r][c] === grid[r][c+1]) return true;
      if (r < SIZE-1 && grid[r][c] === grid[r+1][c]) return true;
    }
    return false;
  }
  
  const state = { score: 0, maxTile: 2 };
  const TIMER = 15000;
  
  function slide(row) {
    let arr = row.filter(v => v);
    const merged = [];
    for (let i = 0; i < arr.length; i++) {
      if (i < arr.length - 1 && arr[i] === arr[i+1]) {
        merged.push(arr[i] * 2);
        state.score += arr[i] * 2;
        i++;
      } else merged.push(arr[i]);
    }
    while (merged.length < SIZE) merged.push(0);
    return merged;
  }
  
  const TILE_COLORS = {0:'rgba(255,255,255,0.04)',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
  
  return {
    id: 'twentyforty', label: MINIGAME_LABELS.twentyforty, timerMs: TIMER,
    _elapsed: 0, _score: 0, _ended: false,
    update(dt) {
      if (this._ended) return;
      this._elapsed += dt * 1000;
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      rect(x, y, w, h, '#0f0a1a');
      txt(this.label, x + w / 2, y + 12, 6, COL.yel, false);
      const SZ = 42, ox = x + (w - SIZE * SZ) / 2, oy = y + 28;
      rect(ox - 3, oy - 3, SIZE * SZ + 6, SIZE * SZ + 6, 'rgba(187,173,160,0.3)', 4);
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        const bg = TILE_COLORS[v] || '#3c3a32';
        rect(ox + c * SZ + 2, oy + r * SZ + 2, SZ - 4, SZ - 4, bg, 3);
        if (v) {
          const fontSize = v >= 1024 ? 7 : v >= 128 ? 8 : 10;
          txt(String(v), ox + c * SZ + SZ / 2, oy + r * SZ + SZ / 2, fontSize, v >= 8 ? '#fff' : '#776e65', false);
        }
      }
      const tierIdx = Math.min(HIERARCHY_2048.length-1, Math.max(0, Math.floor(Math.log2(state.maxTile)) - 1));
      txt(`Score ${state.score} • ${HIERARCHY_2048[tierIdx]} tier`, x + w / 2, y + 196, 5, COL.cyan, false);
      drawCorporateTimer(ctx, x, y, w, this._elapsed, this.timerMs);
    },
    handleInput(evt) {
      if (this._ended) return;

      const move = (dir) => {
        let changed = false;
        if (dir === 'left') {
          for (let r = 0; r < SIZE; r++) { const nw = slide(grid[r]); if (nw.join() !== grid[r].join()) changed = true; grid[r] = nw; }
        } else if (dir === 'right') {
          for (let r = 0; r < SIZE; r++) { const nw = slide([...grid[r]].reverse()).reverse(); if (nw.join() !== grid[r].join()) changed = true; grid[r] = nw; }
        } else if (dir === 'up') {
          for (let c = 0; c < SIZE; c++) { const col = grid.map(r => r[c]); const nw = slide(col); if (nw.join() !== col.join()) changed = true; for (let r = 0; r < SIZE; r++) grid[r][c] = nw[r]; }
        } else if (dir === 'down') {
          for (let c = 0; c < SIZE; c++) { const col = grid.map(r => r[c]).reverse(); const nw = slide(col).reverse(); const orig = grid.map(r => r[c]); if (nw.join() !== orig.join()) changed = true; for (let r = 0; r < SIZE; r++) grid[r][c] = nw[r]; }
        }

        if (changed) addRandom();

        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] > state.maxTile) state.maxTile = grid[r][c];

        const tierScore = Math.min(100, Math.floor(Math.log2(Math.max(2, state.maxTile))) * 14);
        this._score = tierScore;

        if (!canMove()) this._ended = true;
      };

      if (evt.type === 'mousedown') {
        const p = getMiniPointer(evt);
        if (!p) return;

        if (p.y < 100) move('up');
        else if (p.y > 160) move('down');
        else if (p.x < 100) move('left');
        else move('right');
      } else if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft') move('left');
        if (evt.key === 'ArrowRight') move('right');
        if (evt.key === 'ArrowUp') move('up');
        if (evt.key === 'ArrowDown') move('down');
      }
    },
    getPerformance() { return scoreToPerformance(this._score); },
    getScore() { return this._score; },
    isDone() { return this._ended; }
  };
}

// ============================================================
// PHASE 2 — Performance → swing modifier export
// ============================================================
// ============================================================
// GP-8-EXT / NEXT-STEP-FACTION-REWARDS
// Unique faction-standing consequences when a GP-8 minigame VARIANT resolves.
// Additive and surgically removable: delete this block + the five tagged
// applyVariantFactionReward(...) calls + the RPS _lastPivotChoiceId capture.
// Base games (pong/breakout/catch/flappy/memory/rps/tetris/ttt/twentyforty)
// have no variant, so this is a no-op for them.
// Uses frozen PascalCase keys only, routed through adjustStanding().
// Idempotent via mini._variantRewardApplied.
// ============================================================
const VARIANT_STANDING_REWARDS = {
  // Sir Wastrel: a tidy loss is a love letter to the Schedule C.
  tax_shelter_tetris: {
    win: {
      standings: { CommitteeUnnecessarySynergy: 5, PredictiveCompliance: 4 },
      stats: { auditRisk: -4 },
      popup: 'Losses so beautiful the Committee framed them. The taxman looked away, ashamed.' // HUMOR-SHARPEN
    },
    loss: {
      standings: { PredictiveCompliance: -6 },
      stats: { auditRisk: 6 },
      popup: 'Thou turned a PROFIT. Disgusting. The Ministry opened a file AND a group chat.' // HUMOR-SHARPEN
    }
  },
  // Brother Idleworth: failing the LARP honestly earns more than perfect fakery.
  stealth_mode: {
    win: {
      standings: { MigratoryFounders: 3, NativeHollows: -2 },
      stats: {},
      popup: 'Flawless fakery. The Confraternity nods. Henrietta starts a list with thy name on it.' // HUMOR-SHARPEN
    },
    loss: {
      standings: { NativeHollows: 7 },
      stats: {},
      popup: 'A Direct Answer to a Direct Question — illegal in three funds. The Hollows love it.' // HUMOR-SHARPEN
    }
  },
  // Pivot Addict: reward depends on the narrative chosen, not merely the score.
  pivot_roulette: {
    hype: {
      standings: { CursorSpectacles: 4, MigratoryFounders: 3, NativeHollows: -3 },
      stats: {},
      popup: 'Same product, richer font. The Spectacles gleam. The Hollows have met this man before.' // HUMOR-SHARPEN
    },
    grounded: {
      standings: { NativeHollows: 5, CursorSpectacles: -2 },
      stats: {},
      popup: 'Thou named a real thing that exists. The room panicked. Henrietta poured a second cup.' // HUMOR-SHARPEN
    }
  }
};

// Which pivot_roulette narratives read as hype/contrarian vs grounded.
const PIVOT_ROULETTE_HYPE_IDS = new Set(['rock', 'paper']); // AI DIRT, CRYPTO
// SAAS ('scissors') = grounded/locally-coherent.

// GP-8-EXT / FINAL: short themed Ledger notes so the variant's faction
// consequence is visible in the Ledger overlay, not just the field popup.
const VARIANT_LEDGER_NOTES = {
  rise: 'The Ledger warms to thy rebrand.',
  fall: 'The Ledger frowns; thy rebrand is duly noted.'
};

function applyVariantFactionReward(mini, won) {
  if (!mini || mini._variantRewardApplied) return;
  const variant = mini.variant;
  const cfg = VARIANT_STANDING_REWARDS[variant];
  if (!cfg) return; // base game — no variant consequence

  let branch;
  // GP-8-EXT / POLISH: track whether the branch reads as a "positive" outcome so
  // the popup color matches the actual branch (pivot_roulette keys off narrative,
  // not win/loss, so we can't just reuse `won` for the color).
  let positive = won;
  if (variant === 'pivot_roulette') {
    const hype = mini._lastPivotChoiceId ? PIVOT_ROULETTE_HYPE_IDS.has(mini._lastPivotChoiceId) : won;
    branch = hype ? cfg.hype : cfg.grounded;
    positive = hype; // hype pivots pop gold-green; grounded reads as the softer path
  } else {
    branch = won ? cfg.win : cfg.loss;
  }
  if (!branch) return;

  mini._variantRewardApplied = true; // idempotent: never double-apply

  let primaryKey = null, primaryDelta = 0;
  if (branch.standings) {
    for (const key in branch.standings) {
      const d = branch.standings[key];
      adjustStanding(key, d);
      if (Math.abs(d) > Math.abs(primaryDelta)) { primaryKey = key; primaryDelta = d; } // GP-8-EXT / FINAL: track biggest swing
    }
  }
  if (branch.stats) {
    for (const key in branch.stats) applyStatChange(key, branch.stats[key]);
  }
  if (branch.popup) addPopup(branch.popup, W / 2, 214, positive ? COL.grn : COL.ora, 6, 4.2); // GP-8-EXT / POLISH: color by actual branch
  // GP-8-EXT / FINAL: surface the biggest standing swing in the Ledger overlay queue.
  if (primaryKey && Array.isArray(st.ledgerPopups)) {
    st.ledgerPopups.push({
      faction: primaryKey,
      delta: primaryDelta,
      flavor: primaryDelta > 0 ? VARIANT_LEDGER_NOTES.rise : VARIANT_LEDGER_NOTES.fall,
      life: 3.5, maxLife: 3.5
    });
  }
}
// ── END GP-8-EXT / NEXT-STEP-FACTION-REWARDS ─────────────────────────────────

function applyMinigameModifier(perf) {
  if (!perf || typeof perf !== 'object') return;
  const safe = {
    angleDeviation: clamp(perf.angleDeviation || 0, -25, 25),
    powerBoost:     clamp(perf.powerBoost     || 0, -0.30, 0.30),
    chaosFactor:    clamp(perf.chaosFactor    || 0, 0, 1)
  };
  st.pregateModifier = {
    angleDeviation: safe.angleDeviation,
    powerBoost: 1 + safe.powerBoost,
    chaosFactor: safe.chaosFactor
  };
  const popText = buildModifierPopupText(safe);
  if (popText) addPopup(popText, W / 2, 140, COL.cyan, 8);
}

function startPregate() {
  if (consumeOwnedPowerup('skip')) {
    addPopup('⏭️ Minigame skipped!', W / 2, 170, COL.cyan, 12);
    st.swingPhase = 'power';
    st.power = 0;
    st.dir = 1;
    return;
  }
  // Phase 2: use world minigame pool
  const pool = getMinigamePool('pregate');
  const id = chooseGame(pool);
  st.pregateMini = createMinigameInstance(id, { worldId: st.currentWorld, holeIndex: st.holeInWorld });
  st.pregateActive = true;
  // Balance: timer scales from 25s (World 1) to 12s (World 8), floor of 12s, but we will slightly speed it up
  st.pregateTimer = Math.max(10, 20 - (st.currentWorld - 1) * 1.5);
  st.screen = 'pregate';
  // Show announcer quip
  if (st.pregateMini._announcer) addPopup(st.pregateMini._announcer, W / 2, 80, COL.gold, 7);
  playClick();
}

function finishPregate(perf) {
  // Phase 2: perf can be either a number (legacy) or an object (new contract)
  if (typeof perf === 'object' && perf.angleDeviation !== undefined) {
    applyMinigameModifier(perf);
  } else {
    const performance = clamp(typeof perf === 'number' ? perf : 50, 0, 100);
    const devScale = (1 - performance / 100) * 15;
    const angleDeviation = gaussian(0, devScale);
    const powerBoost = 1 + performance / 100 * 0.3;
    const chaosFactor = performance < 60 ? (60 - performance) / 60 : 0;
    st.pregateModifier = { angleDeviation, powerBoost, chaosFactor };
    if (performance > 84) addPopup('🔥 Great prep!', W / 2, 140, COL.grn, 12);
  }

  // Show announcer quip on finish
  if (st.pregateMini && st.pregateMini._announcer) {
    const score = st.pregateMini.getScore();
    const won = score >= 50;
    const flavor = pickFlavor(st.pregateMini.variant || st.pregateMini.id, won);
    if (flavor) addPopup(flavor, W / 2, 160, won ? COL.grn : COL.ora, 8);
    applyVariantFactionReward(st.pregateMini, won); // GP-8-EXT / NEXT-STEP-FACTION-REWARDS
  }

  // CS-5 Hook 7 — pregate minigame score → faction standings
  // Great prep: MechanicalCrow appreciates efficiency; NativeHollows appreciate effort
  // Poor prep: PredictiveCompliance notes the chaos
  const pregateScore = st.pregateMini ? st.pregateMini.getScore() : 50;
  if (pregateScore >= 80) {
    adjustStanding('MechanicalCrow', 2);
    adjustStanding('Vastcart', 2);
  } else if (pregateScore < 35) {
    adjustStanding('PredictiveCompliance', -2);
    adjustStanding('CommitteeUnnecessarySynergy', -1);
  }

  cleanupMini(st.pregateMini);
  st.pregateMini = null;
  st.pregateActive = false;
  st.screen = 'playing';
  st.swingPhase = 'power';
  st.power = 0;
  st.dir = 1;
}

function startChaos() {
  // Balance: chaos chance rises with world difficulty + poor pregate performance
  const base = 0.15 + getWorld().difficulty * 0.08;
  const chaosBonus = st.pregateModifier ? st.pregateModifier.chaosFactor * 0.25 : 0;
  const chance = Math.min(base + chaosBonus, 0.75); // cap at 75%
  if (Math.random() > chance) return;
  const id = chooseGame(getMinigamePool('chaos'));
  st.chaosMini = createMinigameInstance(id);
  st.chaosActive = true;
  // Balance: chaos timer scales from 6s (World 1) down to 3s (World 8)
  st.chaosTimer = Math.max(3, 5 - (st.currentWorld - 1) * 0.42);
  st.screen = 'chaos';
}

// Fix: endChaos — getPerformance() returns object, extract scalar score
function perfToScalar(perf) {
  if (typeof perf === 'number') return clamp(perf, 0, 100);
  if (perf && typeof perf === 'object') {
    // Reverse-engineer a 0-100 score from the performance contract
    // angleDeviation near 0 = good, powerBoost > 0 = good, chaosFactor near 0 = good
    const aimScore = clamp(100 - Math.abs(perf.angleDeviation || 0) * 4, 0, 100);
    const powerScore = clamp(50 + (perf.powerBoost || 0) * 166, 0, 100);
    const chaosScore = clamp(100 - (perf.chaosFactor || 0) * 100, 0, 100);
    return (aimScore * 0.35 + powerScore * 0.35 + chaosScore * 0.30);
  }
  return 50;
}

function endChaos() {
  if (!st.chaosActive) return;
  const perf = st.chaosMini ? st.chaosMini.getPerformance() : null;
  const scalar = perfToScalar(perf);
  const world = getWorld();
  const dx = world.holeX - st.ballX;
  const dy = world.holeY - st.ballY;
  const pull = (scalar - 50) / 100;
  st.chaosLandingMod = {
    x: dx * pull * 0.25,
    y: dy * pull * 0.25,
  };
  if (st.chaosMini) {
    const won = scalar >= 50;
    const flavor = pickFlavor(st.chaosMini.variant || st.chaosMini.id, won);
    if (flavor) addPopup(flavor, W / 2, 170, won ? COL.grn : COL.red, 8);
    applyVariantFactionReward(st.chaosMini, won); // GP-8-EXT / NEXT-STEP-FACTION-REWARDS
  }
  // CS-5 Hook 8 — chaos minigame score → faction standings
  // Clean chaos resolution: Predictive Compliance approves order amid chaos
  // Messy chaos: CoastalShadow relishes the disorder
  if (scalar >= 70) {
    adjustStanding('PredictiveCompliance', 3);  // ministry approves of composure
    adjustStanding('Vastcart', 1);
  } else if (scalar < 30) {
    adjustStanding('CoastalShadow', 4);         // contrarian baron delights
    adjustStanding('CommitteeUnnecessarySynergy', 2); // committee files an incident report
    adjustStanding('PredictiveCompliance', -2);
  }

  cleanupMini(st.chaosMini);
  st.chaosMini = null;
  st.chaosActive = false;
  if (st.ballFlying) st.screen = 'playing';
}

function applySwing() {
  st.strikes++;
  st.totalStrokes++;
  // USER-PLAYTEST-FIX — Lobbyist Umbrella: cancels wind for this swing
  if (st.windX !== 0 && consumeOwnedPowerup('umbrella')) {
    st.windX = 0;
    addPopup('🌂 The wind has been lobbied away.', W / 2, 120, COL.cyan, 8, 2.5);
  }
  const powerPct = st.power / 100;
  const accNormalized = (st.acc - 50) / 50;
  const mod = st.pregateModifier || { angleDeviation: 0, powerBoost: 1, chaosFactor: 0 };
  const clubPower = st.club === 'Driver' ? 1.14 : st.club === 'Putter' ? 0.48 : 1;
  const clubLift = st.club === 'Driver' ? 0.86 : st.club === 'Putter' ? 0.22 : 1;
  const eqPower = getClubPowerBonus();
  const eqAcc = getAccuracyBonus() / 100;

  // CS-6: apply faction crisis debuffs — angle scatter and power penalty
  const crisis = computeCrisisDebuff();
  // anglePenalty scatters randomly left or right (not always the same direction)
  const crisisAngleRad = crisis.anglePenalty > 0
    ? (Math.random() < 0.5 ? 1 : -1) * crisis.anglePenalty * Math.PI / 180
    : 0;
  const rad = mod.angleDeviation * Math.PI / 180 + crisisAngleRad;
  
  const world = getWorld();
  const dx = world.holeX - st.ballX;
  const dy = world.holeY - st.ballY;
  const baseAng = Math.atan2(dy, dx);
  const finalAng = baseAng + rad + accNormalized * 0.5;

  // crisis.powerMultiplier stacks on top of pregateModifier's powerBoost
  const totalPower = mod.powerBoost * crisis.powerMultiplier;
  st.ballVX = Math.cos(finalAng) * (5.8 + (powerPct + eqPower) * 6.4) * clubPower * totalPower;
  st.ballVY = Math.sin(finalAng) * (4.0 + (powerPct + eqPower) * 2.0) * clubPower + st.windX * 0.35;
  st.ballVZ = (7.5 + powerPct * 5.8) * clubLift * totalPower;
  st.ballFlying = true;
  st.swingPhase = 'flying';
  st.pregateModifier = null; // Consume once (Fix #12)
  st.shake = 12; // increased juice
  addBurst(st.ballX - st.camX + 10, st.ballY - st.camY - 10, COL.white, 24, 140);
  addPopup('THWACK!', st.ballX - st.camX + 70, st.ballY - st.camY - 35, COL.yel, 14);
  playSwing();
  startChaos();
}

function applyOpponentSwing() {
  st.oppStrokes++;
  const world = getWorld();
  const dx = world.holeX - st.oppX;
  const dy = world.holeY - st.oppY;
  const dist = Math.hypot(dx, dy);
  
  // Opponent AI behavior
  // Difficulty scales accuracy. Early worlds have higher spread.
  const spreadBase = 0.52 / Math.sqrt(world.difficulty);
  const spread = spreadBase * (0.8 + Math.random() * 0.4);
  
  // Power adjustment: try to land close but not overshoot.
  // "Greed" factor: if player is ahead (fewer strokes), opponent might take riskier, high-power shots.
  const isBehind = st.oppStrokes > st.strikes;
  const greed = isBehind ? 1.15 : 1.0;
  
  const powerVar = (0.85 + Math.random() * 0.3) * greed;
  const power = Math.min(1.2, (dist / 440) * powerVar);
  const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * spread;
  
  st.oppVX = Math.cos(ang) * (5.5 + power * 6.8);
  st.oppVY = Math.sin(ang) * 4.2;
  st.oppVZ = 7.0 + power * 6.2;
  
  st.oppFlying = true;
  st.oppTimer = 2.0 + Math.random() * 1.5;
  st.shake = Math.max(st.shake, 4); // Small shake when opponent hits
  
  addBurst(st.oppX - st.camX + 10, st.oppY - st.camY - 10, COL.dim, 16, 110);
  addPopup('SWOOSH!', st.oppX - st.camX + 30, st.oppY - st.camY - 20, COL.dim, 10);
}

function landOpponent() {
  st.oppFlying = false;
  st.oppZ = 0;
  const world = getWorld();
  const d = Math.hypot(st.oppX - world.holeX, st.oppY - world.holeY);
  
  let hazard = false;
  for (const h of world.hazards) {
    const nx = (st.oppX - h.x) / h.rx;
    const ny = (st.oppY - h.y) / h.ry;
    if (nx * nx + ny * ny <= 1) hazard = true;
  }

  if (d < 48 && !hazard) {
    addPopup('OPPONENT SCORES!', st.oppX - st.camX, st.oppY - st.camY - 20, COL.red, 14);
    st.oppFinished = true;
    st.oppFinalStrokes = st.oppStrokes;
    st.oppZ = -1000; // bury it so it's not visible
    st.shake = 10;
    playExplode(); 
    if (st.strikes > st.oppFinalStrokes) {
      setTimeout(() => { if (st.runActive) endRun('Opponent beat you in fewer strokes!') }, 1500);
    }
  } else {
    // Reset like player
    if (hazard) st.oppStrokes += 1; // 1 penalty stroke
    addPopup(hazard ? 'OPP: SPLASH!' : 'OPP: MISSED!', st.oppX - st.camX, st.oppY - st.camY - 22, COL.ora, 12);
    const startX = Math.max(150, world.holeX - 450 + Math.random() * 50);
    const startY = world.holeY + 150 + Math.random() * 50;
    st.oppX = startX;
    st.oppY = startY;
    st.oppVX = 0;
    st.oppVY = 0;
    st.oppVZ = 0;
    st.oppTimer = 2.0;
    st.shake = 4;
    addBurst(st.oppX - st.camX, st.oppY - st.camY, COL.ora, 8, 60);
  }
}

function landBall() {
  if (st.chaosActive) endChaos();
  st.ballX += st.chaosLandingMod.x;
  st.ballY += st.chaosLandingMod.y;
  st.chaosLandingMod = { x: 0, y: 0 };
  st.ballFlying = false;
  st.ballZ = 0;

  const world = getWorld();
  const d = Math.hypot(st.ballX - world.holeX, st.ballY - world.holeY);
  const hazard = getLandingHazard();

  if (d < 48 && !hazard) {
    const quality = 1 - d / 48;
    st.shake = 15;
    addBurst(st.ballX - st.camX, st.ballY - st.camY, COL.gold, 32, 150);
    finishHole(quality);
    return;
  }

  st.streak = 0;
  // CS-1: track consecutive missed holes for pivot crisis trigger
  st.consecutiveLosses = (st.consecutiveLosses || 0) + 1;
  // USER-PLAYTEST-FIX — Mulligan Memo: this miss costs no strike
  if (consumeOwnedPowerup('mulligan')) {
    st.strikes = Math.max(0, st.strikes - 1);
    addPopup('🔁 MULLIGAN MEMO FILED — stroke expunged', W / 2, 140, COL.gold, 9, 3);
  } else if (hazard) {
    st.strikes += 1; // 1 penalty stroke
  }
  st.shake = 6;
  addBurst(st.ballX - st.camX, st.ballY - st.camY, hazard ? COL.cyan : COL.red, 12, 80);
  addPopup(hazard ? `${hazard === 'water' ? '🌊 SPLASH!' : '🏖️ BUNKERED!'}` : 'MISSED!', st.ballX - st.camX, st.ballY - st.camY - 22, COL.red, 12);
  // HUMOR-SHARPEN + JUICE — mean announcer stinger and a floating emoji on misses
  addPopup(pickRandom(MISS_STINGERS), W / 2, 236, '#f8b4b4', 6, 3.2);
  addPopup(hazard === 'water' ? '🐟' : hazard === 'sand' ? '🏜️' : '📉', st.ballX - st.camX + rand(-16, 16), st.ballY - st.camY - 46, COL.white, 14, 2.2);

  // CS-5 Hook 2 — hazard type → faction standings
  if (hazard === 'water') {
    adjustStanding('Forgeharvest', -3);   // logistics empire is not impressed
    adjustStanding('NativeHollows', -1);  // locals wince
  } else if (hazard === 'sand') {
    adjustStanding('FarmableFractions', 2); // Brother Tillage enjoys the soil involvement
  }

  if (st.oppFinished && st.strikes > st.oppFinalStrokes) {
    if (st.runActive) endRun('Opponent beat you in fewer strokes!');
  } else if (st.money <= 0 || st.runway <= 0 || st.equity <= 0) {
    endRun();
  } else {
    setTimeout(() => resetBall(), 350);
  }
  playFail();
}

function getLandingHazard() {
  const world = getWorld();
  for (const h of world.hazards) {
    const nx = (st.ballX - h.x) / h.rx;
    const ny = (st.ballY - h.y) / h.ry;
    if (nx * nx + ny * ny <= 1) return h.type;
  }
  return null;
}

function finishHole(quality) {
  // Determine if the player beat the opponent
  if (st.oppFinished && st.strikes > st.oppFinalStrokes) {
    if (st.runActive) endRun('Opponent beat you in fewer strokes!');
    return;
  }

  const activeArchetype = st.roster[0] || null;
  const holePar = getHolePar();
  
  st.oppFinished = false; // reset opponent state for the next hole
  st.oppTimer = 2.0;
  st.oppStrokes = 0;
  st.oppFinalStrokes = 0;

  const result = quality > 0.8 ? 'great' : quality > 0.55 ? 'good' : quality > 0.35 ? 'bad' : 'terrible';
  const scoreOutcome = classifyGolfScoreOutcome(st.strikes, holePar);
  const sponsor = getCurrentSponsor();
  const sponsorBonus = sponsor.rarity === 'legendary' ? 1.25 : sponsor.rarity === 'epic' ? 1.15 : 1.05;
  const critChance = st.equipment.find(e => e.id === 'cap' && e.equipped) ? 0.16 : 0.06;
  const crit = Math.random() < critChance;
  let scoreGain = Math.round((350 + quality * 950) * sponsorBonus * (crit ? 2 : 1));
  let cashGain = Math.round((180 + quality * 420) * sponsorBonus);

  if (st.roster.includes('rogers_rachel')) cashGain += 90;
  if (st.roster.includes('springdale_sergio')) scoreGain = Math.round(scoreGain * 1.12);
  if (st.roster.includes('remote_rick')) cashGain += 60;
  if (st.powerups.find(p => p.id === 'coffee' && p.owned)) {
    cashGain += 500;
    consumeOwnedPowerup('coffee');
  }

  const hypeBoost = Math.round(st.hype * 0.015);
  const repCash = Math.round(st.reputation * 0.9);
  scoreGain += hypeBoost;
  cashGain += repCash;

  st.score += scoreGain;
  st.money += cashGain;
  st.totalScoreEarned += scoreGain;
  st.totalMoneyEarned += cashGain;
  // CS-6: crisis burn penalty — PredictiveCompliance Blood Feud issues compliance fines
  const crisisBurn = computeCrisisDebuff();
  const totalBurn = st.burnRate + crisisBurn.burnPenalty;
  if (crisisBurn.burnPenalty > 0) {
    addPopup(`⚖ COMPLIANCE FINE −$${crisisBurn.burnPenalty}`, W / 2, 212, COL.red, 7, 3.5);
  }
  st.money -= totalBurn;
  st.runway -= 1;
  st.valuation += Math.round(scoreGain * 1.6 + st.hype * 10);
  st.streak += 1;
  st.totalHolesCleared += 1;
  st.worldProgress[st.currentWorld] = (st.worldProgress[st.currentWorld] || 0) + 1;
  st.holeInWorld = st.worldProgress[st.currentWorld] + 1;
  st.reputation = clamp(st.reputation + (result === 'great' ? 3 : result === 'good' ? 1 : -2), 0, 100);
  st.hype = clamp(st.hype + (crit ? 4 : result === 'great' ? 2 : 0), 0, 100);
  st.compliance = clamp(st.compliance + (result === 'terrible' ? -2 : 0), 0, 100);
  st.auditRisk = clamp(st.auditRisk + (st.hype > 75 ? 2 : 0) + (result === 'terrible' ? 3 : 0), 0, 100);

  // CS-5 Hook 1 — hole outcome → faction standings
  // Vastcart rewards consistent performance; NativeHollows reward restraint.
  if (result === 'great') {
    adjustStanding('Vastcart', 3);
    adjustStanding('NativeHollows', 2);
  } else if (result === 'good') {
    adjustStanding('Vastcart', 1);
  } else if (result === 'bad') {
    adjustStanding('Vastcart', -1);
    adjustStanding('NativeHollows', 1); // locals appreciate humility
  } else { // terrible
    adjustStanding('Vastcart', -3);
    adjustStanding('CommitteeUnnecessarySynergy', -2); // committee clucks its tongue
  }
  if (crit) adjustStanding('CursorSpectacles', 3); // hype crowd notices the clutch

  addPopup(`${crit ? '⚡ CRIT ' : ''}+${scoreGain} pts`, W / 2, 160, crit ? COL.gold : COL.grn, 14);
  addPopup(`+$${cashGain}`, W / 2, 188, COL.cyan, 11);
  if (activeArchetype) {
    const reaction = getShotReactionLine(activeArchetype, scoreOutcome, result);
    if (reaction) addPopup(reaction, W / 2, 214, result === 'great' || result === 'good' ? COL.gold : COL.ora, 7, 3.8);
  }
  addBurst(world.holeX - st.camX, world.holeY - st.camY - 12, crit ? COL.gold : COL.yel, 20, 140);
  // JUICE — floating emoji fountain on every cleared hole, scaled by quality
  const holeEmojis = crit ? ['⚡', '💰', '🏆', '🔥'] : result === 'great' ? ['💰', '🎉', '⛳'] : result === 'good' ? ['💵', '👏'] : ['🪙', '📋'];
  holeEmojis.forEach((em, ei) => {
    addPopup(em, world.holeX - st.camX + rand(-34, 34), world.holeY - st.camY - 8 - ei * 12, COL.white, 13, 2 + ei * 0.3);
  });
  playHit();

  processInitiativesAfterHole();
  updateQuarterProgress();
  updateFunding();
  updateTeamAfterHole(result);
  maybeBoardMeeting();
  maybeRaiseThreat();
  maybeEvent();
  maybeAuditEvent();
  if (maybeUnlockWorld()) return; // IPO triggered
  evaluateMilestones();

  // A completed hole resets consecutive losses
  st.consecutiveLosses = 0;

  if (st.money <= 0 || st.runway <= 0 || st.strikes >= st.maxStrikes || st.equity <= 0) {
    endRun();
    return;
  }

  // CS-1/CS-2: post-hole overlay sequencing.
  // resolvePostHole handles the priority chain so pitch and quarterly
  // never fire on the same hole and control always returns to gameplay.
  resolvePostHole();
}

// CS-1/CS-2: post-hole overlay sequencer.
// Priority (highest first):
//   1. Quarterly Review  — every 3rd hole  (3, 6, 9, 12, …)
//   2. Investor Pitch    — every 4th hole starting at 2  (2, 5, 9, 13, …)
//      hole 9 is claimed by quarterly (9%3===0), so pitch skips it.
//   3. Ceremonial Spoon  — whenever conditions are met
//   4. Normal play
// Both use idempotent ShownForHole maps: a reload never double-fires.
// Dismissal of each overlay calls onQuarterlyResolved / onPitchResolved,
// which call resetBall() (with double-reset guard) and saveRun().
function resolvePostHole() {
  const h = st.totalHolesCleared; // already incremented by finishHole

  // Quarterly Review: holes 3, 6, 9, 12, …
  if (h > 0 && h % 3 === 0 && !st.quarterlyShownForHole[h]) {
    st.quarterlyShownForHole[h] = true;
    saveMeta(); saveRun();           // save before overlay so reload is safe
    triggerQuarterlyReview();
    return; // resetBall called by clickReview on dismiss
  }

  // Investor Pitch: holes 2, 5, 9, 13, … (every 4, starting at 2, skips
  // any hole already claimed by quarterly)
  if (h > 0 && (h - 2) % 4 === 0 && !st.pitchShownForHole[h]) {
    st.pitchShownForHole[h] = true;
    saveMeta(); saveRun();           // save before overlay so reload is safe
    triggerPitchGauntlet();
    return; // resetBall called by onPitchResolved on dismiss
  }

  // Ceremonial Spoon Check
  const pendingSpoon = checkSpoonAwards();
  if (pendingSpoon) {
    saveMeta(); saveRun();
    triggerSpoonCeremony(pendingSpoon);
    return;
  }

  // Normal flow: advance to next hole immediately
  resetBall();
  saveMeta();
  saveRun();
}

function maybeBoardMeeting() {
  if (st.totalHolesCleared > 0 && st.totalHolesCleared % 5 === 0) {
    const impact = Math.random() < 0.5 ? 'burn' : 'equity';
    st.boardImpact = impact;
    const dialoguePool = DIALOGUE.boardroom_v2 && DIALOGUE.boardroom_v2.length
      ? DIALOGUE.boardroom_v2
      : DIALOGUE.boardroom_default;
    const line = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];
    const mood = st.hype > 70
      ? ' They loved the sizzle and feared the books.'
      : st.compliance < 40
        ? ' Legal visibly aged during the presentation.'
        : ' Everyone nodded like they understood the dashboard.';
    st.boardMessage = `${formatBoardroomLine(line)}${mood}`;
    if (impact === 'burn') {
      st.burnRate += 120;
      // CS-5 Hook 3a — burn-rate hike: Vastcart approves of the pressure
      adjustStanding('Vastcart', 2);
      adjustStanding('CommitteeUnnecessarySynergy', 3);
    } else {
      st.equity = clamp(st.equity - 2, 10, 100);
      // CS-5 Hook 3b — equity dilution: Migratory Founders circling; locals unimpressed
      adjustStanding('MigratoryFounders', 4);
      adjustStanding('NativeHollows', -2);
    }
    st.boardOpen = true;
    st.screen = 'playing';
  }
}

function maybeRaiseThreat() {
  for (const c of st.competitors) c.threat = clamp(c.threat + rand(0, 5) + st.hype * 0.02, 0, 100);
}

function maybeUnlockWorld() {
  const world = getWorld();
  if ((st.worldProgress[st.currentWorld] || 0) >= world.holes) {
    if (st.currentWorld < WORLDS.length) {
      const next = st.currentWorld + 1;
      if (!st.worldsUnlocked.includes(next) && st.funding >= WORLDS[next - 1].fundingReq && meetsWorldRequirement(next)) {
        st.worldsUnlocked.push(next);
        addPopup(`🌍 World ${next} unlocked!`, W / 2, 120, COL.gold, 13);
        addPopup('Visit the world map to launch the next crisis.', W / 2, 144, COL.cyan, 9);
        logStory(`World ${next} opened after leadership successfully packaged chaos as expansion.`);
        playSuccess();
        saveMeta();
      }
    } else {
      st.wealth += Math.max(25000, st.score);
      meta.wealth = st.wealth;
      saveMeta();
      triggerIPO();
      return true;
    }
  }
  return false;
}

function maybeEvent() {
  if (Math.random() > 0.22) return;
  // CS-5 Hook 6 — random events now carry faction standing deltas
  const events = [
    { text: 'Viral founder thread',                money:  700, color: COL.grn,  hype:  6,
      standing: { CursorSpectacles: 8, MigratoryFounders: 5, NativeHollows: -3 } },
    { text: 'Server crash during demo day',        money: -450, color: COL.red,  reputation: -4,
      standing: { PredictiveCompliance: -4, Vastcart: -3, CommitteeUnnecessarySynergy: -2 } },
    { text: 'Angel intro at a bike trail café',    money: 1200, color: COL.gold, reputation:  3,
      standing: { MigratoryFounders: 6, CursorSpectacles: 4 } },
    { text: 'Glassdoor leak',                      equity:  -2, color: COL.red,  reputation: -5,
      standing: { NativeHollows: 5, Vastcart: -5, PredictiveCompliance: -3 } },
    { text: 'Product Hunt bump',                   score:  900, color: COL.cyan, hype:  5,
      standing: { CursorSpectacles: 6, MigratoryFounders: 4 } },
    { text: 'Mandatory synergy summit',            money: -250, color: COL.ora,  compliance: -3, hype: 2,
      standing: { CommitteeUnnecessarySynergy: 8, NativeHollows: -4 } },
    { text: 'Retail pilot whispers',               money:  550, color: COL.gold, reputation:  4,
      standing: { Vastcart: 6, Forgeharvest: 3 } },
    { text: 'Magistrate Ledger files a query',     money: -300, color: COL.ora,  compliance: -4,
      standing: { PredictiveCompliance: 5, AlgorithmicApprovals: 3, Vastcart: -2 } },
    { text: 'Lord Buzzwick spots you mid-swing',   color: COL.dim,
      standing: { MechanicalCrow: 4, NativeHollows: -3 } },
    { text: 'Goodwife Henrietta writes a letter',  color: COL.cyan, reputation: 3,
      standing: { NativeHollows: 8, MigratoryFounders: -4, CursorSpectacles: -3 } },
  ];
  const ev = events[Math.floor(Math.random() * events.length)];
  if (ev.money)      st.money      += ev.money;
  if (ev.score)      st.score      += ev.score;
  if (ev.equity)     st.equity      = clamp(st.equity + ev.equity, 10, 100);
  if (ev.reputation) st.reputation  = clamp(st.reputation + ev.reputation, 0, 100);
  if (ev.hype)       st.hype        = clamp(st.hype + ev.hype, 0, 100);
  if (ev.compliance) st.compliance  = clamp(st.compliance + ev.compliance, 0, 100);
  // Apply faction standing deltas
  if (ev.standing) {
    for (const [faction, delta] of Object.entries(ev.standing)) {
      adjustStanding(faction, delta);
    }
  }
  logStory(`${ev.text}.`);
  addPopup(`${ev.text}${ev.money ? ` ${ev.money > 0 ? '+' : ''}$${ev.money}` : ''}`, W / 2, 110, ev.color, 10);
}

function endRun(msg = '') {
  st.runActive = false;
  st.boardMessage = msg;

  // Liquidation check
  if (st.ventureDebt?.active && (st.money <= 0 || st.runway <= 0)) {
    const LIQUIDATION_LINES = [
      "Thy assets have been tokenized and sold to a consortium of high-frequency alpacas.",
      "The venture note matured early; thy office furniture is now property of Coastal Shadow.",
      "A debt-for-equity swap was performed. Thou now ownest 0% of thy own silence.",
      "The lender triggered the 'Extreme Prejudice' clause. Please vacate the fairway.",
      "Thy runway didn't just end; it was repossessed for a luxury fulfillment center."
    ];
    st.liquidationSummary = {
      principal: st.ventureDebt.principal,
      interest: Math.round(st.ventureDebt.principal * st.ventureDebt.rate),
      flavor: LIQUIDATION_LINES[Math.floor(Math.random() * LIQUIDATION_LINES.length)]
    };
    st.boardMessage = "LIQUIDATED BY CREDITORS.";
    
    // CS-10: Trigger "Liquidation Burst" high-intensity particle sequence
    addBurst(W / 2, H / 2, COL.gold, 64, 250, false);
    addBurst(W / 2, H / 2, COL.red, 48, 180, false);
    st.shake = 30; // Strong screen shake for liquidation
  }

  // CS-7: snapshot ceremony BEFORE clearRun() wipes the ledger
  st.gameOverCeremony = computeCeremony();
  st.ceremonyPhase = 0;

  st.leaderboard.push({
    score: st.score,
    money: st.money,
    funding: FUNDING_ROUNDS[st.funding],
    world: st.currentWorld,
    holes: st.totalHolesCleared,
    quarter: st.quarter,
    reputation: st.reputation,
    hype: st.hype,
    date: Date.now()
  });
  st.leaderboard.sort((a, b) => b.score - a.score);
  st.leaderboard = st.leaderboard.slice(0, 12);
  logStory(`Run ended in Q${st.quarter} with REP ${Math.round(st.reputation)} and HYPE ${Math.round(st.hype)}.`);
  saveMeta();
  clearRun();

  st.screen = 'gameover'; // set after clearRun so transition doesn't flicker
  playFail();
}

function consumeOwnedPowerup(id) {
  const item = st.powerups.find(p => p.id === id);
  if (!item || !item.owned) return false;
  item.owned = false;
  return true;
}

function buyPowerup(id) {
  const item = st.powerups.find(p => p.id === id);
  if (!item || st.money < item.cost) return false;
  st.money -= item.cost;
  // USER-PLAYTEST-FIX — instant-effect powerups resolve on purchase
  if (id === 'life') st.maxStrikes += 1;
  else if (id === 'prblast') {
    st.hype = clamp(st.hype + 10, 0, 100);
    addPopup('📣 The Corridor hears of thee. HYPE +10', W / 2, H / 2 - 26, COL.pink, 9);
  }
  else if (id === 'shredder') {
    st.auditRisk = clamp(st.auditRisk - 12, 0, 100);
    addPopup('🗑️ Documents "archived." AUDIT −12', W / 2, H / 2 - 26, COL.cyan, 9);
  }
  else item.owned = true;
  addPopup(`Purchased ${item.name}`, W / 2, H / 2, COL.grn, 11);
  playSuccess();
  saveRun();
  return true;
}

function buyEquipment(id) {
  const item = st.equipment.find(p => p.id === id);
  if (!item || st.money < item.cost || item.owned) return false;
  st.money -= item.cost;
  item.owned = true;
  addPopup(`Purchased ${item.name}`, W / 2, H / 2, COL.grn, 11);
  playSuccess();
  saveRun();
  return true;
}

function toggleEquipment(id) {
  const item = st.equipment.find(e => e.id === id);
  if (!item || !item.owned) return;
  item.equipped = !item.equipped;
  addPopup(`${item.name} ${item.equipped ? 'equipped' : 'unequipped'}`, W / 2, H / 2, item.equipped ? COL.cyan : COL.dim, 10);
  playClick();
  saveRun();
}

// HUMOR-SHARPEN — commentary pools for the watch-mode booth
const WATCH_COMMENTARY_A = [
  'Team Disruption steals the hole and immediately claims they invented golf!',
  'Disruption sinks it! Their newsletter will call this "product-market fit."',
  'Hole to Disruption. Somewhere, a deck updates itself.',
  'Disruption wins it and thanks their own grindset. The ball did the work.'
];
const WATCH_COMMENTARY_B = [
  'The Bootstrappers answer back! No funding, no fear, no lunch budget!',
  'Bootstrappers take it — with a club they fixed themselves. Twice.',
  'Hole to the Bootstrappers. The crowd nods. Henrietta pours.',
  'Bootstrappers win! Their victory speech: "okay, next hole."'
];

function createWatchMatch() {
  const ids = Object.keys(ARCHETYPE_STATS).sort(() => Math.random() - 0.5);
  st.watch = {
    teamA: { name: 'Team Disruption', ids: ids.slice(0, 4), score: 0 },
    teamB: { name: 'Team Bootstrapper', ids: ids.slice(4, 8), score: 0 },
    bet: 0,
    betOn: null,
    phase: 'betting',
    timer: 0,
    hole: 1,
    commentary: 'Place your bet. The house always wins. The house is a committee.',
    // USER-PLAYTEST-FIX — ballX is now progress (px) across the watch field; ballZ is arc height
    ballX: 0,
    ballZ: 0,
    winner: null,
  };
}

function teamStrength(ids) {
  return ids.reduce((sum, id) => sum + (ARCHETYPE_STATS[id]?.base || 50), 0) / Math.max(1, ids.length);
}

function placeWatchBet(amount, side) {
  if (st.money < amount) {
    addPopup('Not enough cash', W / 2, 170, COL.red, 11);
    playFail();
    return;
  }
  st.money -= amount;
  st.watch.bet = amount;
  st.watch.betOn = side;
  st.watch.phase = 'sim';
  st.watch.timer = 0;
  playClick();
}

function updateWatch(dt) {
  if (!st.watch) return;
  if (st.watch.phase !== 'sim') return;
  st.watch.timer += dt;
  // USER-PLAYTEST-FIX — ball arcs across the watch field and lands at the flag,
  // instead of being drawn below the field in the void.
  const flightDur = 1.8;
  const progress = Math.min(1, st.watch.timer / flightDur);
  st.watch.ballX = progress * 420; // tee (126+20) → flag (~570)
  st.watch.ballZ = Math.max(0, Math.sin(progress * Math.PI) * 80);
  if (st.watch.timer > flightDur) {
    const rollA = teamStrength(st.watch.teamA.ids) + rand(0, 28);
    const rollB = teamStrength(st.watch.teamB.ids) + rand(0, 28);
    st.watch.winner = rollA >= rollB ? 'A' : 'B';
    if (st.watch.winner === 'A') st.watch.teamA.score += 1;
    else st.watch.teamB.score += 1;
    st.watch.commentary = st.watch.winner === 'A' ? pickRandom(WATCH_COMMENTARY_A) : pickRandom(WATCH_COMMENTARY_B); // HUMOR-SHARPEN
    addBurst(570, 400, st.watch.winner === 'A' ? COL.cyan : COL.pink, 14, 110, false); // JUICE — landing pop
    st.watch.hole += 1;
    st.watch.timer = 0;
    st.watch.ballX = 0;
    if (st.watch.hole > 3) {
      st.watch.phase = 'result';
      const finalWinner = st.watch.teamA.score >= st.watch.teamB.score ? 'A' : 'B';
      if (st.watch.bet > 0 && finalWinner === st.watch.betOn) {
        const win = st.watch.bet * 2;
        st.money += win;
        addPopup(`Won $${win}!`, W / 2, 160, COL.grn, 13);
        playSuccess();
      } else if (st.watch.bet > 0) {
        addPopup('Bet lost', W / 2, 160, COL.red, 12);
        playFail();
      }
    }
  }
}

function analyzeRepo(files) {
  const repo = { name: 'Unknown Repo', files: [], langs: {}, totalLines: 0, complexity: 0 };
  for (const f of files) {
    const ext = f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : 'other';
    const langMap = { js: 'JavaScript', ts: 'TypeScript', jsx: 'React', tsx: 'React', py: 'Python', html: 'HTML', css: 'CSS', java: 'Java', go: 'Go', rs: 'Rust', json: 'Config', md: 'Docs' };
    const lang = langMap[ext] || 'Other';
    repo.langs[lang] = (repo.langs[lang] || 0) + 1;
    repo.files.push({ name: f.name, size: f.size, path: f.webkitRelativePath || f.name });
  }
  repo.totalLines = Math.floor(files.reduce((sum, f) => sum + f.size, 0) / 38);
  repo.complexity = repo.files.length * Math.max(1, Object.keys(repo.langs).length);
  repo.name = files[0]?.webkitRelativePath?.split('/')[0] || 'Uploaded Repo';
  return repo;
}

function generateRepoEntities(repo) {
  const sponsors = [];
  const competitors = [];
  const hires = [];
  const langs = Object.keys(repo.langs);
  for (const lang of langs) {
    sponsors.push({
      name: `${lang} Ventures`,
      icon: ['🧠', '📦', '🌪️', '🏴‍☠️', '💾'][Math.floor(Math.random() * 5)],
      desc: `${repo.langs[lang]} ${lang} files analyzed`,
      rarity: repo.files.length > 40 ? 'epic' : 'rare'
    });
  }
  if (repo.files.length > 40) {
    competitors.push({
      name: `${repo.name} Clone`,
      icon: '🐱',
      desc: `Copied your ${repo.files.length} files`,
      threat: clamp(Math.floor(repo.files.length / 2), 10, 70)
    });
  }
  langs.slice(0, 3).forEach((lang, i) => {
    const id = `repo_${repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${i}`;
    const base = 46 + Math.floor(Math.random() * 24);
    ARCHETYPE_STATS[id] = {
      name: `${lang} Architect`,
      role: lang,
      base,
      hireCost: 700 + Math.floor(Math.random() * 900),
      color: ['#93c5fd', '#f9a8d4', '#86efac'][i % 3],
      accent: ['#2563eb', '#be185d', '#16a34a'][i % 3],
      quote: `Spawned from ${repo.name}`,
    };
    hires.push({ id, repo: repo.name });
  });
  return { sponsors, competitors, hires };
}

FILE_INPUT.addEventListener('change', evt => {
  const raw = Array.from(evt.target.files || []).filter(f => !f.webkitRelativePath.includes('node_modules') && !f.webkitRelativePath.includes('.git') && f.size < 1024 * 1024);
  if (!raw.length) {
    addPopup('No valid files found', W / 2, H / 2, COL.red, 12);
    playFail();
    return;
  }
  const repo = analyzeRepo(raw);
  const entities = generateRepoEntities(repo);
  st.uploadedRepos.push(repo);
  st.discovered.sponsors.push(...entities.sponsors);
  st.discovered.competitors.push(...entities.competitors);
  st.discovered.hires.push(...entities.hires);
  st.sponsors.push(...entities.sponsors);
  st.competitors.push(...entities.competitors);
  addPopup(`📦 ${repo.name} loaded`, W / 2, H / 2 - 10, COL.gold, 14);
  addPopup(`+${entities.sponsors.length + entities.competitors.length + entities.hires.length} discoveries`, W / 2, H / 2 + 18, COL.cyan, 10);
  addBurst(W / 2, H / 2 + 10, COL.gold, 20);
  playSuccess();
  saveMeta();
  refreshJobOffers();
  FILE_INPUT.value = '';
});

const CHARACTER_PORTRAITS = {
  'Sir Wastrel': 'assets/portrait_wastrel.webp',
  'Brother Idleworth': 'assets/portrait_idleworth.webp',
  'The Pivot Addict': 'assets/portrait_pivot_addict.webp',
  'Goodwife Henrietta': 'assets/portrait_henrietta.webp',
  'Lord Buzzwick': 'assets/portrait_buzzwick.webp',
  'VC Bro': 'assets/portrait_vc_bro.webp',
  'CFO Karen': 'assets/portrait_karen.webp',
  'Lady Synergy Karen': 'assets/portrait_karen.webp',
  'The Pioneer': 'assets/portrait_wastrel.webp',
  'Young Master Reginald': 'assets/portrait_vc_bro.webp',
  'Brother Hustleworth': 'assets/portrait_pivot_addict.webp',
  'The Web3 Re-Pivoter': 'assets/portrait_pivot_addict.webp',
  'Sam Walton\'s Ghost': 'assets/portrait_wastrel.webp',
  'CFO Karen': 'assets/portrait_karen.webp',
  'Walmart Buyer': 'assets/portrait_vc_bro.webp',
  'Tyson Exec': 'assets/portrait_wastrel.webp',
  'Founder': 'assets/portrait_pivot_addict.webp',
  'Marketing VP': 'assets/portrait_karen.webp',
  'Tech Lead': 'assets/portrait_idleworth.webp',
  'HR Director': 'assets/portrait_karen.webp',
  'Burnt-Out IC': 'assets/portrait_idleworth.webp',
  // Faction defaults
  'CommitteeUnnecessarySynergy': 'assets/portrait_wastrel.webp',
  'NativeHollows': 'assets/portrait_henrietta.webp',
  'MechanicalCrow': 'assets/portrait_buzzwick.webp',
  'CoastalShadow': 'assets/portrait_wastrel.webp',
  'PredictiveCompliance': 'assets/portrait_karen.webp',
  'AlgorithmicApprovals': 'assets/portrait_idleworth.webp',
  'CursorSpectacles': 'assets/portrait_vc_bro.webp',
  'MigratoryFounders': 'assets/portrait_idleworth.webp',
  'FarmableFractions': 'assets/portrait_pivot_addict.webp',
  'Vastcart': 'assets/portrait_vc_bro.webp',
  'Forgeharvest': 'assets/portrait_wastrel.webp',
};

function getPortrait(who) {
  const path = CHARACTER_PORTRAITS[who] || CHARACTER_PORTRAITS[who?.replace(/ /g, '')] || 'assets/investor-character.webp';
  return loadSprite(path);
}

// CS-10 PERF: hoisted out of drawBackground so the constant tree layout isn't
// re-allocated as a fresh array (with four object literals) every frame.
const BG_TREES = [
  { x: 30, y: 190 }, { x: 64, y: 196 }, { x: 690, y: 190 }, { x: 724, y: 196 }
];

function drawBackground(camX = 0, camY = 0) {
  // Blood Feud State Check
  const isBloodFeud = hasBloodFeud();
  if (isBloodFeud) {
    const bgFeud = loadSprite('assets/bg_blood_feud.webp');
    if (bgFeud.complete && bgFeud.naturalWidth) {
      X.drawImage(bgFeud, 0, 0, W, H);
      // Add a menacing pulse
      const pulse = 0.05 + Math.sin(st.time * 4) * 0.05;
      X.fillStyle = `rgba(255, 0, 0, ${pulse})`;
      X.fillRect(0, 0, W, H);
      
      // Draw some heat distortion lines
      X.strokeStyle = 'rgba(255, 50, 0, 0.15)';
      X.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const offset = (st.time * 60 + i * 40) % H;
        X.beginPath();
        X.moveTo(0, offset);
        X.lineTo(W, offset);
        X.stroke();
      }
      return;
    }
  }

  const world = getWorld();
  const g = X.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, world.sky[0]);
  g.addColorStop(0.34, world.sky[1]);
  g.addColorStop(0.35, world.ground);
  g.addColorStop(1, '#051005');
  X.fillStyle = g;
  X.fillRect(0, 0, W, H);

  for (let i = 0; i < 4; i++) {
    const cx = ((100 + i * 170 + Math.sin(st.time * 0.2 + i) * 16) - camX * 0.2) % (W + 100);
    const drawX = cx < -100 ? cx + W + 200 : cx;
    X.fillStyle = 'rgba(255,255,255,0.55)';
    X.beginPath();
    X.ellipse(drawX, 56 + i % 2 * 8, 50, 14, 0, 0, Math.PI * 2);
    X.fill();
  }

  X.fillStyle = '#184f18';
  X.beginPath();
  X.moveTo(0, 192 - camY * 0.1);
  for (let x = 0; x <= W; x += 30) {
    const realX = x + camX * 0.5;
    X.quadraticCurveTo(x + 15, 174 + Math.sin(realX * 0.03) * 14 - camY * 0.1, x + 30, 192 - camY * 0.1);
  }
  X.lineTo(W, H);
  X.lineTo(0, H);
  X.fill();

  for (let i = 0; i < 10; i++) {
    const y = 186 + i * 38 - camY * (0.2 + i * 0.05);
    if (y > 170 && y < H) {
      X.fillStyle = i % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.02)';
      X.fillRect(0, y, W, 38);
    }
  }

  for (const t of BG_TREES) {
    const tx = t.x - camX * 0.8;
    const ty = t.y - camY * 0.2;
    if (tx > -20 && tx < W + 20) {
      rect(tx - 3, ty, 6, 28, '#5d4037');
      X.fillStyle = '#2f7d32';
      X.beginPath(); X.moveTo(tx, ty - 18); X.lineTo(tx - 15, ty + 4); X.lineTo(tx + 15, ty + 4); X.closePath(); X.fill();
    }
  }

  for (const h of world.hazards) {
    const hx = h.x - camX;
    const hy = h.y - camY;
    if (hx + h.rx > 0 && hx - h.rx < W && hy + h.ry > 0 && hy - h.ry < H) {
      if (h.type === 'sand') {
        X.fillStyle = COL.sand;
        X.beginPath(); X.ellipse(hx, hy, h.rx, h.ry, 0, 0, Math.PI * 2); X.fill();
        X.fillStyle = 'rgba(255,255,255,0.16)';
        X.beginPath(); X.ellipse(hx + 8, hy - 2, h.rx * 0.5, h.ry * 0.45, 0.2, 0, Math.PI * 2); X.fill();
      } else {
        X.fillStyle = COL.water;
        X.beginPath(); X.ellipse(hx, hy, h.rx, h.ry, 0, 0, Math.PI * 2); X.fill();
        X.fillStyle = 'rgba(255,255,255,0.22)';
        X.beginPath(); X.ellipse(hx - 15, hy - 6, h.rx * 0.35, h.ry * 0.2, -0.2, 0, Math.PI * 2); X.fill();
      }
    }
  }

  // Drawing the hole and flag was moved to drawHoleFlag
}

function drawHoleFlag() {
  const world = getWorld();
  const hx = world.holeX - st.camX;
  const hy = world.holeY - st.camY;
  if (hx > -20 && hx < W + 20 && hy > -60 && hy < H + 20) {
    X.fillStyle = '#111';
    X.beginPath(); X.arc(hx, hy, 10, 0, Math.PI * 2); X.fill();
    rect(hx - 1, hy - 52, 3, 52, '#f1c40f');
    const flap = Math.sin(st.time * 6) * 4;
    X.fillStyle = COL.flag;
    X.beginPath();
    X.moveTo(hx + 2, hy - 52);
    X.quadraticCurveTo(hx + 26 + flap, hy - 41, hx + 2, hy - 28);
    X.lineTo(hx + 28 + flap, hy - 41);
    X.closePath();
    X.fill();
  }
}

function drawGolfer() {
  const activeId = st.roster[0] || 'bentonville_chad';
  const c = ARCHETYPE_STATS[activeId] || ARCHETYPE_STATS.bentonville_chad;
  // USER-PLAYTEST-FIX — anchor to the swing spot, not the (possibly airborne) ball
  const gx = st.golferX ?? st.ballX;
  const gy = st.golferY ?? st.ballY;
  const x = gx - st.camX - 12;
  const y = gy - st.camY + 20;
  X.save();
  X.translate(x, y);
  const swing = st.swingPhase === 'swinging' ? Math.min(1, st.swingAnim / 0.35) : 0;
  X.rotate(-swing * 0.2);
  rect(-11, -58, 22, 14, c.color, 4, '#111', 1);
  rect(-9, -44, 18, 22, c.accent, 3, '#111', 1);
  rect(-8, -21, 6, 20, '#334155');
  rect(2, -21, 6, 20, '#334155');
  rect(-11, -66, 22, 10, c.accent, 4);
  X.fillStyle = '#f5c7a7';
  X.beginPath(); X.arc(0, -74, 8, 0, Math.PI * 2); X.fill();
  X.strokeStyle = '#cbd5e1';
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(5, -38);
  X.lineTo(26 + swing * 22, -18 + swing * 8);
  X.stroke();
  X.lineWidth = 4;
  X.beginPath();
  X.moveTo(24 + swing * 22, -20 + swing * 8);
  X.lineTo(42 + swing * 30, -2 + swing * 12);
  X.stroke();
  X.restore();
}

function drawOpponent() {
  if (st.oppFinished) return;
  const x = st.oppX - st.camX - 12; // adjust for visual alignment
  const y = st.oppY - st.camY + 20; // adjust to stand slightly behind ball
  
  if (x < -100 || x > W + 100 || y < -100 || y > H + 100) return; // optimize if totally offscreen
  
  X.save();
  X.translate(x, y);
  X.globalAlpha = 0.55; // ghosted appearance
  
  // Draw preview line if preparing swing
  if (st.oppTimer < 1.0 && !st.oppFlying) {
    const world = getWorld();
    const dx = world.holeX - st.oppX;
    const dy = world.holeY - st.oppY;
    const ang = Math.atan2(dy, dx);
    X.strokeStyle = 'rgba(255,100,100,0.3)';
    X.setLineDash([5, 5]);
    X.beginPath();
    X.moveTo(12, -20);
    X.lineTo(12 + Math.cos(ang) * 60, -20 + Math.sin(ang) * 60);
    X.stroke();
    X.setLineDash([]);
  }

  rect(-11, -58, 22, 14, '#ff4444', 4, '#111', 1);
  rect(-9, -44, 18, 22, '#aa0000', 3, '#111', 1);
  rect(-8, -21, 6, 20, '#222');
  rect(2, -21, 6, 20, '#222');
  rect(-11, -66, 22, 10, '#aa0000', 4);
  X.fillStyle = '#f5c7a7';
  X.beginPath(); X.arc(0, -74, 8, 0, Math.PI * 2); X.fill();
  
  const oppSwing = st.oppTimer > 0 && st.oppTimer < 0.35 && !st.oppFlying ? 1 - st.oppTimer / 0.35 : 0;
  X.strokeStyle = '#cbd5e1';
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(5, -38);
  X.lineTo(26 + oppSwing * 22, -18 + oppSwing * 8);
  X.stroke();
  
  X.restore();

  // Draw opponent ball
  const sh = Math.max(0.15, 1 - st.oppZ / 180);
  X.fillStyle = `rgba(0,0,0,${sh * 0.35})`;
  X.beginPath();
  X.ellipse(st.oppX - st.camX + st.oppZ * 0.08, st.oppY - st.camY + 5, 7 + st.oppZ * 0.02, 3.2, 0, 0, Math.PI * 2);
  X.fill();

  const size = Math.max(4, 8 - st.oppZ * 0.018);
  X.save();
  X.translate(st.oppX - st.camX, st.oppY - st.camY - st.oppZ);
  X.rotate(st.oppSpin);
  X.fillStyle = '#ffaaaa';
  X.beginPath(); X.arc(0, 0, size, 0, Math.PI * 2); X.fill();
  X.strokeStyle = '#aa0000';
  X.lineWidth = 1;
  X.stroke();
  X.restore();
}

function drawBall() {
  const sh = Math.max(0.15, 1 - st.ballZ / 180);
  X.fillStyle = `rgba(0,0,0,${sh * 0.35})`;
  X.beginPath();
  X.ellipse(st.ballX - st.camX + st.ballZ * 0.08, st.ballY - st.camY + 5, 7 + st.ballZ * 0.02, 3.2, 0, 0, Math.PI * 2);
  X.fill();

  const size = Math.max(4, 8 - st.ballZ * 0.018);
  X.save();
  X.translate(st.ballX - st.camX, st.ballY - st.camY - st.ballZ);
  X.rotate(st.ballSpin);
  X.fillStyle = '#fff';
  X.beginPath(); X.arc(0, 0, size, 0, Math.PI * 2); X.fill();
  X.strokeStyle = '#d8dee9';
  X.lineWidth = 1;
  X.stroke();
  X.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * 0.5;
    X.beginPath();
    X.arc(Math.cos(a) * size * 0.45, Math.sin(a) * size * 0.45, size * 0.16, 0, Math.PI * 2);
    X.fill();
  }
  X.restore();
}

function drawHUD() {
  const sponsor = getCurrentSponsor();
  const holePar = getHolePar();
  rect(0, 0, W, 54, 'rgba(0,0,0,0.82)');
  rect(0, 54, W, 2, 'rgba(255,215,0,0.35)');

  // GP-10: Display active Pivot Identity as the player label, or fallback to game title
  let playerLabel = 'SKYDISORDER';
  let titleColor = COL.yel;
  if (st.pivotHistory && st.pivotHistory.length > 0) {
    const lastPivotId = st.pivotHistory[st.pivotHistory.length - 1].id;
    const opt = PIVOT_OPTIONS.find(o => o.id === lastPivotId);
    if (opt) {
      playerLabel = opt.name.toUpperCase();
      titleColor = COL.gold; // Slightly different color for active pivots
    }
  }
  
  // Left-aligned title so it doesn't overlap the money if the identity name is long
  txt(playerLabel, 12, 18, playerLabel.length > 15 ? 7 : 9, titleColor, true, 'left');

  txt(`$${Math.max(0, Math.floor(st.money)).toLocaleString()}`, 208, 38, 8, st.money > 1200 ? COL.grn : st.money > 400 ? COL.ora : COL.red, true);
  txt(FUNDING_ROUNDS[st.funding], 210, 16, 6, COL.gold, false);
  txt(`${Math.round(st.equity)}%`, 304, 18, 6, st.equity > 50 ? COL.grn : st.equity > 25 ? COL.ora : COL.red, false);
  txt(`${st.score.toLocaleString()} pts`, 530, 18, 8, COL.pink, true);
  rect(W - 120, 6, 113, 40, 'rgba(74,25,66,0.95)', 4, COL.gold, 1);
  txt(`W${st.currentWorld}`, W - 86, 18, 9, COL.cyan, true);
  txt(`H ${st.holeInWorld}/${getWorld().holes}`, W - 86, 36, 6, COL.gold, false);
  txt(`PAR ${holePar}`, W - 33, 27, 6, COL.yel, false);

  txt(`Strokes: ${st.strikes}  |  Opp: ${st.oppFinished ? st.oppFinalStrokes : st.oppStrokes}`, 432, 38, 7, COL.white, true);
  if (st.streak > 0) txt(`${st.streak}🔥`, 540, 38, 7, COL.ora, true);

  rect(0, H - 48, W, 48, 'rgba(0,0,0,0.84)');
  rect(0, H - 48, W, 2, 'rgba(255,215,0,0.25)');
  txt(`${sponsor.icon} SPONSORED BY: ${sponsor.name}`, W / 2, H - 34, 6, getRarityColor(sponsor.rarity), true);
  txt(`"${sponsor.desc}"`, W / 2, H - 18, 5, '#9aa4af', false);
  txt(getBottomHudLine(), W / 2, H - 6, 4, COL.gold, false);

  rect(0, 56, W, 18, 'rgba(0,0,0,0.58)');
  const runwayPct = clamp(st.runway / 24, 0, 1);
  rect(0, 56, W * runwayPct, 18, runwayPct > 0.5 ? 'rgba(74,222,128,0.15)' : runwayPct > 0.25 ? 'rgba(255,235,59,0.15)' : 'rgba(255,68,68,0.15)');
  txt(`🔥 Burn $${st.burnRate}/hole`, 122, 65, 6, runwayPct > 0.5 ? COL.grn : runwayPct > 0.25 ? COL.yel : COL.red, false);
  txt(`⏱️ Runway ${st.runway}`, 305, 65, 6, runwayPct > 0.5 ? COL.grn : runwayPct > 0.25 ? COL.yel : COL.red, false);
  txt(`📈 Val ${(st.valuation / 1000).toFixed(0)}K`, 503, 65, 6, COL.gold, false);
  txt(`🌬 ${st.windX >= 0 ? '→' : '←'} ${Math.abs(st.windX).toFixed(1)}  ${st.club}`, 654, 65, 6, COL.cyan, false);
  if (st.ventureDebt?.active) {
    const debtText = `🏦 Debt $${st.ventureDebt.principal} @ ${(st.ventureDebt.rate * 100).toFixed(0)}% • Due Q${st.ventureDebt.dueQuarter}`;
    txt(debtText, W / 2, 80, 5, COL.ora, false);
  }

  rect(12, 84, 132, 94, 'rgba(8,12,18,0.78)', 8, COL.cyan, 1);
  txt('CONTROLS', 78, 96, 6, COL.cyan, false);
  txt('CLICK / TAP', 78, 116, 5, COL.yel, false);
  txt('1 DRIVER', 78, 136, 5, st.club === 'Driver' ? COL.gold : '#b8c2cc', false);
  txt('2 IRON', 78, 152, 5, st.club === 'Iron' ? COL.gold : '#b8c2cc', false);
  txt('3 PUTTER', 78, 168, 5, st.club === 'Putter' ? COL.gold : '#b8c2cc', false);

  drawButton(12, 186, 132, 28, '⏸️ PAUSE (ESC)', false, '#666');

  // CS-6: crisis debuff strip — shown only when at least one faction is in Blood Feud
  drawCrisisDebuffHUD();
}

// CS-6: drawCrisisDebuffHUD — compact debuff indicator below the runway strip.
// Shown only when computeCrisisDebuff() returns non-zero values.
// Pulses at ~1 Hz to draw attention without being overwhelming.
function drawCrisisDebuffHUD() {
  const debuff = computeCrisisDebuff();
  const hasDebuff = debuff.meterSpeedPenalty > 0 || debuff.powerMultiplier < 1.0
                 || debuff.anglePenalty > 0 || debuff.burnPenalty > 0;
  if (!hasDebuff) return;

  // CS-10 PERF: removed an unused per-frame Object.entries().filter().map()
  // allocation here — the "collapsed" list it produced was never rendered.

  // Build compact debuff tokens
  const tokens = [];
  if (debuff.meterSpeedPenalty > 0)  tokens.push(`⚡+${debuff.meterSpeedPenalty}spd`);
  if (debuff.powerMultiplier < 1.0)  tokens.push(`💥${((1 - debuff.powerMultiplier) * 100).toFixed(0)}%pwr`);
  if (debuff.anglePenalty > 0)       tokens.push(`🎯±${debuff.anglePenalty}°`);
  if (debuff.burnPenalty > 0)        tokens.push(`💸+$${debuff.burnPenalty}`);

  const pulse = 0.7 + 0.3 * Math.sin(st.time * 6.2);
  const stripY = 76; // just below the runway strip
  const stripH = 16;

  X.save();
  X.globalAlpha = pulse;
  rect(0, stripY, W, stripH, 'rgba(100,0,0,0.55)');
  txt(`⚔ BLOOD FEUD ACTIVE: ${tokens.join('  ')}`, W / 2, stripY + stripH / 2, 5, '#ff9999', false);
  X.globalAlpha = 1;
  X.restore();
}

function drawMeters() {
  if (st.swingPhase === 'ready' && !st.ballFlying) {
    const pulse = Math.sin(st.time * 6) * 0.1 + 1.0;
    X.save();
    X.translate(W / 2, H / 2 + 100);
    X.scale(pulse, pulse);
    txt('CLICK TO START SWING', 0, 0, 10, COL.gold, true);
    X.restore();
  }
  if (st.swingPhase === 'power') {
    const mx = 46, my = 112, mw = 34, mh = 210;
    panel(mx - 12, my - 12, mw + 24, mh + 54, '⚡ POWER');
    rect(mx, my + 26, mw, mh - 26, '#111');
    const g = X.createLinearGradient(0, my + 26, 0, my + mh);
    g.addColorStop(0, '#ff1744'); g.addColorStop(0.25, '#ff9800'); g.addColorStop(0.55, COL.yel); g.addColorStop(0.8, COL.grn); g.addColorStop(1, COL.cyan);
    X.fillStyle = g;
    const fill = (mh - 26) * (st.power / 100);
    X.fillRect(mx + 3, my + mh - fill, mw - 6, fill);
    const iy = my + mh - fill;
    X.fillStyle = '#fff';
    X.beginPath(); X.moveTo(mx + mw, iy); X.lineTo(mx + mw + 12, iy - 6); X.lineTo(mx + mw + 12, iy + 6); X.closePath(); X.fill();
    txt(`${Math.round(st.power)}%`, mx + mw / 2, my + mh + 22, 7, COL.yel, true);
  }
  if (st.swingPhase === 'accuracy') {
    const mx = W / 2 - 112, my = 420, mw = 224, mh = 28;
    panel(mx - 10, my - 10, mw + 20, mh + 48, '🎯 ACCURACY');
    rect(mx, my + 24, mw, mh - 2, '#111');
    const sweetPct = st.powerups.find(p => p.id === 'accuracy' && p.owned) ? 0.3 : 0.2;
    const sweetW = mw * sweetPct;
    rect(mx + mw / 2 - sweetW / 2, my + 24, sweetW, mh - 2, 'rgba(74,222,128,0.28)', 3);
    for (let i = 0; i <= 10; i++) rect(mx + i * (mw / 10), my + 24, 1, mh - 2, 'rgba(255,255,255,0.08)');
    const ix = mx + mw * (st.acc / 100);
    rect(ix - 3, my + 18, 6, mh + 8, COL.yel, 2);
    txt(`${Math.round(st.acc)}%`, mx + mw / 2, my + mh + 32, 7, COL.cyan, true);
  }
}

function drawTeamMiniHud() {
  if (!st.runActive || st.roster.length === 0) return;
  const active = st.roster[0];
  const t = st.teamStats[active];
  if (!t) return;
  rect(560, 458, 176, 44, 'rgba(0,0,0,0.65)', 6, COL.teal, 1);
  txt(ARCHETYPE_STATS[active].name.split(' ')[0], 650, 472, 6, COL.grn, false);
  txt(ARCHETYPE_STATS[active].role, 650, 486, 5, COL.dim, false);
  rect(570, 492, 70, 6, '#333', 3);
  rect(570, 492, 70 * (t.stamina / 100), 6, t.stamina > 50 ? COL.grn : t.stamina > 20 ? COL.ora : COL.red, 3);
  rect(650, 492, 70, 6, '#333', 3);
  rect(650, 492, 70 * (t.morale / 100), 6, t.morale > 50 ? COL.cyan : t.morale > 20 ? COL.ora : COL.red, 3);
}

function drawMiniWindow(win, title, mini) {
  const skin = getMiniWindowSkin(mini);
  const scale = 1 + Math.sin(st.time * 8) * 0.002;
  X.save();
  X.translate(win.x + win.w / 2, win.y + win.h / 2);
  X.scale(scale, scale);
  X.translate(-(win.x + win.w / 2), -(win.y + win.h / 2));
  rect(win.x + 6, win.y + 6, win.w, win.h, 'rgba(0,0,0,0.45)', 10);
  rect(win.x - 6, win.y - 6, win.w + 12, win.h + 26, skin.shell, 10, skin.border, 2);
  rect(win.x, win.y, win.w, win.h, skin.fill, 6);
  mini.render(X, win.x, win.y, win.w, win.h);
  X.save();
  X.globalAlpha = 0.08;
  for (let sy = win.y; sy < win.y + win.h; sy += 2) rect(win.x, sy, win.w, 1, '#000');
  X.restore();
  const rg = X.createRadialGradient(win.x + win.w / 2, win.y + win.h / 2, win.w * 0.2, win.x + win.w / 2, win.y + win.h / 2, win.w * 0.75);
  rg.addColorStop(0, skin.glow);
  rg.addColorStop(1, skin.vignette);
  X.fillStyle = rg;
  X.fillRect(win.x, win.y, win.w, win.h);
  rect(win.x - 2, win.y + win.h + 2, win.w + 4, 18, skin.footer, 4);
  txt(title, win.x + win.w / 2, win.y + win.h + 12, 7, skin.label, false);
  X.restore();
}

function drawPlaying(dim = false) {
  drawBackground(st.camX, st.camY);
  drawOpponent();
  drawGolfer();
  drawBall();
  drawHoleFlag();
  if (dim) rect(0, 0, W, H, 'rgba(0,0,0,0.32)');
  drawHUD();
  drawMeters();
  drawTeamMiniHud();

  rect(W - 182, 84, 170, 138, 'rgba(4,10,16,0.72)', 8, COL.pur, 1);
  txt(`Q${st.quarter}`, W - 152, 98, 7, COL.gold, false, 'left');
  txt(`REP ${Math.round(st.reputation)}`, W - 96, 98, 5, COL.cyan, false, 'left');
  txt(`HYPE ${Math.round(st.hype)}`, W - 96, 114, 5, COL.pink, false, 'left');
  txt(`COMP ${Math.round(st.compliance)}`, W - 96, 130, 5, COL.grn, false, 'left');
  txt(`AUDIT ${Math.round(st.auditRisk)}`, W - 96, 146, 5, st.auditRisk < 35 ? COL.grn : st.auditRisk < 65 ? COL.ora : COL.red, false, 'left');
  rect(W - 172, 160, 138, 8, '#222', 4);
  rect(W - 172, 160, 138 * (st.quarterProgress / st.quarterGoal), 8, COL.gold, 4);
  txt(`Quarter ${st.quarterProgress}/${st.quarterGoal}`, W - 103, 178, 5, '#cbd5e1', false);
  const initiative = st.activeInitiatives[0];
  txt(initiative ? initiative.title.slice(0, 20) : 'No live initiative', W - 103, 198, 4, initiative ? COL.yel : '#7c8793', false);
  txt(initiative ? `${initiative.duration} holes left` : 'Pick one from strategy', W - 103, 212, 4, '#8ea2b8', false);

  const world = getWorld();
  for (let i = 0; i < Math.min(6, st.sponsors.length); i++) {
    const sp = st.sponsors[i];
    const ox = 86 + i * 84;
    const bounce = Math.sin(st.time * 3 + i * 0.6) * 3;
    X.fillStyle = getRarityColor(sp.rarity);
    X.beginPath(); X.arc(ox, 160 + bounce, 10, 0, Math.PI * 2); X.fill();
    txt(sp.icon, ox, 160 + bounce, 12, '#111', false);
  }
  for (let i = 0; i < Math.min(3, st.competitors.length); i++) {
    const cp = st.competitors[i];
    const ox = 665;
    const oy = 210 + i * 38;
    rect(ox - 28, oy + 12, 56, 6, '#333', 3);
    rect(ox - 28, oy + 12, 56 * (cp.threat / 100), 6, cp.threat > 60 ? COL.red : cp.threat > 30 ? COL.ora : COL.grn, 3);
    txt(cp.icon, ox, oy, 12, COL.white, false);
  }

  if (st.boardOpen) {
    rect(0, 0, W, H, 'rgba(0,0,0,0.72)');
    panel(W / 2 - 200, H / 2 - 90, 400, 180, '🏛️ BOARD MEETING');
    
    // Attempt to extract speaker name from st.boardMessage or st.boardroom_v2 logic
    let speaker = 'Board Member';
    if (st.boardMessage.includes(':')) {
      speaker = st.boardMessage.split(':')[0].trim();
    }
    
    const speakerPort = getPortrait(speaker);
    if (speakerPort.complete && speakerPort.naturalWidth) {
      rect(W / 2 - 190, H / 2 - 55, 60, 60, 'rgba(0,0,0,0.5)', 4, COL.gold, 1);
      X.drawImage(speakerPort, W / 2 - 185, H / 2 - 50, 50, 50);
    }

    wrapLines(st.boardMessage, speakerPort.complete ? 28 : 34).forEach((line, idx) => {
      const tx = speakerPort.complete ? W / 2 + 30 : W / 2;
      txt(line, tx, H / 2 - 30 + idx * 18, 7, COL.yel, false);
    });

    const impactText = st.boardImpact === 'burn' ? 'Burn rate +$120' : 'Equity -2%';
    txt(impactText, W / 2, H / 2 + 36, 7, st.boardImpact === 'burn' ? COL.ora : COL.red, false);
    drawButton(W / 2 - 60, H / 2 + 58, 120, 30, 'ACKNOWLEDGE', true, COL.red, true);
  }
}

function getArchitectDeskCardRect() {
  // USER-PLAYTEST-FIX — slightly smaller and pushed right so it never brushes the menu grid
  return { x: W - 172, y: 190, w: 156, h: 146 };
}

function drawMenu() {
  drawBackground();
  rect(0, 0, W, H, 'rgba(0,0,0,0.62)');
  const latestFootnote = getRelevantArchitectFootnote();
  const latestUnreadFootnote = getLatestUnreadArchitectFootnote();
  const hasUnreadFootnotes = hasUnreadArchitectFootnotes();
  const unreadCount = getUnreadArchitectFootnoteIds().length;
  const menuItems = getMenuItems();

  // Animated title glow
  const glowAlpha = 0.12 + Math.sin(st.time * 2) * 0.06;
  const glowRadius = 120 + Math.sin(st.time * 1.5) * 20;
  const glow = X.createRadialGradient(W / 2, 88, 10, W / 2, 88, glowRadius);
  glow.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
  glow.addColorStop(0.5, `rgba(255,150,0,${glowAlpha * 0.4})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  X.fillStyle = glow;
  X.fillRect(W / 2 - glowRadius, 88 - glowRadius, glowRadius * 2, glowRadius * 2);

  const pulse = 1 + Math.sin(st.time * 3.2) * 0.04;
  X.save();
  X.translate(W / 2, 88);
  X.scale(pulse, pulse);
  txt('SKYDISORDER', 0, 0, 28, COL.yel, true);
  X.restore();
  txt('THE OZARK AMBITION CORRIDOR™ • FORCED REINVENTION v5.2', W / 2, 126, 6, COL.cyan, true); // HUMOR-SHARPEN — official satirical region name
  txt(DIALOGUE.titleAttract[0], W / 2, 144, 5, '#cbd5e1', false);
  txt(DIALOGUE.titleAttract[1], W / 2, 158, 4.25, '#9fb0c1', false);

  const marquee = DIALOGUE.marquee[Math.floor(st.time / 4) % DIALOGUE.marquee.length];
  rect(120, 162, W - 240, 22, 'rgba(0,0,0,0.55)', 5, 'rgba(255,255,255,0.08)', 1);
  txt(marquee, W / 2, 173, 5, COL.gold, false);

  rect(12, 192, 114, 110, 'rgba(5,10,18,0.72)', 8, COL.pur, 1);
  txt('EXEC', 69, 206, 6, COL.cyan, false);
  txt(`Q${st.quarter}`, 69, 228, 7, COL.gold, false);
  txt(`REP ${Math.round(st.reputation)}`, 69, 248, 5, COL.cyan, false);
  txt(`HYPE ${Math.round(st.hype)}`, 69, 264, 5, COL.pink, false);
  txt(`AUDIT ${Math.round(st.auditRisk)}`, 69, 280, 5, st.auditRisk < 35 ? COL.grn : st.auditRisk < 65 ? COL.ora : COL.red, false);

  // USER-PLAYTEST-FIX — panel narrowed and shifted left so the right button
  // column no longer collides with the Architect Desk card. 12 items = clean 2×6.
  const menuPanelX = 146;
  const menuPanelY = 194;
  const menuPanelW = 404;
  const menuPanelH = 16 + Math.ceil(menuItems.length / 2) * 40 + 8;
  const menuButtonW = 178;
  const menuButtonH = 30;
  const menuRowStep = 40;
  rect(menuPanelX, menuPanelY, menuPanelW, menuPanelH, 'rgba(4,10,8,0.58)', 10, 'rgba(255,255,255,0.08)', 1);

  for (let i = 0; i < menuItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = menuPanelX + 18 + col * 194;
    const y = menuPanelY + 16 + row * menuRowStep;
    const active = st.menuIndex === i;
    drawButton(x, y, menuButtonW, menuButtonH, menuItems[i].label, active, menuItems[i].color, active);
    if (active) {
      txt('▶', x - 14, y + menuButtonH / 2, 8, menuItems[i].color, true);
      txt('◀', x + menuButtonW + 14, y + menuButtonH / 2, 8, menuItems[i].color, true);
    }
  }

  const desk = getArchitectDeskCardRect();
  const deskHovered = st.mouseX >= desk.x && st.mouseX <= desk.x + desk.w && st.mouseY >= desk.y && st.mouseY <= desk.y + desk.h;
  const deskStatusLine = latestUnreadFootnote
    ? `${unreadCount} NEW FILE${unreadCount === 1 ? '' : 'S'}`
    : latestFootnote ? 'LATEST FILED' : 'ARCHIVE CALM';
  const deskPreviewLines = latestFootnote
    ? wrapLines(latestFootnote.text.replace(/^\d+\.\s*/, ''), 20).slice(0, 1)
    : ['No marginalia yet.'];
  rect(desk.x, desk.y, desk.w, desk.h, deskHovered ? 'rgba(28,18,10,0.9)' : 'rgba(20,12,8,0.8)', 8, hasUnreadFootnotes ? COL.gold : '#6f5631', hasUnreadFootnotes ? 2 : 1);
  if (deskHovered) {
    rect(desk.x + 4, desk.y + 4, desk.w - 8, desk.h - 8, 'rgba(255,255,255,0.02)', 6, 'rgba(255,215,0,0.14)', 1);
  }
  rect(desk.x + 10, desk.y + 10, desk.w - 20, 22, hasUnreadFootnotes ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)', 5, hasUnreadFootnotes ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)', 1);
  txt('ARCHITECT DESK', desk.x + desk.w / 2, desk.y + 21, 4.5, hasUnreadFootnotes ? COL.gold : '#b9965a', false);
  txt(deskStatusLine, desk.x + desk.w / 2, desk.y + 50, 4.4, hasUnreadFootnotes ? COL.gold : '#8c9298', false);
  if (latestFootnote) {
    txt(`FILE #${latestFootnote.id.toString().padStart(2, '0')}`, desk.x + desk.w / 2, desk.y + 72, 5.4, COL.cyan, false);
    deskPreviewLines.forEach((line, idx) => {
      txt(line, desk.x + desk.w / 2, desk.y + 102 + idx * 16, 4.6, '#e6dfd2', false);
    });
  } else {
    deskPreviewLines.forEach((line, idx) => {
      txt(line, desk.x + desk.w / 2, desk.y + 98 + idx * 18, 4.6, COL.dim, false);
    });
  }
  rect(desk.x + 14, desk.y + desk.h - 27, desk.w - 28, 18, deskHovered ? 'rgba(255,215,0,0.16)' : 'rgba(255,255,255,0.05)', 5, deskHovered ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)', 1);
  txt(deskHovered ? 'CLICK TO OPEN LEDGER' : 'OPEN LEDGER', desk.x + desk.w / 2, desk.y + desk.h - 17, 3.6, deskHovered ? COL.gold : hasUnreadFootnotes ? COL.cyan : '#9aa4af', false);

  txt(`${Object.keys(st.milestones).length} milestones • ${menuItems.length} menu routes live`, W / 2, 516, 5, COL.gold, false);
  txt(`Unlocked worlds: ${st.worldsUnlocked.length}/${WORLDS.length} • Wealth: $${Math.floor(st.wealth).toLocaleString()}`, W / 2, 534, 5, COL.cyan, false);
  txt((st.storyLog[0] || 'No fresh scandal yet.').slice(0, 70), W / 2, 550, 4, '#86909b', false);
}

// USER-PLAYTEST-FIX — Training Camp merged into the Arcade (they were the same
// idea twice); the menu is now an exact 2×6 grid with no orphan row.
function getMenuItems() {
  const items = [];
  items.push(st.continueAvailable ? { label: '▶ CONTINUE RUN', action: 'continue', color: COL.gold } : { label: '▶ NEW RUN', action: 'new', color: COL.grn });
  items.push({ label: '🗺️ WORLD MAP', action: 'worldmap', color: COL.cyan });
  items.push({ label: '🎪 JOB FAIR', action: 'jobfair', color: COL.gold });
  items.push({ label: '🔄 BENCH', action: 'bench', color: COL.teal });
  items.push({ label: '🎮 ARCADE & CAMP', action: 'arcade', color: COL.cyan });
  items.push({ label: '📺 WATCH MODE', action: 'watch', color: COL.pink });
  items.push({ label: '📦 REPO', action: 'repo', color: COL.grn });
  items.push({ label: '🛒 MARKET', action: 'shop', color: COL.yel });
  items.push({ label: '🏆 LEADERBOARD', action: 'leaderboard', color: COL.gold });
  items.push({ label: '⚙️ SETTINGS', action: 'settings', color: COL.cyan });
  const unreadCount = getUnreadArchitectFootnoteIds().length;
  items.push({ label: unreadCount > 0 ? `🖋️ FOOTNOTES • ${unreadCount}` : '🖋️ FOOTNOTES', action: 'footnotes', color: unreadCount > 0 ? COL.gold : COL.gold });
  items.push({ label: '📜 CREDITS', action: 'credits', color: '#aaa' });
  return items;
}

function drawWorldMap() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(28, 18, W - 56, H - 36, '🗺️ WORLD MAP');
  txt('Clear each world and raise funding to unlock the next one.', W / 2, 54, 6, '#a8b4c0', false);
  txt('Hotkeys: 1-3 strategy cards, 4-8 world shortcuts.', W / 2, 68, 5, COL.gold, false);
  rect(32, 438, 436, 76, 'rgba(6,12,18,0.76)', 8, COL.pur, 1);
  txt('BOARDROOM STRATEGY', 250, 452, 6, COL.gold, false);
  // USER-PLAYTEST-FIX — strategy offers were only generated when a run started,
  // so this section rendered empty from the menu. Lazily populate it.
  if (!st.strategyOffers.length) refreshStrategyOffers();
  for (let i = 0; i < st.strategyOffers.length; i++) {
    const card = st.strategyOffers[i];
    const x = 42 + i * 142;
    const y = 464;
    rect(x, y, 132, 42, 'rgba(0,0,0,0.4)', 6, COL.cyan, 1);
    txt(`${i + 1}. ${card.icon} ${card.title}`.slice(0, 20), x + 66, y + 12, 4, COL.yel, false);
    txt(card.desc.slice(0, 28), x + 66, y + 28, 3, '#9fb0c0', false);
  }
  rect(484, 438, 234, 76, 'rgba(6,12,18,0.76)', 8, COL.teal, 1);
  txt('RECENT SATIRE', 601, 452, 6, COL.cyan, false);
  txt((st.storyLog[0] || 'The memo is pending.').slice(0, 44), 601, 474, 4, '#dbe4ef', false);
  txt((st.storyLog[1] || 'No additional embarrassment yet.').slice(0, 44), 601, 492, 4, '#9fb0c0', false);
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i];
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 40 + col * 172;
    const y = 84 + row * 175;
    const unlocked = canEnterWorld(w.id) || st.worldsUnlocked.includes(w.id);
    const current = st.currentWorld === w.id && st.runActive;
    rect(x, y, 156, 155, unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)', 8, current ? COL.gold : unlocked ? COL.grn : '#333', current ? 2 : 1);
    const g = X.createLinearGradient(x, y + 24, x, y + 72);
    g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
    X.fillStyle = g; X.fillRect(x + 4, y + 24, 148, 48);
    txt(`W${w.id}`, x + 78, y + 14, 8, current ? COL.gold : COL.cyan, false);
    const req = WORLD_REQUIREMENTS[w.id] || WORLD_REQUIREMENTS[1];
    txt(w.name, x + 78, y + 88, 6, unlocked ? COL.yel : '#666', false);
    txt(`${w.tag} • ${w.holes} holes`, x + 78, y + 108, 5, '#9aa4af', false);
    txt(`Requires ${FUNDING_ROUNDS[w.fundingReq]}`, x + 78, y + 124, 5, unlocked ? COL.grn : COL.red, false);
    txt(`REP ${req.rep} • HYPE ${req.hype}`, x + 78, y + 140, 4, meetsWorldRequirement(w.id) ? COL.cyan : COL.ora, false);
    txt(`COMP ${req.compliance} • Q${req.quarter}`, x + 78, y + 152, 4, meetsWorldRequirement(w.id) ? COL.grn : COL.red, false);
    if (!unlocked) txt('🔒', x + 78, y + 54, 18, COL.white, false);
  }
  drawButton(W / 2 - 70, H - 44, 140, 28, '← BACK', true, '#888');
}

function currentWorldProgressFor(id) {
  return st.worldProgress[id] || 0;
}

function drawJobFair() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(30, 20, W - 60, H - 40, '🎪 JOB FAIR');
  txt(`Cash $${Math.floor(st.money).toLocaleString()}`, W - 46, 52, 6, COL.grn, false, 'right'); // USER-PLAYTEST-FIX — right-aligned
  txt('Hire the Ozark Ambition Corridor\'s finest archetypes.', 46, 54, 5.5, '#a8b4c0', false, 'left'); // canon-safe region name
  if (st.jobOffers.length === 0) refreshJobOffers();
  const { maxScroll } = clampJobFairScroll();
  const scroll = st.jobFairScroll || 0;

  X.save();
  X.beginPath();
  X.rect(34, 66, W - 68, 438);
  X.clip();
  for (let i = 0; i < st.jobOffers.length; i++) {
    const offer = st.jobOffers[i];
    const card = ARCHETYPE_STATS[offer.id];
    const x = 42 + (i % 3) * 225;
    const y = 88 + Math.floor(i / 3) * 180 - scroll; // USER-PLAYTEST-FIX — scrollable rows
    if (y + 150 < 66 || y > 504) continue;
    rect(x, y, 205, 150, 'rgba(0,0,0,0.52)', 8, card.accent, 2);
    rect(x + 12, y + 14, 48, 48, card.color, 8, card.accent, 2);
    txt(card.name.split(' ')[0], x + 36, y + 38, 7, '#111', false);
    txt(card.name, x + 112, y + 20, 6, COL.yel, false);
    txt(`${card.role} • Base ${card.base}`, x + 112, y + 38, 5, COL.cyan, false);
    // USER-PLAYTEST-FIX — stable cached line (was re-rolled every frame = "glitching")
    wrapLines(offer.line || ARCHETYPE_STATS[offer.id].quote, 26).slice(0, 2).forEach((line, idx) => txt(line, x + 102, y + 66 + idx * 13, 4.4, '#b9c6d2', false));
    txt(`Hire $${offer.cost}`, x + 72, y + 116, 7, COL.gold, false);
    if (offer.signingBonus > 0) txt(`+$${offer.signingBonus} bonus`, x + 72, y + 132, 5, COL.grn, false);
    drawButton(x + 118, y + 105, 70, 30, 'HIRE', st.money >= offer.cost, st.money >= offer.cost ? COL.grn : '#666');
  }
  X.restore();

  if (maxScroll > 0) {
    const trackY = 74, trackH = 424;
    const thumbH = Math.max(30, trackH * (424 / (424 + maxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (scroll / maxScroll);
    rect(W - 40, trackY, 6, trackH, 'rgba(255,255,255,0.08)', 3);
    rect(W - 40, thumbY, 6, thumbH, 'rgba(255,215,0,0.75)', 3);
    txt('Mouse wheel / ↑↓ to scroll', W / 2, 512, 4.5, '#8ea2b8', false);
  }

  drawButton(44, H - 46, 160, 28, 'REFRESH $500', st.money >= 500, COL.ora);
  drawButton(W / 2 - 70, H - 46, 140, 28, '← BACK', true, '#888');
}

function drawBench() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(26, 18, W - 52, H - 36, '🔄 TEAM BENCH');
  txt('Roster takes the heat. Bench recovers stamina each cleared hole.', W / 2, 52, 6, '#a8b4c0', false);

  txt('ACTIVE ROSTER', 132, 82, 7, COL.grn, false);
  for (let i = 0; i < 4; i++) {
    const id = st.roster[i];
    const x = 40 + i * 176;
    const y = 98;
    rect(x, y, 162, 142, id ? 'rgba(74,222,128,0.08)' : 'rgba(0,0,0,0.4)', 8, id ? COL.grn : '#333', 1);
    if (!id) {
      txt('EMPTY SLOT', x + 81, y + 70, 7, '#555', false);
      continue;
    }
    const card = ARCHETYPE_STATS[id];
    const t = st.teamStats[id] || { stamina: 50, morale: 50 };
    rect(x + 14, y + 16, 46, 46, card.color, 7, card.accent, 2);
    txt(card.name.split(' ')[0], x + 37, y + 39, 6, '#111', false);
    txt(card.name, x + 106, y + 20, 6, COL.yel, false);
    txt(card.role, x + 106, y + 37, 5, COL.cyan, false);
    txt(`STA ${Math.round(t.stamina)}%`, x + 106, y + 58, 5, t.stamina > 50 ? COL.grn : t.stamina > 20 ? COL.ora : COL.red, false);
    txt(`MOR ${Math.round(t.morale)}%`, x + 106, y + 74, 5, t.morale > 50 ? COL.cyan : t.morale > 20 ? COL.ora : COL.red, false);
    rect(x + 76, y + 86, 68, 6, '#333', 3);
    rect(x + 76, y + 86, 68 * t.stamina / 100, 6, t.stamina > 50 ? COL.grn : t.stamina > 20 ? COL.ora : COL.red, 3);
    rect(x + 76, y + 102, 68, 6, '#333', 3);
    rect(x + 76, y + 102, 68 * t.morale / 100, 6, t.morale > 50 ? COL.cyan : t.morale > 20 ? COL.ora : COL.red, 3);
    drawButton(x + 28, y + 116, 106, 20, 'TO BENCH', st.bench.length < 6, COL.ora);
  }

  txt('BENCH', 74, 272, 7, COL.ora, false, 'left');
  for (let i = 0; i < 6; i++) {
    const id = st.bench[i];
    const x = 40 + (i % 3) * 224;
    const y = 288 + Math.floor(i / 3) * 108;
    rect(x, y, 204, 90, id ? 'rgba(255,152,0,0.08)' : 'rgba(0,0,0,0.35)', 8, id ? COL.ora : '#333', 1);
    if (!id) {
      txt('EMPTY BENCH SLOT', x + 102, y + 44, 6, '#444', false);
      continue;
    }
    const card = ARCHETYPE_STATS[id];
    const t = st.teamStats[id] || { stamina: 50, morale: 50 };
    txt(card.name, x + 102, y + 18, 6, COL.yel, false);
    txt(`${card.role} • Base ${card.base}`, x + 102, y + 34, 5, COL.cyan, false);
    txt(`STA ${Math.round(t.stamina)}% • MOR ${Math.round(t.morale)}%`, x + 102, y + 50, 5, '#a8b4c0', false);
    wrapLines(getBenchVoiceLine(id, t), 28).slice(0, 2).forEach((line, idx) => txt(line, x + 102, y + 64 + idx * 10, 3, '#9fb1c1', false));
    drawButton(x + 18, y + 62, 80, 20, 'ACTIVATE', st.roster.length < 4, COL.grn);
    drawButton(x + 108, y + 62, 80, 20, 'FIRE', true, COL.red);
  }
  drawButton(W / 2 - 70, H - 42, 140, 28, '← BACK', true, '#888');
}

function drawTraining() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(28, 18, W - 56, H - 36, '🏋️ TRAINING CAMP');
  if (!st.trainingMini) {
    txt('Pick a drill to sharpen your chaos golf fundamentals.', W / 2, 52, 6, '#a8b4c0', false);
    for (let i = 0; i < TRAINING_DRILLS.length; i++) {
      const d = TRAINING_DRILLS[i];
      const x = 80;
      const y = 84 + i * 72;
      const best = st.trainingBest[d.id] || 0;
      rect(x, y, W - 160, 64, 'rgba(0,0,0,0.45)', 8, COL.cyan, 1);
      txt(d.name, W / 2, y + 16, 7, COL.yel, false);
      txt(d.desc, W / 2, y + 32, 5, '#a8b4c0', false);
      txt(`Best ${best}`, W / 2, y + 48, 5, COL.gold, false);
    }
  } else {
    txt(st.trainingDrill.name, W / 2, 52, 9, COL.yel, true);
    txt(`Time ${Math.ceil(st.trainingTimer)}s • Score ${st.trainingScore}`, W / 2, 74, 6, COL.cyan, false);
    drawMiniWindow(MINI_WINDOW_STANDARD, miniDisplayLabel(st.trainingMini, 'TRAINING'), st.trainingMini); // GP-8-EXT / FINAL: ★ cue on reskins
    drawButton(W / 2 - 56, H - 44, 112, 28, 'QUIT DRILL', true, COL.red);
  }
  if (!st.trainingMini) drawButton(W / 2 - 70, H - 42, 140, 28, '← ARCADE', true, '#888'); // USER-PLAYTEST-FIX — camp nests under the arcade
}

// USER-PLAYTEST-FIX — the 9 base games PLUS the three GP-8 reskins are now
// playable from the arcade cabinet (12 games, clean 3×4 grid).
const ARCADE_GAME_IDS = ['pong','breakout','catch','flappy','memory','rps','tetris','ttt','twentyforty','tax_shelter_tetris','stealth_mode','pivot_roulette'];

function drawArcade() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(28, 18, W - 56, H - 36, '🎮 MINIGAME ARCADE & TRAINING CAMP');
  if (st.arcadePhase === 'select') {
    txt('12 cabinets. Chase high scores or run drills in the camp.', W / 2, 52, 5.5, '#a8b4c0', false);
    const ids = ARCADE_GAME_IDS;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const x = 32 + (i % 3) * 230;
      const y = 82 + Math.floor(i / 3) * 86;
      const active = st.arcadeSelection === i;
      const hovered = st.mouseX > x && st.mouseX < x + 210 && st.mouseY > y && st.mouseY < y + 68;
      const highlight = active || hovered;
      const isVariant = GP8_VARIANT_IDS.has(id);
      rect(x, y, 210, 68, active ? 'rgba(255,235,59,0.15)' : hovered ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)', 6, highlight ? COL.yel : isVariant ? '#8a6e2a' : '#444', highlight ? 2 : 1);
      txt(`${isVariant ? '★ ' : ''}${MINIGAME_LABELS[id] || id}`, x + 105, y + 24, 5.5, isVariant ? COL.gold : COL.cyan, false);
      txt(`Best ${st.arcadeBest[id] || 0}`, x + 105, y + 48, 5, COL.gold, false);
    }
    // USER-PLAYTEST-FIX — buttons laid out side by side (they used to stack on
    // top of each other, making BACK unclickable).
    drawButton(44, H - 44, 170, 28, '🏋️ TRAINING CAMP', true, COL.ora);
    drawButton(W / 2 - 90, H - 44, 180, 28, 'PLAY SELECTED', true, COL.grn);
    drawButton(W - 184, H - 44, 140, 28, '← BACK', true, '#888');
  } else if (st.arcadePhase === 'play') {
    txt(`${MINIGAME_LABELS[st.arcadeGameId]}`, W / 2, 52, 9, COL.yel, true);
    txt(`Time ${Math.ceil(st.arcadeTimer)}s • Score ${st.arcadeScore}`, W / 2, 74, 6, COL.cyan, false);
    drawMiniWindow(MINI_WINDOW_STANDARD, miniDisplayLabel(st.arcadeMini, 'ARCADE'), st.arcadeMini); // GP-8-EXT / FINAL: ★ cue on reskins
    drawButton(W / 2 - 56, H - 44, 112, 28, 'END GAME', true, COL.red);
  } else {
    txt('RESULTS', W / 2, 72, 12, COL.gold, true);
    txt(`${MINIGAME_LABELS[st.arcadeGameId]}`, W / 2, 108, 8, COL.cyan, false);
    txt(`Final Score ${st.arcadeScore}`, W / 2, 148, 14, COL.grn, true);
    txt(`Best ${st.arcadeBest[st.arcadeGameId] || 0}`, W / 2, 184, 8, COL.gold, false);
    drawButton(W / 2 - 96, 240, 192, 32, 'PLAY AGAIN', true, COL.grn);
    drawButton(W / 2 - 70, H - 44, 140, 28, '← BACK', true, '#888');
  }
}

function drawWatch() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(28, 18, W - 56, H - 36, '📺 WATCH MODE');
  if (!st.watch) createWatchMatch();
  txt(`Cash $${Math.floor(st.money).toLocaleString()}`, W - 46, 50, 7, COL.grn, false, 'right'); // USER-PLAYTEST-FIX — right-aligned so it never clips

  rect(56, 82, 274, 150, 'rgba(0,0,0,0.45)', 8, COL.cyan, 2);
  rect(420, 82, 274, 150, 'rgba(0,0,0,0.45)', 8, COL.pink, 2);
  txt(st.watch.teamA.name, 193, 102, 8, COL.cyan, false);
  txt(st.watch.teamB.name, 557, 102, 8, COL.pink, false);
  st.watch.teamA.ids.forEach((id, i) => txt(ARCHETYPE_STATS[id].name, 193, 132 + i * 20, 5, '#dbeafe', false));
  st.watch.teamB.ids.forEach((id, i) => txt(ARCHETYPE_STATS[id].name, 557, 132 + i * 20, 5, '#fde7f3', false));
  txt(`${st.watch.teamA.score}`, 193, 214, 14, COL.cyan, true);
  txt(`${st.watch.teamB.score}`, 557, 214, 14, COL.pink, true);

  // USER-PLAYTEST-FIX — the watch field is self-contained: fixed tee, fixed flag,
  // ball arcs between them. Nothing renders below the turf anymore.
  rect(120, 256, 510, 180, 'rgba(0,0,0,0.45)', 8, COL.gold, 1);
  const world = getWorld();
  const g = X.createLinearGradient(120, 256, 120, 430);
  g.addColorStop(0, world.sky[0]); g.addColorStop(0.5, world.sky[1]); g.addColorStop(0.5, world.ground); g.addColorStop(1, '#12320f');
  X.fillStyle = g;
  X.fillRect(126, 262, 498, 168);
  // Tee marker
  rect(142, 404, 8, 4, '#e8e8e8', 2);
  // Hole + flag, aligned to the field's own ground line
  X.fillStyle = '#111';
  X.beginPath(); X.ellipse(572, 408, 9, 3.5, 0, 0, Math.PI * 2); X.fill();
  rect(571, 372, 3, 36, '#f1c40f');
  const watchFlap = Math.sin(st.time * 6) * 3;
  X.fillStyle = COL.flag;
  X.beginPath();
  X.moveTo(574, 372);
  X.quadraticCurveTo(596 + watchFlap, 380, 574, 388);
  X.closePath();
  X.fill();
  if (st.watch.phase === 'sim') {
    const bx = 146 + st.watch.ballX;
    const by = 406 - st.watch.ballZ;
    // Ball shadow stays on the turf
    X.fillStyle = 'rgba(0,0,0,0.3)';
    X.beginPath(); X.ellipse(bx, 407, 5, 2, 0, 0, Math.PI * 2); X.fill();
    X.fillStyle = '#fff';
    X.beginPath(); X.arc(bx, by, 6, 0, Math.PI * 2); X.fill();
  }
  txt(st.watch.commentary.slice(0, 88), W / 2, 452, 5.5, COL.gold, false);

  if (st.watch.phase === 'betting') {
    drawButton(170, 466, 110, 28, '$500 on A', st.money >= 500, COL.cyan);
    drawButton(320, 466, 110, 28, '$1000 on A', st.money >= 1000, COL.grn);
    drawButton(470, 466, 110, 28, '$500 on B', st.money >= 500, COL.pink);
  } else if (st.watch.phase === 'result') {
    drawButton(W / 2 - 90, 466, 180, 28, 'NEW MATCH', true, COL.grn);
  }
  drawButton(W / 2 - 70, H - 56, 140, 28, '← BACK', true, '#888'); // USER-PLAYTEST-FIX — raised inside the panel
}

function drawRepo() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(40, 24, W - 80, H - 48, '📦 REPOSITORY DISCOVERY');
  txt('Upload a folder, zip, or files to extract sponsors, rivals, and hires.', W / 2, 58, 5, '#a8b4c0', false);
  drawButton(W / 2 - 94, 94, 188, 34, 'BROWSE FOLDER', true, COL.gold, true);
  txt(`${st.uploadedRepos.length} payloads loaded`, W / 2, 146, 7, COL.cyan, false);

  panel(58, 174, W - 116, 284, 'DISCOVERIES');
  if (!st.uploadedRepos.length) {
    txt('No payloads loaded yet.', W / 2, 314, 8, '#667085', false);
    txt('Try uploading a project folder, zip, or code files.', W / 2, 340, 5, '#7d8793', false);
  } else {
    for (let i = 0; i < Math.min(4, st.uploadedRepos.length); i++) {
      const repo = st.uploadedRepos[st.uploadedRepos.length - 1 - i];
      const y = 206 + i * 58;
      rect(80, y, W - 160, 48, 'rgba(0,0,0,0.35)', 6, COL.cyan, 1);
      txt(repo.name, 180, y + 14, 7, COL.yel, false, 'left');
      txt(`${repo.files.length} files • ${repo.totalLines} estimated lines`, 180, y + 30, 5, '#a8b4c0', false, 'left');
      const langs = Object.keys(repo.langs).slice(0, 4).join(' • ');
      txt(langs, W - 100, y + 22, 5, COL.grn, false, 'right');
    }
  }
  drawButton(W / 2 - 70, H - 42, 140, 28, '← BACK', true, '#888');
}

function drawShop() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(30, 20, W - 60, H - 40, '🛒 MARKETPLACE');
  txt(`Cash $${Math.floor(st.money).toLocaleString()}`, W - 46, 52, 7, COL.grn, false, 'right'); // USER-PLAYTEST-FIX — right-aligned so big balances never clip
  drawButton(50, 46, 120, 28, 'POWERUPS', st.shopTab === 'powerups', COL.cyan);
  drawButton(184, 46, 120, 28, 'EQUIPMENT', st.shopTab === 'equipment', COL.cyan);
  txt('Powerups are one-use. Equipment stays owned and can be toggled.', W / 2, 84, 5, '#a8b4c0', false);

  const items = st.shopTab === 'powerups' ? st.powerups : st.equipment;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const x = 50 + (i % 2) * 330;
    const y = 98 + Math.floor(i / 2) * 100;
    const owned = !!it.owned;
    const hovered = st.mouseX > x && st.mouseX < x + 300 && st.mouseY > y && st.mouseY < y + 84;
    rect(x, y, 300, 84, hovered ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.46)', 8, owned ? COL.grn : hovered ? COL.white : COL.cyan, owned ? 2 : 1);
    txt(it.icon, x + 28, y + 30, 18, COL.yel, false);
    txt(it.name, x + 150, y + 20, 7, COL.yel, false);
    wrapLines(it.desc, 28).slice(0, 2).forEach((line, idx) => txt(line, x + 150, y + 42 + idx * 14, 4, '#a8b4c0', false));
    if (st.shopTab === 'equipment' && owned) {
      drawButton(x + 196, y + 54, 84, 22, it.equipped ? 'EQUIPPED' : 'TOGGLE', it.equipped, it.equipped ? COL.grn : COL.ora);
    } else {
      drawButton(x + 196, y + 54, 84, 22, owned ? 'OWNED' : `$${it.cost}`, owned, owned ? COL.grn : st.money >= it.cost ? COL.grn : '#666');
    }
  }

  drawButton(W / 2 - 70, H - 42, 140, 28, '← BACK', true, '#888');
}

function drawSettings() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(120, 52, W - 240, H - 104, '⚙️ SETTINGS');
  txt('Audio', W / 2, 112, 9, COL.yel, false);
  drawButton(W / 2 - 130, 128, 120, 30, `MUSIC ${st.settings.music ? 'ON' : 'OFF'}`, st.settings.music, st.settings.music ? COL.grn : COL.red);
  drawButton(W / 2 + 10, 128, 120, 30, `SFX ${st.settings.sfx ? 'ON' : 'OFF'}`, st.settings.sfx, st.settings.sfx ? COL.grn : COL.red);
  txt('Music: "The Quillhaven Court Minstrel" — procedurally hummed, no downloads.', W / 2, 172, 4.5, '#8ea2b8', false); // UI-POLISH
  // USER-PLAYTEST-FIX — the caddy section now explains what it actually does
  txt('Thy Caddy', W / 2, 200, 8, COL.cyan, false);
  txt('The voice that critiques every swing from the HUD ticker. Pick thy heckler.', W / 2, 216, 4.5, '#a8b4c0', false);
  for (let i = 0; i < CADDIES.length; i++) {
    const x = 144 + (i % 2) * 230;
    const y = 236 + Math.floor(i / 2) * 44;
    drawButton(x, y, 210, 28, `${CADDIES[i].icon} ${CADDIES[i].name}`, st.caddy.name === CADDIES[i].name, COL.gold);
  }
  const sampleTip = st.caddy?.tips?.[Math.floor(st.time / 5) % (st.caddy?.tips?.length || 1)] || '';
  wrapLines(`${st.caddy.icon} "${sampleTip}"`, 62).slice(0, 2).forEach((line, i) => txt(line, W / 2, 388 + i * 13, 4.5, '#c8b57a', false)); // UI-POLISH — live sample
  drawButton(W / 2 - 70, H - 72, 140, 28, '← BACK', true, '#888');
}

function drawLeaderboard() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.94)');
  panel(40, 22, W - 80, H - 44, '🏆 LEADERBOARD');
  if (!st.leaderboard.length) {
    txt('No scores yet. Go collapse a startup beautifully.', W / 2, H / 2, 7, '#748091', false);
  } else {
    rect(64, 72, W - 128, 26, 'rgba(58,24,64,0.65)', 4);
    txt('RANK', 102, 84, 5, COL.cyan, false);
    txt('ROUND', 218, 84, 5, COL.cyan, false);
    txt('SCORE', 338, 84, 5, COL.cyan, false);
    txt('CASH', 452, 84, 5, COL.cyan, false);
    txt('QTR', 560, 84, 5, COL.cyan, false);
    txt('REP/HYPE', 648, 84, 5, COL.cyan, false);
    for (let i = 0; i < Math.min(10, st.leaderboard.length); i++) {
      const e = st.leaderboard[i];
      const y = 108 + i * 34;
      rect(64, y, W - 128, 28, i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)', 4);
      txt(i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`, 102, y + 14, 7, COL.gold, false);
      txt(e.funding, 218, y + 14, 5, COL.yel, false);
      txt(`${e.score.toLocaleString()}`, 338, y + 14, 6, COL.grn, false);
      txt(`$${Math.floor(e.money).toLocaleString()}`, 452, y + 14, 5, COL.cyan, false);
      txt(`Q${e.quarter || 1}`, 560, y + 14, 5, COL.gold, false);
      txt(`${Math.round(e.reputation || 0)}/${Math.round(e.hype || 0)}`, 648, y + 14, 5, COL.pink, false);
    }
  }
  drawButton(W / 2 - 70, H - 44, 140, 28, '← BACK', true, '#888');
}

function drawPitch() {
  rect(0, 0, W, H, 'rgba(10,5,20,0.96)');
  panel(80, 60, W - 160, H - 120, '💡 INVESTOR PITCH GAUNTLET');
  const p = st.currentPitch;
  // Guard: no pitch loaded — return to playing safely
  if (!p) { onPitchResolved(null); return; }

  // Header
  const title = p.title || p.id.replace(/_/g, ' ');
  const proposer = p.proposer || (p.founderArchetype && ARCHETYPE_STATS[p.founderArchetype] ? ARCHETYPE_STATS[p.founderArchetype].name : 'A Founder');
  
  // Proposer Portrait
  const port = getPortrait(p.proposer || p.founderArchetype);
  if (port.complete && port.naturalWidth) {
    rect(90, 75, 60, 60, 'rgba(0,0,0,0.5)', 4, COL.gold, 1);
    X.drawImage(port, 95, 80, 50, 50);
  }

  txt(title.toUpperCase(), W / 2 + 30, 108, 13, COL.gold, true);
  txt(`Proposed by: ${proposer}`, W / 2 + 30, 130, 6, COL.cyan, false);

  // Pitch body — capped at 3 lines so it never overflows the box
  const pitchText = p.pitch || p.pitchLine || "";
  const pitchLines = wrapLines(pitchText, 42).slice(0, 3);
  rect(90, 148, W - 180, 76, 'rgba(0,0,0,0.4)', 8, COL.dim, 1);
  pitchLines.forEach((l, i) => txt(l, W / 2, 168 + i * 22, 8, COL.white, false));

  txt('CHOOSE THY RESPONSE:', W / 2, 242, 6, '#888', false);

  // Action buttons
  const bW = 168, bH = 40, gap = 18;
  const startX = (W - (bW * 3 + gap * 2)) / 2;
  
  // GP-3 uses 'branches' with 'invest', 'decline', 'counter' instead of 'outcomes' with 'roast'
  const branches = p.branches || p.outcomes;
  const roastKey = branches.counter ? 'counter' : 'roast';

  drawButton(startX,              258, bW, bH, '💰 INVEST',  true, COL.grn);
  drawButton(startX + bW + gap,   258, bW, bH, '🚫 DECLINE', true, COL.ora);
  drawButton(startX + (bW+gap)*2, 258, bW, bH, branches.counter ? '🔥 COUNTER' : '🔥 ROAST',   true, COL.red);

  // Outcome previews
  const previewY = 312;
  const bLabels = [branches.invest, branches.decline, branches[roastKey]];
  bLabels.forEach((o, i) => {
    if (!o) return;
    const lines = wrapLines(o.text, 22).slice(0, 2);
    lines.forEach((l, j) =>
      txt(l, startX + bW / 2 + i * (bW + gap), previewY + j * 16, 5, COL.dim, false)
    );
  });

  // Escape hint
  txt('ESC to defer until next qualifying hole', W / 2, H - 76, 5, '#555', false);
}

// CS-1: onPitchResolved — the single named exit point for the pitch overlay.
// decision: 'invest' | 'decline' | 'roast' | null (null = deferred / no pitch loaded)
// CS-5 (applyPitchOutcome) hooks into this function for standing changes.
function onPitchResolved(decision) {
  const p = st.currentPitch;

  if (p && decision) {
    if (decision === 'decline') st.consecutiveDeclines = (st.consecutiveDeclines || 0) + 1;
    else st.consecutiveDeclines = 0;

    const branches = p.branches || p.outcomes;
    const actualDecision = (decision === 'roast' && branches.counter) ? 'counter' : decision;
    const outcome = branches[actualDecision];
    
    if (outcome) {
      if (outcome.effect) outcome.effect(st); // legacy
      if (outcome.standingMap) { // GP-3 format
        for (const [faction, delta] of Object.entries(outcome.standingMap)) {
          adjustStanding(faction, delta);
        }
      }
      addPopup(outcome.text, W / 2, H / 2 - 50, COL.gold, 11, 3.5);
      const logTitle = p.title || p.id;
      logStory(`[Pitch] ${logTitle} → ${actualDecision.toUpperCase()}: ${outcome.text}`);
      playSuccess();
    }
  }

  // Clean up overlay state
  st.currentPitch = null;
  st.screen = 'playing';

  // Only reset the ball if it hasn't already been reset (guard against double-reset)
  if (st.swingPhase === 'ready' && !st.ballFlying) {
    // Ball was already reset by finishHole's early-return path; do nothing
  } else {
    resetBall();
  }

  checkPivotCrisis(); // pivot crisis check after standing changes
  saveRun();
}

// ============================================================
// CS-6 — LEDGER OVERLAY (drawn on top of playing screen)
// ============================================================

// Band display config: color by band name
const BAND_COLORS = {
  'Blood Feud': '#ff3333',
  'Frosty':     '#88aacc',
  'Neutral':    '#aaaaaa',
  'Warm':       '#ffe066',
  'Patron':     '#4ade80',
};

// CS-6: drawLedger — parchment panel showing all 11 faction standings.
// Rendered as an overlay on top of drawPlaying() when st.ledgerOverlayOpen is true.
// Dirty-flag: factions with a pending ledgerPopup get a pulsing bar outline.
function drawLedger() {
  // Panel geometry — centred, near-full height
  const PW = 560, PH = 440;
  const PX = (W - PW) / 2, PY = (H - PH) / 2;

  // Backdrop scrim
  X.save();
  X.fillStyle = 'rgba(5,10,8,0.88)';
  X.fillRect(0, 0, W, H);

  // Parchment panel background
  const panelGrad = X.createLinearGradient(PX, PY, PX, PY + PH);
  panelGrad.addColorStop(0,   '#1a1208');
  panelGrad.addColorStop(0.4, '#120e06');
  panelGrad.addColorStop(1,   '#0d0a04');
  roundRectPath(X, PX, PY, PW, PH, 10);
  X.fillStyle = panelGrad;
  X.fill();
  X.strokeStyle = '#c8a84b';
  X.lineWidth = 2;
  X.stroke();

  // Inner border (inset by 4px) — decorative double-line effect
  X.strokeStyle = 'rgba(200,168,75,0.25)';
  X.lineWidth = 1;
  roundRectPath(X, PX + 6, PY + 6, PW - 12, PH - 12, 7);
  X.stroke();

  // Header
  txt('THE LEDGER OF QUILLHAVEN', W / 2, PY + 22, 11, '#c8a84b', false);
  txt('A REGISTER OF POLITICAL STANDING', W / 2, PY + 40, 5, '#8a6e2a', false);

  // Separator rule
  X.strokeStyle = 'rgba(200,168,75,0.4)';
  X.lineWidth = 1;
  X.beginPath(); X.moveTo(PX + 20, PY + 52); X.lineTo(PX + PW - 20, PY + 52); X.stroke();

  // Pending dirty-flag set (factions that have unshown flavor popups = recently changed)
  const dirtyFactions = new Set(st.ledgerPopups.map(p => p.faction));

  // Row layout
  const ROW_H = 32;
  const ROW_X = PX + 16;
  const ROW_W = PW - 32;
  const ROWS_Y = PY + 60;
  const BAR_X = ROW_X + 168;
  const BAR_W = ROW_W - 168 - 72; // space for swatch+name left, value+band right
  const BAR_H = 10;
  const MIDPOINT = BAR_X + BAR_W / 2; // x-position of standing=0

  const factionKeys = Object.keys(FACTIONS);

  factionKeys.forEach((key, i) => {
    const f = FACTIONS[key];
    const val = st.ledger[key] ?? 0;
    const band = bandOf(val);
    const bandCol = BAND_COLORS[band] || COL.dim;
    const dirty = dirtyFactions.has(key);
    const ry = ROWS_Y + i * ROW_H;

    // Row background (alternate stripes)
    X.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.18)';
    X.fillRect(ROW_X, ry + 2, ROW_W, ROW_H - 4);

    // Faction color swatch
    X.fillStyle = f.color;
    roundRectPath(X, ROW_X + 2, ry + 9, 12, 14, 3);
    X.fill();

    // Short name — truncate if needed
    const shortName = f.short.length > 18 ? f.short.slice(0, 17) + '…' : f.short;
    txt(shortName, ROW_X + 22, ry + 16, 5.5, '#d4b87a', false, 'left');

    // Bar track
    rect(BAR_X, ry + 10, BAR_W, BAR_H, 'rgba(0,0,0,0.55)', 3);

    // Zero line (midpoint tick)
    X.strokeStyle = 'rgba(200,168,75,0.3)';
    X.lineWidth = 1;
    X.beginPath(); X.moveTo(MIDPOINT, ry + 8); X.lineTo(MIDPOINT, ry + 22); X.stroke();

    // Filled bar segment
    const clampedVal = clamp(val, -100, 100);
    const filled = (clampedVal / 100) * (BAR_W / 2);
    if (filled > 0) {
      // Positive: midpoint → right
      const barGrad = X.createLinearGradient(MIDPOINT, 0, MIDPOINT + filled, 0);
      barGrad.addColorStop(0, 'rgba(74,222,128,0.7)');
      barGrad.addColorStop(1, 'rgba(74,222,128,1)');
      roundRectPath(X, MIDPOINT, ry + 10, filled, BAR_H, 2);
      X.fillStyle = barGrad;
      X.fill();
    } else if (filled < 0) {
      // Negative: left of midpoint
      const neg = Math.abs(filled);
      const barGrad = X.createLinearGradient(MIDPOINT - neg, 0, MIDPOINT, 0);
      barGrad.addColorStop(0, clampedVal <= COLLAPSE_THRESHOLD ? 'rgba(255,30,30,1)' : 'rgba(255,80,80,0.7)');
      barGrad.addColorStop(1, clampedVal <= COLLAPSE_THRESHOLD ? 'rgba(255,80,80,0.9)' : 'rgba(255,120,120,0.5)');
      roundRectPath(X, MIDPOINT - neg, ry + 10, neg, BAR_H, 2);
      X.fillStyle = barGrad;
      X.fill();
    }

    // Dirty-flag: pulsing outline around bar track
    if (dirty) {
      const pulse = 0.55 + 0.45 * Math.sin(st.time * 8);
      X.strokeStyle = `rgba(255,220,80,${pulse})`;
      X.lineWidth = 1.5;
      roundRectPath(X, BAR_X, ry + 10, BAR_W, BAR_H, 3);
      X.stroke();
    }

    // Collapse threshold tick line
    const collapseX = MIDPOINT + (COLLAPSE_THRESHOLD / 100) * (BAR_W / 2);
    X.strokeStyle = 'rgba(255,50,50,0.5)';
    X.lineWidth = 1;
    X.beginPath(); X.moveTo(collapseX, ry + 7); X.lineTo(collapseX, ry + 23); X.stroke();

    // Numeric value
    const valStr = (val >= 0 ? '+' : '') + Math.round(val);
    txt(valStr, BAR_X + BAR_W + 6, ry + 16, 5.5, val < 0 ? '#ff8888' : '#aaffaa', false, 'left');

    // Band label
    txt(band, BAR_X + BAR_W + 54, ry + 16, 5, bandCol, false, 'left');
  });

  // Footer separator
  const footY = PY + PH - 42;
  X.strokeStyle = 'rgba(200,168,75,0.3)';
  X.lineWidth = 1;
  X.beginPath(); X.moveTo(PX + 20, footY); X.lineTo(PX + PW - 20, footY); X.stroke();

  // Legend row
  txt('◆ BLOOD FEUD ≤ -60', PX + 32, footY + 14, 4.5, '#ff5555', false, 'left');
  txt('◆ PATRON ≥ +60', PX + 200, footY + 14, 4.5, '#4ade80', false, 'left');

  // Close hint
  drawButton(PX + PW - 112, footY + 4, 100, 24, 'CLOSE  [L]', true, '#8a6e2a');
  txt('L or ESC to close', W / 2, PY + PH - 10, 4.5, '#5a4a1a', false);

  X.restore();
}

// CS-6: closeLedger — single exit point, mirrors the pattern of other overlays.
function closeLedger() {
  st.ledgerOverlayOpen = false;
  playClick();
}

// CS-6: clickLedger — handles clicks when the ledger overlay is open.
// Returns true if the click was consumed by the ledger.
function clickLedger(mx, my) {
  const PW = 560, PH = 440;
  const PX = (W - PW) / 2, PY = (H - PH) / 2;
  // Close button hit test
  const btnX = PX + PW - 112, btnY = PY + PH - 38;
  if (mx > btnX && mx < btnX + 100 && my > btnY && my < btnY + 24) {
    closeLedger();
    return true;
  }
  // Click anywhere outside the panel also closes
  if (mx < PX || mx > PX + PW || my < PY || my > PY + PH) {
    closeLedger();
    return true;
  }
  return true; // consume all clicks while open
}

function clickPitch(mx, my) {
  if (!st.currentPitch) { onPitchResolved(null); return; }

  const bW = 168, bH = 40, gap = 18;
  const startX = (W - (bW * 3 + gap * 2)) / 2;

  if (my > 258 && my < 258 + bH) {
    if      (mx > startX               && mx < startX + bW)               onPitchResolved('invest');
    else if (mx > startX + bW + gap    && mx < startX + bW * 2 + gap)     onPitchResolved('decline');
    else if (mx > startX + (bW+gap)*2  && mx < startX + bW * 3 + gap * 2) onPitchResolved('roast');
  }
}

function drawSpoonCeremony() {
  rect(0, 0, W, H, 'rgba(10,25,20,0.96)');
  panel(80, 56, W - 160, H - 112, '🥄 CEREMONIAL AWARD');
  const spoon = st.currentSpoon;
  if (!spoon) { onSpoonCeremonyResolved(); return; }
  const ceremony = getSpoonCeremonyCopy(spoon);
  const accent = getRarityColor(ceremony.rarity);

  txt('THE COMMITTEE FOR UNNECESSARY SYNERGY', W / 2, 92, 6, COL.gold, true);
  txt(ceremony.label, W / 2, 112, 5, accent, false);

  // Spoon Icon
  const spoonIcon = loadSprite('assets/icon_ceremonial_spoon.webp');
  if (spoonIcon.complete && spoonIcon.naturalWidth) {
    X.drawImage(spoonIcon, W / 2 - 26, 120, 52, 52);
  }

  // Spoon Name
  const nameLines = wrapLines(spoon.name.toUpperCase(), 34).slice(0, 2);
  nameLines.forEach((l, i) => txt(l, W / 2, 186 + i * 22, 10, COL.yel, true));

  const introLines = wrapLines(ceremony.intro, 56).slice(0, 3);
  const decreeLines = wrapLines(ceremony.decree, 56).slice(0, 4);
  const flavorLines = wrapLines(spoon.flavor, 56).slice(0, 3);
  const closingLines = wrapLines(ceremony.closing, 56).slice(0, 2);

  rect(104, 228, W - 208, 152, 'rgba(0,0,0,0.42)', 6, accent, 1);
  introLines.forEach((l, i) => txt(l, W / 2, 246 + i * 14, 5.5, '#d7e2ea', false));
  decreeLines.forEach((l, i) => txt(l, W / 2, 288 + i * 14, 5.5, COL.white, false));
  flavorLines.forEach((l, i) => txt(l, W / 2, 344 + i * 14, 5.5, '#b8d6c9', false));

  txt(`Awarded for: ${spoon.unlock}`, W / 2, 394, 5, '#88aacc', false);
  closingLines.forEach((l, i) => txt(l, W / 2, 412 + i * 13, 5, '#c6a86b', false));
  txt(ceremony.toast.toUpperCase(), W / 2, 446, 5, accent, false);

  drawButton(W / 2 - 90, H - 86, 180, 32, 'ACCEPT SPOON ▶', true, accent, true);
  txt('click or ENTER to continue', W / 2, H - 40, 5, '#555', false);
}

function clickSpoonCeremony(mx, my) {
  if (my > H - 120) {
    onSpoonCeremonyResolved();
  }
}

function onSpoonCeremonyResolved() {
  const spoon = st.currentSpoon;
  if (st.previewOverlay === 'spoon') {
    st.currentSpoon = null;
    st.previewOverlay = null;
    transitionTo('menu');
    playClick();
    return;
  }
  if (spoon) {
    if (!st.spoonState) st.spoonState = { awarded: [], count: 0 };
    st.spoonState.awarded.push(spoon.id);
    st.spoonState.count++;
    logStory(`[Ceremony] Awarded ${spoon.name}.`);
    playHit();
  }

  st.currentSpoon = null;
  st.screen = 'playing';

  // Only reset the ball if it hasn't already been reset
  if (st.swingPhase === 'ready' && !st.ballFlying) {
    // idle, ok
  } else {
    resetBall();
  }

  saveRun();
}

function drawReview() {
  rect(0, 0, W, H, 'rgba(20,10,10,0.98)');
  panel(80, 44, W - 160, H - 88, '📋 QUARTERLY PERFORMANCE REVIEW');

  // Guard: no template — safe exit
  if (!st.currentReviewTemplate) { onQuarterlyResolved(); return; }

  const t = st.currentReviewTemplate;

  // Karen byline
  txt('LADY SYNERGY KAREN, PERFORMANCE DIRECTOR', W / 2, 80, 5, COL.pink, false);

  const voiceCalibrationLine = st.currentReviewVoiceLine;
  const debtLine = st.currentReviewDebtLine;

  // Portrait Placement
  const portKaren = getPortrait('Lady Synergy Karen');
  if (portKaren.complete && portKaren.naturalWidth) {
    rect(W - 170, 55, 80, 80, 'rgba(0,0,0,0.5)', 4, COL.pink, 1);
    X.drawImage(portKaren, W - 165, 60, 70, 70);
  }

  // Karen's line — wrap to fit
  const karenLines = wrapLines(t.karenLine, 52).slice(0, 3);
  rect(100, 94, W - 200, 58 + (karenLines.length - 1) * 16, 'rgba(80,0,30,0.45)', 6, COL.pink, 1);
  karenLines.forEach((l, i) => txt(l, W / 2, 112 + i * 17, 6, COL.white, false));

  // Metric roasts
  const roastY = 168;
  t.metricRoast.slice(0, 3).forEach((r, i) => {
    rect(100, roastY + i * 28, W - 200, 22, 'rgba(0,0,0,0.3)', 4);
    txt(`• ${r}`, W / 2, roastY + 11 + i * 28, 5, COL.dim, false);
  });

  let infoY = roastY + t.metricRoast.slice(0, 3).length * 28 + 10;
  if (voiceCalibrationLine) {
    if (Array.isArray(voiceCalibrationLine)) {
      // GP-1: Character Interaction display with dynamic portrait switching
      voiceCalibrationLine.forEach((lineObj, i) => {
        const text = `${lineObj.who}: "${lineObj.line}"`;
        const speakPort = getPortrait(lineObj.who);
        const portX = (i % 2 === 0) ? 85 : W - 85;
        
        // Miniature speaker portrait
        if (speakPort.complete && speakPort.naturalWidth) {
          rect(portX - 25, infoY + i * 32, 50, 50, 'rgba(0,0,0,0.5)', 4, i % 2 === 0 ? COL.cyan : COL.gold, 1);
          X.drawImage(speakPort, portX - 22, infoY + i * 32 + 3, 44, 44);
        }

        const boxX = (i % 2 === 0) ? 140 : 100;
        const boxW = W - 240;
        const alignX = (i % 2 === 0) ? 145 : W - 145;

        rect(boxX, infoY + i * 32, boxW, 28, 'rgba(0,0,0,0.4)', 4, i % 2 === 0 ? COL.cyan : COL.gold, 1);
        txt(text, i % 2 === 0 ? boxX + 10 : boxX + boxW - 10, infoY + i * 32 + 14, 4.5, i % 2 === 0 ? '#9fe7ff' : '#d1f4ff', false, i % 2 === 0 ? 'left' : 'right');
      });
      infoY += voiceCalibrationLine.length * 36 + 10;
    } else {
      rect(100, infoY, W - 200, 24, 'rgba(10,30,50,0.35)', 4, COL.cyan, 1);
      txt(voiceCalibrationLine, W / 2, infoY + 12, 4.5, '#9fe7ff', false);
      infoY += 34;
    }
  }

  if (debtLine) {
    const debtLines = wrapLines(debtLine, 58).slice(0, 3);
    const debtH = 18 + debtLines.length * 12;
    rect(100, infoY, W - 200, debtH, 'rgba(60,35,0,0.35)', 4, COL.ora, 1);
    debtLines.forEach((l, i) => txt(l, W / 2, infoY + 10 + i * 12, 4.5, '#ffd7a1', false));
    infoY += debtH + 8;
  }

  // Vulnerability beat (italic-ish via colour)
  const vulnY = infoY + 4;
  if (t.vulnerabilityBeat) {
    txt(t.vulnerabilityBeat, W / 2, vulnY, 5, COL.cyan, false);
  }

  // Grade bar
  const grade = st.reputation > 80 ? 'EXCEPTIONAL' : st.reputation > 50 ? 'ACCEPTABLE' : 'CONCERNING';
  const gradeCol = grade === 'EXCEPTIONAL' ? COL.grn : grade === 'CONCERNING' ? COL.red : COL.yel;
  const statsY = t.vulnerabilityBeat ? vulnY + 22 : vulnY;

  rect(100, statsY, W - 200, 22, 'rgba(0,0,0,0.3)', 4);
  txt(`Q${st.quarter} GRADE: ${grade}`, W / 2, statsY + 11, 7, gradeCol, true);

  // Live stat strip
  const stripY = statsY + 32;
  const cols = [
    { l: 'REP',  v: `${Math.round(st.reputation)}%` },
    { l: 'HYPE', v: `${Math.round(st.hype)}%` },
    { l: 'COMP', v: `${Math.round(st.compliance)}%` },
    { l: 'CASH', v: `$${Math.floor(st.money / 1000)}k` },
  ];
  cols.forEach((c, i) => {
    const sx = 110 + i * 136;
    rect(sx, stripY, 120, 28, 'rgba(0,0,0,0.35)', 4, COL.dim, 1);
    txt(c.l, sx + 60, stripY + 8,  5, COL.cyan, false);
    txt(c.v, sx + 60, stripY + 20, 6, COL.yel,  false);
  });

  drawButton(W / 2 - 90, H - 72, 180, 36, 'CONTINUE SPRINT ▶', true, COL.gold, true);
  txt('ESC or ENTER to continue', W / 2, H - 26, 5, '#555', false);
}

function clickReview(mx, my) {
  // Hit the button or anywhere in the lower quarter of the screen
  if (my > H - 80) {
    onQuarterlyResolved();
  }
}

function drawPivot() {
  rect(0, 0, W, H, 'rgba(5,20,30,0.96)');
  const isCrisis = st.pivotSource === 'crisis';
  panel(60, 44, W - 120, H - 88, `🔄 THE PIVOT TABLE${isCrisis ? ' — CRISIS' : ''}`);

  // Context banner: different flavour for crisis vs voluntary open
  if (isCrisis) {
    // Identify the collapsed faction(s) for the banner
    const collapsed = Object.entries(st.ledger)
      .filter(([, v]) => v <= COLLAPSE_THRESHOLD)
      .map(([k]) => FACTIONS[k]?.short || k);
    const lossStreak = st.consecutiveLosses >= 2;
    let bannerText = 'Thy current situation has been formally classified as a Crisis.';
    if (collapsed.length)  bannerText = `Blood Feud with: ${collapsed.join(', ')}. A pivot is required.`;
    else if (lossStreak)   bannerText = `${st.consecutiveLosses} consecutive losses. The Committee is concerned.`;
    rect(80, 78, W - 160, 24, 'rgba(180,0,0,0.35)', 4, COL.red, 1);
    txt(bannerText, W / 2, 90, 5, COL.red, false);
  } else {
    txt('Voluntarily reconsidering thy direction. Very strategic. Very deliberate.', W / 2, 90, 5, COL.cyan, false);
  }

  // Option cards — up to 2 columns × n rows
  const cols = 2;
  const cardW = 290, cardH = 98, gapX = 20, gapY = 12;
  const gridW = cols * cardW + (cols - 1) * gapX;
  const gridX = (W - gridW) / 2;
  const gridY = 112;

  PIVOT_OPTIONS.forEach((o, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gridX + col * (cardW + gapX);
    const cy = gridY + row * (cardH + gapY);
    const hovered = st.mouseX > cx && st.mouseX < cx + cardW &&
                    st.mouseY > cy && st.mouseY < cy + cardH;
    rect(cx, cy, cardW, cardH,
      hovered ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.45)',
      8, hovered ? COL.gold : COL.cyan, hovered ? 2 : 1);
    txt(o.name.toUpperCase(), cx + cardW / 2, cy + 20, 8, COL.yel, false);
    wrapLines(o.desc, 33).slice(0, 3).forEach((l, j) =>
      txt(l, cx + cardW / 2, cy + 42 + j * 17, 5, COL.white, false));
  });

  // Cancel / close button — labelled differently for crisis
  const cancelLabel = isCrisis ? 'DEFER CRISIS' : 'CANCEL  [ESC]';
  drawButton(W / 2 - 80, H - 58, 160, 30, cancelLabel, true, '#666');
  txt('P to close • ESC to cancel', W / 2, H - 20, 5, '#444', false);
}

function clickPivot(mx, my) {
  const cols = 2;
  const cardW = 290, cardH = 98, gapX = 20, gapY = 12;
  const gridW = cols * cardW + (cols - 1) * gapX;
  const gridX = (W - gridW) / 2;
  const gridY = 112;

  for (let i = 0; i < PIVOT_OPTIONS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gridX + col * (cardW + gapX);
    const cy = gridY + row * (cardH + gapY);
    if (mx > cx && mx < cx + cardW && my > cy && my < cy + cardH) {
      onPivotResolved(PIVOT_OPTIONS[i].id);
      return;
    }
  }

  // Cancel button
  if (my > H - 58 && my < H - 28) {
    onPivotResolved(null);
  }
}

function drawCredits() {
  rect(0, 0, W, H, 'rgba(0,0,0,0.96)');
  panel(70, 18, W - 140, H - 36, '📜 CREDITS');
  const lines = [
    'SKYDISORDER v5.1',
    'NWA FORCED REINVENTION',
    'THE QUILLHAVEN CLOSING CEREMONY',
    '',
    'Executive Producer: The Committee for Unnecessary Synergy',
    'Ceremonial Spoon Stewardship: Sir Wastrel of the Aggressive Schedule C',
    'Footnotes, Omens, and Margin Architecture: The Architect',
    'Tea, Sanity, and Local Memory: Goodwife Henrietta',
    'Premium Customer Intimacy: Lord Buzzwick and the Mechanical Crow Syndicate',
    'Vibes, Hoodies, and Investor Lighting: Cursor Spectacles',
    'Stealth, Delay, and Soft Furniture: Brother Idleworth',
    'Grinding, Posting, and Legally Distinct Motivation: Brother Hustleworth',
    'Agile Course-Correction Against All Evidence: The Pivot Addict',
    'Blockchain Repositioning Services: The Web3 Re-Pivoter',
    'Metrics, Decrees, and Corrective Sighing: Lady Synergy Karen',
    '',
    'SPECIAL THANKS',
    'To Vastcart, for proving that serenity and market power can share a polo shirt.',
    'To Forgeharvest, for optimizing throughput until the euphemisms became load-bearing.',
    'To the Western Sun-Coast, whose tasteful humility arrived fortnight last in cashmere.',
    'To the Native Hollows, for remaining unimpressed in ways that preserved civilization.',
    'To every Ceremonial Spoon, ethically sourced from the Committee\'s own drawer.',
    '',
    'DISCLAIMER OF FICTIONALITY',
    'All founders, barons, committees, crows, and ceremonial utensils herein are entirely fictional.',
    'Any resemblance to real venture cults, retail empires, logistics duchies, or keynote monasteries is a coincidence of structure, not of naming.',
    'Any resemblance to the Western Sun-Coast is, by decree, a fortnight last coincidence.',
    'No real founders were harmed in the making of Quillhaven, though several were gently observed and professionally paraphrased.',
    'No real locals were mocked. The joke was always the machine, the money, and the people who mistook both for personality.',
    '',
    'POST-CEREMONIAL ACCOUNTING',
    'The Cursor Spectacles would like it noted that thy aura tested exceptionally well in controlled demo conditions.',
    'Brother Idleworth remains pre-launch, pre-clarity, and somehow post-seed.',
    'Sir Wastrel hath declared the losses emotionally profitable.',
    'Lord Buzzwick\'s crows deny all surveillance and request wider camera access.',
    'Lady Synergy Karen hath filed the joy under miscellaneous overhead.',
    'Magistrate Ledger reviewed the vibes and found them insufficiently documented.',
    'The Committee for Unnecessary Synergy convened, recessed, reconvened, and achieved a spoon.',
    'Fortnight last, this all seemed temporary. Quillhaven remembers otherwise.',
    '',
    'ACKNOWLEDGMENTS',
    'To those who build under dashboards, deadlines, and decorative mission statements: we saw you.',
    'To those who kept room in the margins for other people to remain people: that mattered here.',
    'If this strange little city felt warmer than the systems around it, that was not an accident.',
    'Thank you for golfing through the chaos.',
    'Go gently. Keep thy humor. Leave room in the margins for one another.'
  ];
  // USER-PLAYTEST-FIX — long credit lines are word-wrapped to fit the panel, and
  // the crawl is a seamless repeating loop instead of a jump-cut "lazy refresh".
  const wrapped = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) { wrapped.push({ text: '', head: false }); continue; }
    const head = i === 0 || i === 1 || lines[i] === lines[i].toUpperCase();
    const pieces = wrapLines(lines[i], head ? 40 : 62);
    pieces.forEach(piece => wrapped.push({ text: piece, head, first: i === 0, second: i === 1 }));
  }
  const lineStep = 24;
  const totalH = wrapped.length * lineStep + 120; // content + breathing gap before it loops
  const scroll = (st.time * 26) % totalH;
  X.save();
  X.beginPath();
  X.rect(90, 50, W - 180, H - 108);
  X.clip();
  for (let i = 0; i < wrapped.length; i++) {
    // Wrap-around: each line also renders one full cycle later, so the top of the
    // list crawls in below the bottom with no visible reset.
    let y = H - 60 - scroll + i * lineStep;
    if (y < 40) y += totalH;
    if (y > 56 && y < H - 54) {
      const ln = wrapped[i];
      txt(ln.text, W / 2, y, ln.first ? 9 : ln.head ? 7 : 5.5, ln.first ? COL.gold : ln.second ? COL.cyan : ln.head ? COL.gold : '#d0d7e1', false);
    }
  }
  X.restore();
  drawButton(W / 2 - 70, H - 44, 140, 28, '← BACK', true, '#888');
}

function drawProjectEpilogue() {
  const c = st.gameOverCeremony || buildPreviewCeremony();
  const ep = c?.epilogue;
  rect(0, 0, W, H, 'rgba(4,8,12,0.98)');
  panel(40, 20, W - 80, H - 40, '📘 PROJECT EPILOGUE');

  txt('THE FINAL PROJECT SUMMARY', W / 2, 58, 10, COL.gold, true);
  const headlineLines = wrapLines(ep?.headline || 'The deck is closed. The numbers remain.', 52).slice(0, 2);
  headlineLines.forEach((line, i) => txt(line, W / 2, 80 + i * 12, 5.5, '#d6c79a', false));

  rect(64, 112, 278, 334, 'rgba(0,0,0,0.35)', 8, 'rgba(79,195,247,0.35)', 1);
  txt('RUN STATISTICS', 203, 132, 7, COL.cyan, true);
  const stats = ep?.stats || [];
  stats.forEach((row, i) => {
    const y = 156 + i * 22;
    txt(row.label, 82, y, 5, '#9fb0bf', false, 'left');
    txt(row.value, 324, y, 5.4, COL.white, false, 'right');
  });

  rect(360, 112, 326, 334, 'rgba(0,0,0,0.35)', 8, 'rgba(255,215,0,0.35)', 1);
  txt('ACHIEVEMENT MILESTONES', 523, 132, 7, COL.gold, true);

  const unlocked = ep?.milestones || [];
  if (unlocked.length) {
    unlocked.slice(0, 8).forEach((m, i) => {
      const y = 158 + i * 34;
      const labelLines = wrapLines(`🏅 ${m.label}`, 27).slice(0, 2);
      labelLines.forEach((line, j) => {
        txt(line, 378, y + j * 10, 5.1, '#ffe48a', false, 'left');
      });
      const descLines = wrapLines(m.desc, 34).slice(0, 2);
      descLines.forEach((line, j) => {
        txt(line, 396, y + 18 + j * 11, 4.2, '#d7dee7', false, 'left');
      });
    });
    if (unlocked.length > 8) {
      txt(`+ ${unlocked.length - 8} more filed in the municipal appendix`, 523, 430, 4.5, COL.dim, false);
    }
  } else {
    txt('No formal milestones were ratified.', 523, 186, 5.5, COL.dim, false);
    txt('Even so, the paperwork remains substantial.', 523, 204, 4.8, '#8a959f', false);
  }

  const identityText = `Identity Verdict: ${c?.identity?.title || 'Undetermined'}`;
  const identityLines = wrapLines(identityText, 54).slice(0, 2);
  identityLines.forEach((line, i) => txt(line, W / 2, 470 + i * 12, 5.5, c?.identity?.color || COL.ora, false));
  drawButton(W / 2 - 118, H - 56, 236, 32, 'RETURN TO MENU', true, COL.cyan, true);
}

// ── CS-7: GAME OVER CEREMONY ─────────────────────────────────────────────────
// Three phases, each dismissed by click or key.
//   Phase 0 — Run stats (existing final report)
//   Phase 1 — Ledger summary: top/bottom faction, patrons, feuds
//   Phase 2 — Political identity verdict (full-screen reveal)
// After phase 2 the RETURN TO MENU button appears.

function drawGameOver() {
  const c = st.gameOverCeremony;
  drawBackground();
  rect(0, 0, W, H, 'rgba(0,0,0,0.88)');

  if (!c || st.ceremonyPhase === 0) {
    _drawGameOverPhase0();
  } else if (st.ceremonyPhase === 1) {
    _drawGameOverPhase1(c);
  } else {
    _drawGameOverPhase2(c);
  }
}

function _drawGameOverPhase0() {
  const isLiquidation = !!st.liquidationSummary;
  txt('💀', W / 2, 76 + Math.sin(st.time * 3) * 4, 30, COL.white, false);
  txt(isLiquidation ? 'LIQUIDATION WRIT' : 'GAME OVER', W / 2, 122, 20, isLiquidation ? COL.gold : COL.red, true);
  
  const reason = st.boardMessage
    ? st.boardMessage
    : (st.money <= 0 ? 'Bankrupt.' : st.runway <= 0 ? 'Out of runway.'
    : st.strikes >= st.maxStrikes ? 'Too many strikes.' : 'The board won.');
  txt(reason, W / 2, 148, 7, COL.ora, false);

  if (isLiquidation) {
    const l = st.liquidationSummary;
    rect(100, 164, W - 200, 80, 'rgba(60,35,0,0.45)', 8, COL.gold, 1);
    txt(l.flavor, W / 2, 184, 5, '#ffd7a1', false);
    txt(`DEBT RECOVERED: $${l.principal + l.interest}`, W / 2, 210, 6, COL.red, true);
    txt(`(Principal $${l.principal} + Interest $${l.interest})`, W / 2, 228, 4, COL.dim, false);
    
    panel(W / 2 - 188, 254, 376, 160, 'FINAL REPORT');
    const stats = [
      ['Score',    `${st.score.toLocaleString()}`],
      ['Cash',     `$0 (Seized)`],
      ['Equity',   `0% (Diluted)`],
      ['World',    `${st.currentWorld}`],
      ['Holes',    `${st.totalHolesCleared}`],
      ['Quarter',  `Q${st.quarter}`],
    ];
    stats.forEach((row, idx) => {
      txt(row[0], W / 2 - 118, 288 + idx * 21, 6, '#a8b4c0', false, 'left');
      txt(row[1], W / 2 + 118, 288 + idx * 21, 7, COL.yel, false, 'right');
    });
  } else {
    panel(W / 2 - 188, 168, 376, 226, 'FINAL REPORT');
    const stats = [
      ['Score',    `${st.score.toLocaleString()}`],
      ['Cash',     `$${Math.floor(st.money).toLocaleString()}`],
      ['Funding',  FUNDING_ROUNDS[st.funding]],
      ['World',    `${st.currentWorld}`],
      ['Holes',    `${st.totalHolesCleared}`],
      ['Equity',   `${Math.round(st.equity)}%`],
      ['Runway',   `${st.runway}`],
      ['Quarter',  `Q${st.quarter}`],
      ['Rep/Hype', `${Math.round(st.reputation)}/${Math.round(st.hype)}`],
    ];
    stats.forEach((row, idx) => {
      txt(row[0], W / 2 - 118, 206 + idx * 21, 6, '#a8b4c0', false, 'left');
      txt(row[1], W / 2 + 118, 206 + idx * 21, 7, COL.yel, false, 'right');
    });
  }

  const btnY = isLiquidation ? 430 : 410;
  if (st.gameOverCeremony) {
    drawButton(W / 2 - 110, btnY, 220, 32, 'SEE THE LEDGER  ▶', true, COL.cyan, true);
    txt('click or any key to continue', W / 2, btnY + 44, 5, '#444', false);
  } else {
    drawButton(W / 2 - 90, btnY + 10, 180, 32, 'RETURN TO MENU', true, COL.gold, true);
  }
}

function _drawGameOverPhase1(c) {
  txt('THE LEDGER SPEAKS', W / 2, 64, 14, '#c8a84b', true);
  txt('A FINAL ACCOUNTING OF THY POLITICAL STANDING', W / 2, 88, 5, '#8a6e2a', false);

  // Separator
  X.strokeStyle = 'rgba(200,168,75,0.4)';
  X.lineWidth = 1;
  X.beginPath(); X.moveTo(60, 100); X.lineTo(W - 60, 100); X.stroke();

  // Top / bottom faction highlight
  const hlY = 116;
  rect(W / 2 - 240, hlY, 222, 48, 'rgba(74,222,128,0.08)', 6, 'rgba(74,222,128,0.35)', 1);
  txt('HIGHEST STANDING', W / 2 - 129, hlY + 14, 5, COL.grn, false);
  txt(c.topFaction, W / 2 - 129, hlY + 32, 8, COL.grn, false);
  txt(`+${c.topVal}`, W / 2 - 56, hlY + 32, 6, COL.grn, false, 'right');

  rect(W / 2 + 18, hlY, 222, 48, 'rgba(255,68,68,0.08)', 6, 'rgba(255,68,68,0.35)', 1);
  txt('LOWEST STANDING', W / 2 + 129, hlY + 14, 5, COL.red, false);
  txt(c.bottomFaction, W / 2 + 129, hlY + 32, 8, COL.red, false);
  const botSign = c.bottomVal >= 0 ? '+' : '';
  txt(`${botSign}${c.bottomVal}`, W / 2 + 202, hlY + 32, 6, COL.red, false, 'right');

  // Patron list
  const pY = 184;
  txt('PATRONS  (standing ≥ +60)', W / 2, pY, 6, COL.gold, false);
  if (c.patrons.length) {
    const pLine = c.patrons.join('  ·  ');
    wrapLines(pLine, 58).slice(0, 2).forEach((l, i) =>
      txt(l, W / 2, pY + 18 + i * 16, 5.5, '#ffe066', false));
  } else {
    txt('None secured.', W / 2, pY + 18, 5.5, '#555', false);
  }

  // Blood Feud list
  const fY = pY + 58;
  txt('BLOOD FEUDS  (standing ≤ −60)', W / 2, fY, 6, COL.red, false);
  if (c.feuds.length) {
    const fLine = c.feuds.join('  ·  ');
    wrapLines(fLine, 58).slice(0, 2).forEach((l, i) =>
      txt(l, W / 2, fY + 18 + i * 16, 5.5, '#ff8888', false));
  } else {
    txt('None declared. Remarkable.', W / 2, fY + 18, 5.5, '#555', false);
  }

  // Mini ledger bars — compact version of the overlay (top 5 by absolute value)
  const barY = fY + 66;
  txt('FINAL STANDINGS', W / 2, barY, 6, '#888', false);
  const sorted = Object.entries(c.ledger).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5);
  const BAR_TW = 280, BAR_TX = (W - BAR_TW) / 2, BAR_TH = 8;
  const MID = BAR_TX + BAR_TW / 2;
  sorted.forEach(([key, val], i) => {
    const f = FACTIONS[key];
    const ry = barY + 16 + i * 22;
    const sname = (f?.short || key).slice(0, 16);
    txt(sname, BAR_TX - 6, ry + 4, 4.5, '#a08060', false, 'right');
    rect(BAR_TX, ry, BAR_TW, BAR_TH, 'rgba(0,0,0,0.4)', 2);
    X.strokeStyle = 'rgba(200,168,75,0.2)';
    X.lineWidth = 1;
    X.beginPath(); X.moveTo(MID, ry - 1); X.lineTo(MID, ry + BAR_TH + 1); X.stroke();
    const filled = (clamp(val, -100, 100) / 100) * (BAR_TW / 2);
    if (filled > 0) {
      rect(MID, ry, filled, BAR_TH, '#4ade80', 1);
    } else if (filled < 0) {
      const neg = Math.abs(filled);
      rect(MID - neg, ry, neg, BAR_TH, val <= COLLAPSE_THRESHOLD ? '#ff2222' : '#ff6666', 1);
    }
    const vstr = (val >= 0 ? '+' : '') + Math.round(val);
    txt(vstr, BAR_TX + BAR_TW + 6, ry + 4, 4.5, val < 0 ? '#ff8888' : '#88ff88', false, 'left');
  });

  drawButton(W / 2 - 120, H - 58, 240, 32, 'SEE THY IDENTITY  ▶', true, '#c8a84b', true);
  txt('click or any key to continue', W / 2, H - 16, 5, '#444', false);
}

function _drawGameOverPhase2(c) {
  const id = c.identity;

  // Dramatic full-screen reveal
  // Background tint in identity colour
  X.save();
  X.globalAlpha = 0.12;
  X.fillStyle = id.color;
  X.fillRect(0, 0, W, H);
  X.globalAlpha = 1;
  X.restore();

  // Heraldic header
  txt('QUILLHAVEN HATH JUDGED THEE', W / 2, 52, 8, '#c8a84b', true);

  // Animated gold border pulse
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(st.time * 1.8));
  X.save();
  X.strokeStyle = `rgba(200,168,75,${0.3 + pulse * 0.4})`;
  X.lineWidth = 2;
  roundRectPath(X, 48, 70, W - 96, H - 130, 10);
  X.stroke();
  X.restore();

  // Identity title — large, colored
  const titleLines = wrapLines(id.title, 30);
  titleLines.forEach((l, i) => {
    txt(l, W / 2, 108 + i * 30, 16, id.color, true);
  });
  const titleBottom = 108 + titleLines.length * 30;

  // Separator
  X.strokeStyle = `rgba(200,168,75,0.5)`;
  X.lineWidth = 1;
  X.beginPath(); X.moveTo(90, titleBottom + 8); X.lineTo(W - 90, titleBottom + 8); X.stroke();

  // Identity description — wrapped archaic prose
  const descLines = wrapLines(id.desc, 54).slice(0, 5);
  descLines.forEach((l, i) =>
    txt(l, W / 2, titleBottom + 28 + i * 20, 6.5, '#d4c090', false));

  // Patron / feud footnote
  const noteY = titleBottom + 28 + descLines.length * 20 + 16;
  if (c.patrons.length) {
    txt(`Allied: ${c.patrons.join(', ')}`, W / 2, noteY, 5, COL.grn, false);
  }
  if (c.feuds.length) {
    txt(`Enemies: ${c.feuds.join(', ')}`, W / 2, noteY + (c.patrons.length ? 18 : 0), 5, COL.red, false);
  }

  // Return button
  drawButton(W / 2 - 100, H - 58, 200, 32, 'RETURN TO MENU', true, COL.gold, true);
  txt('thy fate is sealed', W / 2, H - 16, 5, '#444', false);
}
// ── END CS-7 CEREMONY ────────────────────────────────────────────────────────

function drawPregate() {
  drawPlaying(true);
  rect(0, 0, W, H, 'rgba(0,0,0,0.25)');
  if (st.pregateMini) {
    drawMiniWindow(st.pregateWindow, miniDisplayLabel(st.pregateMini, 'PREGATE'), st.pregateMini); // GP-8-EXT / FINAL: ★ cue on reskins
    const sec = Math.ceil(st.pregateTimer);
    const varIdx = st.pregateMini._timerVariantIdx || 0;
    const timerText = TIMER_VARIATIONS[varIdx % TIMER_VARIATIONS.length].replace('{X}', sec);
    const timerColor = sec <= 5 ? COL.red : sec <= 10 ? COL.ora : COL.cyan;
    txt(timerText, W / 2, 74, 7, timerColor, true);
    // Announcer quip subtitle (fades out after 3 seconds elapsed)
    const elapsed = (st.pregateMini._startedAt ? (performance.now() - st.pregateMini._startedAt) / 1000 : 99);
    if (st.pregateMini._announcer && elapsed < 4) {
      X.globalAlpha = clamp(1 - (elapsed - 2.5) / 1.5, 0, 1);
      txt(st.pregateMini._announcer, W / 2, 88, 5, COL.gold, false);
      X.globalAlpha = 1;
    }
    drawButton(W / 2 - 70, st.pregateWindow.y + st.pregateWindow.h + 34, 140, 26, 'LOCK IN', true, COL.grn, true);
  }
}

function drawChaos() {
  drawPlaying(true);
  rect(0, 0, W, H, 'rgba(0,0,0,0.12)');
  if (st.chaosMini) {
    drawMiniWindow(st.chaosWindow, miniDisplayLabel(st.chaosMini, 'CHAOS'), st.chaosMini); // GP-8-EXT / FINAL: ★ cue on reskins
    const sec = Math.ceil(st.chaosTimer);
    const varIdx = st.chaosMini._timerVariantIdx || 0;
    const timerText = TIMER_VARIATIONS[varIdx % TIMER_VARIATIONS.length].replace('{X}', sec);
    const timerColor = sec <= 3 ? COL.red : COL.ora;
    txt(timerText, W / 2, 166, 7, timerColor, true);
  }
}

// Screen transition helper — smooth fade between screens
function transitionTo(targetScreen) {
  // Skip transition for gameplay-critical instant switches
  const instant = ['pregate', 'chaos', 'playing', 'paused'];
  if (instant.includes(targetScreen) || instant.includes(st.screen)) {
    st.screen = targetScreen;
    return;
  }
  st.transition = 0.01;
  st.transitionDir = 1;
  st.transitionTarget = targetScreen;
}

function updateTransition(dt) {
  if (st.transition <= 0) return;
  st.transition += st.transitionDir * dt * 4.5; // ~0.22s half-cycle
  if (st.transitionDir === 1 && st.transition >= 1) {
    st.transition = 1;
    st.transitionDir = -1;
    if (st.transitionTarget) {
      st.screen = st.transitionTarget;
      st.transitionTarget = null;
    }
  }
  if (st.transitionDir === -1 && st.transition <= 0) {
    st.transition = 0;
    st.transitionDir = 0;
  }
}

function drawScreen() {
  X.save();
  if (st.shake > 0) X.translate(rand(-st.shake, st.shake), rand(-st.shake, st.shake));
  if (st.screen === 'menu') drawMenu();
  else if (st.screen === 'worldmap') drawWorldMap();
  else if (st.screen === 'jobfair') drawJobFair();
  else if (st.screen === 'bench') drawBench();
  else if (st.screen === 'training') drawTraining();
  else if (st.screen === 'arcade') drawArcade();
  else if (st.screen === 'watch') drawWatch();
  else if (st.screen === 'repo') drawRepo();
  else if (st.screen === 'shop') drawShop();
  else if (st.screen === 'settings') drawSettings();
  else if (st.screen === 'leaderboard') drawLeaderboard();
  else if (st.screen === 'credits') drawCredits();
  else if (st.screen === 'footnotes') drawFootnoteLedger();
  else if (st.screen === 'pregate') drawPregate();
  else if (st.screen === 'chaos') drawChaos();
  else if (st.screen === 'pitch') drawPitch();
  else if (st.screen === 'review') drawReview();
  else if (st.screen === 'pivot') drawPivot();
  else if (st.screen === 'ipo') drawIPO();
  else if (st.screen === 'epilogue') drawProjectEpilogue();
  else if (st.screen === 'bureaucracy') drawBureaucracy();
  else if (st.screen === 'spoon_ceremony') drawSpoonCeremony();
  else if (st.screen === 'gameover') drawGameOver();
  else if (st.screen === 'paused') drawPaused();
  else drawPlaying();
  // CS-6: Ledger overlay drawn on top of the playing screen (not a screen change)
  if (st.screen === 'playing' && st.ledgerOverlayOpen) drawLedger();
  drawFx();
  // GP-1: Architect Footnote overlay
  drawArchitectFootnote();
  // Draw transition overlay
  if (st.transition > 0) {
    X.globalAlpha = st.transition;
    X.fillStyle = '#0a0012';
    X.fillRect(0, 0, W, H);
    X.globalAlpha = 1;
  }
  X.restore();
}

function updateRun(dt) {
  const world = getWorld();
  if (st.boardOpen) return;

  if (st.pregateActive && st.pregateMini) {
    // Handle minigame timer update correctly with dt
    st.pregateTimer -= dt;
    st.pregateMini.update(dt);
    if (st.pregateMini.isDone() || st.pregateTimer <= 0) finishPregate(st.pregateMini.getPerformance());
    return;
  }

  // Phase 4: Procedural Bureaucracy — Frequency scales with world difficulty (CS-10)
  if (st.screen === 'playing' && !st.ballFlying && !st.boardOpen) {
    st.bureaucracyTimer = (st.bureaucracyTimer || 0) + dt;
    const worldScale = Math.max(0.6, 1.1 - (st.currentWorld - 1) * 0.07);
    const triggerThreshold = (25 + Math.random() * 25) * worldScale;
    if (st.bureaucracyTimer > triggerThreshold) {
      triggerBureaucracyEvent();
      st.bureaucracyTimer = 0;
    }
  }

  if (st.swingPhase === 'power') {
    st.power += st.dir * getMeterSpeed() * dt;
    if (st.power >= 100) { st.power = 100; st.dir = -1; }
    if (st.power <= 0) { st.power = 0; st.dir = 1; }
  }
  if (st.swingPhase === 'accuracy') {
    st.acc += st.dir * (getMeterSpeed() + 35) * dt;
    if (st.acc >= 100) { st.acc = 100; st.dir = -1; }
    if (st.acc <= 0) { st.acc = 0; st.dir = 1; }
  }
  if (st.swingPhase === 'swinging') {
    st.swingAnim += dt;
    if (st.swingAnim >= 0.34 && !st.ballFlying) applySwing();
  }

  if (st.ballFlying) {
    // JUICE — flight trail: sparkle particles plus the occasional drifting emoji
    if (Math.random() < dt * 22) {
      spawnParticle(st.ballX - st.camX, st.ballY - st.camY - st.ballZ, {
        vx: rand(-20, 20), vy: rand(-10, 26), maxLife: rand(0.3, 0.6),
        size: rand(1.5, 3), color: 'rgba(255,255,255,0.85)', gravity: 40, world: false
      });
    }
    if (Math.random() < dt * 1.4) {
      addPopup(pickRandom(['💸', '🪶', '📈', '🦞', '☁️']), st.ballX - st.camX + rand(-10, 10), st.ballY - st.camY - st.ballZ - 14, COL.white, 10, 1.6);
    }
    st.ballSpin += (Math.abs(st.ballVX) + Math.abs(st.ballVY) + Math.abs(st.ballVZ)) * dt * 0.08;
    st.ballX += st.ballVX * dt * 60;
    st.ballY += st.ballVY * dt * 60;
    st.ballZ += st.ballVZ * dt * 60;
    st.ballVZ -= 14.5 * dt * 60 * 0.06;
    st.ballVX *= 0.998;
    st.ballVY *= 0.996;
    st.ballVY += st.windX * dt * 0.5;

    if (st.chaosActive && st.chaosMini) {
      st.chaosTimer -= dt;
      st.chaosMini.update(dt);
      if (st.chaosTimer <= 0 || st.chaosMini.isDone()) endChaos();
    }

    if (st.ballZ <= 0 && st.ballVZ < 0) landBall();
    if (st.ballX > W + 30 || st.ballX < -30 || st.ballY > H + 30 || st.ballY < 120) landBall();
  }

  // Camera tracking - focus on player during swing prep, then track both/leader
  let followX, followY;
  if (st.swingPhase !== 'flying' && !st.ballFlying) {
    followX = st.ballX;
    followY = st.ballY;
  } else {
    // If both balls are out, track the one furthest right (closest to hole)
    followX = st.oppFinished ? st.ballX : Math.max(st.ballX, st.oppX);
    followY = st.oppFinished ? st.ballY : (st.ballY + st.oppY) * 0.5;
  }

  const targetCamX = Math.max(0, followX - 220) * 0.72;
  const targetCamY = clamp((followY - 320) * 0.5, -100, 100);
  
  st.camX += (targetCamX - st.camX) * dt * 3.5;
  st.camY += (targetCamY - st.camY) * dt * 3.5;

  if (st.chaosActive) {
    st.shake = Math.max(st.shake, 1.8); // Constant low-level buzz during chaos
  }

  // Opponent AI
  if (st.oppFlying) {
    st.oppSpin += (Math.abs(st.oppVX) + Math.abs(st.oppVY) + Math.abs(st.oppVZ)) * dt * 0.08;
    st.oppX += st.oppVX * dt * 60;
    st.oppY += st.oppVY * dt * 60;
    st.oppZ += st.oppVZ * dt * 60;
    st.oppVZ -= 14.5 * dt * 60 * 0.06;
    st.oppVX *= 0.998;
    st.oppVY *= 0.996;
    st.oppVY += st.windX * dt * 0.5;

    if (st.oppZ <= 0 && st.oppVZ < 0) landOpponent();
    if (st.oppX > W + 30 || st.oppX < -30 || st.oppY > H + 30 || st.oppY < 120) landOpponent();
  } else if (!st.oppFinished && !st.boardOpen && !st.pregateActive && !st.chaosActive && st.swingPhase !== 'flying') {
    st.oppTimer -= dt;
    if (st.oppTimer <= 0) {
      applyOpponentSwing();
    }
  }

  if (st.money <= 0 || st.runway <= 0 || st.equity <= 0 || (st.oppFinished && st.strikes > st.oppFinalStrokes)) {
    if (st.runActive) {
      if (st.oppFinished && st.strikes > st.oppFinalStrokes) {
        endRun('Opponent beat you in fewer strokes!');
      } else {
        endRun();
      }
    }
  }

  if (st.totalHolesCleared > 0 && st.totalHolesCleared % 3 === 0 && st.totalHolesCleared % 9 === 0 && Math.random() < 0.35) {
    st.caddy = CADDIES[Math.floor(Math.random() * CADDIES.length)];
  }

  st.autosaveTimer += dt;
  if (st.autosaveTimer >= 0.75) {
    saveRun();
    st.autosaveTimer = 0;
  }
}

function updateTraining(dt) {
  if (!st.trainingMini) return;
  st.trainingTimer -= dt;
  st.trainingMini.update(dt);
  st.trainingScore = st.trainingMini.getScore();
  if (st.trainingTimer <= 0 || st.trainingMini.isDone()) {
    const perf = st.trainingMini.getPerformance();
    const reward = 120 + Math.floor(st.trainingScore * 0.4);
    st.money += reward;
    st.trainingBest[st.trainingDrill.id] = Math.max(st.trainingBest[st.trainingDrill.id] || 0, st.trainingScore);
    const won = perfToScalar(perf) >= 50;
    const flavor = pickFlavor(st.trainingMini.variant || st.trainingMini.id, won);
    applyVariantFactionReward(st.trainingMini, won); // GP-8-EXT / NEXT-STEP-FACTION-REWARDS
    cleanupMini(st.trainingMini);
    st.trainingMini = null;
    addPopup(`Training complete +$${reward}`, W / 2, 170, COL.grn, 12);
    if (flavor) addPopup(flavor, W / 2, 196, won ? COL.cyan : COL.ora, 7);
    saveMeta();
    saveRun();
  }
}

function updateArcade(dt) {
  if (st.arcadePhase !== 'play' || !st.arcadeMini) return;
  st.arcadeTimer -= dt;
  st.arcadeMini.update(dt);
  st.arcadeScore = st.arcadeMini.getScore();
  if (st.arcadeTimer <= 0 || st.arcadeMini.isDone()) {
    const perf = st.arcadeMini.getPerformance();
    const won = perfToScalar(perf) >= 50;
    const flavor = pickFlavor(st.arcadeMini.variant || st.arcadeMini.id, won);
    applyVariantFactionReward(st.arcadeMini, won); // GP-8-EXT / NEXT-STEP-FACTION-REWARDS
    st.arcadePhase = 'result';
    st.arcadeBest[st.arcadeGameId] = Math.max(st.arcadeBest[st.arcadeGameId] || 0, st.arcadeScore);
    if (flavor) addPopup(flavor, W / 2, 178, won ? COL.grn : COL.ora, 7);
    saveMeta();
  }
}

function updateAll(dt) {
  st.time += dt;
  updateFx(dt);
  updateTransition(dt);
  updateArchitectFootnote(dt);
  if (st.screen === 'playing' || st.screen === 'pregate' || st.screen === 'chaos') updateRun(dt);
  if (st.screen === 'training') updateTraining(dt);
  if (st.screen === 'arcade') updateArcade(dt);
  if (st.screen === 'watch') updateWatch(dt);

  // CS-6: drain ledgerPopups so dirty-flags expire and the queue doesn't grow unbounded.
  // Popups are only used for the dirty-flag pulse in drawLedger; they don't render themselves.
  if (st.ledgerPopups.length) {
    for (let i = st.ledgerPopups.length - 1; i >= 0; i--) {
      st.ledgerPopups[i].life -= dt;
      if (st.ledgerPopups[i].life <= 0) st.ledgerPopups.splice(i, 1);
    }
  }
}

function menuAction(action) {
  if (action === 'new') startNewRun(1);
  else if (action === 'continue') {
    if (!loadRun()) startNewRun(1);
    playClick();
  }
  else if (action === 'worldmap') transitionTo('worldmap');
  else if (action === 'jobfair') { refreshJobOffers(); transitionTo('jobfair'); }
  else if (action === 'bench') transitionTo('bench');
  else if (action === 'training') transitionTo('training');
  else if (action === 'arcade') transitionTo('arcade');
  else if (action === 'watch') { createWatchMatch(); transitionTo('watch'); }
  else if (action === 'repo') transitionTo('repo');
  else if (action === 'shop') transitionTo('shop');
  else if (action === 'leaderboard') transitionTo('leaderboard');
  else if (action === 'settings') transitionTo('settings');
  else if (action === 'footnotes') {
    st.footnoteLedgerScroll = 0;
    clearFootnoteLedgerFocus();
    focusLatestUnreadArchitectFootnote() || focusLatestArchitectFootnote();
    transitionTo('footnotes');
  }
  else if (action === 'credits') transitionTo('credits');
  else if (action === 'preview_epilogue') {
    st.previewOverlay = 'epilogue';
    st.screen = SCREEN.EPILOGUE;
  }
  else if (action === 'preview_spoon') {
    st.previewOverlay = 'spoon';
    st.currentSpoon = CEREMONIAL_SPOONS[CEREMONIAL_SPOONS.length - 1] || CEREMONIAL_SPOONS[0] || null;
    st.screen = 'spoon_ceremony';
  }
  playClick();
}

function clickMenu(mx, my) {
  const desk = getArchitectDeskCardRect();
  if (mx > desk.x && mx < desk.x + desk.w && my > desk.y && my < desk.y + desk.h) {
    const items = getMenuItems();
    const footnoteIndex = items.findIndex(item => item.action === 'footnotes');
    if (footnoteIndex >= 0) st.menuIndex = footnoteIndex;
    menuAction('footnotes');
    return;
  }

  const items = getMenuItems();
  // USER-PLAYTEST-FIX — hitboxes track the narrowed 2×6 menu grid
  const menuPanelX = 146;
  const menuPanelY = 194;
  const menuButtonW = 178;
  const menuButtonH = 30;
  const menuRowStep = 40;
  for (let i = 0; i < items.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = menuPanelX + 18 + col * 194;
    const y = menuPanelY + 16 + row * menuRowStep;
    if (mx > x && mx < x + menuButtonW && my > y && my < y + menuButtonH) {
      st.menuIndex = i;
      menuAction(items[i].action);
      return;
    }
  }
}

function clickWorldMap(mx, my) {
  for (let i = 0; i < WORLDS.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 40 + col * 172;
    const y = 84 + row * 175;
    if (mx > x && mx < x + 156 && my > y && my < y + 155) {
      enterWorld(WORLDS[i].id);
      return;
    }
  }
  for (let i = 0; i < st.strategyOffers.length; i++) {
    const x = 42 + i * 142;
    const y = 464;
    if (mx > x && mx < x + 132 && my > y && my < y + 42) {
      applyStrategyOffer(i);
      return;
    }
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 44 && my < H - 16) transitionTo('menu');
}

function clickPlaying(mx, my) {
  // CS-6: Ledger overlay intercepts all clicks while open
  if (st.ledgerOverlayOpen) { clickLedger(mx, my); return; }

  if (st.boardOpen) {
    if (mx > W / 2 - 60 && mx < W / 2 + 60 && my > H / 2 + 58 && my < H / 2 + 88) {
      st.boardOpen = false;
      playClick();
    }
    return;
  }

  if (mx > 12 && mx < 144 && my > 186 && my < 214) {
    pauseGame();
    playClick();
    return;
  }

  if (my > 84 && my < 178 && mx > 12 && mx < 144) {
    if (my < 144) st.club = 'Driver';
    else if (my < 160) st.club = 'Iron';
    else st.club = 'Putter';
    playClick();
    saveRun();
    return;
  }

  if (st.swingPhase === 'ready' && !st.ballFlying) startPregate();
  else if (st.swingPhase === 'power') { st.swingPhase = 'accuracy'; st.dir = 1; playClick(); }
  else if (st.swingPhase === 'accuracy') { st.swingPhase = 'swinging'; st.swingAnim = 0; playClick(); }
}

function clickPregate(mx, my) {
  const win = st.pregateWindow;
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > win.y + win.h + 34 && my < win.y + win.h + 60) {
    finishPregate(st.pregateMini ? st.pregateMini.getPerformance() : 50);
    playClick();
    return;
  }
  forwardMiniMouse(st.pregateMini, 'click', mx, my, win);
}

function clickChaos(mx, my) {
  const win = st.chaosWindow;
  forwardMiniMouse(st.chaosMini, 'click', mx, my, win);
}

function clickJobFair(mx, my) {
  const scroll = st.jobFairScroll || 0; // USER-PLAYTEST-FIX — hitboxes track the scrolled cards
  for (let i = 0; i < st.jobOffers.length; i++) {
    const x = 42 + (i % 3) * 225;
    const y = 88 + Math.floor(i / 3) * 180 - scroll;
    if (y + 150 < 66 || y > 504) continue;
    if (mx > x + 118 && mx < x + 188 && my > y + 105 && my < y + 135) {
      const offer = st.jobOffers[i];
      hireCharacter(offer.id, offer.cost, offer.signingBonus);
      return;
    }
  }
  if (mx > 44 && mx < 204 && my > H - 46 && my < H - 18) {
    if (st.money >= 500) {
      st.money -= 500;
      refreshJobOffers();
      playClick();
      saveRun();
    } else {
      playFail();
    }
    return;
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 46 && my < H - 18) transitionTo('menu');
}

function clickBench(mx, my) {
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 176;
    const y = 98;
    if (mx > x + 28 && mx < x + 134 && my > y + 116 && my < y + 136) {
      moveRosterToBench(i);
      return;
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = 40 + (i % 3) * 224;
    const y = 288 + Math.floor(i / 3) * 108;
    if (mx > x + 18 && mx < x + 98 && my > y + 62 && my < y + 82) {
      moveBenchToRoster(i);
      return;
    }
    if (mx > x + 108 && mx < x + 188 && my > y + 62 && my < y + 82) {
      fireBenchCharacter(i);
      return;
    }
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 42 && my < H - 14) transitionTo('menu');
}

function clickTraining(mx, my) {
  if (!st.trainingMini) {
    // USER-PLAYTEST-FIX — camp is nested under the arcade now; BACK returns there
    if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 42 && my < H - 14) { transitionTo('arcade'); return; }
    for (let i = 0; i < TRAINING_DRILLS.length; i++) {
      const y = 84 + i * 72;
      if (mx > 80 && mx < W - 80 && my > y && my < y + 64) {
        st.trainingDrill = TRAINING_DRILLS[i];
        st.trainingMini = createMinigameInstance(st.trainingDrill.mini);
        st.trainingTimer = 40;
        st.trainingScore = 0;
        playClick();
        return;
      }
    }
  } else {
    const win = MINI_WINDOW_STANDARD;
    if (mx > W / 2 - 56 && mx < W / 2 + 56 && my > H - 44 && my < H - 16) {
      cleanupMini(st.trainingMini);
      st.trainingMini = null;
      playClick();
      return;
    }
    forwardMiniMouse(st.trainingMini, 'click', mx, my, win);
  }
}

function clickArcade(mx, my) {
  if (st.arcadePhase === 'select') {
    const ids = ARCADE_GAME_IDS;
    for (let i = 0; i < ids.length; i++) {
      const x = 32 + (i % 3) * 230;
      const y = 82 + Math.floor(i / 3) * 86;
      if (mx > x && mx < x + 210 && my > y && my < y + 68) {
        st.arcadeSelection = i;
        playClick();
        return;
      }
    }
    // USER-PLAYTEST-FIX — three distinct bottom buttons: TRAINING / PLAY / BACK
    if (mx > 44 && mx < 214 && my > H - 44 && my < H - 16) {
      transitionTo('training');
      playClick();
      return;
    }
    if (mx > W / 2 - 90 && mx < W / 2 + 90 && my > H - 44 && my < H - 16) {
      const ids2 = ARCADE_GAME_IDS;
      st.arcadeGameId = ids2[st.arcadeSelection] || 'pong';
      st.arcadeMini = createMinigameInstance(st.arcadeGameId);
      st.arcadePhase = 'play';
      st.arcadeTimer = 45;
      st.arcadeScore = 0;
      playClick();
      return;
    }
    if (mx > W - 184 && mx < W - 44 && my > H - 44 && my < H - 16) {
      cleanupMini(st.arcadeMini);
      st.arcadePhase = 'select';
      st.arcadeMini = null;
      transitionTo('menu');
      return;
    }
    return;
  } else if (st.arcadePhase === 'play') {
    const win = MINI_WINDOW_STANDARD;
    if (mx > W / 2 - 56 && mx < W / 2 + 56 && my > H - 44 && my < H - 16) {
      const perf = st.arcadeMini ? st.arcadeMini.getPerformance() : null;
      const won = perfToScalar(perf) >= 50;
      const flavor = st.arcadeMini ? pickFlavor(st.arcadeMini.variant || st.arcadeMini.id, won) : null;
      if (st.arcadeMini) applyVariantFactionReward(st.arcadeMini, won); // GP-8-EXT / NEXT-STEP-FACTION-REWARDS
      st.arcadePhase = 'result';
      st.arcadeBest[st.arcadeGameId] = Math.max(st.arcadeBest[st.arcadeGameId] || 0, st.arcadeScore);
      if (flavor) addPopup(flavor, W / 2, 178, won ? COL.grn : COL.ora, 7);
      saveMeta();
      playClick();
      return;
    }
    forwardMiniMouse(st.arcadeMini, 'click', mx, my, win);
  } else {
    if (mx > W / 2 - 96 && mx < W / 2 + 96 && my > 240 && my < 272) {
      cleanupMini(st.arcadeMini);
      st.arcadeMini = createMinigameInstance(st.arcadeGameId);
      st.arcadePhase = 'play';
      st.arcadeTimer = 30;
      st.arcadeScore = 0;
      playClick();
      return;
    }
    // USER-PLAYTEST-FIX — BACK only exists on the results screen now (returns to select)
    if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 44 && my < H - 16) {
      cleanupMini(st.arcadeMini);
      st.arcadePhase = 'select';
      st.arcadeMini = null;
      playClick();
    }
  }
}

function clickWatch(mx, my) {
  // USER-PLAYTEST-FIX — hitboxes match the redrawn button positions
  if (st.watch.phase === 'betting') {
    if (mx > 170 && mx < 280 && my > 466 && my < 494) return placeWatchBet(500, 'A');
    if (mx > 320 && mx < 430 && my > 466 && my < 494) return placeWatchBet(1000, 'A');
    if (mx > 470 && mx < 580 && my > 466 && my < 494) return placeWatchBet(500, 'B');
  } else if (st.watch.phase === 'result') {
    if (mx > W / 2 - 90 && mx < W / 2 + 90 && my > 466 && my < 494) {
      createWatchMatch();
      playClick();
      return;
    }
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 56 && my < H - 28) transitionTo('menu');
}

function clickRepo(mx, my) {
  if (mx > W / 2 - 94 && mx < W / 2 + 94 && my > 94 && my < 128) {
    FILE_INPUT.click();
    playClick();
    return;
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 42 && my < H - 14) transitionTo('menu');
}

function clickShop(mx, my) {
  if (mx > 50 && mx < 170 && my > 46 && my < 70) { st.shopTab = 'powerups'; playClick(); return; }
  if (mx > 184 && mx < 304 && my > 46 && my < 70) { st.shopTab = 'equipment'; playClick(); return; }
  const items = st.shopTab === 'powerups' ? st.powerups : st.equipment;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const x = 50 + (i % 2) * 330;
    const y = 98 + Math.floor(i / 2) * 100;
    if (mx > x + 196 && mx < x + 280 && my > y + 54 && my < y + 76) {
      if (st.shopTab === 'powerups') buyPowerup(it.id);
      else if (it.owned) toggleEquipment(it.id);
      else buyEquipment(it.id);
      return;
    }
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 42 && my < H - 14) transitionTo('menu');
}

function clickSettings(mx, my) {
  // USER-PLAYTEST-FIX — hitboxes track the reflowed settings layout
  if (mx > W / 2 - 130 && mx < W / 2 - 10 && my > 128 && my < 158) { st.settings.music = !st.settings.music; saveMeta(); playClick(); return; }
  if (mx > W / 2 + 10 && mx < W / 2 + 130 && my > 128 && my < 158) { st.settings.sfx = !st.settings.sfx; saveMeta(); playClick(); return; }
  for (let i = 0; i < CADDIES.length; i++) {
    const x = 144 + (i % 2) * 230;
    const y = 236 + Math.floor(i / 2) * 44;
    if (mx > x && mx < x + 210 && my > y && my < y + 28) {
      st.caddy = CADDIES[i];
      playClick();
      saveRun();
      return;
    }
  }
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 72 && my < H - 44) transitionTo('menu');
}

function clickBackSimple(mx, my) {
  if (mx > W / 2 - 70 && mx < W / 2 + 70 && my > H - 44 && my < H - 16) transitionTo('menu');
}

function clickProjectEpilogue(mx, my) {
  if (mx > W / 2 - 118 && mx < W / 2 + 118 && my > H - 56 && my < H - 24) {
    st.gameOverCeremony = null;
    st.ceremonyPhase = 0;
    st.previewOverlay = null;
    transitionTo('menu');
    refreshMenuContinueState();
    playClick();
  }
}

// CS-7: clickGameOver — advances ceremony phases; final phase returns to menu.
function clickGameOver(mx, my) {
  const c = st.gameOverCeremony;

  if (!c || st.ceremonyPhase === 0) {
    // Phase 0: "SEE THE LEDGER" button or anywhere advances to phase 1
    if (c) {
      st.ceremonyPhase = 1;
      playClick();
    } else {
      // No ceremony (edge case) — just return to menu
      if (mx > W / 2 - 90 && mx < W / 2 + 90 && my > 418 && my < 450) {
        transitionTo('menu'); refreshMenuContinueState(); playClick();
      }
    }
    return;
  }

  if (st.ceremonyPhase === 1) {
    st.ceremonyPhase = 2;
    playSuccess(); // identity reveal = triumph chord
    return;
  }

  // Phase 2: RETURN TO MENU button only in lower band
  if (my > H - 66) {
    transitionTo('menu');
    refreshMenuContinueState();
    playClick();
  }
}

function onCanvasClick(mx, my) {
  ensureAudio();
  // Block clicks during screen transition
  if (st.transition > 0) return;
  if (st.screen === 'paused') {
    if (mx > W / 2 - 80 && mx < W / 2 + 80 && my > H / 2 + 40 && my < H / 2 + 72) { resumeGame(); playClick(); return; }
    if (mx > W / 2 - 80 && mx < W / 2 + 80 && my > H / 2 + 80 && my < H / 2 + 112) { transitionTo('menu'); playClick(); return; }
    return;
  }
  if (st.screen === 'menu') return clickMenu(mx, my);
  if (st.screen === 'worldmap') return clickWorldMap(mx, my);
  if (st.screen === 'playing') return clickPlaying(mx, my);
  if (st.screen === 'pregate') return clickPregate(mx, my);
  if (st.screen === 'chaos') return clickChaos(mx, my);
  if (st.screen === 'pitch') return clickPitch(mx, my);
  if (st.screen === 'review') return clickReview(mx, my);
  if (st.screen === 'pivot') return clickPivot(mx, my);
  if (st.screen === 'ipo') return clickIPO(mx, my);
  if (st.screen === 'bureaucracy') return clickBureaucracy(mx, my);
  if (st.screen === 'spoon_ceremony') return clickSpoonCeremony(mx, my);
  if (st.screen === 'jobfair') return clickJobFair(mx, my);
  if (st.screen === 'bench') return clickBench(mx, my);
  if (st.screen === 'training') return clickTraining(mx, my);
  if (st.screen === 'arcade') return clickArcade(mx, my);
  if (st.screen === 'watch') return clickWatch(mx, my);
  if (st.screen === 'repo') return clickRepo(mx, my);
  if (st.screen === 'shop') return clickShop(mx, my);
  if (st.screen === 'settings') return clickSettings(mx, my);
  if (st.screen === 'footnotes') return clickFootnoteLedger(mx, my);
  if (st.screen === 'leaderboard' || st.screen === 'credits') return clickBackSimple(mx, my);
  if (st.screen === 'epilogue') return clickProjectEpilogue(mx, my);
  if (st.screen === 'gameover') return clickGameOver(mx, my);
}

// Fix #4 — handleMiniKey null guard
function handleMiniInput(evt) {
  if (st.screen === 'pregate' && st.pregateMini && typeof st.pregateMini.handleInput === 'function') st.pregateMini.handleInput(evt);
  else if (st.screen === 'chaos' && st.chaosMini && typeof st.chaosMini.handleInput === 'function') st.chaosMini.handleInput(evt);
  else if (st.screen === 'training' && st.trainingMini && typeof st.trainingMini.handleInput === 'function') st.trainingMini.handleInput(evt);
  else if (st.screen === 'arcade' && st.arcadePhase === 'play' && st.arcadeMini && typeof st.arcadeMini.handleInput === 'function') st.arcadeMini.handleInput(evt);
}

function handleMiniKey(key, down) {
  if (!key) return;
  if (st.screen === 'pregate' && st.pregateMini && typeof st.pregateMini.handleKey === 'function') st.pregateMini.handleKey(key, down);
  else if (st.screen === 'chaos' && st.chaosMini && typeof st.chaosMini.handleKey === 'function') st.chaosMini.handleKey(key, down);
  else if (st.screen === 'training' && st.trainingMini && typeof st.trainingMini.handleKey === 'function') st.trainingMini.handleKey(key, down);
  else if (st.screen === 'arcade' && st.arcadePhase === 'play' && st.arcadeMini && typeof st.arcadeMini.handleKey === 'function') st.arcadeMini.handleKey(key, down);
}

C.addEventListener('click', evt => {
  const p = getCanvasPointer(evt);
  if (!p) return;
  st.mouseX = p.mx;
  st.mouseY = p.my;
  onCanvasClick(p.mx, p.my);
});

C.addEventListener('mousedown', evt => {
  const p = getCanvasPointer(evt);
  if (p) {
    st.mouseX = p.mx;
    st.mouseY = p.my;
  }
  handleMiniInput(evt);
});

C.addEventListener('mousemove', evt => {
  const p = getCanvasPointer(evt);
  if (!p) return;
  st.mouseX = p.mx;
  st.mouseY = p.my;
  handleMiniInput(evt);
  routeMiniMotion(p.mx, p.my);
});

C.addEventListener('wheel', evt => {
  if (st.screen === 'footnotes') {
    evt.preventDefault();
    scrollFootnoteLedger(evt.deltaY);
    return;
  }
  // USER-PLAYTEST-FIX — job fair scrolls too
  if (st.screen === 'jobfair') {
    evt.preventDefault();
    st.jobFairScroll = (st.jobFairScroll || 0) + evt.deltaY;
    clampJobFairScroll();
  }
}, { passive: false });

document.addEventListener('keydown', evt => {
  ensureAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(evt.key) && st.screen !== 'repo') evt.preventDefault();
  handleMiniInput(evt);
  const items = getMenuItems();
  if (st.screen === 'menu') {
    if (evt.key === 'ArrowUp') { st.menuIndex = (st.menuIndex - 2 + items.length) % items.length; playClick(); }
    if (evt.key === 'ArrowDown') { st.menuIndex = (st.menuIndex + 2) % items.length; playClick(); }
    if (evt.key === 'ArrowLeft') { st.menuIndex = (st.menuIndex - 1 + items.length) % items.length; playClick(); }
    if (evt.key === 'ArrowRight') { st.menuIndex = (st.menuIndex + 1) % items.length; playClick(); }
    if (evt.key === 'f' || evt.key === 'F') {
      const footnoteIndex = items.findIndex(item => item.action === 'footnotes');
      if (footnoteIndex >= 0) {
        st.menuIndex = footnoteIndex;
        playClick();
      }
    }
    if (evt.shiftKey && (evt.key === 'E' || evt.key === 'e')) {
      evt.preventDefault();
      menuAction('preview_epilogue');
      return;
    }
    if (evt.shiftKey && (evt.key === 'S' || evt.key === 's')) {
      evt.preventDefault();
      menuAction('preview_spoon');
      return;
    }
    if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); menuAction(items[st.menuIndex].action); }
    return;
  }

  // FIX F — overlay screens consume ALL input; nothing passes through to game
  // CS-1: ESC on pitch defers it (onPitchResolved(null) — safe exit)
  if (st.screen === 'pitch') {
    if (evt.key === 'Escape') onPitchResolved(null);
    return;
  }
  if (st.screen === 'review') {
    // CS-2: Enter, Space, or Escape all dismiss the quarterly review cleanly
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'Escape') onQuarterlyResolved();
    return;
  }
  if (st.screen === 'pivot') {
    // CS-3: ESC or P both close the pivot table via the clean exit function
    if (evt.key === 'Escape' || evt.key === 'p' || evt.key === 'P') {
      onPivotResolved(null);
    }
    return;
  }
  if (st.screen === 'ipo') {
    if (evt.key === 'Enter' || evt.key === ' ') clickIPO();
    return;
  }
  if (st.screen === 'epilogue') {
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'Escape') {
      evt.preventDefault();
      clickProjectEpilogue(W / 2, H - 40);
    }
    return;
  }
  if (st.screen === 'bureaucracy') {
    // Bureaucracy events must be resolved by clicking a choice. No ESC skip to force consequences.
    return;
  }
  if (st.screen === 'spoon_ceremony') {
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'Escape') onSpoonCeremonyResolved();
    return;
  }

  // Fix #7 — Pause on Escape from any gameplay screen
  if (st.screen === 'paused') {
    if (evt.key === 'Escape') { resumeGame(); playClick(); return; }
    return;
  }

  if (st.screen === 'playing') {
    // CS-6: Ledger overlay open — ESC and L both close it; nothing else passes through
    if (st.ledgerOverlayOpen) {
      if (evt.key === 'Escape' || evt.key === 'l' || evt.key === 'L') closeLedger();
      return;
    }
    // CS-3: P opens Pivot Table (hotkey source); L opens Ledger overlay
    if (evt.key === 'p' || evt.key === 'P') {
      if (canOpenOverlay()) triggerPivotTable('hotkey');
      return;
    }
    if (evt.key === 'l' || evt.key === 'L') {
      if (canOpenOverlay()) { st.ledgerOverlayOpen = true; playClick(); }
      return;
    }
    if (evt.key === 'Escape') { pauseGame(); playClick(); return; }
    if (evt.key === '1') { st.club = 'Driver'; playClick(); return; }
    if (evt.key === '2') { st.club = 'Iron'; playClick(); return; }
    if (evt.key === '3') { st.club = 'Putter'; playClick(); return; }
    if (st.boardOpen && (evt.key === 'Enter' || evt.key === ' ')) { st.boardOpen = false; playClick(); return; }
    if ((evt.key === ' ' || evt.key === 'Enter') && !st.ballFlying && !st.boardOpen) {
      evt.preventDefault();
      if (st.swingPhase === 'ready') startPregate();
      else if (st.swingPhase === 'power') { st.swingPhase = 'accuracy'; st.dir = 1; playClick(); }
      else if (st.swingPhase === 'accuracy') { st.swingPhase = 'swinging'; st.swingAnim = 0; playClick(); }
    }
    return;
  }

  if (st.screen === 'worldmap') {
    if (evt.key === 'Escape') transitionTo('menu');
    if (evt.key >= '1' && evt.key <= '8') {
      const num = parseInt(evt.key, 10);
      if (num <= st.strategyOffers.length) applyStrategyOffer(num - 1);
      else enterWorld(num);
    }
    return;
  }

  if (st.screen === 'watch' && evt.key === 'Escape') { transitionTo('menu'); playClick(); return; }
  if (st.screen === 'jobfair') {
    if (evt.key === 'Escape') { transitionTo('menu'); playClick(); return; }
    // USER-PLAYTEST-FIX — keyboard scrolling for the fair
    if (evt.key === 'ArrowUp') { st.jobFairScroll = (st.jobFairScroll || 0) - 90; clampJobFairScroll(); return; }
    if (evt.key === 'ArrowDown') { st.jobFairScroll = (st.jobFairScroll || 0) + 90; clampJobFairScroll(); return; }
    return;
  }
  if (st.screen === 'bench' && evt.key === 'Escape') { transitionTo('menu'); playClick(); return; }
  if (st.screen === 'training' && evt.key === 'Escape') {
    if (st.trainingMini) {
      cleanupMini(st.trainingMini);
      st.trainingMini = null;
    }
    else transitionTo('arcade'); // USER-PLAYTEST-FIX — camp lives under the arcade
    playClick();
    return;
  }
  if (st.screen === 'arcade' && evt.key === 'Escape') {
    if (st.arcadePhase === 'play') st.arcadePhase = 'result';
    else {
      cleanupMini(st.arcadeMini);
      transitionTo('menu');
    }
    playClick();
    return;
  }
  // CS-7: gameover ceremony key handling — any key advances phases; ESC skips to menu
  if (st.screen === 'gameover') {
    if (evt.key === 'Escape') {
      transitionTo('menu'); refreshMenuContinueState(); playClick();
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      clickGameOver(W / 2, H / 2); // simulate centre click to advance phase
    }
    return;
  }
  if (st.screen === 'footnotes') {
    if (evt.key === 'Escape') {
      transitionTo('menu');
      playClick();
      return;
    }
    if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      scrollFootnoteLedger(-64);
      playClick();
      return;
    }
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      scrollFootnoteLedger(64);
      playClick();
      return;
    }
    if (evt.key === 'Home') {
      evt.preventDefault();
      st.footnoteLedgerScroll = 0;
      clearFootnoteLedgerFocus();
      playClick();
      return;
    }
    if (evt.key === 'End') {
      evt.preventDefault();
      focusLatestArchitectFootnote();
      playClick();
      return;
    }
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      if (st.footnoteLedgerFocusId != null) {
        const didMarkRead = markArchitectFootnoteRead(st.footnoteLedgerFocusId);
        clearFootnoteLedgerFocus();
        const focused = focusLatestUnreadArchitectFootnote() || focusLatestArchitectFootnote();
        if (didMarkRead || focused) playClick();
      }
      return;
    }
    if (evt.key === 'l' || evt.key === 'L') {
      evt.preventDefault();
      const focused = focusLatestUnreadArchitectFootnote() || focusLatestArchitectFootnote();
      if (focused) playClick();
      return;
    }
    return;
  }

  if ((st.screen === 'leaderboard' || st.screen === 'credits' || st.screen === 'repo' || st.screen === 'shop' || st.screen === 'settings') && evt.key === 'Escape') {
    transitionTo('menu');
    playClick();
    return;
  }

  handleMiniKey(evt.key, true);
});

document.addEventListener('keyup', evt => {
  handleMiniKey(evt.key, false);
  handleMiniInput(evt);
});

// Fix #6 — Touch support on main canvas
let touchStart = null;
C.addEventListener('touchstart', (e) => {
  e.preventDefault();
  ensureAudio();
  const t = e.touches[0];
  const synthetic = { type: 'mousedown', clientX: t.clientX, clientY: t.clientY, key: null };
  const p = getCanvasPointer(synthetic);
  if (!p) return;
  touchStart = { x: t.clientX, y: t.clientY, t: performance.now(), mx: p.mx, my: p.my };
  st.mouseX = p.mx;
  st.mouseY = p.my;

  handleMiniInput(synthetic);

  // route touch as click for most screens
  onCanvasClick(p.mx, p.my);
}, { passive: false });

C.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const synthetic = { type: 'mousemove', clientX: t.clientX, clientY: t.clientY, key: null };
  const p = getCanvasPointer(synthetic);
  if (!p) return;
  st.mouseX = p.mx;
  st.mouseY = p.my;

  handleMiniInput(synthetic);
  routeMiniMotion(p.mx, p.my);
}, { passive: false });

C.addEventListener('touchend', (e) => {
  e.preventDefault();
  touchStart = null;
}, { passive: false });

// Fix #7 — Pause menu on Escape (already handled in keydown handler)
function pauseGame()  { st.prevScreen = st.screen; st.screen = 'paused'; }
function resumeGame() { st.screen = st.prevScreen || 'playing'; }

function drawPaused() {
  // Draw the underlying screen dimmed
  if (st.prevScreen === 'playing') drawPlaying(true);
  else drawBackground();
  rect(0, 0, W, H, 'rgba(0,0,0,0.75)');
  txt('⏸️ PAUSED', W / 2, H / 2 - 40, 22, COL.yel, true);
  txt('Press ESC to resume', W / 2, H / 2 + 10, 8, COL.cyan, false);
  drawButton(W / 2 - 80, H / 2 + 40, 160, 32, 'RESUME', true, COL.grn, true);
  drawButton(W / 2 - 80, H / 2 + 80, 160, 32, 'QUIT TO MENU', true, COL.red);
}

function gameLoop(ts) {
  const dt = Math.min(0.05, (ts - (st.lastTime || ts)) / 1000);
  st.lastTime = ts;
  if (st.screen !== 'paused') updateAll(dt);
  drawScreen();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
