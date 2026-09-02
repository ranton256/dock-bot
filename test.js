'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { LEVEL, parseLevel, step, isSolved, renderText, playMoves } = require('./game.js');

// Transcribed by hand from the specification, deliberately not imported.
//
// This is the only assertion that catches a wall typo in the game's own
// constant. The parsing scenario pins the bot, crates and pads by coordinate but
// says nothing about walls; comparing renderText against LEVEL is
// self-referential; and a stray '#' off the solution path survives the 15-move
// replay too. An independently typed copy is the only witness.
const MAP = [
  '########',
  '#..P...#',
  '#.C.C..#',
  '#B.P...#',
  '#..C.P.#',
  '########',
].join('\n');

const SOLVED_BOARD = [
  '########',
  '#..XB..#',
  '#......#',
  '#..X...#',
  '#....X.#',
  '########',
].join('\n');

const SOLUTION = 'UURDLDRDRRUURUL';
const COLS = 8;
const ROWS = 6;

const fresh = () => parseLevel(LEVEL);
const cells = (set) => [...set].sort();
const at = (state) => [state.bot.col, state.bot.row];

// Builds an 8x6 board of open floor with a single wall, a bot, and one crate
// placed off any pad so the board is never vacuously solved.
function openBoard({ wall, bot, crate }) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  if (wall) grid[wall[1]][wall[0]] = '#';
  grid[crate[1]][crate[0]] = 'C';
  grid[bot[1]][bot[0]] = 'B';
  return grid.map((row) => row.join('')).join('\n');
}

function freeCell(taken) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!taken.has(`${col},${row}`)) return [col, row];
    }
  }
  throw new Error('no free cell');
}

// --- 1. Module seam and level constant --------------------------------------

test('Importing the core outside a browser: all six bindings are exported', () => {
  const core = require('./game.js');
  for (const name of ['parseLevel', 'step', 'isSolved', 'renderText', 'playMoves']) {
    assert.strictEqual(typeof core[name], 'function', `${name} should be exported`);
  }
  assert.strictEqual(typeof core.LEVEL, 'string');
  // Each runs with no canvas, window or document present - which is simply the
  // fact that this file executes at all.
  const state = core.parseLevel(core.LEVEL);
  assert.strictEqual(typeof core.renderText(state), 'string');
  assert.strictEqual(core.isSolved(state), false);
  assert.strictEqual(core.playMoves(state, '').moves, 0);
  assert.strictEqual(core.step(state, 'U').moves, 1);
});

test('Importing the core outside a browser: the export block is inert in a browser', () => {
  const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
  assert.match(source, /typeof module !== 'undefined'/, 'exports must be guarded');

  // A plain script tag leaves `module` undefined. Evaluating with no module and
  // no document must not throw, and must not define anything beyond the core.
  const sandbox = {};
  vm.createContext(sandbox);
  assert.doesNotThrow(() => vm.runInContext(source, sandbox));
  assert.deepStrictEqual(
    Object.keys(sandbox).sort(),
    ['isSolved', 'parseLevel', 'playMoves', 'renderText', 'step']
  );
});

test('the exported level constant matches an independent transcription', () => {
  assert.strictEqual(LEVEL, MAP);
  assert.strictEqual(LEVEL, LEVEL.trim(), 'canonical form has no leading or trailing newline');
});

// --- 2. Parsing and text rendering ------------------------------------------

test('Parsing the level map', () => {
  const state = fresh();
  assert.deepStrictEqual(at(state), [1, 3]);
  assert.strictEqual(state.bot.facing, 'R');
  assert.deepStrictEqual(cells(state.crates), ['2,2', '3,4', '4,2'].sort());
  assert.deepStrictEqual(cells(state.pads), ['3,1', '3,3', '5,4'].sort());
  assert.strictEqual(state.moves, 0);
  assert.strictEqual(isSolved(state), false);
  assert.strictEqual(renderText(state), MAP);
});

test('parsing a board containing docked crates', () => {
  const state = parseLevel(SOLVED_BOARD);
  for (const cell of ['3,1', '3,3', '5,4']) {
    assert.ok(state.pads.has(cell), `${cell} should be a pad`);
    assert.ok(state.crates.has(cell), `${cell} should hold a crate`);
  }
  assert.strictEqual(isSolved(state), true);
});

