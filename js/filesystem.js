/* ══════════════════════════════════════════════
   DevOS — Virtual File System
   ══════════════════════════════════════════════ */

(function() {
'use strict';

const tree = {
  type: 'dir', name: '/', children: {
    home: { type: 'dir', name: 'home', children: {
      user: { type: 'dir', name: 'user', children: {
        Desktop: { type: 'dir', name: 'Desktop', children: {} },
        Documents: { type: 'dir', name: 'Documents', children: {
          'notes.md': { type: 'file', name: 'notes.md', content:
`# My Notes

## Todo
- [ ] Learn something new
- [x] Open DevOS

## Ideas
> "The best way to predict the future is to invent it." — Alan Kay
` },
          'readme.txt': { type: 'file', name: 'readme.txt', content:
`Welcome to DevOS!
=================

This is a browser-based desktop environment.
Built entirely with vanilla HTML, CSS & JavaScript.

Crafted by Claude AI.
` },
        }},
        Projects: { type: 'dir', name: 'Projects', children: {
          'hello.js': { type: 'file', name: 'hello.js', content:
`// Hello World in JavaScript
const greet = (name) => {
  return \`Hello, \${name}! Welcome to DevOS.\`;
};

console.log(greet('World'));

// Fibonacci sequence
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const fib = fibonacci();
for (let i = 0; i < 10; i++) {
  console.log(fib.next().value);
}
` },
          'style.css': { type: 'file', name: 'style.css', content:
`:root {
  --primary: #7c3aed;
  --bg: #0a0a1f;
}

body {
  background: var(--bg);
  color: #f0f4f8;
  font-family: 'Inter', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
` },
          'index.html': { type: 'file', name: 'index.html', content:
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello, DevOS!</h1>
    <p>This is my project.</p>
  </div>
  <script src="app.js"></script>
</body>
</html>
` },
        }},
        '.bashrc': { type: 'file', name: '.bashrc', content:
`# DevOS bash configuration
export USER="user"
export HOME="/home/user"
export PATH="/usr/local/bin:/usr/bin:/bin"
export EDITOR="devos-editor"

alias ls='ls --color=auto'
alias ll='ls -la'
alias grep='grep --color=auto'

PS1='\\[\\033[0;32m\\]\\u\\[\\033[0m\\]@\\[\\033[0;36m\\]devos\\[\\033[0m\\]:\\[\\033[0;35m\\]\\w\\[\\033[0m\\]$ '

echo "Welcome back, $USER!"
` },
        '.profile': { type: 'file', name: '.profile', content: '# DevOS user profile\n. ~/.bashrc\n' },
      }}
    }},
    bin: { type: 'dir', name: 'bin', children: {} },
    etc: { type: 'dir', name: 'etc', children: {
      'hostname': { type: 'file', name: 'hostname', content: 'devos\n' },
      'os-release': { type: 'file', name: 'os-release', content:
`NAME="DevOS"
VERSION="1.0.0"
ID=devos
PRETTY_NAME="DevOS 1.0.0 (Nebula)"
HOME_URL="https://devos.local"
BUILD_BY="Claude AI"
` },
    }},
    tmp: { type: 'dir', name: 'tmp', children: {} },
    usr: { type: 'dir', name: 'usr', children: {
      bin: { type: 'dir', name: 'bin', children: {} },
      local: { type: 'dir', name: 'local', children: {} },
    }},
    var: { type: 'dir', name: 'var', children: {
      log: { type: 'dir', name: 'log', children: {
        'devos.log': { type: 'file', name: 'devos.log', content:
`[BOOT] DevOS v1.0.0 starting...
[BOOT] Loading kernel modules...
[BOOT] Initializing display server...
[BOOT] Starting window manager...
[BOOT] Loading user session...
[INFO] User 'user' logged in.
[INFO] Desktop environment ready.
` },
      }},
    }},
  }
};

// Resolve a path string to a node
function resolve(path, cwd = '/') {
  const parts = path.startsWith('/') ? path.split('/') : (cwd + '/' + path).split('/');
  let node = tree;
  const clean = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') { clean.pop(); continue; }
    clean.push(p);
  }
  for (const seg of clean) {
    if (!node || node.type !== 'dir') return null;
    node = node.children[seg];
    if (!node) return null;
  }
  return node || tree;
}

function normPath(path, cwd = '/') {
  const parts = path.startsWith('/') ? path.split('/') : (cwd + '/' + path).split('/');
  const clean = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') { clean.pop(); continue; }
    clean.push(p);
  }
  return '/' + clean.join('/');
}

function parentAndName(path, cwd) {
  const full = normPath(path, cwd);
  const parts = full.split('/').filter(Boolean);
  const name = parts.pop();
  const parentPath = '/' + parts.join('/');
  const parent = resolve(parentPath);
  return { parent, name, full };
}

window.FS = {
  resolve,
  normPath,
  // List directory contents
  ls(path, cwd = '/') {
    const node = resolve(path, cwd);
    if (!node) return null;
    if (node.type === 'file') return [node];
    return Object.values(node.children);
  },
  // Read file contents
  cat(path, cwd = '/') {
    const node = resolve(path, cwd);
    if (!node || node.type !== 'file') return null;
    return node.content;
  },
  // Create directory
  mkdir(path, cwd = '/') {
    const { parent, name } = parentAndName(path, cwd);
    if (!parent || parent.type !== 'dir') return false;
    if (parent.children[name]) return false;
    parent.children[name] = { type: 'dir', name, children: {} };
    return true;
  },
  // Create/touch file
  touch(path, cwd = '/', content = '') {
    const { parent, name } = parentAndName(path, cwd);
    if (!parent || parent.type !== 'dir') return false;
    if (!parent.children[name]) {
      parent.children[name] = { type: 'file', name, content };
    }
    return true;
  },
  // Write file
  write(path, content, cwd = '/') {
    const { parent, name } = parentAndName(path, cwd);
    if (!parent || parent.type !== 'dir') return false;
    parent.children[name] = { type: 'file', name, content };
    return true;
  },
  // Remove file or directory
  rm(path, cwd = '/', recursive = false) {
    const { parent, name } = parentAndName(path, cwd);
    if (!parent || !parent.children[name]) return false;
    const node = parent.children[name];
    if (node.type === 'dir' && !recursive) return 'NOTREC';
    delete parent.children[name];
    return true;
  },
  // Move/rename
  mv(src, dst, cwd = '/') {
    const srcR = parentAndName(src, cwd);
    if (!srcR.parent || !srcR.parent.children[srcR.name]) return false;
    const node = srcR.parent.children[srcR.name];
    delete srcR.parent.children[srcR.name];
    const dstR = parentAndName(dst, cwd);
    // If dst is an existing dir, put inside it
    const dstNode = resolve(dst, cwd);
    if (dstNode && dstNode.type === 'dir') {
      dstNode.children[node.name] = node;
    } else {
      if (!dstR.parent) return false;
      node.name = dstR.name;
      dstR.parent.children[dstR.name] = node;
    }
    return true;
  },
  exists(path, cwd = '/') {
    return resolve(path, cwd) != null;
  },
  isDir(path, cwd = '/') {
    const n = resolve(path, cwd);
    return n != null && n.type === 'dir';
  },
};

})();
