/* ══════════════════════════════════════════════
   DevOS — Particle Constellation Background
   ══════════════════════════════════════════════ */

(function() {
'use strict';

let canvas, ctx, W, H, raf;
let mouse = { x: -9999, y: -9999 };
const PARTICLE_COUNT = 130;
const LINK_DIST = 145;
const MOUSE_DIST = 160;
const particles = [];

class Particle {
  constructor() { this.reset(true); }
  reset(init = false) {
    this.x  = Math.random() * W;
    this.y  = init ? Math.random() * H : -5;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r  = 0.8 + Math.random() * 1.6;
    this.base_opacity = 0.3 + Math.random() * 0.5;
    this.opacity = this.base_opacity;
    this.twinkle_phase = Math.random() * Math.PI * 2;
    this.twinkle_speed = 0.015 + Math.random() * 0.025;
    // Color: mostly white, some purple/cyan
    const roll = Math.random();
    if (roll < 0.12)      this.color = [167, 139, 250]; // purple
    else if (roll < 0.22) this.color = [103, 232, 249]; // cyan
    else if (roll < 0.27) this.color = [249, 168, 212]; // pink
    else                  this.color = [220, 230, 255]; // cool white
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Mouse repulsion
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_DIST && dist > 0) {
      const force = (MOUSE_DIST - dist) / MOUSE_DIST * 0.4;
      this.vx += (dx / dist) * force * dt * 0.06;
      this.vy += (dy / dist) * force * dt * 0.06;
    }
    // Speed cap
    const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
    if (speed > 0.8) { this.vx = (this.vx / speed) * 0.8; this.vy = (this.vy / speed) * 0.8; }
    // Damping back to base speed
    this.vx += (Math.random() - 0.5) * 0.003;
    this.vy += (Math.random() - 0.5) * 0.003;
    // Wrap
    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10) this.y = H + 10;
    if (this.y > H + 10) this.y = -10;
    // Twinkle
    this.twinkle_phase += this.twinkle_speed * dt;
    this.opacity = this.base_opacity * (0.65 + 0.35 * Math.sin(this.twinkle_phase));
  }
  draw() {
    const [r, g, b] = this.color;
    const o = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    // Glow
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3.5);
    grd.addColorStop(0, `rgba(${r},${g},${b},${o})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.fill();
    // Core dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, o * 1.6)})`;
    ctx.fill();
  }
}

function drawLinks() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < LINK_DIST) {
        const alpha = (1 - dist / LINK_DIST) * 0.28 * a.opacity * b.opacity * 1.8;
        // Blend colors
        const ra = a.color[0], ga = a.color[1], ba = a.color[2];
        const rb = b.color[0], gb = b.color[1], bb = b.color[2];
        const r = Math.round((ra + rb) / 2);
        const g = Math.round((ga + gb) / 2);
        const bl = Math.round((ba + bb) / 2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }
}

// Shooting star
let shootingStar = null;
let nextShoot = Date.now() + 4000 + Math.random() * 6000;

function spawnShootingStar() {
  const angle = Math.PI / 6 + Math.random() * Math.PI / 6;
  const sx = Math.random() * W * 0.5;
  const sy = Math.random() * H * 0.3;
  const speed = 500 + Math.random() * 400;
  shootingStar = {
    x: sx, y: sy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: 80 + Math.random() * 60,
    opacity: 0,
    phase: 'in', // in → hold → out
    life: 0,
    maxLife: 0.4 + Math.random() * 0.3,
  };
}

function updateShootingStar(dt) {
  if (!shootingStar) {
    if (Date.now() > nextShoot) {
      spawnShootingStar();
      nextShoot = Date.now() + 5000 + Math.random() * 8000;
    }
    return;
  }
  const s = shootingStar;
  s.life += dt / 1000;
  if (s.phase === 'in') {
    s.opacity = Math.min(1, s.life / 0.08);
    if (s.opacity >= 1) s.phase = 'hold';
  } else {
    s.opacity = Math.max(0, 1 - (s.life - 0.08) / (s.maxLife - 0.08));
    if (s.opacity <= 0) { shootingStar = null; return; }
  }
  s.x += s.vx * dt / 1000;
  s.y += s.vy * dt / 1000;

  const tailX = s.x - (s.vx / Math.sqrt(s.vx**2+s.vy**2)) * s.length;
  const tailY = s.y - (s.vy / Math.sqrt(s.vx**2+s.vy**2)) * s.length;
  const grd = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
  grd.addColorStop(0, `rgba(255,255,255,0)`);
  grd.addColorStop(0.7, `rgba(200,220,255,${s.opacity * 0.5})`);
  grd.addColorStop(1, `rgba(255,255,255,${s.opacity})`);
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(s.x, s.y);
  ctx.strokeStyle = grd;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Nebula blobs (static, drawn once)
function drawNebula() {
  const blobs = [
    { x: W * 0.15, y: H * 0.25, r: 220, c1: 'rgba(124,58,237,0.045)', c2: 'rgba(6,182,212,0.02)' },
    { x: W * 0.8,  y: H * 0.6,  r: 280, c1: 'rgba(6,182,212,0.035)', c2: 'rgba(124,58,237,0.015)' },
    { x: W * 0.5,  y: H * 0.85, r: 200, c1: 'rgba(236,72,153,0.028)', c2: 'transparent' },
    { x: W * 0.92, y: H * 0.1,  r: 160, c1: 'rgba(124,58,237,0.03)',  c2: 'transparent' },
  ];
  for (const blob of blobs) {
    const grd = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    grd.addColorStop(0, blob.c1);
    grd.addColorStop(0.5, blob.c2);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }
}

let lastTime = performance.now();
function animate(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  bgGrd.addColorStop(0, '#04040f');
  bgGrd.addColorStop(0.5, '#060614');
  bgGrd.addColorStop(1, '#050510');
  ctx.fillStyle = bgGrd;
  ctx.fillRect(0, 0, W, H);

  drawNebula();
  drawLinks();
  for (const p of particles) { p.update(dt); p.draw(); }
  updateShootingStar(dt);

  raf = requestAnimationFrame(animate);
}

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function init(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(animate);
}

function stop() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
}

window.DesktopBG = { init, stop };

})();