test('parsing a board with the bot on a pad', () => {
  const board = MAP.split('\n');
  board[3] = '#..b...#'; // the bot standing on the pad at (3,3)
  const state = parseLevel(board.join('\n'));
  assert.deepStrictEqual(at(state), [3, 3]);
  assert.ok(state.pads.has('3,3'), 'the cell under the bot is still a pad');
});

test('rendering the initial board is byte-for-byte the level text', () => {
  assert.strictEqual(renderText(fresh()), MAP);
});

test('rendering round-trips through parsing', () => {
  const boards = [
    renderText(fresh()),
    renderText(playMoves(fresh(), 'UURD')),      // a crate pushed onto floor
    renderText(playMoves(fresh(), SOLUTION)),    // crates on pads
    (() => { const b = MAP.split('\n'); b[3] = '#..b...#'; return b.join('\n'); })(),
  ];
  for (const board of boards) {
    assert.strictEqual(renderText(parseLevel(board)), board);
  }
});

test('a crate on a pad renders as X', () => {
  const solved = playMoves(fresh(), SOLUTION);
  const rows = renderText(solved).split('\n');
  assert.strictEqual(rows[1][3], 'X');
  assert.strictEqual(rows[3][3], 'X');
  assert.strictEqual(rows[4][5], 'X');
  assert.ok(!renderText(solved).includes('C'), 'no crate is off a pad');
});

// --- 3. Stepping -------------------------------------------------------------

test('every border cell blocks the bot', () => {
  const border = [];
  for (let col = 0; col < COLS; col++) { border.push([col, 0]); border.push([col, ROWS - 1]); }
  for (let row = 1; row < ROWS - 1; row++) { border.push([0, row]); border.push([COLS - 1, row]); }
  assert.strictEqual(border.length, 24, 'the perimeter of an 8x6 board');

  for (const [wc, wr] of border) {
    const neighbours = [[wc - 1, wr, 'R'], [wc + 1, wr, 'L'], [wc, wr - 1, 'D'], [wc, wr + 1, 'U']]
      .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
    const [bc, br, dir] = neighbours[0];
    const crate = freeCell(new Set([`${wc},${wr}`, `${bc},${br}`]));
    const state = parseLevel(openBoard({ wall: [wc, wr], bot: [bc, br], crate }));
    assert.strictEqual(isSolved(state), false, 'fixture must not be vacuously solved');

    const next = step(state, dir);
    assert.deepStrictEqual(at(next), [bc, br], `wall at (${wc},${wr}) should block`);
    assert.strictEqual(next.moves, 0);
    assert.strictEqual(next.bot.facing, dir);
  }
});

test('stepping off any edge of the board is blocked', () => {
  const edges = [
    { bot: [0, 3], dir: 'L' },
    { bot: [COLS - 1, 3], dir: 'R' },
    { bot: [3, 0], dir: 'U' },
    { bot: [3, ROWS - 1], dir: 'D' },
  ];
  for (const { bot, dir } of edges) {
    const crate = freeCell(new Set([`${bot[0]},${bot[1]}`]));
    const state = parseLevel(openBoard({ wall: null, bot, crate }));
    const next = step(state, dir);
    assert.deepStrictEqual(at(next), bot, `stepping ${dir} off the board should block`);
    assert.strictEqual(next.moves, 0);
    assert.strictEqual(next.bot.facing, dir);
  }
});

test('Moving onto floor', () => {
  const next = step(fresh(), 'U');
  assert.deepStrictEqual(at(next), [1, 2]);
  assert.strictEqual(next.bot.facing, 'U');
  assert.strictEqual(next.moves, 1);
});

test('moving onto an empty pad leaves the pad in place', () => {
  const next = playMoves(fresh(), 'RR'); // (1,3) -> (2,3) -> the pad at (3,3)
  assert.deepStrictEqual(at(next), [3, 3]);
  assert.ok(next.pads.has('3,3'), 'the pad is still there');
  assert.strictEqual(next.moves, 2);
  assert.strictEqual(renderText(next).split('\n')[3][3], 'b');
});

test('Blocked by a wall', () => {
  const state = fresh();
  const next = step(state, 'L');
  assert.deepStrictEqual(at(next), [1, 3]);
  assert.strictEqual(next.moves, state.moves);
  assert.strictEqual(next.bot.facing, 'L');
});

test('Pushing a crate onto floor', () => {
  const before = step(fresh(), 'U'); // bot at (1,2), crate at (2,2), (3,2) is floor
  const after = step(before, 'R');
  assert.ok(after.crates.has('3,2'), 'crate moved to (3,2)');
  assert.ok(!after.crates.has('2,2'), 'crate left (2,2)');
  assert.deepStrictEqual(at(after), [2, 2]);
  assert.strictEqual(after.moves, before.moves + 1);
});

