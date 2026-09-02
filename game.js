'use strict';

// Dock Bot.
//
// This file is a pure core plus a thin browser shell. Everything above the seam
// marked below is the core: it never touches the DOM, and `step` returns a new
// state rather than modifying the one it was given. The shell half is added by a
// later milestone and goes below the seam.

// --- Level ------------------------------------------------------------------

// Canonical form: rows joined by a single newline, no leading or trailing one.
const LEVEL = [
  '########',
  '#..P...#',
  '#.C.C..#',
  '#B.P...#',
  '#..C.P.#',
  '########',
].join('\n');

const COLS = 8;
const ROWS = 6;

// One alphabet throughout: a direction argument, the bot's facing, and a
// character of a replayed move string are all the same four letters.
const DELTA = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

// Cells are packed as "col,row" so membership is a set lookup.
const key = (col, row) => col + ',' + row;

// --- Core -------------------------------------------------------------------

function parseLevel(text) {
  const lines = String(text).trim().split('\n');
  const walls = new Set();
  const pads = new Set();
  const crates = new Set();
  let bot = null;

  lines.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const cell = key(col, row);
      switch (ch) {
        case '#': walls.add(cell); break;
        case '.': break;
        case 'P': pads.add(cell); break;
        case 'C': crates.add(cell); break;
        case 'B': bot = { col, row, facing: 'R' }; break;
        // The two glyphs renderText emits are accepted on the way in too, so a
        // board pasted from a bug report can be loaded back and reproduced.
        case 'X': pads.add(cell); crates.add(cell); break;
        case 'b': pads.add(cell); bot = { col, row, facing: 'R' }; break;
        default:
          throw new Error(`unknown character '${ch}' at (${col},${row})`);
      }
    });
  });

  if (!bot) throw new Error('level has no bot');

  return { walls, pads, crates, bot, moves: 0 };
}

function renderText(state) {
  const lines = [];
  for (let row = 0; row < ROWS; row++) {
    let line = '';
    for (let col = 0; col < COLS; col++) {
      const cell = key(col, row);
      const onPad = state.pads.has(cell);
      if (state.walls.has(cell)) line += '#';
      else if (state.bot.col === col && state.bot.row === row) line += onPad ? 'b' : 'B';
      else if (state.crates.has(cell)) line += onPad ? 'X' : 'C';
      else if (onPad) line += 'P';
      else line += '.';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function isSolved(state) {
  for (const cell of state.crates) {
    if (!state.pads.has(cell)) return false;
  }
  return true;
}

// True for a wall or for anything off the board. Folding the two together keeps
// the bounds test from reading as dead defensive code: the level's wall ring
// means it never fires, but this is the predicate that answers "can anything
// occupy this cell".
// Declared as a const rather than a function so it stays lexical: a classic
// script tag turns top-level function declarations into window properties, and
// this one is an internal, not part of the core's surface.
const isBlocked = (state, col, row) => {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  return state.walls.has(key(col, row));
};

function step(state, dir) {
  const delta = DELTA[dir];
  // A direction outside the four letters is a programming error, not a blocked
  // press. Returning the state unchanged would let a typo in a move string pass
  // as a wall.
  if (!delta) throw new Error(`unknown direction '${dir}'`);

  // Solved boards are frozen: no move, no count, and no turn either. Returning
  // the identical object makes reference inequality an exact "did anything
  // change" signal for the shell. This lives here rather than in the key handler
  // so that a replayed move string cannot count past a solve.
  if (isSolved(state)) return state;

  const [dc, dr] = delta;

  // From here down the bot always turns, even when nothing else happens: that
  // turn is the only visible sign a blocked press registered.
  const turned = { ...state, bot: { col: state.bot.col, row: state.bot.row, facing: dir } };

  const aheadCol = state.bot.col + dc;
  const aheadRow = state.bot.row + dr;
  if (isBlocked(state, aheadCol, aheadRow)) return turned;

  const ahead = key(aheadCol, aheadRow);
  const movedBot = { col: aheadCol, row: aheadRow, facing: dir };

  if (state.crates.has(ahead)) {
    const beyondCol = aheadCol + dc;
    const beyondRow = aheadRow + dr;
    const beyond = key(beyondCol, beyondRow);
    // One crate per push: a crate behind a crate blocks, and there is no pulling.
    if (isBlocked(state, beyondCol, beyondRow) || state.crates.has(beyond)) return turned;

    const crates = new Set(state.crates);
    crates.delete(ahead);
    crates.add(beyond);
    return { ...state, crates, bot: movedBot, moves: state.moves + 1 };
  }

  return { ...state, bot: movedBot, moves: state.moves + 1 };
}

function playMoves(state, moves) {
  return [...String(moves)].reduce((current, ch) => step(current, ch), state);
}

// --- Seam: browser shell goes below here ------------------------------------

// Guarded so the browser ignores it and Node can import the core. A plain script
// tag leaves `module` undefined, so this block simply does not run there.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVEL, parseLevel, step, isSolved, renderText, playMoves };
}
