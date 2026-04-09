/* ══════════════════════════════════════════════
   DevOS — Main System
   ══════════════════════════════════════════════ */

(function() {
'use strict';

// ── App Registry ────────────────────────────────
const APP_LIST = [
  Apps.terminal,
  Apps.editor,
  Apps.snake,
  Apps.neural,
  Apps.calculator,
  Apps.explorer,
  {
    id: 'about',
    name: 'About DevOS',
    icon: 'ℹ️',
    color: '#06b6d4',
    defaultWidth: 440,
    defaultHeight: 460,
    mount: createAbout,
  },
];

function createAbout(container) {
  container.innerHTML = `
    <div class="about-app">
      <div class="about-logo-wrap">
        <div class="about-logo-glow"></div>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="9" height="9" rx="1.5" fill="url(#aLg1)"/>
          <rect x="13" y="2" width="9" height="9" rx="1.5" fill="url(#aLg2)"/>
          <rect x="2" y="13" width="9" height="9" rx="1.5" fill="url(#aLg3)"/>
          <rect x="13" y="13" width="9" height="9" rx="1.5" fill="url(#aLg4)"/>
          <defs>
            <linearGradient id="aLg1"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
            <linearGradient id="aLg2"><stop stop-color="#67e8f9"/><stop offset="1" stop-color="#06b6d4"/></linearGradient>
            <linearGradient id="aLg3"><stop stop-color="#06b6d4"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
            <linearGradient id="aLg4"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
          </defs>
        </svg>
      </div>
      <div class="about-title">DevOS</div>
      <div class="about-version">Version 1.0.0 "Nebula"</div>
      <div class="about-desc">
        A fully-featured browser desktop environment built with vanilla HTML, CSS &amp; JavaScript.
        No frameworks. No dependencies. Pure web magic. ✨
      </div>
      <div class="about-grid">
        <div class="about-item">
          <div class="about-item-label">Built by</div>
          <div class="about-item-value">Claude AI</div>
        </div>
        <div class="about-item">
          <div class="about-item-label">Platform</div>
          <div class="about-item-value">Browser</div>
        </div>
        <div class="about-item">
          <div class="about-item-label">Kernel</div>
          <div class="about-item-value">HTML5</div>
        </div>
        <div class="about-item">
          <div class="about-item-label">Apps</div>
          <div class="about-item-value">${APP_LIST.length} installed</div>
        </div>
        <div class="about-item">
          <div class="about-item-label">Lines of Code</div>
          <div class="about-item-value">~4,000</div>
        </div>
        <div class="about-item">
          <div class="about-item-label">Build Date</div>
          <div class="about-item-value">${new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <div class="about-credit">Crafted by <span>Claude AI</span> in a single turn ⚡</div>
    </div>`;
  return () => {};
}

// ── Notification system ─────────────────────────
function notify(title, msg = '', type = 'info', duration = 3500) {
  const area = document.getElementById('notif-area');
  if (!area) return;
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.innerHTML = `<div class="notif-title">${title}</div>${msg ? `<div class="notif-msg">${msg}</div>` : ''}`;
  area.appendChild(el);
  el.addEventListener('click', () => dismiss(el));
  const timer = setTimeout(() => dismiss(el), duration);
  function dismiss(n) {
    clearTimeout(timer);
    n.classList.add('exiting');
    n.addEventListener('animationend', () => n.remove(), { once: true });
  }
  return el;
}

// ── Launch app ───────────────────────────────────
function launch(appId) {
  const def = APP_LIST.find(a => a.id === appId);
  if (!def) return null;
  return WM.open({
    title: def.name,
    icon: def.icon,
    width: def.defaultWidth,
    height: def.defaultHeight,
    appId: def.id,
    onMount(body, winId) {
      return def.mount(body, winId);
    },
  });
}

// ── Context menu ─────────────────────────────────
const ctxMenu = document.getElementById('ctx-menu');

function showCtxMenu(x, y, items) {
  ctxMenu.innerHTML = '';
  for (const item of items) {
    if (item === 'sep') {
      const sep = document.createElement('div'); sep.className = 'ctx-sep';
      ctxMenu.appendChild(sep); continue;
    }
    const el = document.createElement('div');
    el.className = 'ctx-item' + (item.danger ? ' danger' : '');
    el.innerHTML = `<span class="ctx-icon">${item.icon || ''}</span>${item.label}`;
    el.addEventListener('click', () => { hideCtxMenu(); item.action?.(); });
    ctxMenu.appendChild(el);
  }
  // Position
  const W = window.innerWidth, H = window.innerHeight;
  ctxMenu.classList.remove('hidden');
  const cw = ctxMenu.offsetWidth, ch = ctxMenu.offsetHeight;
  ctxMenu.style.left = Math.min(x, W - cw - 8) + 'px';
  ctxMenu.style.top  = Math.min(y, H - ch - 8) + 'px';
}

function hideCtxMenu() { ctxMenu.classList.add('hidden'); }

document.addEventListener('click',       () => hideCtxMenu());
document.addEventListener('contextmenu', e  => {
  e.preventDefault();
  const dskIcon = e.target.closest('.dsk-icon');
  if (dskIcon) {
    showCtxMenu(e.clientX, e.clientY, [
      { icon: '🚀', label: 'Open', action: () => launch(dskIcon.dataset.app) },
      'sep',
      { icon: 'ℹ️', label: 'Properties', action: () => notify('Properties', `App: ${dskIcon.dataset.app}`, 'info') },
    ]);
    return;
  }
  // Desktop right-click
  showCtxMenu(e.clientX, e.clientY, [
    { icon: '🖥️', label: 'Change Wallpaper', action: () => notify('Wallpaper', 'Wallpaper changed! (Pretend it did 😄)', 'success') },
    { icon: '🔃', label: 'Refresh Desktop',  action: () => { renderDesktopIcons(); notify('Desktop', 'Refreshed', 'info', 1500); } },
    'sep',
    { icon: '⚙️', label: 'Settings',  action: () => notify('Settings', 'Coming soon!', 'info') },
    { icon: 'ℹ️', label: 'About DevOS', action: () => launch('about') },
  ]);
});

// ── Desktop icons ─────────────────────────────────
function renderDesktopIcons() {
  const grid = document.getElementById('desktop-icons');
  grid.innerHTML = '';
  for (const app of APP_LIST) {
    const el = document.createElement('div');
    el.className = 'dsk-icon';
    el.dataset.app = app.id;
    el.innerHTML = `
      <div class="dsk-icon-emoji">${app.icon}</div>
      <div class="dsk-icon-label">${app.name}</div>`;
    el.addEventListener('dblclick', () => launch(app.id));
    el.addEventListener('click', e => {
      document.querySelectorAll('.dsk-icon.active').forEach(el => el.classList.remove('active'));
      el.classList.add('active');
    });
    // Stagger animation
    el.style.opacity = '0';
    el.style.transform = 'scale(0.7) translateY(10px)';
    grid.appendChild(el);
  }
  // Animate in
  grid.querySelectorAll('.dsk-icon').forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
      el.style.opacity = '1';
      el.style.transform = '';
    }, 100 + i * 60);
  });
}

