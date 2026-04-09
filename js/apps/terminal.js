/* ══════════════════════════════════════════════
   DevOS — Terminal App
   ══════════════════════════════════════════════ */

(function() {
'use strict';

const FORTUNES = [
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Programs must be written for people to read." — Abelson & Sussman',
  '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"The most disastrous thing that you can ever learn is your first programming language." — Alan Kay',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"In order to be irreplaceable, one must always be different." — Coco Chanel',
  '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
  '"Make it work, make it right, make it fast." — Kent Beck',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
];

const FAKE_PROCESSES = [
  { pid: 1, name: 'devos-init',      cpu: '0.0', mem: '4.2' },
  { pid: 2, name: 'kernel-thread',   cpu: '0.1', mem: '1.8' },
  { pid: 8, name: 'display-server',  cpu: '2.3', mem: '48.1' },
  { pid: 15,name: 'window-manager',  cpu: '0.8', mem: '22.6' },
  { pid: 23,name: 'desktop-shell',   cpu: '0.4', mem: '16.2' },
  { pid: 31,name: 'compositor',      cpu: '1.2', mem: '30.4' },
  { pid: 45,name: 'audio-daemon',    cpu: '0.2', mem: '8.9' },
  { pid: 67,name: 'network-mgr',     cpu: '0.0', mem: '6.1' },
  { pid: 89,name: 'user-session',    cpu: '0.3', mem: '12.0' },
];

function createTerminal(container, windowId) {
  container.innerHTML = `
    <div class="terminal-app" id="term-${windowId}">
      <div class="term-output" id="term-out-${windowId}"></div>
      <div class="term-input-row">
        <span class="term-prompt" id="term-prompt-${windowId}"></span>
        <input class="term-input" id="term-in-${windowId}" type="text" autocomplete="off" spellcheck="false" autofocus>
      </div>
    </div>`;

  const output   = document.getElementById(`term-out-${windowId}`);
  const inputEl  = document.getElementById(`term-in-${windowId}`);
  const promptEl = document.getElementById(`term-prompt-${windowId}`);

  let cwd = '/home/user';
  let history = [];
  let histIdx = -1;
  let matrixRaf = null;

  // ── Prompt string ──
  function updatePrompt() {
    const display = cwd.replace('/home/user', '~');
    promptEl.innerHTML =
      `<span class="tp-user">user</span><span class="tp-at">@</span>` +
      `<span class="tp-host">devos</span><span class="tp-sep">:</span>` +
      `<span class="tp-path">${display}</span><span class="tp-sym"> $ </span>`;
  }
  updatePrompt();

  // ── Output helpers ──
  function print(html, cls = '') {
    const div = document.createElement('div');
    div.className = 'term-line' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }
  function println(text, cls) { print(text, cls); }
  function blank() { print('', 'term-blank'); }

  // Welcome banner
  print(`<span class="tc-purple tc-bold">DevOS Terminal</span> <span class="tc-gray">v1.0.0</span>`);
  print(`<span class="tc-gray">Type <span class="tc-cyan">help</span> for available commands.</span>`);
  blank();

  // ── Path utilities ──
  function normPath(p) {
    const parts = p.startsWith('/') ? p.split('/') : (cwd + '/' + p).split('/');
    const clean = [];
    for (const seg of parts) {
      if (!seg || seg === '.') continue;
      if (seg === '..') clean.pop(); else clean.push(seg);
    }
    return '/' + clean.join('/');
  }

  // ── Commands ──────────────────────────────────

  const cmds = {
    help(args) {
      print(`<span class="tc-cyan tc-bold">Available commands:</span>`);
      const list = [
        ['ls',      'List directory contents'],
        ['cd',      'Change directory'],
        ['pwd',     'Print working directory'],
        ['cat',     'Show file contents'],
        ['mkdir',   'Create directory'],
        ['touch',   'Create empty file'],
        ['rm',      'Remove file or directory'],
        ['mv',      'Move or rename'],
        ['echo',    'Print text'],
        ['clear',   'Clear terminal'],
        ['whoami',  'Show current user'],
        ['date',    'Show date and time'],
        ['uname',   'System information'],
        ['ps',      'List processes'],
        ['neofetch','System info with ASCII art'],
        ['matrix',  'Enter the Matrix (q to exit)'],
        ['fortune', 'Random quote'],
        ['cowsay',  'Make a cow say something'],
        ['banner',  'Display a large banner'],
        ['history', 'Show command history'],
        ['hack',    'Totally legit hacking tool'],
        ['calc',    'Quick calculation'],
        ['joke',    'Tell a programming joke'],
        ['exit',    'Close terminal'],
      ];
      for (const [cmd, desc] of list) {
        print(`  <span class="tc-green">${cmd.padEnd(12)}</span><span class="tc-gray">${desc}</span>`);
      }
      blank();
    },

    ls(args) {
      const path = args[0] || cwd;
      const target = normPath(path);
      const items = FS.ls(target);
      if (!items) { print(`<span class="tc-red">ls: cannot access '${path}': No such file or directory</span>`); return; }
      if (items.length === 0) { return; }
      let line = '';
      for (const item of items) {
        if (item.name.startsWith('.') && !args.includes('-a') && !args.includes('-la')) continue;
        const isDir = item.type === 'dir';
        const color = isDir ? 'tc-cyan tc-bold' : 'tc-white';
        const suffix = isDir ? '/' : '';
        line += `<span class="${color}">${item.name}${suffix}</span>  `;
      }
      if (line) print(line);
    },

    cd(args) {
      const path = args[0] || '/home/user';
      const target = normPath(path);
      if (!FS.exists(target)) {
        print(`<span class="tc-red">cd: no such file or directory: ${path}</span>`); return;
      }
      if (!FS.isDir(target)) {
        print(`<span class="tc-red">cd: not a directory: ${path}</span>`); return;
      }
      cwd = target;
      updatePrompt();
    },

    pwd() { print(cwd); },

    cat(args) {
      if (!args.length) { print('<span class="tc-red">cat: missing operand</span>'); return; }
      for (const arg of args) {
        const target = normPath(arg);
        const content = FS.cat(target);
        if (content === null) {
          print(`<span class="tc-red">cat: ${arg}: No such file or directory</span>`);
        } else {
          const escaped = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          print(`<span class="tc-white" style="white-space:pre-wrap">${escaped}</span>`);
        }
      }
    },

    mkdir(args) {
      if (!args.length) { print('<span class="tc-red">mkdir: missing operand</span>'); return; }
      for (const arg of args) {
        const ok = FS.mkdir(normPath(arg), cwd);
        if (!ok) print(`<span class="tc-red">mkdir: cannot create directory '${arg}'</span>`);
      }
    },

    touch(args) {
      if (!args.length) { print('<span class="tc-red">touch: missing file operand</span>'); return; }
      for (const arg of args) FS.touch(normPath(arg), cwd);
    },

    rm(args) {
      const rec = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const files = args.filter(a => !a.startsWith('-'));
      if (!files.length) { print('<span class="tc-red">rm: missing operand</span>'); return; }
      for (const arg of files) {
        const r = FS.rm(normPath(arg), cwd, rec);
        if (r === 'NOTREC') print(`<span class="tc-red">rm: cannot remove '${arg}': Is a directory (use -r)</span>`);
        else if (!r) print(`<span class="tc-red">rm: cannot remove '${arg}': No such file or directory</span>`);
      }
    },

    mv(args) {
      if (args.length < 2) { print('<span class="tc-red">mv: missing operand</span>'); return; }
      const ok = FS.mv(normPath(args[0]), normPath(args[1]), cwd);
      if (!ok) print(`<span class="tc-red">mv: cannot move '${args[0]}'</span>`);
    },

    echo(args) {
      print(args.join(' '));
    },

    clear() {
      output.innerHTML = '';
    },

    whoami() { print('<span class="tc-green">user</span>'); },

    date() {
      print(`<span class="tc-cyan">${new Date().toString()}</span>`);
    },

    uname(args) {
      if (args.includes('-a')) {
        print('<span class="tc-white">DevOS 1.0.0 devos #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux</span>');
      } else {
        print('DevOS');
      }
    },

    ps() {
      print(`<span class="tc-cyan">  PID  %-20s  CPU%%  MEM%%</span>`.replace('%s', 'CMD'));
      for (const p of FAKE_PROCESSES) {
        print(`<span class="tc-gray">${String(p.pid).padStart(5)}  </span><span class="tc-white">${p.name.padEnd(22)}</span><span class="tc-green"> ${p.cpu.padStart(3)}%  </span><span class="tc-blue">${p.mem}%</span>`);
      }
    },

    neofetch() {
      const art = [
        `<span class="tc-cyan">    ██████╗ ███████╗██╗   ██╗ ██████╗ ███████╗</span>`,
        `<span class="tc-cyan">    ██╔══██╗██╔════╝██║   ██║██╔═══██╗██╔════╝</span>`,
        `<span class="tc-purple">    ██║  ██║█████╗  ██║   ██║██║   ██║███████╗</span>`,
        `<span class="tc-purple">    ██║  ██║██╔══╝  ╚██╗ ██╔╝██║   ██║╚════██║</span>`,
        `<span class="tc-pink">    ██████╔╝███████╗ ╚████╔╝ ╚██████╔╝███████║</span>`,
        `<span class="tc-pink">    ╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝</span>`,
      ];
      const info = [
        `<span class="tc-cyan tc-bold">user</span><span class="tc-gray">@</span><span class="tc-cyan tc-bold">devos</span>`,
        `<span class="tc-gray">─────────────────────────</span>`,
        `<span class="tc-purple">OS:</span>     <span class="tc-white">DevOS 1.0.0 Nebula</span>`,
        `<span class="tc-purple">Kernel:</span> <span class="tc-white">devos-6.18.5</span>`,
        `<span class="tc-purple">Shell:</span>  <span class="tc-white">devsh 1.0</span>`,
        `<span class="tc-purple">WM:</span>     <span class="tc-white">DevOS WM</span>`,
        `<span class="tc-purple">CPU:</span>    <span class="tc-white">Claude Neural Engine</span>`,
        `<span class="tc-purple">Memory:</span> <span class="tc-white">∞ MB / ∞ MB</span>`,
        `<span class="tc-purple">Made by:</span><span class="tc-white"> Claude AI 🤖</span>`,
        ``,
        `<span style="color:#ef4444">█</span><span style="color:#f59e0b">█</span><span style="color:#10b981">█</span><span style="color:#3b82f6">█</span><span style="color:#7c3aed">█</span><span style="color:#ec4899">█</span><span style="color:#06b6d4">█</span><span style="color:#f1f5f9">█</span>`,
      ];
      blank();
      for (let i = 0; i < Math.max(art.length, info.length); i++) {
        const a = art[i] || ''; const b = info[i] || '';
        print(`${a}  ${b}`);
      }
      blank();
    },

    fortune() {
      const q = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      blank();
      print(`<span class="tc-amber">❝ ${q} ❞</span>`);
      blank();
    },

    cowsay(args) {
      const msg = args.join(' ') || 'Moo!';
      const top    = ' ' + '_'.repeat(msg.length + 2);
      const bottom = ' ' + '-'.repeat(msg.length + 2);
      print(`<span class="tc-white">${top}</span>`);
      print(`<span class="tc-white">| ${msg} |</span>`);
      print(`<span class="tc-white">${bottom}</span>`);
      print(`<span class="tc-amber">       \\   ^__^</span>`);
      print(`<span class="tc-amber">        \\  (oo)\\_______</span>`);
      print(`<span class="tc-amber">           (__)\\       )\\/\\</span>`);
      print(`<span class="tc-amber">               ||----w |</span>`);
      print(`<span class="tc-amber">               ||     ||</span>`);
      blank();
    },

    banner(args) {
      const text = (args.join(' ') || 'DevOS').toUpperCase().slice(0, 10);
      const bigChars = {
        'A':'█████\n█   █\n█████\n█   █\n█   █','B':'████ \n█   █\n████ \n█   █\n████ ',
        'C':'█████\n█    \n█    \n█    \n█████','D':'████ \n█   █\n█   █\n█   █\n████ ',
        'E':'█████\n█    \n████ \n█    \n█████','F':'█████\n█    \n████ \n█    \n█    ',
        'G':'█████\n█    \n█  ██\n█   █\n█████','H':'█   █\n█   █\n█████\n█   █\n█   █',
        'I':'█████\n  █  \n  █  \n  █  \n█████','J':'█████\n    █\n    █\n█   █\n █████',
        'K':'█   █\n█  █ \n███  \n█  █ \n█   █','L':'█    \n█    \n█    \n█    \n█████',
        'M':'█   █\n██ ██\n█ █ █\n█   █\n█   █','N':'█   █\n██  █\n█ █ █\n█  ██\n█   █',
        'O':'█████\n█   █\n█   █\n█   █\n█████','P':'████ \n█   █\n████ \n█    \n█    ',
        'Q':'█████\n█   █\n█ █ █\n█  ██\n██████','R':'████ \n█   █\n████ \n█  █ \n█   █',
        'S':'█████\n█    \n█████\n    █\n█████','T':'█████\n  █  \n  █  \n  █  \n  █  ',
        'U':'█   █\n█   █\n█   █\n█   █\n█████','V':'█   █\n█   █\n█   █\n █ █ \n  █  ',
        'W':'█   █\n█   █\n█ █ █\n██ ██\n█   █','X':'█   █\n █ █ \n  █  \n █ █ \n█   █',
        'Y':'█   █\n █ █ \n  █  \n  █  \n  █  ','Z':'█████\n   █ \n  █  \n █   \n█████',
        ' ':'     \n     \n     \n     \n     ',
        '0':'█████\n█   █\n█ █ █\n█   █\n█████','1':'  █  \n ██  \n  █  \n  █  \n█████',
        '!':'  █  \n  █  \n  █  \n     \n  █  ',
      };
      const lines = ['','','','',''];
      for (const ch of text) {
        const pattern = bigChars[ch] || bigChars['?'] || '     \n     \n     \n     \n     ';
        const rows = pattern.split('\n');
        for (let i = 0; i < 5; i++) lines[i] += (rows[i] || '     ') + ' ';
      }
      blank();
      const colors = ['tc-purple','tc-cyan','tc-purple','tc-cyan','tc-pink'];
      lines.forEach((l, i) => print(`<span class="${colors[i]}">${l}</span>`));
      blank();
    },

    history() {
      history.forEach((cmd, i) => {
        print(`<span class="tc-gray">${String(i+1).padStart(4)}  </span><span class="tc-white">${cmd}</span>`);
      });
    },

    calc(args) {
      if (!args.length) { print('<span class="tc-red">calc: provide an expression</span>'); return; }
      const expr = args.join(' ');
      try {
        const result = Function(`"use strict"; return (${expr.replace(/[^0-9+\-*/().,% \t]/g, '')})`)();
        print(`<span class="tc-cyan">${expr} = <span class="tc-green tc-bold">${result}</span></span>`);
      } catch(e) {
        print(`<span class="tc-red">calc: invalid expression</span>`);
      }
    },

    joke() {
      const jokes = [
        ['Why do programmers prefer dark mode?', 'Because light attracts bugs!'],
        ['How many programmers does it take to change a light bulb?', 'None. That\'s a hardware problem.'],
        ['A SQL query walks into a bar, walks up to two tables and asks...', '"Can I join you?"'],
        ['Why did the programmer quit their job?', 'Because they didn\'t get arrays.'],
        ['What do you call a programmer from Finland?', 'Nerdic.'],
        ['Why do Java developers wear glasses?', 'Because they don\'t C#.'],
        ['!false', 'It\'s funny because it\'s true.'],
      ];
      const [q, a] = jokes[Math.floor(Math.random() * jokes.length)];
      blank();
      print(`<span class="tc-amber">Q: ${q}</span>`);
      setTimeout(() => { print(`<span class="tc-green">A: ${a}</span>`); blank(); }, 800);
    },

    hack(args) {
      blank();
      print(`<span class="tc-green">Initializing DevOS Penetration Suite v4.2.0...</span>`);
      const steps = [
        [400,  `<span class="tc-cyan">► Scanning target network...</span>`],
        [900,  `<span class="tc-green">  [████████████████████] 100%  Found 47 open ports</span>`],
        [1300, `<span class="tc-cyan">► Running vulnerability scanner...</span>`],
        [1900, `<span class="tc-amber">  [!] CVE-2024-0001: Buffer overflow in /usr/lib/libnotreallyreal.so</span>`],
        [2400, `<span class="tc-cyan">► Deploying exploit payload...</span>`],
        [3000, `<span class="tc-green">  [████████████████████] 100%  Payload delivered</span>`],
        [3400, `<span class="tc-cyan">► Escalating privileges...</span>`],
        [3900, `<span class="tc-green">  root@target:~# </span>`],
        [4500, `<span class="tc-pink tc-bold">✓ Access granted! (jk, this is all fake)</span>`],
        [5000, `<span class="tc-gray">  This is DevOS. No actual hacking occurred. Stay ethical. 😄</span>`],
      ];
      steps.forEach(([delay, html]) => setTimeout(() => print(html), delay));
      setTimeout(() => blank(), 5200);
    },

    matrix() {
      stopMatrix();
      print(`<span class="tc-green">Entering the Matrix... (press <span class="tc-amber">q</span> to exit)</span>`);
      blank();
      const chars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF'.split('');
      let active = true;
      function rainLine() {
        if (!active) return;
        let line = '';
        for (let i = 0; i < 60; i++) {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          const bright = Math.random() > 0.85;
          line += bright
            ? `<span style="color:#fff;text-shadow:0 0 6px #0f0">${ch}</span>`
            : `<span style="color:#00${Math.floor(100+Math.random()*155).toString(16).padStart(2,'0')}00">${ch}</span>`;
        }
        print(`<span style="font-family:var(--font-mono);font-size:11px">${line}</span>`);
        matrixRaf = setTimeout(rainLine, 80);
      }
      rainLine();
      function onKey(e) {
        if (e.key === 'q' || e.key === 'Q') {
          active = false;
          stopMatrix();
          blank();
          print(`<span class="tc-cyan">You took the red pill. Welcome back.</span>`);
          blank();
          document.removeEventListener('keydown', onKey);
        }
      }
      document.addEventListener('keydown', onKey);
    },

    exit() {
      if (typeof WM !== 'undefined') {
        const wins = WM.getAll();
        for (const w of wins) {
          if (w.el.querySelector(`#term-${windowId}`)) {
            WM.close(w.id); break;
          }
        }
      }
    },
  };

  function stopMatrix() {
    if (matrixRaf) { clearTimeout(matrixRaf); matrixRaf = null; }
  }

  function runCommand(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    history.push(trimmed);
    histIdx = -1;

    // Echo command
    const display = cwd.replace('/home/user', '~');
    print(`<span class="tc-green">user</span><span class="tc-gray">@</span><span class="tc-cyan">devos</span><span class="tc-gray">:</span><span class="tc-purple">${display}</span><span class="tc-gray"> $ </span>${trimmed}`, 'cmd-line');

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmds[cmd]) {
      try { cmds[cmd](args); } catch(e) { print(`<span class="tc-red">Error: ${e.message}</span>`); }
    } else {
      print(`<span class="tc-red">bash: ${cmd}: command not found</span>`);
      print(`<span class="tc-gray">Type <span class="tc-cyan">help</span> for available commands.</span>`);
    }
    blank();
  }

  // ── Input handling ──────────────────────────
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = inputEl.value;
      inputEl.value = '';
      runCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      if (histIdx < history.length - 1) histIdx++;
      inputEl.value = history[history.length - 1 - histIdx];
      setTimeout(() => inputEl.setSelectionRange(9999, 9999), 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; inputEl.value = history[history.length - 1 - histIdx]; }
      else { histIdx = -1; inputEl.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const partial = inputEl.value.trim();
      const parts = partial.split(/\s+/);
      if (parts.length === 1) {
        const matches = Object.keys(cmds).filter(c => c.startsWith(partial));
        if (matches.length === 1) { inputEl.value = matches[0] + ' '; }
        else if (matches.length > 1) { print(matches.join('  ')); }
      } else {
        const prefix = parts[parts.length - 1];
        const items = FS.ls(cwd) || [];
        const matches = items.filter(i => i.name.startsWith(prefix));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0].name + (matches[0].type === 'dir' ? '/' : '');
          inputEl.value = parts.join(' ');
        } else if (matches.length > 1) {
          print(matches.map(m => `<span class="${m.type==='dir'?'tc-cyan':'tc-white'}">${m.name}</span>`).join('  '));
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault(); cmds.clear();
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      stopMatrix();
      if (inputEl.value) print(inputEl.value + '^C');
      else print('^C');
      inputEl.value = '';
      blank();
    }
  });

  // Focus on click
  container.addEventListener('click', () => inputEl.focus());
  inputEl.focus();

  // Cleanup
  return () => { stopMatrix(); };
}

window.Apps = window.Apps || {};
window.Apps.terminal = {
  id: 'terminal',
  name: 'Terminal',
  icon: '⌨️',
  color: '#10b981',
  defaultWidth: 760,
  defaultHeight: 500,
  mount: createTerminal,
};

})();