test('Pushing a crate onto a pad (core half)', () => {
  const before = playMoves(fresh(), 'UURDLD'); // bot at (1,3), crate at (2,3), pad at (3,3)
  assert.ok(before.crates.has('2,3'));
  const after = step(before, 'R');
  assert.ok(after.crates.has('3,3'), 'the crate sits on the pad');
  assert.ok(after.pads.has('3,3'));
  assert.strictEqual(after.moves, before.moves + 1);
  assert.strictEqual(renderText(after).split('\n')[3][3], 'X', 'and counts as filled');
});

test('Push blocked: by a wall beyond the crate', () => {
  const before = playMoves(fresh(), 'RR'); // bot on the pad at (3,3), crate at (3,4), wall at (3,5)
  assert.strictEqual(before.moves, 2);
  const after = step(before, 'D');
  assert.deepStrictEqual(at(after), [3, 3]);
  assert.ok(after.crates.has('3,4'), 'the crate did not move');
  assert.strictEqual(after.moves, 2);
  assert.strictEqual(after.bot.facing, 'D');
});

test('Push blocked: by another crate beyond the crate', () => {
  const before = playMoves(fresh(), 'UR'); // crate pushed to (3,2), another already at (4,2)
  assert.strictEqual(before.moves, 2);
  assert.ok(before.crates.has('3,2') && before.crates.has('4,2'));
  const after = step(before, 'R');
  assert.strictEqual(after.moves, 2);
  assert.deepStrictEqual(at(after), [2, 2]);
  assert.deepStrictEqual(cells(after.crates), cells(before.crates));
  assert.strictEqual(after.bot.facing, 'R');
});

test('exactly one crate moves per push, and never toward the bot', () => {
  const before = step(fresh(), 'U');
  const after = step(before, 'R');
  assert.strictEqual(after.crates.size, before.crates.size, 'crate count is conserved');

  const moved = [...after.crates].filter((c) => !before.crates.has(c));
  const left = [...before.crates].filter((c) => !after.crates.has(c));
  assert.strictEqual(moved.length, 1, 'exactly one crate appeared somewhere new');
  assert.strictEqual(left.length, 1, 'exactly one crate vacated a cell');

  // The crate moved away from the bot, in the direction pressed, not toward it.
  assert.deepStrictEqual(left, ['2,2']);
  assert.deepStrictEqual(moved, ['3,2']);
});

test('an unrecognised direction throws', () => {
  const state = fresh();
  for (const bad of ['X', 'u', '', 'UP', 'ArrowUp', null, undefined, 0]) {
    assert.throws(() => step(state, bad), /unknown direction/, `step should reject ${JSON.stringify(bad)}`);
  }
});

// --- 4. Solving and the freeze -----------------------------------------------

test('the level is not solved while any crate is off a pad', () => {
  assert.strictEqual(isSolved(fresh()), false);
  const partial = playMoves(fresh(), 'UURDLDR'); // one pad filled, two crates loose
  assert.strictEqual(isSolved(partial), false);
  assert.ok([...partial.crates].some((c) => !partial.pads.has(c)));
});

test('Level solved (core half): the final push solves it', () => {
  const before = playMoves(fresh(), SOLUTION.slice(0, -1));
  assert.strictEqual(isSolved(before), false);
  const after = step(before, SOLUTION.slice(-1));
  assert.strictEqual(isSolved(after), true);
  assert.strictEqual(after.moves, 15);
});

test('Level solved (core half): arrows are inert once solved', () => {
  const solved = playMoves(fresh(), SOLUTION);
  for (const dir of ['U', 'D', 'L', 'R']) {
    const after = step(solved, dir);
    assert.deepStrictEqual(renderText(after), renderText(solved), `${dir} must not move anything`);
    assert.strictEqual(after.moves, solved.moves, `${dir} must not count`);
    assert.strictEqual(after.bot.facing, solved.bot.facing, `${dir} must not even turn the bot`);
  }
});

test('the frozen branch returns the identical object, a blocked press does not', () => {
  const solved = playMoves(fresh(), SOLUTION);
  // The shell uses `next !== state` as its redraw signal, so identity matters.
  assert.strictEqual(step(solved, 'U'), solved, 'a press after solving changes nothing');

  const blocked = step(fresh(), 'L');
  assert.notStrictEqual(blocked, fresh(), 'a blocked press still turns the bot, so it redraws');
  assert.strictEqual(blocked.bot.facing, 'L');
});

