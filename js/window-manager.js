/* ══════════════════════════════════════════════
   DevOS — Window Manager
   ══════════════════════════════════════════════ */

(function() {
'use strict';

let zCounter = 200;
const windows = {};
let dragState = null;
let resizeState = null;
let snapPreview = null;
const layer = () => document.getElementById('windows-layer');

// ── Snap zones ──────────────────────────────
const SNAP_ZONE = 12; // px from edge

function getSnapTarget(x, y) {
  const W = window.innerWidth, H = window.innerHeight - 52;
  if (x <= SNAP_ZONE) return 'left';
  if (x >= W - SNAP_ZONE) return 'right';
  if (y <= SNAP_ZONE) return 'max';
  return null;
}

function getSnapRect(zone) {
  const W = window.innerWidth, H = window.innerHeight - 52;
  if (zone === 'left')  return { x: 0,     y: 0, w: W/2, h: H };
  if (zone === 'right') return { x: W/2,   y: 0, w: W/2, h: H };
  if (zone === 'max')   return { x: 0,     y: 0, w: W,   h: H };
  return null;
}

function showSnapPreview(zone) {
  if (!snapPreview) {
    snapPreview = document.createElement('div');
    snapPreview.id = 'snap-preview';
    document.body.appendChild(snapPreview);
  }
  const r = getSnapRect(zone);
  Object.assign(snapPreview.style, {
    display: 'block',
    left: r.x + 'px', top: r.y + 'px',
    width: r.w + 'px', height: r.h + 'px',
  });
}

function hideSnapPreview() {
  if (snapPreview) snapPreview.style.display = 'none';
}

// ── Build window element ─────────────────────
function buildWindow(config) {
  const id = config.id;
  const el = document.createElement('div');
  el.className = 'window opening';
  el.dataset.id = id;

  const W = window.innerWidth, H = window.innerHeight - 52;
  const w = config.width  || 700;
  const h = config.height || 480;
  const x = config.x != null ? config.x : Math.round((W - w) / 2);
  const y = config.y != null ? config.y : Math.round((H - h) / 2);

  Object.assign(el.style, {
    left: x + 'px', top: y + 'px',
    width: w + 'px', height: h + 'px',
    zIndex: ++zCounter,
  });

  // Titlebar
  const tb = document.createElement('div');
  tb.className = 'win-titlebar';
  tb.innerHTML = `
    <div class="win-icon">${config.icon || '🖥️'}</div>
    <div class="win-title">${config.title}</div>
    <div class="win-controls">
      <button class="win-btn btn-cls" title="Close">×</button>
      <button class="win-btn btn-min" title="Minimize">─</button>
      <button class="win-btn btn-max" title="Maximize">⬜</button>
    </div>`;
  el.appendChild(tb);

  // Body
  const body = document.createElement('div');
  body.className = 'win-body';
  if (config.content) {
    if (typeof config.content === 'string') {
      body.innerHTML = config.content;
    } else {
      body.appendChild(config.content);
    }
  }
  el.appendChild(body);

  // Resize handles
  for (const dir of ['n','s','e','w','nw','ne','sw','se']) {
    const rz = document.createElement('div');
    rz.className = `rz rz-${dir}`;
    rz.dataset.dir = dir;
    el.appendChild(rz);
  }

  // Events: titlebar drag
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.win-controls')) return;
    e.preventDefault();
    focusWindow(id);
    tb.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    dragState = { id, offX: e.clientX - rect.left, offY: e.clientY - rect.top };
  });

  tb.addEventListener('dblclick', e => {
    if (e.target.closest('.win-controls')) return;
    toggleMaximize(id);
  });

  // Controls
  tb.querySelector('.btn-cls').addEventListener('click', () => closeWindow(id));
  tb.querySelector('.btn-min').addEventListener('click', () => minimizeWindow(id));
  tb.querySelector('.btn-max').addEventListener('click', () => toggleMaximize(id));

  // Resize handles
  el.addEventListener('mousedown', e => {
    const rz = e.target.closest('.rz');
    if (!rz) return;
    e.preventDefault();
    focusWindow(id);
    const rect = el.getBoundingClientRect();
    resizeState = {
      id, dir: rz.dataset.dir,
      startX: e.clientX, startY: e.clientY,
      origLeft: rect.left, origTop: rect.top,
      origW: rect.width, origH: rect.height,
    };
  });

  // Focus on click
  el.addEventListener('mousedown', e => {
    if (!e.target.closest('.rz') && !e.target.closest('.win-controls')) {
      focusWindow(id);
    }
  });

  return el;
}

// ── Global mouse handlers ─────────────────────
document.addEventListener('mousemove', e => {
  // Drag
  if (dragState) {
    const id = dragState.id;
    const state = windows[id];
    if (!state || state.maximized) return;
    let x = e.clientX - dragState.offX;
    let y = e.clientY - dragState.offY;
    const H = window.innerHeight - 52;
    x = Math.max(-state.el.offsetWidth + 80, Math.min(window.innerWidth - 80, x));
    y = Math.max(0, Math.min(H - 42, y));
    state.el.style.left = x + 'px';
    state.el.style.top  = y + 'px';
    const zone = getSnapTarget(e.clientX, e.clientY);
    zone ? showSnapPreview(zone) : hideSnapPreview();
  }

  // Resize
  if (resizeState) {
    const s = resizeState;
    const state = windows[s.id];
    if (!state) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const minW = 300, minH = 200;

    let { origLeft: l, origTop: t, origW: w, origH: h } = s;

    if (s.dir.includes('e')) w = Math.max(minW, s.origW + dx);
    if (s.dir.includes('s')) h = Math.max(minH, s.origH + dy);
    if (s.dir.includes('w')) {
      w = Math.max(minW, s.origW - dx);
      l = s.origLeft + s.origW - w;
    }
    if (s.dir.includes('n')) {
      h = Math.max(minH, s.origH - dy);
      t = s.origTop + s.origH - h;
    }

    Object.assign(state.el.style, {
      left: l + 'px', top: t + 'px',
      width: w + 'px', height: h + 'px',
    });
  }
});