// ── Start Menu ────────────────────────────────────
const startBtn  = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const smApps    = document.getElementById('sm-apps');
const smSearch  = document.getElementById('sm-search');
const smPower   = document.getElementById('sm-power');

function renderStartMenu(filter = '') {
  smApps.innerHTML = '';
  const filtered = APP_LIST.filter(a =>
    !filter || a.name.toLowerCase().includes(filter.toLowerCase())
  );
  for (const app of filtered) {
    const el = document.createElement('div');
    el.className = 'sm-app';
    el.innerHTML = `<div class="sm-app-icon">${app.icon}</div><div class="sm-app-name">${app.name}</div>`;
    el.addEventListener('click', () => { closeStartMenu(); launch(app.id); });
    smApps.appendChild(el);
  }
  if (!filtered.length) {
    smApps.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:12px;grid-column:1/-1">No apps found</div>`;
  }
}

function toggleStartMenu() {
  const open = !startMenu.classList.contains('hidden');
  if (open) { closeStartMenu(); } else { openStartMenu(); }
}

function openStartMenu() {
  renderStartMenu();
  startMenu.classList.remove('hidden');
  startBtn.classList.add('open');
  smSearch.value = '';
  setTimeout(() => smSearch.focus(), 50);
}

function closeStartMenu() {
  startMenu.classList.add('hidden');
  startBtn.classList.remove('open');
}

