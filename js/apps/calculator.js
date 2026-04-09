/* ══════════════════════════════════════════════
   DevOS — Calculator App
   ══════════════════════════════════════════════ */

(function() {
'use strict';

function createCalc(container, windowId) {
  const id = windowId;

  const keys = [
    [{ l: 'sin', fn: true }, { l: 'cos', fn: true }, { l: 'tan', fn: true }, { l: '(', op: true }],
    [{ l: 'x²',  fn: true }, { l: '√',  fn: true }, { l: 'log', fn: true }, { l: ')', op: true }],
    [{ l: 'π',   fn: true }, { l: 'e',  fn: true }, { l: '!',  fn: true }, { l: '%', op: true }],
    [{ l: 'AC', clr: true }, { l: '±',  fn: true }, { l: '⌫', del: true }, { l: '÷', op: true }],
    [{ l: '7' },  { l: '8' }, { l: '9' }, { l: '×', op: true }],
    [{ l: '4' },  { l: '5' }, { l: '6' }, { l: '−', op: true }],
    [{ l: '1' },  { l: '2' }, { l: '3' }, { l: '+', op: true }],
    [{ l: '0', zero: true }, { l: '.', op: true }, { l: '=', eq: true }],
  ];

  let keysHTML = '';
  for (const row of keys) {
    for (const k of row) {
      const cls = ['calc-btn',
        k.clr ? 'clr' : '', k.del ? 'del' : '',
        k.fn  ? 'fn'  : '', k.op  ? 'op'  : '',
        k.eq  ? 'eq'  : '', k.zero? 'zero': '',
      ].filter(Boolean).join(' ');
      keysHTML += `<button class="${cls}" data-val="${k.l}">${k.l}</button>`;
    }
  }

  container.innerHTML = `
    <div class="calc-app" id="calc-${id}">
      <div class="calc-history" id="calc-hist-${id}"></div>
      <div class="calc-display">
        <div class="calc-expr-line" id="calc-expr-${id}"></div>
        <div class="calc-result-line" id="calc-res-${id}">0</div>
      </div>
      <div class="calc-keypad">${keysHTML}</div>
    </div>`;

  const exprEl = document.getElementById(`calc-expr-${id}`);
  const resEl  = document.getElementById(`calc-res-${id}`);
  const histEl = document.getElementById(`calc-hist-${id}`);

  let display  = '';
  let lastResult = null;
  let justEvaluated = false;

  function updateDisplay() {
    exprEl.textContent = display || '';
    // Show preview if possible
    if (display && !justEvaluated) {
      try {
        const val = evalExpr(display);
        if (isFinite(val)) {
          resEl.textContent = format(val);
          resEl.classList.remove('error');
        }
      } catch(_) {}
    }
  }

  function format(val) {
    if (!isFinite(val)) return 'Error';
    if (Number.isInteger(val) && Math.abs(val) < 1e12) return val.toLocaleString();
    if (Math.abs(val) > 1e12 || (Math.abs(val) < 0.0001 && val !== 0)) return val.toExponential(4);
    return parseFloat(val.toFixed(10)).toString();
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
  }

  function evalExpr(expr) {
    // Replace symbols with JS equivalents
    let e = expr
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/π/g, 'Math.PI').replace(/\be\b/g, 'Math.E')
      .replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(').replace(/log\(/g, 'Math.log10(')
      .replace(/√\(/g, 'Math.sqrt(').replace(/√(\d+\.?\d*)/g, 'Math.sqrt($1)')
      .replace(/(\d+\.?\d*)!/g, (_, n) => factorial(parseFloat(n)))
      .replace(/(\d+\.?\d*)\^(\d+\.?\d*)/g, 'Math.pow($1,$2)')
      .replace(/x²/g, '^2').replace(/(\d+\.?\d*)²/g, 'Math.pow($1,2)')
      .replace(/(\d+)(Math\.PI|Math\.E)/g, '$1*$2');
    // Remove anything not safe
    e = e.replace(/[^0-9+\-*/.()%,Math\.PIEsincotanqrlgowdb\s]/g, '');
    return Function(`"use strict"; return (${e})`)();
  }

  function addToHistory(expr, result) {
    const item = document.createElement('div');
    item.className = 'calc-hist-item';
    item.innerHTML = `<span class="calc-hist-expr">${expr}</span><span class="calc-hist-res">${result}</span>`;
    histEl.appendChild(item);
    histEl.scrollTop = histEl.scrollHeight;
    // Limit history
    while (histEl.children.length > 30) histEl.removeChild(histEl.firstChild);
  }

  function press(val) {
    if (justEvaluated && /[0-9π(]/.test(val)) { display = ''; justEvaluated = false; }
    if (justEvaluated && /[+\-×÷%]/.test(val)) { justEvaluated = false; }

    if (val === 'AC') {
      display = ''; justEvaluated = false;
      resEl.textContent = '0'; exprEl.textContent = '';
      resEl.classList.remove('error');
      return;
    }
    if (val === '⌫') {
      display = display.slice(0, -1); updateDisplay(); return;
    }
    if (val === '=') {
      if (!display) return;
      try {
        const result = evalExpr(display);
        if (!isFinite(result)) throw new Error('Result is ' + result);
        const formatted = format(result);
        addToHistory(display + ' =', formatted);
        display = formatted.replace(/,/g, '');
        resEl.textContent = formatted;
        resEl.classList.remove('error');
        exprEl.textContent = '';
        justEvaluated = true;
      } catch(e) {
        resEl.textContent = 'Error';
        resEl.classList.add('error');
        display = '';
        justEvaluated = true;
      }
      return;
    }
    if (val === '±') {
      if (display.startsWith('-')) display = display.slice(1);
      else display = '-' + display;
      updateDisplay(); return;
    }
    if (val === 'x²') { display += '²'; updateDisplay(); return; }
    if (val === '√')  { display += '√('; updateDisplay(); return; }
    if (val === 'sin' || val === 'cos' || val === 'tan' || val === 'log') {
      display += val + '('; updateDisplay(); return;
    }

    display += val;
    updateDisplay();
  }

  // Buttons
  container.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => press(btn.dataset.val));
  });

  // Keyboard support
  function onKey(e) {
    if (!document.getElementById(`calc-${id}`)) {
      document.removeEventListener('keydown', onKey); return;
    }
    const map = {
      'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'AC',
      '*': '×', '/': '÷', '-': '−', '+': '+', '.': '.', '%': '%',
      '(': '(', ')': ')',
    };
    if (map[e.key]) { e.preventDefault(); press(map[e.key]); return; }
    if (/^[0-9]$/.test(e.key)) { press(e.key); return; }
  }
  document.addEventListener('keydown', onKey);

  return () => document.removeEventListener('keydown', onKey);
}

window.Apps = window.Apps || {};
window.Apps.calculator = {
  id: 'calculator',
  name: 'Calculator',
  icon: '🔢',
  color: '#f59e0b',
  defaultWidth: 320,
  defaultHeight: 530,
  mount: createCalc,
};

})();