document.addEventListener('mouseup', e => {
  if (dragState) {
    const zone = getSnapTarget(e.clientX, e.clientY);
    if (zone) {
      const id = dragState.id;
      const state = windows[id];
      const r = getSnapRect(zone);
      if (zone === 'max') {
        toggleMaximize(id);
      } else {
        Object.assign(state.el.style, {
          left: r.x + 'px', top: r.y + 'px',
          width: r.w + 'px', height: r.h + 'px',
        });
        state.el.classList.remove('maximized');
        state.maximized = false;
      }
    }
    hideSnapPreview();
    document.querySelector('.win-titlebar.dragging')?.classList.remove('dragging');
    dragState = null;
  }
  if (resizeState) resizeState = null;
});

// ── Window operations ─────────────────────────
function focusWindow(id) {
  const state = windows[id];
  if (!state) return;
  // Unfocus all
  document.querySelectorAll('.window.focused').forEach(el => el.classList.remove('focused'));
  document.querySelectorAll('.tb-app.focused').forEach(el => el.classList.remove('focused'));
  // Focus this
  state.el.classList.add('focused');
  state.el.style.zIndex = ++zCounter;
  const tbBtn = document.querySelector(`.tb-app[data-id="${id}"]`);
  if (tbBtn) tbBtn.classList.add('focused');
}

function closeWindow(id) {
  const state = windows[id];
  if (!state) return;
  state.el.classList.remove('opening', 'restoring');
  state.el.classList.add('closing');
  if (state.cleanup) state.cleanup();
  state.el.addEventListener('animationend', () => {
    state.el.remove();
    delete windows[id];
    removeTaskbarBtn(id);
    if (typeof OS !== 'undefined') OS.onWindowClose(id);
  }, { once: true });
}

function minimizeWindow(id) {
  const state = windows[id];
  if (!state || state.minimized) return;
  state.minimized = true;
  state.el.classList.add('minimizing');
  state.el.addEventListener('animationend', () => {
    state.el.style.display = 'none';
    state.el.classList.remove('minimizing');
    const tbBtn = document.querySelector(`.tb-app[data-id="${id}"]`);
    if (tbBtn) { tbBtn.classList.add('minimized'); tbBtn.classList.remove('focused'); }
  }, { once: true });
}

function restoreWindow(id) {
  const state = windows[id];
  if (!state) return;
  state.minimized = false;
  state.el.style.display = '';
  state.el.classList.add('restoring');
  state.el.addEventListener('animationend', () => state.el.classList.remove('restoring'), { once: true });
  const tbBtn = document.querySelector(`.tb-app[data-id="${id}"]`);
  if (tbBtn) tbBtn.classList.remove('minimized');
  focusWindow(id);
}

function toggleMaximize(id) {
  const state = windows[id];
  if (!state) return;
  if (state.maximized) {
    // Restore
    Object.assign(state.el.style, {
      left: state.prevRect.left + 'px', top: state.prevRect.top + 'px',
      width: state.prevRect.width + 'px', height: state.prevRect.height + 'px',
    });
    state.el.classList.remove('maximized');
    state.maximized = false;
  } else {
    // Save current position
    const r = state.el.getBoundingClientRect();
    state.prevRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    state.el.classList.add('maximized');
    state.maximized = true;
  }
}

function addTaskbarBtn(id, config) {
  const tb = document.getElementById('tb-apps');
  if (!tb) return;
  const btn = document.createElement('button');
  btn.className = 'tb-app focused';
  btn.dataset.id = id;
  btn.innerHTML = `<span class="tb-app-icon">${config.icon || '🖥️'}</span><span class="tb-app-label">${config.title}</span>`;
  btn.addEventListener('click', () => {
    const state = windows[id];
    if (!state) return;
    if (state.minimized) { restoreWindow(id); }
    else if (state.el.classList.contains('focused')) { minimizeWindow(id); }
    else { focusWindow(id); }
  });
  tb.appendChild(btn);
}

function removeTaskbarBtn(id) {
  document.querySelector(`.tb-app[data-id="${id}"]`)?.remove();
}

// ── Public API ────────────────────────────────
let idCounter = 0;

const WM = {
  open(config) {
    const id = config.id || `win_${++idCounter}`;
    config.id = id;

    const el = buildWindow(config);
    layer().appendChild(el);

    windows[id] = { el, id, config, minimized: false, maximized: false, cleanup: null };
    addTaskbarBtn(id, config);
    focusWindow(id);

    // Call mount callback after DOM is in place
    if (config.onMount) {
      requestAnimationFrame(() => {
        const cleanup = config.onMount(el.querySelector('.win-body'), id);
        if (cleanup) windows[id].cleanup = cleanup;
      });
    }

    el.addEventListener('animationend', () => el.classList.remove('opening'), { once: true });
    return id;
  },

  close: closeWindow,
  minimize: minimizeWindow,
  restore: restoreWindow,
  focus: focusWindow,
  toggleMaximize,

  isOpen(id) { return !!windows[id]; },
  get(id) { return windows[id]; },
  getAll() { return Object.values(windows); },
};

window.WM = WM;

})();
