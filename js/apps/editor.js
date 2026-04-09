/* ══════════════════════════════════════════════
   DevOS — Code Editor App
   ══════════════════════════════════════════════ */

(function() {
'use strict';

const LANGS = {
  js:   { name: 'JavaScript', ext: ['.js','.mjs','.cjs'] },
  html: { name: 'HTML',       ext: ['.html','.htm'] },
  css:  { name: 'CSS',        ext: ['.css','.scss'] },
  py:   { name: 'Python',     ext: ['.py'] },
  md:   { name: 'Markdown',   ext: ['.md','.txt'] },
  json: { name: 'JSON',       ext: ['.json'] },
};

function detectLang(filename) {
  const lower = filename.toLowerCase();
  for (const [key, def] of Object.entries(LANGS)) {
    if (def.ext.some(e => lower.endsWith(e))) return key;
  }
  return 'js';
}

// ── Syntax highlighter (regex-based) ────────────────
function highlight(code, lang) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (lang === 'html') {
    html = html
      .replace(/(&lt;\/?)([\w-]+)/g, (_, open, tag) => `${open}<span class="hl-tag">${tag}</span>`)
      .replace(/([\w-]+)(=)(&quot;[^&]*&quot;)/g, `<span class="hl-attr">$1</span>$2<span class="hl-str">$3</span>`)
      .replace(/(&amp;quot;[^&]*&amp;quot;)/g, '<span class="hl-str">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="hl-cmt">$1</span>')
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-cmt">$1</span>');
    return html;
  }
  if (lang === 'css') {
    html = html
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-cmt">$1</span>')
      .replace(/([.#]?[\w-]+)(\s*\{)/g, '<span class="hl-sel">$1</span>$2')
      .replace(/([\w-]+)(\s*:)(?![^{]*\})/g, '<span class="hl-prop">$1</span>$2')
      .replace(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g, '<span class="hl-num">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="hl-str">$1</span>');
    return html;
  }
  if (lang === 'py') {
    html = html
      .replace(/(#.*$)/gm, '<span class="hl-cmt">$1</span>')
      .replace(/\b(def|class|import|from|if|elif|else|for|while|return|try|except|with|as|pass|break|continue|lambda|yield|and|or|not|in|is|None|True|False|self)\b/g, '<span class="hl-kw">$1</span>')
      .replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g, '<span class="hl-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>')
      .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="hl-cls">$1</span>')
      .replace(/\b(\w+)(?=\s*\()/g, '<span class="hl-fn">$1</span>');
    return html;
  }
  if (lang === 'json') {
    html = html
      .replace(/("[\w-]+")\s*:/g, '<span class="hl-attr">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="hl-str">$1</span>')
      .replace(/:\s*(true|false|null)\b/g, ': <span class="hl-kw">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="hl-num">$1</span>');
    return html;
  }
  if (lang === 'md') {
    html = html
      .replace(/^(#{1,6})(.+)$/gm, '<span class="hl-kw">$1</span><span class="hl-cls">$2</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<span class="hl-str">`$1`</span>')
      .replace(/^([-*+]) /gm, '<span class="hl-op">$1</span> ')
      .replace(/^(\d+\.) /gm, '<span class="hl-num">$1</span> ');
    return html;
  }
  // Default: JavaScript
  html = html
    .replace(/(\/\/.*$)/gm, '<span class="hl-cmt">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-cmt">$1</span>')
    .replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="hl-str">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="hl-str">$1</span>')
    .replace(/\b(const|let|var|function|class|extends|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|import|export|default|from|async|await|try|catch|finally|throw|delete|void|in|of|null|undefined|true|false|static|get|set|super|yield)\b/g, '<span class="hl-kw">$1</span>')
    .replace(/\b([A-Z][A-Z0-9_]*)\b/g, '<span class="hl-cls">$1</span>')
    .replace(/\b([A-Z][a-zA-Z0-9_]+)\b/g, '<span class="hl-cls">$1</span>')
    .replace(/\b(\w+)(?=\s*\()/g, '<span class="hl-fn">$1</span>')
    .replace(/\b(-?\d+\.?\d*(e[+-]?\d+)?)\b/g, '<span class="hl-num">$1</span>')
    .replace(/(=>|===|!==|==|!=|&&|\|\||[+\-*/%]=?|[<>]=?)/g, '<span class="hl-op">$1</span>');
  return html;
}

// ── Tab state ────────────────────────────────────────
let tabCounter = 0;

function createEditor(container, windowId) {
  const id = windowId;

  container.innerHTML = `
    <div class="editor-app" id="ed-${id}">
      <div class="editor-toolbar">
        <div class="editor-tabs" id="ed-tabs-${id}"></div>
        <div class="editor-toolbar-right">
          <select class="editor-lang-sel" id="ed-lang-${id}">
            <option value="js">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="py">Python</option>
            <option value="md">Markdown</option>
            <option value="json">JSON</option>
          </select>
          <button class="editor-run-btn" id="ed-run-${id}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Run
          </button>
        </div>
      </div>
      <div class="editor-body">
        <div class="editor-gutter" id="ed-gutter-${id}"></div>
        <div class="editor-code-wrap" id="ed-wrap-${id}">
          <textarea class="editor-textarea" id="ed-ta-${id}" spellcheck="false" autocomplete="off"></textarea>
          <pre class="editor-highlight" id="ed-hl-${id}" aria-hidden="true"></pre>
        </div>
      </div>
      <div class="editor-statusbar">
        <span class="editor-status-item" id="ed-pos-${id}">Ln 1, Col 1</span>
        <span class="editor-status-item" id="ed-lang-disp-${id}">JavaScript</span>
        <span class="editor-status-item">UTF-8</span>
        <span class="editor-status-item" id="ed-saved-${id}" style="margin-left:auto;color:var(--green)">● Saved</span>
      </div>
      <div class="editor-output" id="ed-out-${id}" style="display:none"></div>
    </div>`;

  const tabs      = document.getElementById(`ed-tabs-${id}`);
  const gutter    = document.getElementById(`ed-gutter-${id}`);
  const ta        = document.getElementById(`ed-ta-${id}`);
  const hl        = document.getElementById(`ed-hl-${id}`);
  const langSel   = document.getElementById(`ed-lang-${id}`);
  const runBtn    = document.getElementById(`ed-run-${id}`);
  const posEl     = document.getElementById(`ed-pos-${id}`);
  const langDisp  = document.getElementById(`ed-lang-disp-${id}`);
  const savedEl   = document.getElementById(`ed-saved-${id}`);
  const outPanel  = document.getElementById(`ed-out-${id}`);
  const codeWrap  = document.getElementById(`ed-wrap-${id}`);

  let openTabs = [];
  let activeTab = null;
  let saveTimeout = null;

  // Tab data: { id, filename, content, lang, unsaved }
  function addTab(filename, content = '', lang = null) {
    const tid = ++tabCounter;
    const l = lang || detectLang(filename);
    const tab = { id: tid, filename, content, lang: l, unsaved: false };
    openTabs.push(tab);
    renderTabs();
    switchTab(tid);
    return tid;
  }

  function switchTab(tid) {
    if (activeTab) saveActiveContent();
    activeTab = openTabs.find(t => t.id === tid);
    if (!activeTab) return;
    ta.value = activeTab.content;
    langSel.value = activeTab.lang;
    langDisp.textContent = LANGS[activeTab.lang]?.name || activeTab.lang;
    renderHighlight();
    renderGutter();
    renderTabs();
  }

  function closeTab(tid) {
    const idx = openTabs.findIndex(t => t.id === tid);
    if (idx === -1) return;
    openTabs.splice(idx, 1);
    if (activeTab?.id === tid) {
      activeTab = openTabs[Math.max(0, idx - 1)] || null;
      if (activeTab) { ta.value = activeTab.content; renderHighlight(); renderGutter(); }
    }
    renderTabs();
  }

  function saveActiveContent() {
    if (activeTab) activeTab.content = ta.value;
  }

  function renderTabs() {
    tabs.innerHTML = '';
    for (const t of openTabs) {
      const btn = document.createElement('div');
      btn.className = 'editor-tab' + (t.id === activeTab?.id ? ' active' : '');
      btn.innerHTML = `
        <span>${t.unsaved ? '● ' : ''}${t.filename}</span>
        <span class="editor-tab-close" data-tid="${t.id}">×</span>`;
      btn.addEventListener('click', e => {
        if (e.target.closest('.editor-tab-close')) { closeTab(t.id); return; }
        switchTab(t.id);
      });
      tabs.appendChild(btn);
    }
    // New tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'editor-tab-new';
    newBtn.textContent = '+';
    newBtn.title = 'New file';
    newBtn.addEventListener('click', () => addTab(`untitled-${tabCounter+1}.js`, ''));
    tabs.appendChild(newBtn);
  }

  function renderHighlight() {
    if (!activeTab) return;
    const code = ta.value;
    hl.innerHTML = highlight(code, activeTab.lang) + '\n';
    // Sync scroll
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
    // Mark as saved indicator
    if (activeTab) {
      activeTab.unsaved = false;
      savedEl.textContent = '● Saved';
      savedEl.style.color = 'var(--green)';
    }
  }

  function renderGutter() {
    const lines = ta.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) html += `${i}\n`;
    gutter.textContent = html;
    gutter.scrollTop = ta.scrollTop;
  }

  function updatePosition() {
    const pos = ta.selectionStart;
    const text = ta.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col  = lines[lines.length - 1].length + 1;
    posEl.textContent = `Ln ${line}, Col ${col}`;
  }

  // Events
  ta.addEventListener('input', () => {
    saveActiveContent();
    renderHighlight();
    renderGutter();
    if (activeTab) {
      activeTab.unsaved = true;
      savedEl.textContent = '● Unsaved';
      savedEl.style.color = 'var(--amber)';
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        renderHighlight(); // recalc
        savedEl.textContent = '● Saved';
        savedEl.style.color = 'var(--green)';
      }, 1000);
    }
  });

  ta.addEventListener('scroll', () => {
    hl.scrollTop  = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  });

  ta.addEventListener('keyup', updatePosition);
  ta.addEventListener('click', updatePosition);

  ta.addEventListener('keydown', e => {
    // Tab key → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd;
      if (e.shiftKey) {
        // Unindent
        const before = ta.value.substring(0, s);
        const lineStart = before.lastIndexOf('\n') + 1;
        if (ta.value.substring(lineStart, lineStart + 2) === '  ') {
          ta.value = ta.value.substring(0, lineStart) + ta.value.substring(lineStart + 2);
          ta.selectionStart = ta.selectionEnd = Math.max(lineStart, s - 2);
        }
      } else {
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
      ta.dispatchEvent(new Event('input'));
    }
    // Ctrl+S → save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveActiveContent();
      if (activeTab && FS) {
        const path = `/home/user/Projects/${activeTab.filename}`;
        FS.write(path, activeTab.content);
        savedEl.textContent = '● Saved';
        savedEl.style.color = 'var(--green)';
        if (window.OS?.notify) OS.notify('File Saved', `Saved to ${path}`, 'success');
      }
    }
    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const s = ta.selectionStart, end = ta.selectionEnd;
      if (s === end) {
        e.preventDefault();
        const close = pairs[e.key];
        ta.value = ta.value.substring(0, s) + e.key + close + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 1;
        ta.dispatchEvent(new Event('input'));
      }
    }
  });

  langSel.addEventListener('change', () => {
    if (activeTab) {
      activeTab.lang = langSel.value;
      langDisp.textContent = LANGS[langSel.value]?.name || langSel.value;
      renderHighlight();
    }
  });

  // Run button: eval JS, show output
  runBtn.addEventListener('click', () => {
    if (!activeTab || activeTab.lang !== 'js') {
      if (window.OS?.notify) OS.notify('Run', 'Only JavaScript can be executed', 'warn');
      return;
    }
    outPanel.style.display = '';
    outPanel.innerHTML = '';
    const logs = [];
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    function addOut(cls, ...args) {
      const line = document.createElement('div');
      line.className = cls;
      line.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      outPanel.appendChild(line);
    }
    console.log = (...a)   => { origLog(...a);   addOut('out-log',    ...a); };
    console.error = (...a) => { origError(...a); addOut('out-error',  ...a); };
    console.warn = (...a)  => { origWarn(...a);  addOut('out-log',    ...a); };
    try {
      const result = Function(activeTab.content)();
      if (result !== undefined) addOut('out-result', '→ ' + result);
    } catch(e) {
      addOut('out-error', '✗ ' + e.message);
    } finally {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
    }
    if (outPanel.children.length === 0) {
      outPanel.innerHTML = '<span class="out-log">Executed successfully (no output)</span>';
    }
  });

  // Open a file from filesystem
  function openFile(path) {
    const content = FS.cat(path);
    if (content === null) return false;
    const name = path.split('/').pop();
    // Check if already open
    const existing = openTabs.find(t => t.filename === name);
    if (existing) { switchTab(existing.id); return true; }
    addTab(name, content);
    return true;
  }

  // Start with welcome file
  addTab('hello.js',
`// Welcome to DevOS Code Editor!
// Press Ctrl+S to save, click Run to execute JavaScript.

const greet = (name) => \`Hello, \${name}! 🚀\`;

console.log(greet('World'));
console.log('DevOS Editor is ready.');

// Try changing this and pressing Run ▶
const fibonacci = n => n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2);
console.log('Fibonacci(10) =', fibonacci(10));
`);

  // Expose openFile for file explorer integration
  container._editorOpenFile = openFile;

  return () => { clearTimeout(saveTimeout); };
}

window.Apps = window.Apps || {};
window.Apps.editor = {
  id: 'editor',
  name: 'Code Editor',
  icon: '📝',
  color: '#3b82f6',
  defaultWidth: 820,
  defaultHeight: 560,
  mount: createEditor,
};

})();
