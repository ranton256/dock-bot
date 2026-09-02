'use strict';
// Headless harness for the browser shell.
//
// Runs game.js against a stubbed DOM and asserts on what it would have drawn.
// This is not part of the shipped game: test.js stays scoped to the core
// scenarios the specification assigns it, and a DOM stub there would be a lot of
// machinery for a student to wade through. It lives here so the shell's logic is
// checked mechanically before the file:// checklist, which is otherwise done by eye.
//
// Usage: node tools/shell-harness.js [repo-root]

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = process.argv[2] || path.join(__dirname, '..');

function makeShell() {
  const draws = [];
  let hudText = 'Moves: 0';
  let cleared = 0;
  let keyHandler = null;
  let loadHandler = null;
  let smoothing = null;
  let atlasSrc = null;

  const context = {
    set imageSmoothingEnabled(v) { smoothing = v; },
    get imageSmoothingEnabled() { return smoothing; },
    clearRect(x, y, w, h) { cleared++; draws.push({ op: 'clear', x, y, w, h }); },
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      draws.push({ op: 'draw', sx, sy, sw, sh, dx, dy, dw, dh });
    },
  };

  const canvas = { width: 384, height: 288, getContext: () => context };
  const hud = { set textContent(v) { hudText = v; }, get textContent() { return hudText; } };

  const sandbox = {
    document: { getElementById: (id) => (id === 'board' ? canvas : id === 'hud' ? hud : null) },
    window: { addEventListener: (type, fn) => { if (type === 'keydown') keyHandler = fn; } },
    Image: function () {
      this.addEventListener = (type, fn) => { if (type === 'load') loadHandler = fn; };
      Object.defineProperty(this, 'src', { set: (v) => { atlasSrc = v; }, get: () => atlasSrc });
    },
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8'), sandbox);

  const api = {
    draws, get hud() { return hudText; }, get cleared() { return cleared; },
    get smoothing() { return smoothing; }, get atlasSrc() { return atlasSrc; },
    get hasKeyHandler() { return keyHandler !== null; },
    load: () => loadHandler(),
    press: (key, extra = {}) => {
      if (!keyHandler) return { prevented: false, ignored: true };
      let prevented = false;
      keyHandler({ key, repeat: false, ctrlKey: false, metaKey: false, altKey: false,
                   preventDefault: () => { prevented = true; }, ...extra });
      return { prevented };
    },
    reset: () => { draws.length = 0; },
  };
  return api;
}

let checks = 0;
const ok = (name, fn) => { fn(); checks++; console.log('  ok  ' + name); };

// --- 3.2 drawing waits for the atlas ---
ok('no key handler and no drawing before the atlas loads', () => {
  const s = makeShell();
  assert.strictEqual(s.draws.length, 0, 'nothing drawn before load');
  assert.strictEqual(s.hasKeyHandler, false, 'no listener before load');
  s.press('ArrowUp');
  assert.strictEqual(s.draws.length, 0, 'an early press draws nothing');
  assert.strictEqual(s.hud, 'Moves: 0');
});

ok('the atlas is requested by path and smoothing is disabled', () => {
  const s = makeShell();
  assert.strictEqual(s.atlasSrc, 'assets/dock_bot.png');
  assert.strictEqual(s.smoothing, false);
});

// --- 4.2 draw order ---
ok('draw order: clear, 48 base tiles, crates, bot last', () => {
  const s = makeShell();
  s.load();
  const d = s.draws;
  assert.strictEqual(d[0].op, 'clear', 'the whole canvas is cleared first');
  assert.deepStrictEqual([d[0].x, d[0].y, d[0].w, d[0].h], [0, 0, 384, 288]);

  const base = d.slice(1, 49);
  assert.strictEqual(base.length, 48, '8 columns x 6 rows of base tiles');
  base.forEach((c, i) => {
    const col = i % 8, row = Math.floor(i / 8);
    assert.deepStrictEqual([c.dx, c.dy], [col * 48, row * 48], `cell ${col},${row} lands at c*48,r*48`);
    assert.deepStrictEqual([c.dw, c.dh], [48, 48]);
    assert.deepStrictEqual([c.sw, c.sh], [16, 16]);
  });

  const rest = d.slice(49);
  assert.strictEqual(rest.length, 4, 'three crates then the bot');
  const bot = rest[rest.length - 1];
  assert.deepStrictEqual([bot.dx, bot.dy], [1 * 48, 3 * 48], 'the bot draws last, at its cell');
  assert.deepStrictEqual([bot.sx, bot.sy], [3 * 16, 0], 'facing right -> bot_right at cell (3,0)');
});