// --- 5. Replay ----------------------------------------------------------------

test('Blocked moves inside a script', () => {
  const after = playMoves(fresh(), 'LLL');
  assert.deepStrictEqual(at(after), [1, 3]);
  assert.strictEqual(after.bot.facing, 'L');
  assert.strictEqual(after.moves, 0);
});

test('Replaying a move string: the canonical solution', () => {
  const after = playMoves(fresh(), SOLUTION);
  assert.strictEqual(isSolved(after), true);
  assert.strictEqual(after.moves, 15);
  assert.strictEqual(renderText(after), SOLVED_BOARD);
});

test('A replay cannot count past the solve', () => {
  const solved = playMoves(fresh(), SOLUTION);
  const overrun = playMoves(fresh(), SOLUTION + 'UUDDLLRR');
  assert.strictEqual(overrun.moves, 15);
  assert.strictEqual(renderText(overrun), renderText(solved));
});

test('the move counter reflects only successful moves', () => {
  // L is blocked by the wall; U and R are not.
  const after = playMoves(fresh(), 'LULLU');
  assert.strictEqual(after.moves, 2, 'three blocked presses cost nothing');
  assert.deepStrictEqual(at(after), [1, 1]);
});

// --- 6. Immutability, determinism, and restart --------------------------------

test('a step does not mutate the state it was given', () => {
  const before = fresh();
  const snapshot = renderText(before);
  const moves = before.moves;

  const after = step(before, 'U');

  // Asserted by snapshot, not object identity: a step that moves no crate
  // legitimately carries the same crates set forward, which is structural
  // sharing rather than mutation.
  assert.strictEqual(renderText(before), snapshot);
  assert.strictEqual(before.moves, moves);
  assert.notStrictEqual(after, before);
});

test('a whole replay does not disturb the state it started from', () => {
  const before = fresh();
  const snapshot = renderText(before);
  playMoves(before, SOLUTION);
  assert.strictEqual(renderText(before), snapshot);
  assert.strictEqual(before.moves, 0);
});

test('replay is reproducible', () => {
  const a = playMoves(fresh(), SOLUTION);
  const b = playMoves(fresh(), SOLUTION);
  assert.strictEqual(renderText(a), renderText(b));
  assert.strictEqual(a.moves, b.moves);
  assert.deepStrictEqual(a, b);
});

test('Restarting (core half): from a solved state', () => {
  const baseline = fresh();
  playMoves(fresh(), SOLUTION);
  const restarted = parseLevel(LEVEL);
  assert.deepStrictEqual(restarted, baseline);
  assert.strictEqual(restarted.moves, 0);
});

test('Restarting (core half): partway through a game', () => {
  const baseline = fresh();
  playMoves(fresh(), 'UURDL');
  const restarted = parseLevel(LEVEL);
  assert.deepStrictEqual(restarted, baseline);
  assert.strictEqual(restarted.moves, 0);
  assert.strictEqual(renderText(restarted), MAP);
});

// --- 7. Milestone verification ------------------------------------------------

test('every specification scenario naming a core function has a test', () => {
  const source = fs.readFileSync(path.join(__dirname, 'test.js'), 'utf8');
  const scenarios = [
    'Importing the core outside a browser',
    'Parsing the level map',
    'Moving onto floor',
    'Blocked by a wall',
    'Pushing a crate onto floor',
    'Pushing a crate onto a pad',
    'Push blocked',
    'Level solved',
    'Restarting',
    'Replaying a move string',
    'Blocked moves inside a script',
    'A replay cannot count past the solve',
  ];
  for (const name of scenarios) {
    assert.ok(
      source.includes(`test('${name}`),
      `no test covers the scenario "${name}"`
    );
  }
});

test('the core stays free of the DOM and of a package manager', () => {
  const root = __dirname;
  assert.ok(!fs.existsSync(path.join(root, 'package.json')),
    'adding a package.json would break require() of game.js');

  const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
  // Strip comments first: the requirement is that the core does not *use* a
  // browser global, and prose about the browser is not a dependency on one.
  const core = source.split('--- Seam')[0]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.ok(core.length > 0, 'the seam marker should still be present');
  for (const global of ['document', 'window', 'navigator', 'requestAnimationFrame']) {
    assert.ok(
      !new RegExp(`\\b${global}\\b`).test(core),
      `the core must not reference ${global}`
    );
  }
});
