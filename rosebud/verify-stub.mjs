// Stub harness: executes main.js under a minimal DOM/canvas/WebAudio stub,
// ticks the loop, visits every menu screen, and reports runtime errors.
// Run: node rosebud/verify-stub.mjs   (from the repo root or rosebud/)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'main.js'), 'utf8');

const noop = () => {};
const gradientStub = { addColorStop: noop };
const ctx2d = new Proxy({}, {
  get(t, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradientStub;
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  },
  set() { return true; }
});

function makeElement(tag = 'div') {
  return {
    tagName: tag,
    style: { cssText: '' },
    width: 0, height: 0, naturalWidth: 1, complete: true, value: '',
    getContext: () => ctx2d,
    appendChild: noop, insertBefore: noop, removeChild: noop, remove: noop,
    addEventListener: noop, removeEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 750, height: 560 }),
    toDataURL: () => 'data:,', click: noop,
    firstChild: null, classList: { add: noop, remove: noop },
    files: [],
  };
}

class ImageStub {
  constructor() { this.complete = true; this.naturalWidth = 1; }
  set src(v) { this._src = v; }
  get src() { return this._src; }
  addEventListener() {}
}

class AudioNodeStub {
  constructor() { this.gain = { value: 1, setValueAtTime: noop, linearRampToValueAtTime: noop, exponentialRampToValueAtTime: noop, cancelScheduledValues: noop }; this.frequency = { value: 0 }; }
  connect() {} start() {} stop() {}
}
class AudioContextStub {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createGain() { return new AudioNodeStub(); }
  createOscillator() { return new AudioNodeStub(); }
  resume() { return Promise.resolve(); }
}