// --- 4.3 docked crate frame ---
ok('a crate on a pad draws with the docked frame, over the pad tile', () => {
  const s = makeShell();
  s.load();
  s.reset();
  'UURDLDR'.split('').forEach((c) => s.press({ U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[c]));
  const last = s.draws.slice(-4);
  const crates = last.slice(0, 3);
  const docked = crates.filter((c) => c.sx === 1 * 16 && c.sy === 1 * 16);
  const plain = crates.filter((c) => c.sx === 0 * 16 && c.sy === 1 * 16);
  assert.strictEqual(docked.length, 1, 'one crate is docked after UURDLDR');
  assert.strictEqual(plain.length, 2, 'the other two are not');
  // The pad tile beneath it was drawn in the base pass.
  const baseAtPad = s.draws.slice(1, 49).find((c) => c.dx === 3 * 48 && c.dy === 3 * 48);
  assert.deepStrictEqual([baseAtPad.sx, baseAtPad.sy], [0, 2 * 16], 'pad frame at cell (0,2)');
});

// --- 4.4 facing selects the frame ---
ok('each facing selects its own bot frame', () => {
  const s = makeShell();
  s.load();
  const expect = { ArrowUp: [0, 0], ArrowDown: [1 * 16, 0], ArrowLeft: [2 * 16, 0], ArrowRight: [3 * 16, 0] };
  for (const [k, [sx, sy]] of Object.entries(expect)) {
    s.reset();
    s.press(k);
    const bot = s.draws[s.draws.length - 1];
    assert.deepStrictEqual([bot.sx, bot.sy], [sx, sy], `${k} -> frame at ${sx},${sy}`);
  }
});

// --- 5.1 / 5.2 input ---
ok('one press is one move, and arrows suppress scrolling', () => {
  const s = makeShell();
  s.load();
  const r = s.press('ArrowUp');
  assert.strictEqual(r.prevented, true, 'arrows must not scroll the page');
  assert.strictEqual(s.hud, 'Moves: 1');
  s.press('ArrowUp');
  assert.strictEqual(s.hud, 'Moves: 2');
});

ok('auto-repeat while a key is held produces no further moves', () => {
  const s = makeShell();
  s.load();
  s.press('ArrowUp');
  assert.strictEqual(s.hud, 'Moves: 1');
  for (let i = 0; i < 20; i++) s.press('ArrowUp', { repeat: true });
  assert.strictEqual(s.hud, 'Moves: 1', 'held keys do not repeat');
});

// --- 5.3 restart ---
ok('R restarts from mid-game and from a solved board', () => {
  const s = makeShell();
  s.load();
  'UURD'.split('').forEach((c) => s.press({ U: 'ArrowUp', R: 'ArrowRight', D: 'ArrowDown' }[c]));
  assert.strictEqual(s.hud, 'Moves: 4');
  s.press('R');
  assert.strictEqual(s.hud, 'Moves: 0');

  const solve = 'UURDLDRDRRUURUL';
  const map = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  solve.split('').forEach((c) => s.press(map[c]));
  assert.match(s.hud, /^Solved in 15 moves/);
  s.press('r');
  assert.strictEqual(s.hud, 'Moves: 0', 'lowercase r restarts too');
});

// --- 5.4 other keys inert ---
ok('every other key is inert and causes no redraw', () => {
  const s = makeShell();
  s.load();
  s.reset();
  for (const k of ['a', 'Z', '1', ' ', 'Tab', 'Enter', 'Shift', 'Escape', 'ArrowUpLeft', 'F5']) {
    const r = s.press(k);
    assert.strictEqual(r.prevented, false, `${k} must not be swallowed`);
  }
  assert.strictEqual(s.draws.length, 0, 'nothing was redrawn');
  assert.strictEqual(s.hud, 'Moves: 0');
});

ok('modifier combinations are left to the browser', () => {
  const s = makeShell();
  s.load();
  s.reset();
  assert.strictEqual(s.press('r', { metaKey: true }).prevented, false, 'Cmd+R must still reload');
  assert.strictEqual(s.press('r', { ctrlKey: true }).prevented, false, 'Ctrl+R must still reload');
  assert.strictEqual(s.draws.length, 0);
});

// --- 5.5 redraw only on change ---
ok('a blocked press redraws the turned bot; a press after solving redraws nothing', () => {
  const s = makeShell();
  s.load();
  s.reset();
  s.press('ArrowLeft'); // blocked by the wall at (0,3), but the bot turns
  assert.ok(s.draws.length > 0, 'a blocked press still redraws');
  const bot = s.draws[s.draws.length - 1];
  assert.deepStrictEqual([bot.sx, bot.sy], [2 * 16, 0], 'now facing left');
  assert.strictEqual(s.hud, 'Moves: 0', 'and costs nothing');

  const map = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  'UURDLDRDRRUURUL'.split('').forEach((c) => s.press(map[c]));
  assert.match(s.hud, /^Solved in 15 moves/);
  s.reset();
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) s.press(k);
  assert.strictEqual(s.draws.length, 0, 'a solved board is frozen and draws nothing');
});

// --- 6.1 / 6.2 heads-up display ---
ok('the display tracks the counter and the solved message carries a real em dash', () => {
  const s = makeShell();
  s.load();
  assert.strictEqual(s.hud, 'Moves: 0');
  const map = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  'UURDLDRDRRUURUL'.split('').forEach((c) => s.press(map[c]));
  assert.strictEqual(s.hud, 'Solved in 15 moves — press R');
  assert.ok(s.hud.includes('—'), 'U+2014 EM DASH, not a hyphen');
  assert.ok(!/[�?]/.test(s.hud), 'no replacement characters');
});

console.log(`\nshell harness: ${checks} checks passed`);
