/* ══════════════════════════════════════════════
   DevOS — Neural Network Visualizer
   ══════════════════════════════════════════════ */

(function() {
'use strict';

function createNeural(container, windowId) {
  const id = windowId;

  container.innerHTML = `
    <div class="neural-app" id="nn-${id}">
      <div class="neural-viz-area" id="nn-viz-${id}">
        <canvas id="nn-canvas-${id}"></canvas>
      </div>
      <div class="neural-panel">
        <div class="neural-panel-section">
          <div class="neural-panel-title">Architecture</div>
          <div class="ctrl-group">
            <div class="ctrl-label"><span>Network</span></div>
            <select class="ctrl-select" id="nn-arch-${id}">
              <option value="3,5,5,2">Classifier  3→5→5→2</option>
              <option value="4,8,8,8,1">Regressor  4→8→8→8→1</option>
              <option value="2,6,6,6,6,1">Deep  2→6→6→6→6→1</option>
              <option value="1,4,8,4,1">Autoencoder  1→4→8→4→1</option>
              <option value="3,10,10,10,3">Wide  3→10→10→10→3</option>
            </select>
          </div>
          <div class="ctrl-group">
            <div class="ctrl-label">
              <span>Learning Rate</span>
              <span class="ctrl-val" id="nn-lr-val-${id}">0.010</span>
            </div>
            <input type="range" class="ctrl-range" id="nn-lr-${id}" min="1" max="100" value="10">
          </div>
          <div class="ctrl-group">
            <div class="ctrl-label">
              <span>Activation</span>
            </div>
            <select class="ctrl-select" id="nn-act-${id}">
              <option value="relu">ReLU</option>
              <option value="sigmoid">Sigmoid</option>
              <option value="tanh">Tanh</option>
              <option value="leaky">Leaky ReLU</option>
            </select>
          </div>
        </div>
        <div class="neural-panel-section">
          <div class="neural-panel-title">Training</div>
          <div class="neural-stats">
            <div class="neural-stat">
              <div class="neural-stat-label">Epoch</div>
              <div class="neural-stat-value" id="nn-epoch-${id}">0</div>
            </div>
            <div class="neural-stat">
              <div class="neural-stat-label">Loss</div>
              <div class="neural-stat-value" style="color:var(--red)" id="nn-loss-${id}">—</div>
            </div>
            <div class="neural-stat">
              <div class="neural-stat-label">Acc</div>
              <div class="neural-stat-value" style="color:var(--green)" id="nn-acc-${id}">—</div>
            </div>
            <div class="neural-stat">
              <div class="neural-stat-label">Speed</div>
              <div class="neural-stat-value" style="color:var(--amber)" id="nn-speed-${id}">—</div>
            </div>
          </div>
          <button class="neural-train-btn" id="nn-btn-${id}">▶ Start Training</button>
        </div>
        <div class="neural-panel-section">
          <div class="neural-panel-title">Loss Curve</div>
          <div class="chart-wrap">
            <div class="chart-label" id="nn-chart-lbl-${id}">Training in progress...</div>
            <canvas id="nn-chart-${id}" height="100"></canvas>
          </div>
        </div>
        <div class="neural-panel-section" style="border-bottom:none">
          <div class="neural-panel-title">Legend</div>
          <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--tx2)">
            <div>🟣 <span>Purple node: High activation</span></div>
            <div>🔵 <span>Blue node: Low activation</span></div>
            <div>— <span>Line opacity = weight strength</span></div>
            <div>✦ <span>Particle = data propagating</span></div>
          </div>
        </div>
      </div>
    </div>`;

  const vizArea  = document.getElementById(`nn-viz-${id}`);
  const canvas   = document.getElementById(`nn-canvas-${id}`);
  const ctx      = canvas.getContext('2d');
  const chart    = document.getElementById(`nn-chart-${id}`);
  const chartCtx = chart.getContext('2d');
  const archSel  = document.getElementById(`nn-arch-${id}`);
  const lrSlider = document.getElementById(`nn-lr-${id}`);
  const lrVal    = document.getElementById(`nn-lr-val-${id}`);
  const actSel   = document.getElementById(`nn-act-${id}`);
  const btn      = document.getElementById(`nn-btn-${id}`);
  const epochEl  = document.getElementById(`nn-epoch-${id}`);
  const lossEl   = document.getElementById(`nn-loss-${id}`);
  const accEl    = document.getElementById(`nn-acc-${id}`);
  const speedEl  = document.getElementById(`nn-speed-${id}`);
  const chartLbl = document.getElementById(`nn-chart-lbl-${id}`);

  // ── State ────────────────────────────────────
  let layers = [3, 5, 5, 2];
  let weights = [];   // [layerIdx][fromNode][toNode]
  let activations = []; // [layerIdx][nodeIdx]  0..1
  let particles = [];
  let raf, training = false;
  let epoch = 0, loss = 1.0, acc = 0;
  let lossHistory = [];
  let accHistory  = [];
  let lastEpochTime = 0;
  let lr = 0.01;
  const MAX_HISTORY = 80;

  function parseArch(str) {
    return str.split(',').map(Number);
  }

  function initWeights() {
    weights = [];
    activations = [];
    for (let i = 0; i < layers.length; i++) {
      activations.push(new Array(layers[i]).fill(0).map(() => Math.random()));
      if (i < layers.length - 1) {
        const layer = [];
        for (let j = 0; j < layers[i]; j++) {
          layer.push(new Array(layers[i+1]).fill(0).map(() => (Math.random() - 0.5) * 2));
        }
        weights.push(layer);
      }
    }
  }

  function resetTraining() {
    epoch = 0; loss = 1.0; acc = 0;
    lossHistory = []; accHistory = [];
    epochEl.textContent = '0'; lossEl.textContent = '—'; accEl.textContent = '—'; speedEl.textContent = '—';
    initWeights();
    drawChart();
  }

  // ── Rendering ────────────────────────────────
  function resize() {
    canvas.width  = vizArea.clientWidth  || 500;
    canvas.height = vizArea.clientHeight || 400;
    chart.width   = chart.parentElement.clientWidth || 186;
  }

  function nodePositions() {
    const W = canvas.width, H = canvas.height;
    const marginX = 60, marginY = 30;
    const positions = [];
    for (let li = 0; li < layers.length; li++) {
      const count = layers[li];
      const x = marginX + li * ((W - marginX * 2) / (layers.length - 1));
      const layerPos = [];
      for (let ni = 0; ni < count; ni++) {
        const y = marginY + (ni + 0.5) * ((H - marginY * 2) / count);
        layerPos.push({ x, y });
      }
      positions.push(layerPos);
    }
    return positions;
  }

  function drawNetwork() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#030310');
    bg.addColorStop(1, '#050518');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const pos = nodePositions();
    const maxNodes = Math.max(...layers);

    // ── Draw connections ──────────────────────
    for (let li = 0; li < layers.length - 1; li++) {
      for (let ni = 0; ni < layers[li]; ni++) {
        for (let nj = 0; nj < layers[li+1]; nj++) {
          const w = weights[li]?.[ni]?.[nj] ?? 0;
          const from = pos[li][ni];
          const to   = pos[li+1][nj];
          const strength = Math.abs(w) / 2;
          const alpha = Math.min(0.7, 0.05 + strength * 0.6);
          const positive = w > 0;

          const grd = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
          if (positive) {
            grd.addColorStop(0, `rgba(124,58,237,${alpha})`);
            grd.addColorStop(1, `rgba(6,182,212,${alpha})`);
          } else {
            grd.addColorStop(0, `rgba(239,68,68,${alpha * 0.8})`);
            grd.addColorStop(1, `rgba(236,72,153,${alpha * 0.8})`);
          }
          ctx.strokeStyle = grd;
          ctx.lineWidth = 0.5 + strength;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    }

    // ── Draw particles ─────────────────────────
    for (const p of particles) {
      const fromPos = pos[p.fromLayer]?.[p.fromNode];
      const toPos   = pos[p.toLayer]?.[p.toNode];
      if (!fromPos || !toPos) continue;
      const t = p.progress;
      const x = fromPos.x + (toPos.x - fromPos.x) * t;
      const y = fromPos.y + (toPos.y - fromPos.y) * t;
      const alpha = Math.sin(t * Math.PI) * 0.9;
      const pgrd = ctx.createRadialGradient(x, y, 0, x, y, 5);
      pgrd.addColorStop(0, `rgba(255,255,255,${alpha})`);
      pgrd.addColorStop(0.4, `rgba(167,139,250,${alpha * 0.6})`);
      pgrd.addColorStop(1, 'transparent');
      ctx.fillStyle = pgrd;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Draw nodes ────────────────────────────
    const nodeRadius = Math.max(6, Math.min(18, Math.round(160 / maxNodes)));

    for (let li = 0; li < layers.length; li++) {
      for (let ni = 0; ni < layers[li]; ni++) {
        const { x, y } = pos[li][ni];
        const act = activations[li]?.[ni] ?? 0;

        // Glow
        const glowR = nodeRadius * 2.5;
        const glowA = 0.15 + act * 0.35;
        const glowGrd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glowGrd.addColorStop(0, `rgba(124,58,237,${glowA})`);
        glowGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrd;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Node circle
        const nodeGrd = ctx.createRadialGradient(x - nodeRadius*0.2, y - nodeRadius*0.2, 0, x, y, nodeRadius);
        const r = Math.round(50  + act * 117);
        const g = Math.round(20  + act * 50);
        const b = Math.round(100 + act * 150);
        nodeGrd.addColorStop(0, `rgba(${r+80},${g+60},${b+50},1)`);
        nodeGrd.addColorStop(1, `rgba(${r},${g},${b},1)`);
        ctx.fillStyle = nodeGrd;
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(167,139,250,${0.2 + act * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Value text for output nodes
        if (li === layers.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = `bold 10px Inter`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(act.toFixed(2), x, y);
        }
      }
    }

    // ── Layer labels ──────────────────────────
    const labels = ['Input', ...new Array(layers.length - 2).fill(null).map((_, i) => `Hidden ${i+1}`), 'Output'];
    for (let li = 0; li < layers.length; li++) {
      const { x } = pos[li][0];
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(labels[li], x, 16);
      ctx.fillText(`(${layers[li]})`, x, H - 8);
    }
  }

  function drawChart() {
    const W = chart.width, H = chart.height;
    chartCtx.clearRect(0, 0, W, H);
    chartCtx.fillStyle = 'rgba(255,255,255,0.03)';
    chartCtx.fillRect(0, 0, W, H);

    if (lossHistory.length < 2) return;

    // Grid lines
    chartCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    chartCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      chartCtx.beginPath();
      chartCtx.moveTo(0, y); chartCtx.lineTo(W, y);
      chartCtx.stroke();
    }

    // Loss curve (red)
    drawCurve(chartCtx, lossHistory, W, H, '#f87171', 1.0, 0);
    // Acc curve (green, inverted loss scale = acc 0..1)
    drawCurve(chartCtx, accHistory, W, H, '#6ee7b7', 1.0, 0);

    // Labels
    chartCtx.fillStyle = 'rgba(248,113,113,0.7)';
    chartCtx.font = '9px Inter'; chartCtx.textAlign = 'left';
    chartCtx.fillText('Loss', 4, 12);
    chartCtx.fillStyle = 'rgba(110,231,183,0.7)';
    chartCtx.fillText('Acc', 4, 24);
  }

  function drawCurve(c, data, W, H, color, maxVal, minVal) {
    if (data.length < 2) return;
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (MAX_HISTORY - 1)) * W;
      const y = H - ((data[i] - minVal) / (maxVal - minVal)) * H;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    // Fill under curve
    c.lineTo((data.length - 1) / (MAX_HISTORY - 1) * W, H);
    c.lineTo(0, H);
    c.closePath();
    c.fillStyle = color.replace(')', ',0.08)').replace('rgb', 'rgba').replace('rgba(', 'rgba(');
    c.globalAlpha = 0.3;
    c.fill();
    c.globalAlpha = 1;
  }

  // ── Fake training step ────────────────────
  function trainingStep(dt) {
    const decayRate = lr * 0.8 + 0.003;
    // Smooth exponential decay with noise
    loss = loss * (1 - decayRate * 0.04) + (Math.random() - 0.5) * 0.008;
    loss = Math.max(0.02, Math.min(1.0, loss));
    acc  = 1 - loss * (0.7 + Math.random() * 0.15);
    acc  = Math.max(0, Math.min(0.99, acc));
    epoch++;

    lossHistory.push(loss);
    accHistory.push(acc);
    if (lossHistory.length > MAX_HISTORY) { lossHistory.shift(); accHistory.shift(); }

    // Update weights gradually
    for (let li = 0; li < weights.length; li++) {
      for (let ni = 0; ni < weights[li].length; ni++) {
        for (let nj = 0; nj < weights[li][ni].length; nj++) {
          weights[li][ni][nj] += (Math.random() - 0.5) * lr * 0.1;
          weights[li][ni][nj] = Math.max(-2, Math.min(2, weights[li][ni][nj]));
        }
      }
    }
    // Update activations
    for (let li = 0; li < activations.length; li++) {
      for (let ni = 0; ni < activations[li].length; ni++) {
        const target = li === activations.length - 1
          ? (acc * 0.8 + Math.random() * 0.2)
          : (Math.random() * 0.7 + 0.15);
        activations[li][ni] += (target - activations[li][ni]) * 0.12;
      }
    }

    epochEl.textContent = epoch;
    lossEl.textContent  = loss.toFixed(4);
    accEl.textContent   = (acc * 100).toFixed(1) + '%';
    speedEl.textContent = Math.round(1000 / (dt || 100)) + '/s';
  }

  // ── Particles ────────────────────────────
  let lastParticle = 0;

  function updateParticles(dt) {
    const speed = 0.0008 * dt;
    particles = particles.filter(p => p.progress < 1);
    for (const p of particles) p.progress += speed * (1.2 + Math.random() * 0.4);

    // Spawn new particles along connections
    const now = performance.now();
    if (now - lastParticle > 80 && training) {
      lastParticle = now;
      const li = Math.floor(Math.random() * (layers.length - 1));
      const ni = Math.floor(Math.random() * layers[li]);
      const nj = Math.floor(Math.random() * layers[li+1]);
      particles.push({ fromLayer: li, fromNode: ni, toLayer: li+1, toNode: nj, progress: 0 });
    }
    if (particles.length > 40) particles.splice(0, particles.length - 40);
  }

  // ── Main loop ─────────────────────────────
  let lastTime = performance.now();
  let epochTimer = 0;
  const EPOCH_INTERVAL = 200; // ms per epoch

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;

    updateParticles(dt);

    if (training) {
      epochTimer += dt;
      if (epochTimer >= EPOCH_INTERVAL) {
        epochTimer -= EPOCH_INTERVAL;
        trainingStep(EPOCH_INTERVAL);
        drawChart();
        chartLbl.textContent = `Epoch ${epoch} | Loss: ${loss.toFixed(3)}`;
      }
    }
    drawNetwork();
  }

  // ── Controls ──────────────────────────────
  archSel.addEventListener('change', () => {
    layers = parseArch(archSel.value);
    resetTraining();
  });

  lrSlider.addEventListener('input', () => {
    lr = parseInt(lrSlider.value) / 1000;
    lrVal.textContent = lr.toFixed(3);
  });

  btn.addEventListener('click', () => {
    training = !training;
    if (training) {
      btn.textContent = '■ Stop Training';
      btn.classList.add('running');
      chartLbl.textContent = 'Training...';
    } else {
      btn.textContent = '▶ Start Training';
      btn.classList.remove('running');
      chartLbl.textContent = `Paused at epoch ${epoch}`;
    }
  });

  // ── Init ─────────────────────────────────
  resize();
  initWeights();
  raf = requestAnimationFrame(loop);

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(vizArea);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

window.Apps = window.Apps || {};
window.Apps.neural = {
  id: 'neural',
  name: 'Neural Net',
  icon: '🧠',
  color: '#7c3aed',
  defaultWidth: 820,
  defaultHeight: 540,
  mount: createNeural,
};

})();
