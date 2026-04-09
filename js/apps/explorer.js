/* ══════════════════════════════════════════════
   DevOS — File Explorer App
   ══════════════════════════════════════════════ */

(function() {
'use strict';

const FILE_ICONS = {
  js:   '📜', ts: '📜', mjs: '📜',
  html: '🌐', htm: '🌐',
  css:  '🎨', scss: '🎨',
  py:   '🐍',
  json: '📋',
  md:   '📖', txt: '📄',
  png:  '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
  mp3:  '🎵', wav: '🎵',
  mp4:  '🎬',
  zip:  '📦', tar: '📦',
  sh:   '⚡',
  default: '📄',
};

function getIcon(name, isDir) {
  if (isDir) return '📁';
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function createExplorer(container, windowId) {
  const id = windowId;

  container.innerHTML = `
    <div class="explorer-app" id="exp-${id}">
      <div class="explorer-sidebar">
        <div class="exp-tree" id="exp-tree-${id}"></div>
      </div>
      <div class="explorer-main">
        <div class="explorer-toolbar">
          <div class="explorer-path-bar" id="exp-path-${id}"></div>
          <button class="exp-btn" id="exp-up-${id}" title="Up one level" style="
            padding:4px 10px;border-radius:var(--r2);background:rgba(255,255,255,0.06);
            color:var(--tx2);font-size:13px;transition:background 0.12s;
          ">↑</button>
          <button class="exp-btn" id="exp-refresh-${id}" title="Refresh" style="
            padding:4px 10px;border-radius:var(--r2);background:rgba(255,255,255,0.06);
            color:var(--tx2);font-size:13px;transition:background 0.12s;
          ">↺</button>
        </div>
        <div class="explorer-files" id="exp-files-${id}"></div>
        <div class="explorer-status" id="exp-status-${id}">
          <span>Ready</span>
        </div>
      </div>
    </div>`;

  const treeEl   = document.getElementById(`exp-tree-${id}`);
  const filesEl  = document.getElementById(`exp-files-${id}`);
  const pathEl   = document.getElementById(`exp-path-${id}`);
  const statusEl = document.getElementById(`exp-status-${id}`);
  const upBtn    = document.getElementById(`exp-up-${id}`);
  const refreshBtn = document.getElementById(`exp-refresh-${id}`);

  let currentPath = '/home/user';
  let selectedFile = null;

  // ── Path bar ──────────────────────────────
  function renderPathBar(path) {
    const parts = path.split('/').filter(Boolean);
    let html = `<span class="exp-path-part" data-path="/">/</span>`;
    let built = '';
    for (const p of parts) {
      built += '/' + p;
      const cp = built;
      html += `<span class="exp-path-sep">/</span><span class="exp-path-part" data-path="${cp}">${p}</span>`;
    }
    pathEl.innerHTML = html;
    pathEl.querySelectorAll('.exp-path-part').forEach(el => {
      el.addEventListener('click', () => navigateTo(el.dataset.path));
    });
  }

  // ── Tree (sidebar) ────────────────────────
  function renderTree(path = '/', depth = 0, parentEl = treeEl) {
    if (depth === 0) parentEl.innerHTML = '';
    const items = FS.ls(path) || [];
    const dirs = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name));
    for (const dir of dirs) {
      const fullPath = (path === '/' ? '' : path) + '/' + dir.name;
      const item = document.createElement('div');
      item.className = 'exp-tree-item' + (fullPath === currentPath ? ' active' : '');
      item.style.paddingLeft = (14 + depth * 14) + 'px';
      item.innerHTML = `
        <span class="exp-tree-toggle" data-expanded="false">▶</span>
        <span class="exp-tree-icon">📁</span>
        <span>${dir.name}</span>`;
      const toggle = item.querySelector('.exp-tree-toggle');
      let childContainer = null;

      item.addEventListener('click', e => {
        e.stopPropagation();
        navigateTo(fullPath);
        // Expand/collapse
        const expanded = toggle.dataset.expanded === 'true';
        toggle.dataset.expanded = !expanded;
        toggle.classList.toggle('open', !expanded);
        if (!expanded) {
          if (!childContainer) {
            childContainer = document.createElement('div');
            item.after(childContainer);
            renderTree(fullPath, depth + 1, childContainer);
          }
          childContainer.style.display = '';
        } else if (childContainer) {
          childContainer.style.display = 'none';
        }
        // Update active states
        treeEl.querySelectorAll('.exp-tree-item.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      parentEl.appendChild(item);
    }
  }

  // ── Files grid ────────────────────────────
  function renderFiles(path) {
    filesEl.innerHTML = '';
    const items = FS.ls(path) || [];
    if (!items.length) {
      filesEl.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:20px;grid-column:1/-1">Empty folder</div>`;
      return;
    }
    const sorted = [...items].sort((a,b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const item of sorted) {
      const fullPath = (path === '/' ? '' : path) + '/' + item.name;
      const el = document.createElement('div');
      el.className = 'exp-file' + (fullPath === selectedFile ? ' selected' : '');
      el.innerHTML = `
        <div class="exp-file-icon">${getIcon(item.name, item.type === 'dir')}</div>
        <div class="exp-file-name">${item.name}</div>`;

      el.addEventListener('click', () => {
        filesEl.querySelectorAll('.exp-file.selected').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        selectedFile = fullPath;
        statusEl.innerHTML = `<span>${item.type === 'dir' ? '📁' : '📄'} ${item.name}${item.type === 'file' ? ' · ' + (item.content?.length || 0) + ' bytes' : ''}</span>`;
      });

      el.addEventListener('dblclick', () => {
        if (item.type === 'dir') {
          navigateTo(fullPath);
        } else {
          // Open in editor
          openInEditor(fullPath, item);
        }
      });

      filesEl.appendChild(el);
    }
    statusEl.innerHTML = `<span>${items.length} item${items.length !== 1 ? 's' : ''}</span>`;
  }

  function openInEditor(path, item) {
    // Find open editor window or open new one
    if (typeof WM !== 'undefined' && typeof OS !== 'undefined') {
      // Try to find an open editor
      const openWins = WM.getAll();
      let editorWin = null;
      for (const w of openWins) {
        if (w.config?.appId === 'editor') { editorWin = w; break; }
      }
      if (editorWin) {
        const edBody = editorWin.el.querySelector('.win-body');
        if (edBody._editorOpenFile) {
          edBody._editorOpenFile(path);
          WM.focus(editorWin.id);
          return;
        }
      }
      // Open new editor window
      const newId = OS.launch('editor');
      setTimeout(() => {
        const w = WM.get(newId);
        if (w) {
          const edBody = w.el.querySelector('.win-body');
          if (edBody._editorOpenFile) edBody._editorOpenFile(path);
        }
      }, 200);
    }
  }

  // ── Navigation ────────────────────────────
  function navigateTo(path) {
    if (!FS.exists(path) || !FS.isDir(path)) return;
    currentPath = path;
    renderPathBar(path);
    renderFiles(path);
    selectedFile = null;
  }

  upBtn.addEventListener('click', () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo(parts.length ? '/' + parts.join('/') : '/');
  });

  refreshBtn.addEventListener('click', () => {
    renderTree();
    renderFiles(currentPath);
  });

  // Init
  renderTree();
  navigateTo(currentPath);

  return () => {};
}

window.Apps = window.Apps || {};
window.Apps.explorer = {
  id: 'explorer',
  name: 'Files',
  icon: '📁',
  color: '#f59e0b',
  defaultWidth: 680,
  defaultHeight: 480,
  mount: createExplorer,
};

})();