const store = {};
const errors = [];
const sandbox = {
  console: { log: noop, warn: noop, error: (...a) => errors.push(a.join(' ')) },
  window: null,
  document: {
    getElementById: id => makeElement(id),
    createElement: tag => makeElement(tag),
    addEventListener: noop,
    readyState: 'complete',
  },
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  Image: ImageStub,
  performance: { now: () => Date.now() },
  requestAnimationFrame: cb => setTimeout(() => cb(Date.now()), 0),
  setTimeout, setInterval: (fn) => 0, clearInterval: noop, clearTimeout,
  AudioContext: AudioContextStub,
  navigator: { userAgent: 'stub' },
  Math, JSON, Object, Array, Set, Map, Promise, Date, String, Number, Boolean, RegExp, Error, Uint8ClampedArray, Proxy, Reflect,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.devicePixelRatio = 1;
sandbox.window.devicePixelRatio = 1;
sandbox.window.AudioContext = AudioContextStub;
sandbox.window.addEventListener = noop;

const context = vm.createContext(sandbox);
try {
  vm.runInContext(src, context, { filename: 'main.js' });
  console.log('LOAD: OK — no exceptions at top-level execution');
} catch (err) {
  console.log('LOAD FAILED:', err.stack || err.message);
  process.exit(1);
}

// Pull internals out for the census + screen smoke test
const probe = vm.runInContext(`({
  st, POWERUPS, ARCADE_GAME_IDS, MISS_STINGERS, WATCH_COMMENTARY_A, WATCH_COMMENTARY_B,
  getMenuItems, getFootnoteLedgerMetrics, refreshJobOffers, clampJobFairScroll,
  createWatchMatch, updateWatch, drawScreen, updateAll, transitionTo,
  createMinigameInstance, drawMenu, drawWorldMap, drawJobFair, drawArcade, drawWatch,
  drawSettings, drawCredits, drawFootnoteLedger, drawShop, startNewRun, MUSIC, musicTick, startMusic,
  FACTIONS, BUREAUCRACY_EVENTS, PITCH_DECK_GP3 : (typeof PITCH_DECK !== 'undefined' ? PITCH_DECK : null)
})`, context);

const results = [];
const check = (name, fn) => {
  try { fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', `${name} — ${e.message}`]); }
};

check('menu items form an exact 2-col grid (even count = 12)', () => {
  const n = probe.getMenuItems().length;
  if (n !== 12) throw new Error(`expected 12, got ${n}`);
});
check('powerup catalog has 8 entries', () => {
  if (probe.POWERUPS.length !== 8) throw new Error(`got ${probe.POWERUPS.length}`);
});
check('arcade lists 12 games incl. GP-8 variants', () => {
  if (probe.ARCADE_GAME_IDS.length !== 12) throw new Error(`got ${probe.ARCADE_GAME_IDS.length}`);
  for (const v of ['tax_shelter_tetris', 'stealth_mode', 'pivot_roulette'])
    if (!probe.ARCADE_GAME_IDS.includes(v)) throw new Error(`missing ${v}`);
});
check('footnote ledger view starts below the desk preview (PY+162)', () => {
  const m = probe.getFootnoteLedgerMetrics();
  if (m.viewY < m.PY + 160) throw new Error(`viewY ${m.viewY} overlaps preview ending at PY+152`);
  if (m.viewH <= 100) throw new Error(`viewH too small: ${m.viewH}`);
});
check('job fair produces 9 offers with stable cached lines', () => {
  probe.refreshJobOffers();
  const offers = probe.st.jobOffers;
  if (offers.length !== 9) throw new Error(`got ${offers.length}`);
  if (!offers.every(o => typeof o.line === 'string')) throw new Error('missing cached line');
});
check('job fair scroll clamps to reachable third row', () => {
  probe.st.jobFairScroll = 99999;
  const m = probe.clampJobFairScroll();
  if (probe.st.jobFairScroll !== m.maxScroll) throw new Error('clamp failed');
  if (m.maxScroll <= 0) throw new Error('no scroll range — third row unreachable');
});
check('watch ball stays inside the field for a full flight', () => {
  probe.createWatchMatch();
  probe.st.watch.phase = 'sim';
  probe.st.screen = 'watch';
  for (let i = 0; i < 400; i++) {
    probe.updateWatch(1 / 60);
    const bx = 146 + probe.st.watch.ballX;
    const by = 406 - probe.st.watch.ballZ;
    if (bx < 126 || bx > 624) throw new Error(`ball x out of field: ${bx}`);
    if (by < 262 || by > 430) throw new Error(`ball y out of field: ${by}`);
    if (probe.st.watch.phase === 'result') break;
  }
});
check('every menu screen draws one frame without throwing', () => {
  const screens = ['menu', 'worldmap', 'jobfair', 'bench', 'training', 'arcade', 'watch', 'repo', 'shop', 'settings', 'leaderboard', 'credits', 'footnotes'];
  for (const s of screens) {
    probe.st.screen = s;
    if (s === 'watch' && !probe.st.watch) probe.createWatchMatch();
    probe.drawScreen();
  }
  probe.st.screen = 'menu';
});
check('game loop ticks 300 frames without throwing', () => {
  probe.st.screen = 'menu';
  for (let i = 0; i < 300; i++) probe.updateAll(1 / 60);
});
check('a run starts and plays 300 frames without throwing', () => {
  probe.startNewRun(1);
  for (let i = 0; i < 300; i++) { probe.updateAll(1 / 60); probe.drawScreen(); }
});
check('music scheduler runs without throwing (on and muted)', () => {
  probe.startMusic();
  probe.st.settings.music = true;
  probe.musicTick();
  probe.st.settings.music = false;
  probe.musicTick();
  probe.st.settings.music = true;
});
check('GP-8 variant instances build from arcade ids', () => {
  for (const v of ['tax_shelter_tetris', 'stealth_mode', 'pivot_roulette']) {
    const inst = probe.createMinigameInstance(v);
    if (inst.variant !== v) throw new Error(`variant not preserved for ${v}`);
  }
});
check('frozen faction keys intact (11)', () => {
  const keys = Object.keys(probe.st.ledger);
  if (keys.length !== 11) throw new Error(`got ${keys.length}`);
});

let failed = 0;
for (const [status, name] of results) {
  console.log(`${status === 'PASS' ? '  ✓' : '  ✗'} ${name}`);
  if (status === 'FAIL') failed++;
}
if (errors.length) console.log('console.error output during run:', errors.slice(0, 5));
console.log(failed === 0 ? 'ALL CHECKS PASSED' : `${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