startBtn.addEventListener('click', e => { e.stopPropagation(); toggleStartMenu(); });
startMenu.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', closeStartMenu);
smSearch.addEventListener('input', () => renderStartMenu(smSearch.value));
smSearch.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeStartMenu();
  if (e.key === 'Enter') {
    const first = smApps.querySelector('.sm-app');
    if (first) { first.click(); }
  }
});
smPower.addEventListener('click', () => {
  closeStartMenu();
  notify('DevOS', 'Goodbye! Refresh the page to restart.', 'warn', 5000);
  setTimeout(() => {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:#04040f;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;flex-direction:column;gap:16px">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.5)" stroke-width="1.5">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
        <p style="color:rgba(255,255,255,0.3);font-size:14px">Shutting down… Refresh to restart.</p>
      </div>`;
  }, 3000);
});

// ── Clock ─────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('tb-time').textContent = `${h}:${m}`;
  document.getElementById('tb-date').textContent = `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Window close hook ──────────────────────────────
function onWindowClose(id) { /* hook for future use */ }

// ── Boot Sequence ─────────────────────────────────
const BOOT_STEPS = [
  [0,   5,  'Initializing kernel…'],
  [300, 20, 'Loading hardware drivers…'],
  [600, 35, 'Starting display server…'],
  [900, 50, 'Mounting virtual filesystem…'],
  [1100,65, 'Initializing window manager…'],
  [1350,78, 'Loading applications…'],
  [1600,90, 'Starting desktop environment…'],
  [1850,100,'Welcome to DevOS!'],
];

function boot() {
  const bar    = document.getElementById('boot-bar');
  const status = document.getElementById('boot-status');
  const bootScreen = document.getElementById('boot-screen');
  const bootCanvas = document.getElementById('boot-canvas');

  // Boot screen particle bg
  (function bootBg() {
    const bCtx = bootCanvas.getContext('2d');
    bootCanvas.width  = window.innerWidth;
    bootCanvas.height = window.innerHeight;
    const pts = Array.from({length:60}, () => ({
      x: Math.random()*bootCanvas.width, y: Math.random()*bootCanvas.height,
      vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4,
      r: 0.5+Math.random()*1.5, o:0.2+Math.random()*0.5,
    }));
    function frame() {
      if (!document.getElementById('boot-screen') || bootScreen.classList.contains('boot-out')) return;
      bCtx.clearRect(0,0,bootCanvas.width,bootCanvas.height);
      bCtx.fillStyle='#04040f'; bCtx.fillRect(0,0,bootCanvas.width,bootCanvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x<0) p.x=bootCanvas.width; if(p.x>bootCanvas.width) p.x=0;
        if (p.y<0) p.y=bootCanvas.height; if(p.y>bootCanvas.height) p.y=0;
        bCtx.beginPath(); bCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
        bCtx.fillStyle=`rgba(167,139,250,${p.o})`; bCtx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  BOOT_STEPS.forEach(([delay, pct, msg]) => {
    setTimeout(() => {
      bar.style.width = pct + '%';
      status.textContent = msg;
      if (pct >= 100) {
        setTimeout(showDesktop, 500);
      }
    }, delay);
  });
}

function showDesktop() {
  const bootScreen = document.getElementById('boot-screen');
  const desktop    = document.getElementById('desktop');
  const winLayer   = document.getElementById('windows-layer');
  const taskbar    = document.getElementById('taskbar');

  bootScreen.classList.add('boot-out');
  bootScreen.addEventListener('animationend', () => {
    bootScreen.style.display = 'none';
  }, { once: true });

  desktop.classList.remove('hidden');
  winLayer.classList.remove('hidden');
  taskbar.classList.remove('hidden');

  // Start background animation
  DesktopBG.init(document.getElementById('bg-canvas'));

  // Render desktop icons
  setTimeout(renderDesktopIcons, 200);

  // Welcome notification
  setTimeout(() => notify('Welcome to DevOS!', 'Double-click an icon to open an app', 'info', 5000), 800);

  // Auto-open terminal after a moment for wow factor
  setTimeout(() => {
    launch('terminal');
    setTimeout(() => {
      launch('neural');
    }, 300);
  }, 1200);
}

// ── Keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', e => {
  // Super/Win + key shortcuts (using Alt as modifier)
  if (e.altKey) {
    switch(e.key) {
      case 't': e.preventDefault(); launch('terminal');   break;
      case 'e': e.preventDefault(); launch('editor');     break;
      case 'n': e.preventDefault(); launch('neural');     break;
      case 'c': e.preventDefault(); launch('calculator'); break;
      case 'f': e.preventDefault(); launch('explorer');   break;
      case 'g': e.preventDefault(); launch('snake');      break;
      case 'a': e.preventDefault(); launch('about');      break;
    }
  }
  // Click outside closes start menu
  if (e.key === 'Escape') closeStartMenu();
});

// ── Global OS object ──────────────────────────────
window.OS = {
  launch,
  notify,
  onWindowClose,
  APP_LIST,
};

// ── Start! ────────────────────────────────────────
boot();

})();
