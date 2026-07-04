const fs = require('fs');

const mainJs = fs.readFileSync('main.js', 'utf8');
const startMatch = '// ============================================================\n// PHASE 2 — 9 FULLY-IMPLEMENTED ARCADE GAMES\n// Each returns the minigame contract: update, render, handleMouse, handleKey,\n// getPerformance()->{angleDeviation,powerBoost,chaosFactor}, getScore(), isDone(), cleanup()\n// ============================================================';
const endMatch = '// ============================================================\n// PHASE 2 — Performance → swing modifier export\n// ============================================================';

const startIdx = mainJs.indexOf(startMatch);
const endIdx = mainJs.indexOf(endMatch);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

const replacement = `// ============================================================
// PHASE 2 — 9 FULLY-IMPLEMENTED ARCADE GAMES
// ============================================================

const KPI_BRICKS = ['Rev','CAC','NPS','MRR','ARR','DAU','MAU','LTV','GMV','AOV','CVR','CTR'];
const HIERARCHY_2048 = ['Intern','Junior','Mid','Senior','Staff','Principal','VP','CTO','CEO','Board','Sam'];
const TETRIS_DEPTS = ['ENG','MKT','OPS','HR','FIN','LEG','CEO'];
const PASSWORD_PAIRS = ['🔑','🔒','💾','📧','🛡️','⚡','💻','📱'];
const KAREN_NAMES = ['Karen from Legal','VP of Vibes','Chief Synergy Officer','Regional Disruptor','Agile Ambassador'];
const TTT_QUESTIONS = ['Invert a binary tree?','FizzBuzz in O(1)?','Explain DNS to a VP?','Design Twitter in 5 min?','Why manhole covers?','Reverse a linked list?'];
const CATCH_ITEMS_FLAVOR = [
  { sprite: 'nugget.png', rarity: 0.4 },
  { sprite: 'biscuit.png', rarity: 0.3 },
  { sprite: 'fries.png', rarity: 0.2 },
  { sprite: 'karen_yelp.png', rarity: 0.1 }
];
const RPS_CHOICES = [
  { id: 'rock', label: 'ROCK', beats: 'scissors' },
  { id: 'paper', label: 'PAPER', beats: 'rock' },
  { id: 'scissors', label: 'SCISSORS', beats: 'paper' }
];
const FLAPPY_HAZARDS = ['OSHA', 'FAA', 'BOARD', 'LEGAL', 'KAREN', 'TWEET'];

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

function drawCorporateTimer(ctx, w, msRemaining) {
  const sec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mini = getActiveMini();
  const idx = (mini && mini._timerVariantIdx) || 0;
  const text = TIMER_VARIATIONS[idx % TIMER_VARIATIONS.length].replace('{X}', sec);
  ctx.fillStyle = sec <= 5 ? '#f33' : '#ff0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(text, w - 6, 14);
  ctx.textAlign = 'left';
}

function buildPong(ctx) {
  const state = {
    ballX:150, ballY:100, vx:2.4, vy:1.8,
    playerY:80, aiY:80, paddleH:40,
    rallies:0, lives:3,
    karenSprite: loadSprite('sprites/karen_pong.png'),
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
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
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

function buildBreakout(ctx) {
  const bricks = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    bricks.push({ x: 4+c*36, y: 20+r*14, w: 34, h: 12, alive: true,
                  label: KPI_BRICKS[(r*8+c) % KPI_BRICKS.length] });
  }
  const state = { ballX:150, ballY:150, vx:2, vy:-2.5, paddleX:130, paddleW:50, broken:0 };
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
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
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

function buildCatch(ctx) {
  const ITEMS = CATCH_ITEMS_FLAVOR.map(f => ({ ...f, sprite: loadSprite('sprites/'+f.sprite) }));
  function pickItem() {
    const r = Math.random(); let acc = 0;
    for (const it of ITEMS) { acc += it.rarity; if (r < acc) return it; }
    return ITEMS[0];
  }
  const state = { basketX:130, falling:[], caught:0, dropped:0, spawnT:0 };
  const TIMER = 18000;
  return {
    id:'catch', label:MINIGAME_LABELS.catch, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      state.spawnT -= dt*1000;
      if (state.spawnT <= 0) {
        state.spawnT = 600 + Math.random()*400;
        state.falling.push({ x:20+Math.random()*260, y:0, vy:90+Math.random()*40, item:pickItem() });
      }
      state.falling.forEach(f => f.y += f.vy * dt);
      state.falling = state.falling.filter(f => {
        if (f.y > 175 && f.y < 195 && f.x > state.basketX && f.x < state.basketX+50) {
          state.caught++; this._score = Math.min(100, state.caught * 6); return false;
        }
        if (f.y > 200) { state.dropped++; return false; }
        return true;
      });
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#3a2a1a'; ctx.fillRect(0,0,w,h);
      state.falling.forEach(f => drawSprite(f.item.sprite, f.x, f.y, 16, 16));
      ctx.fillStyle='#a52'; ctx.fillRect(state.basketX, 180, 50, 14);
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('Caught: '+state.caught, 4, 12);
      ctx.fillText('Dropped: '+state.dropped, 4, 24);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft')  state.basketX = Math.max(0, state.basketX-14);
        if (evt.key === 'ArrowRight') state.basketX = Math.min(250, state.basketX+14);
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(18,-12,n), powerBoost:lerp(-0.10,0.20,n), chaosFactor:lerp(0.5,0.05,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildFlappy(ctx) {
  const state = {
    droneY:100, vy:0, pipes:[], passed:0,
    sprite: loadSprite('sprites/drone.png'), spawnT:0
  };
  const TIMER = 22000;
  return {
    id:'flappy', label:MINIGAME_LABELS.flappy, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      state.vy += 320 * dt; state.droneY += state.vy * dt;
      state.spawnT -= dt*1000;
      if (state.spawnT <= 0) {
        state.spawnT = 1400;
        const gapY = 50 + Math.random()*100;
        const hazard = FLAPPY_HAZARDS[Math.floor(Math.random()*FLAPPY_HAZARDS.length)];
        state.pipes.push({ x:300, gapY, w:24, gap:60, passed:false, hazard });
      }
      state.pipes.forEach(p => p.x -= 90 * dt);
      state.pipes = state.pipes.filter(p => {
        if (!p.passed && p.x + p.w < 30) {
          p.passed = true; state.passed++;
          this._score = Math.min(100, state.passed * 12);
        }
        return p.x > -30;
      });
      for (const p of state.pipes) {
        if (p.x < 40 && p.x + p.w > 20) {
          if (state.droneY < p.gapY || state.droneY > p.gapY + p.gap) this._ended = true;
        }
      }
      if (state.droneY < 0 || state.droneY > 200 || this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#558'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#3a3';
      state.pipes.forEach(p => {
        ctx.fillRect(p.x, 0, p.w, p.gapY);
        ctx.fillRect(p.x, p.gapY+p.gap, p.w, 200-p.gapY-p.gap);
        ctx.fillStyle='#ff0'; ctx.font='6px monospace';
        ctx.fillText(p.hazard, p.x-2, p.gapY+30);
        ctx.fillStyle='#3a3';
      });
      drawSprite(state.sprite, 18, state.droneY-8, 20, 16);
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('Deliveries: '+state.passed, 4, 12);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown' && (evt.key === ' ' || evt.key === 'ArrowUp')) state.vy = -150;
      else if (evt.type === 'click') state.vy = -150;
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(22,-8,n), powerBoost:lerp(-0.18,0.22,n), chaosFactor:lerp(0.65,0.08,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildMemory(ctx) {
  const cards = [];
  PASSWORD_PAIRS.concat(PASSWORD_PAIRS).sort(() => Math.random()-0.5).forEach((pw,i) => {
    cards.push({ pw, faceUp:false, matched:false,
                 x:(i%4)*70+12, y:Math.floor(i/4)*42+22, w:64, h:36 });
  });
  const state = { cards, flipped:[], matchCount:0, attempts:0, lockUntil:0 };
  const TIMER = 28000;
  return {
    id:'memory', label:MINIGAME_LABELS.memory, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      if (state.lockUntil && this._elapsed >= state.lockUntil) {
        if (state.flipped.length === 2) {
          const [a,b] = state.flipped;
          if (a.pw === b.pw) { a.matched=b.matched=true; state.matchCount++; }
          else { a.faceUp=b.faceUp=false; }
          state.flipped = []; state.lockUntil = 0;
        }
      }
      this._score = Math.min(100, state.matchCount * 12.5);
      if (state.matchCount === 8 || this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#222'; ctx.fillRect(0,0,w,h);
      state.cards.forEach(c => {
        ctx.fillStyle = c.matched ? '#363' : (c.faceUp ? '#fff' : '#46a');
        ctx.fillRect(c.x, c.y, c.w, c.h);
        if (c.faceUp || c.matched) {
          ctx.fillStyle='#000'; ctx.font='8px monospace';
          ctx.fillText(c.pw, c.x+4, c.y+22);
        }
      });
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('Matched: '+state.matchCount+'/8', 4, 12);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type !== 'click' || state.lockUntil) return;
      const card = state.cards.find(c => !c.faceUp && !c.matched
        && evt.localX > c.x && evt.localX < c.x+c.w
        && evt.localY > c.y && evt.localY < c.y+c.h);
      if (!card) return;
      card.faceUp = true;
      state.flipped.push(card);
      if (state.flipped.length === 2) {
        state.attempts++;
        state.lockUntil = this._elapsed + 700;
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(15,-15,n), powerBoost:lerp(-0.12,0.18,n), chaosFactor:lerp(0.55,0.05,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildRps(ctx) {
  const state = { round:0, wins:0, losses:0, lastResult:'' };
  const TIMER = 20000;
  return {
    id:'rps', label:MINIGAME_LABELS.rps, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      this._score = Math.min(100, state.wins * 20);
      if (state.round >= 5 || this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#1a2a1a'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#fff'; ctx.font='11px monospace';
      ctx.fillText('TERM SHEET ROUND '+(state.round+1)+'/5', 60, 30);
      ctx.fillText('Wins: '+state.wins+'  Losses: '+state.losses, 70, 48);
      RPS_CHOICES.forEach((c, i) => {
        ctx.fillStyle='#446';
        ctx.fillRect(20 + i*90, 100, 76, 50);
        ctx.fillStyle='#fff'; ctx.font='10px monospace';
        ctx.fillText(c.label, 28+i*90, 130);
        ctx.fillText('['+(i+1)+']', 50+i*90, 144);
      });
      if (state.lastResult) {
        ctx.fillStyle='#ff0'; ctx.font='10px monospace';
        ctx.fillText(state.lastResult, 80, 175);
      }
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        const i = ['1','2','3'].indexOf(evt.key);
        if (i >= 0) this.pick(i);
      } else if (evt.type === 'click') {
        for(let i=0; i<3; i++) {
          if (evt.localX > 20 + i*90 && evt.localX < 96 + i*90 && evt.localY > 100 && evt.localY < 150) this.pick(i);
        }
      }
    },
    pick(i) {
      const player = RPS_CHOICES[i];
      const ai = RPS_CHOICES[Math.floor(Math.random()*3)];
      if (player.id === ai.id) state.lastResult = 'TIE: redraft.';
      else if (player.beats === ai.id) {
        state.wins++; state.lastResult = 'WIN: '+player.label+' beats '+ai.label;
      } else {
        state.losses++; state.lastResult = 'LOSS: '+ai.label+' beats '+player.label;
      }
      state.round++;
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(20,-20,n), powerBoost:lerp(-0.22,0.25,n), chaosFactor:lerp(0.7,0.05,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildTetris(ctx) {
  const COLS = 10, ROWS = 16, CELL = 12;
  const SHAPES = [
    [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]]
  ];
  const grid = Array.from({length:ROWS}, () => Array(COLS).fill(0));
  const state = { piece:null, dept:'', px:4, py:0, fallT:0, lines:0, _gameOver:false };
  function newPiece() {
    const i = Math.floor(Math.random()*7);
    state.piece = SHAPES[i].map(r => r.slice());
    state.dept = TETRIS_DEPTS[i]; state.px = 4; state.py = 0;
  }
  function collides(piece, ox, oy) {
    for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
      if (!piece[r][c]) continue;
      const x = ox+c, y = oy+r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && grid[y][x]) return true;
    }
    return false;
  }
  function lock() {
    state.piece.forEach((row,r) => row.forEach((v,c) => {
      if (v && state.py+r >= 0) grid[state.py+r][state.px+c] = state.dept;
    }));
    for (let y = ROWS-1; y >= 0; y--) {
      if (grid[y].every(v => v)) {
        grid.splice(y, 1); grid.unshift(Array(COLS).fill(0));
        state.lines++; y++;
      }
    }
    newPiece();
    if (collides(state.piece, state.px, state.py)) state._gameOver = true;
  }
  newPiece();
  const TIMER = 30000;
  return {
    id:'tetris', label:MINIGAME_LABELS.tetris, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      state.fallT += dt*1000;
      if (state.fallT > 600) {
        state.fallT = 0;
        if (collides(state.piece, state.px, state.py+1)) lock();
        else state.py++;
      }
      this._score = Math.min(100, state.lines * 20);
      if (state._gameOver || this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,w,h);
      const ox = 90;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          ctx.fillStyle='#3a8'; ctx.fillRect(ox+c*CELL, r*CELL, CELL-1, CELL-1);
          ctx.fillStyle='#fff'; ctx.font='6px monospace';
          ctx.fillText(grid[r][c], ox+c*CELL+1, r*CELL+8);
        }
      }
      ctx.fillStyle='#f80';
      state.piece.forEach((row,r) => row.forEach((v,c) => {
        if (v) ctx.fillRect(ox+(state.px+c)*CELL, (state.py+r)*CELL, CELL-1, CELL-1);
      }));
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('REORGS: '+state.lines, 4, 12);
      ctx.fillText('DEPT: '+state.dept, 4, 26);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft'  && !collides(state.piece, state.px-1, state.py)) state.px--;
        if (evt.key === 'ArrowRight' && !collides(state.piece, state.px+1, state.py)) state.px++;
        if (evt.key === 'ArrowDown'  && !collides(state.piece, state.px, state.py+1)) state.py++;
        if (evt.key === 'ArrowUp' || evt.key === ' ') {
          const rotated = state.piece[0].map((_,i) => state.piece.map(r => r[i]).reverse());
          if (!collides(rotated, state.px, state.py)) state.piece = rotated;
        }
      } else if (evt.type === 'click') {
        const rotated = state.piece[0].map((_,i) => state.piece.map(r => r[i]).reverse());
        if (!collides(rotated, state.px, state.py)) state.piece = rotated;
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(22,-10,n), powerBoost:lerp(-0.20,0.25,n), chaosFactor:lerp(0.7,0.10,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildTtt(ctx) {
  const board = Array(9).fill(null);
  const state = {
    turn:'X', winner:null,
    question: TTT_QUESTIONS[Math.floor(Math.random()*TTT_QUESTIONS.length)]
  };
  function checkWin(b, p) {
    const W = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return W.some(line => line.every(i => b[i] === p));
  }
  function aiMove() {
    for (const p of ['O','X']) {
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = p;
          if (checkWin(board, p)) {
            if (p === 'O') return;
            board[i] = null; continue;
          }
          board[i] = null;
        }
      }
    }
    const empty = board.map((v,i) => v ? null : i).filter(v => v !== null);
    if (empty.length) board[empty[Math.floor(Math.random()*empty.length)]] = 'O';
  }
  const TIMER = 18000;
  return {
    id:'ttt', label:MINIGAME_LABELS.ttt, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      if (!state.winner) {
        if (checkWin(board, 'X'))      { state.winner='X';    this._score=100; this._ended=true; }
        else if (checkWin(board, 'O')) { state.winner='O';    this._score=20;  this._ended=true; }
        else if (board.every(v => v))  { state.winner='draw'; this._score=50;  this._ended=true; }
      }
      if (this._elapsed >= TIMER) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#222';
      const ox = 90, oy = 30, cell = 40;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ox+i*cell, oy); ctx.lineTo(ox+i*cell, oy+3*cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, oy+i*cell); ctx.lineTo(ox+3*cell, oy+i*cell); ctx.stroke();
      }
      ctx.font='24px monospace'; ctx.fillStyle='#222';
      board.forEach((v,i) => {
        if (!v) return;
        const cx = ox + (i%3)*cell + 12, cy = oy + Math.floor(i/3)*cell + 30;
        ctx.fillText(v, cx, cy);
      });
      ctx.fillStyle='#222'; ctx.font='9px monospace';
      ctx.fillText(state.question, 4, 12);
      if (state.winner) ctx.fillText('Result: '+state.winner, 4, 192);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'click' && !state.winner) {
        const ox = 90, oy = 30, cell = 40;
        const cx = Math.floor((evt.localX - ox) / cell);
        const cy = Math.floor((evt.localY - oy) / cell);
        if (cx >= 0 && cx <= 2 && cy >= 0 && cy <= 2) {
          const i = cy*3 + cx;
          if (!board[i]) {
            board[i] = 'X';
            if (!checkWin(board,'X') && !board.every(v => v)) aiMove();
          }
        }
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(25,-15,n), powerBoost:lerp(-0.20,0.25,n), chaosFactor:lerp(0.65,0.05,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}

function buildTwentyForty(ctx) {
  let grid = Array.from({length:4}, () => Array(4).fill(0));
  function spawn() {
    const empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r,c]);
    if (!empty.length) return false;
    const [r,c] = empty[Math.floor(Math.random()*empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 1 : 2;
    return true;
  }
  spawn(); spawn();
  function slide(row) {
    const filtered = row.filter(v => v);
    for (let i = 0; i < filtered.length-1; i++) {
      if (filtered[i] === filtered[i+1]) { filtered[i]++; filtered[i+1] = 0; }
    }
    const result = filtered.filter(v => v);
    while (result.length < 4) result.push(0);
    return result;
  }
  function move(dir) {
    const before = JSON.stringify(grid);
    if (dir === 'left')  grid = grid.map(slide);
    if (dir === 'right') grid = grid.map(r => slide(r.slice().reverse()).reverse());
    if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        const s = slide(col);
        for (let r = 0; r < 4; r++) grid[r][c] = s[r];
      }
    }
    if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        const s = slide(col);
        for (let r = 0; r < 4; r++) grid[3-r][c] = s[r];
      }
    }
    if (JSON.stringify(grid) !== before) spawn();
  }
  const state = { highest: 1 };
  const TIMER = 30000;
  return {
    id:'twentyforty', label:MINIGAME_LABELS.twentyforty, timerMs:TIMER,
    _elapsed:0, _score:0, _ended:false,
    update(dt) {
      this._elapsed += dt*1000;
      let h = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] > h) h = grid[r][c];
      state.highest = h;
      this._score = Math.min(100, h * 10);
      if (this._elapsed >= TIMER || h >= 10) this._ended = true;
    },
    render(ctx, x, y, w, h) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle='#2a1a0a'; ctx.fillRect(0,0,w,h);
      const cell = 40, ox = 70, oy = 18;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const v = grid[r][c];
        ctx.fillStyle = v ? '#a85' : '#332';
        ctx.fillRect(ox+c*cell, oy+r*cell, cell-2, cell-2);
        if (v) {
          ctx.fillStyle='#fff'; ctx.font='8px monospace';
          ctx.fillText(HIERARCHY_2048[v] || v, ox+c*cell+2, oy+r*cell+22);
        }
      }
      ctx.fillStyle='#fff'; ctx.font='10px monospace';
      ctx.fillText('Highest: '+(HIERARCHY_2048[state.highest]||state.highest), 4, 12);
      drawCorporateTimer(ctx, w, TIMER - this._elapsed);
      ctx.restore();
    },
    handleInput(evt) {
      if (evt.type === 'keydown') {
        if (evt.key === 'ArrowLeft')  move('left');
        if (evt.key === 'ArrowRight') move('right');
        if (evt.key === 'ArrowUp')    move('up');
        if (evt.key === 'ArrowDown')  move('down');
      } else if (evt.type === 'click') {
        if (evt.localY < 100) move('up');
        else if (evt.localY > 160) move('down');
        else if (evt.localX < 100) move('left');
        else move('right');
      }
    },
    getPerformance() {
      const n = clamp(this._score/100, 0, 1);
      return { angleDeviation:lerp(20,-12,n), powerBoost:lerp(-0.18,0.22,n), chaosFactor:lerp(0.6,0.08,n) };
    },
    getScore() { return this._score; },
    isDone() { return this._ended; },
    cleanup() {}
  };
}
`;

fs.writeFileSync('main.js', mainJs.substring(0, startIdx) + replacement + mainJs.substring(endIdx));
console.log('Script ran successfully');
