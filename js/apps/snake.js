/* ══════════════════════════════════════════════
   DevOS — Snake Game App
   ══════════════════════════════════════════════ */

(function() {
'use strict';

function createSnake(container, windowId) {
  const id = windowId;
  const GRID = 20;

  container.innerHTML = `
    <div class="snake-app" id="snk-${id}">
      <div class="snake-hud">
        <div class="snake-stat">
          <div class="snake-stat-label">Score</div>
          <div class="snake-stat-value" id="snk-score-${id}">0</div>
        </div>
        <div class="snake-stat">
          <div class="snake-stat-label">Best</div>
          <div class="snake-stat-value hi" id="snk-best-${id}">0</div>
        </div>
        <div class="snake-stat">
          <div class="snake-stat-label">Level</div>
          <div class="snake-stat-value lv" id="snk-level-${id}">1</div>
        </div>
      </div>
      <canvas id="snk-canvas-${id}"></canvas>
      <div class="snake-hint" id="snk-hint-${id}">Press Space or Enter to start · WASD / Arrow Keys</div>
    </div>`;

  const canvas  = document.getElementById(`snk-canvas-${id}`);
  const ctx     = canvas.getContext('2d');
  const scoreEl = document.getElementById(`snk-score-${id}`);
  const bestEl  = document.getElementById(`snk-best-${id}`);
  const levelEl = document.getElementById(`snk-level-${id}`);
  const hintEl  = document.getElementById(`snk-hint-${id}`);

  // ── Sizing ──────────────────────────────────
  function resize() {
    const appEl = document.getElementById(`snk-${id}`);
    const size = Math.min(appEl.clientWidth - 24, appEl.clientHeight - 90);
    const cells = Math.floor(size / GRID);
    canvas.width  = cells * GRID;
    canvas.height = cells * GRID;
    canvas.dataset.cells = cells;
  }

  // ── State ────────────────────────────────────
  let snake, dir, nextDir, food, powerup, score, level, speed, raf, gameState;
  let bestScore = parseInt(localStorage.getItem('devos-snake-best') || '0');
  bestEl.textContent = bestScore;

  function getCells() { return parseInt(canvas.dataset.cells || '20'); }

  function initGame() {
    resize();
    const cells = getCells();
    const cx = Math.floor(cells / 2);
    snake    = [
      { x: cx, y: cx },
      { x: cx - 1, y: cx },
      { x: cx - 2, y: cx },
    ];
    dir      = { x: 1, y: 0 };
    nextDir  = { x: 1, y: 0 };
    score    = 0;
    level    = 1;
    speed    = 150;
    food     = spawnFood();
    powerup  = null;
    gameState = 'idle';
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    hintEl.textContent = 'Press Space or Enter to start · WASD / Arrow Keys';
    drawFrame();
  }

  function spawnFood() {
    const cells = getCells();
    let pos;
    do { pos = { x: randInt(0, cells-1), y: randInt(0, cells-1) }; }
    while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function spawnPowerup() {
    if (powerup || Math.random() > 0.3) return;
    const cells = getCells();
    const types = ['shrink', 'slow', 'points'];
    let pos;
    do { pos = { x: randInt(0, cells-1), y: randInt(0, cells-1) }; }
    while (snake.some(s => s.x === pos.x && s.y === pos.y) || (food.x === pos.x && food.y === pos.y));
    powerup = { ...pos, type: types[Math.floor(Math.random() * types.length)], life: 8000 };
  }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // ── Game loop ────────────────────────────────
  let lastTick = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (gameState !== 'running') return;

    if (powerup) {
      powerup.life -= (now - lastTick);
      if (powerup.life <= 0) powerup = null;
    }

    if (now - lastTick < speed) return;
    lastTick = now;

    dir = { ...nextDir };
    const head = { x: (snake[0].x + dir.x + getCells()) % getCells(),
                   y: (snake[0].y + dir.y + getCells()) % getCells() };

    // Collision with self
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver(); return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
      score += level * 10;
      scoreEl.textContent = score;
      food = spawnFood();
      spawnPowerup();
      // Level up every 5 foods
      const newLevel = Math.floor(score / 50) + 1;
      if (newLevel > level) {
        level = newLevel;
        levelEl.textContent = level;
        speed = Math.max(65, 150 - (level - 1) * 12);
      }
    } else {
      snake.pop();
    }

    // Eat powerup
    if (powerup && head.x === powerup.x && head.y === powerup.y) {
      if (powerup.type === 'shrink') {
        snake.splice(Math.max(2, Math.floor(snake.length / 2)));
      } else if (powerup.type === 'slow') {
        speed = Math.min(200, speed + 40);
        setTimeout(() => { speed = Math.max(65, speed - 40); }, 5000);
      } else if (powerup.type === 'points') {
        score += level * 25;
        scoreEl.textContent = score;
      }
      powerup = null;
    }

    drawFrame();
  }

  // ── Rendering ────────────────────────────────
  const COLORS = {
    bg:       '#030310',
    grid:     'rgba(124,58,237,0.07)',
    snake_h:  '#a78bfa',
    snake_b:  '#7c3aed',
    snake_t:  '#4c1d95',
    food:     '#f43f5e',
    food_glow:'rgba(244,63,94,0.4)',
    shrink:   '#06b6d4',
    slow:     '#f59e0b',
    points:   '#10b981',
  };

  function drawFrame() {
    const C = getCells();
    const W = canvas.width, H = canvas.height;
    const cell = W / C;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= C; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H);
      ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell);
      ctx.stroke();
    }

    // Food glow
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
    const fx = (food.x + 0.5) * cell, fy = (food.y + 0.5) * cell;
    const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, cell * 1.5 * pulse);
    gr.addColorStop(0, `rgba(244,63,94,${0.3 * pulse})`);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(fx, fy, cell * 1.5, 0, Math.PI * 2); ctx.fill();

    // Food
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.roundRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(food.x * cell + cell * 0.3, food.y * cell + cell * 0.3, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Power-up
    if (powerup) {
      const blink = Math.sin(Date.now() * 0.01) > 0;
      if (blink || powerup.life > 3000) {
        const px = (powerup.x + 0.5) * cell, py = (powerup.y + 0.5) * cell;
        const pc = COLORS[powerup.type];
        const pgr = ctx.createRadialGradient(px, py, 0, px, py, cell);
        pgr.addColorStop(0, pc + 'aa');
        pgr.addColorStop(1, 'transparent');
        ctx.fillStyle = pgr;
        ctx.beginPath(); ctx.arc(px, py, cell, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pc;
        ctx.beginPath();
        const s = cell * 0.35;
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py + s);
        ctx.lineTo(px - s, py + s);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.fillStyle = '#fff'; ctx.font = `bold ${cell * 0.3}px Inter`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const label = powerup.type === 'shrink' ? '↓' : powerup.type === 'slow' ? '⏳' : '✕2';
        ctx.fillText(label, px, py);
      }
    }

    // Snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const t = i / snake.length;
      // Color gradient head→tail
      const r = Math.round(167 - t * 50);
      const g = Math.round(139 - t * 95);
      const b = Math.round(250 - t * 130);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad*2, cell - pad*2, i === 0 ? 5 : 3);
      ctx.fill();

      // Head details
      if (i === 0) {
        // Eyes
        const eyeOffset = cell * 0.22;
        const eyeSize   = cell * 0.1;
        // Offset eyes based on direction
        const ex1 = s.x * cell + cell/2 + dir.y * eyeOffset - dir.x * eyeOffset;
        const ey1 = s.y * cell + cell/2 + dir.x * eyeOffset + dir.y * eyeOffset;
        const ex2 = s.x * cell + cell/2 - dir.y * eyeOffset - dir.x * eyeOffset;
        const ey2 = s.y * cell + cell/2 - dir.x * eyeOffset + dir.y * eyeOffset;
        ctx.fillStyle = '#1a0040';
        ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
        // Gleam
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(ex1 + eyeSize*0.3, ey1 - eyeSize*0.3, eyeSize*0.35, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2 + eyeSize*0.3, ey2 - eyeSize*0.3, eyeSize*0.35, 0, Math.PI*2); ctx.fill();
      }
    }

    // Overlay states
    if (gameState === 'idle') {
      drawOverlay('🐍 SNAKE', 'Press Space or Enter to Play', '#a78bfa');
    } else if (gameState === 'gameover') {
      drawOverlay('GAME OVER', `Score: ${score}  Best: ${bestScore}`, '#f87171', 'Press Space to Restart');
    } else if (gameState === 'paused') {
      drawOverlay('PAUSED', 'Press Space to Continue', '#67e8f9');
    }
  }

  function drawOverlay(title, sub, color, sub2 = '') {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = 'rgba(4,4,16,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(W * 0.1)}px Inter`;
    ctx.fillText(title, W/2, H/2 - W*0.08);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.round(W * 0.05)}px Inter`;
    ctx.fillText(sub, W/2, H/2 + W*0.02);
    if (sub2) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `${Math.round(W * 0.04)}px Inter`;
      ctx.fillText(sub2, W/2, H/2 + W*0.1);
    }
  }

  function gameOver() {
    gameState = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('devos-snake-best', bestScore);
      bestEl.textContent = bestScore;
    }
    drawFrame();
    hintEl.textContent = `Game Over! Score: ${score}`;
  }

  // ── Input ────────────────────────────────────
  const keyMap = {
    ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown:  { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
    ArrowLeft:  { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    ArrowRight: { x: 1,  y: 0 }, d: { x: 1,  y: 0 }, D: { x: 1,  y: 0 },
  };

  function onKey(e) {
    if (!document.getElementById(`snk-${id}`)) {
      document.removeEventListener('keydown', onKey); return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (gameState === 'idle' || gameState === 'gameover') {
        initGame();
        gameState = 'running';
        lastTick = performance.now();
        hintEl.textContent = 'WASD / Arrow Keys · P to Pause';
      } else if (gameState === 'running') {
        gameState = 'paused';
        drawFrame();
      } else if (gameState === 'paused') {
        gameState = 'running';
        lastTick = performance.now();
      }
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      if (gameState === 'running') { gameState = 'paused'; drawFrame(); }
      else if (gameState === 'paused') { gameState = 'running'; lastTick = performance.now(); }
    }
    const d = keyMap[e.key];
    if (!d || gameState !== 'running') return;
    // Prevent reversing
    if (d.x !== 0 && d.x === -dir.x) return;
    if (d.y !== 0 && d.y === -dir.y) return;
    e.preventDefault();
    nextDir = d;
  }

  document.addEventListener('keydown', onKey);

  // ── Start ──────────────────────────────────
  resize();
  raf = requestAnimationFrame(loop);
  initGame();

  // Cleanup
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
  };
}

window.Apps = window.Apps || {};
window.Apps.snake = {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  color: '#10b981',
  defaultWidth: 500,
  defaultHeight: 560,
  mount: createSnake,
};

})();
