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

// Everything below is the browser shell. Guarded on a document existing, which
// is the same seam the export block guards from the other side: test.js imports
// this file under Node, where touching `document` would throw at import time and
// take the whole suite down with it.
//
// There are no rules down here. The shell binds keys to `step`, draws state, and
// formats two strings; anything that decides what a move *means* belongs above.
if (typeof document !== 'undefined') {
  const TILE = 16;
  const SCALE = 3;
  const SIZE = TILE * SCALE;

  // The atlas cell for each frame. Source rectangles are derived from this
  // rather than written out four numbers at a time: nine frames times four
  // hand-written coordinates is thirty-six chances to transpose a digit, and a
  // transposed rectangle draws a wrong-looking tile rather than raising.
  const FRAME = {
    bot_up: [0, 0], bot_down: [1, 0], bot_left: [2, 0], bot_right: [3, 0],
    crate: [0, 1], crate_docked: [1, 1],
    floor: [2, 1], wall: [3, 1], pad: [0, 2],
  };

  const BOT_FRAME = { U: 'bot_up', D: 'bot_down', L: 'bot_left', R: 'bot_right' };
  const ARROWS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };

  // The em dash is written as an escape rather than as a literal character. A
  // script loaded from file:// inherits the document's encoding, so declaring
  // UTF-8 fixes the common case; this makes the string survive even a file saved
  // in the wrong encoding.
  const solvedMessage = (moves) => 'Solved in ' + moves + ' moves \u2014 press R';

  const canvas = document.getElementById('board');
  const hud = document.getElementById('hud');
  const context = canvas.getContext('2d');

  // Governs how the atlas is magnified into the canvas. The canvas element being
  // resampled by the browser is a separate stage, handled in style.css.
  context.imageSmoothingEnabled = false;

  const atlas = new Image();
  let state = parseLevel(LEVEL);

  function drawFrame(name, col, row) {
    const cell = FRAME[name];
    context.drawImage(
      atlas,
      cell[0] * TILE, cell[1] * TILE, TILE, TILE,
      col * SIZE, row * SIZE, SIZE, SIZE
    );
  }

  function draw(current) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = key(col, row);
        drawFrame(current.walls.has(cell) ? 'wall' : current.pads.has(cell) ? 'pad' : 'floor', col, row);
      }
    }

    for (const cell of current.crates) {
      const parts = cell.split(',');
      drawFrame(current.pads.has(cell) ? 'crate_docked' : 'crate', Number(parts[0]), Number(parts[1]));
    }

    drawFrame(BOT_FRAME[current.bot.facing], current.bot.col, current.bot.row);

    hud.textContent = isSolved(current) ? solvedMessage(current.moves) : 'Moves: ' + current.moves;
  }

  function onKeyDown(event) {
    // Browsers stream key events while a key is held down; only the first is a
    // press. Without this one press would run the bot across the board.
    if (event.repeat) return;

    // Leave shortcuts alone. Reload is Ctrl+R or Cmd+R, and hijacking it would
    // be a worse bug than any it could fix.
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      state = parseLevel(LEVEL);
      draw(state);
      return;
    }

    const dir = ARROWS[event.key];
    if (!dir) return; // every other key is inert, and nothing is redrawn

    event.preventDefault(); // arrows would otherwise scroll the page under the board

    // Reference inequality is an exact "did anything change": the core returns
    // the identical object only for a press after a solve, and a new one for
    // everything else including a blocked press that merely turns the bot.
    const next = step(state, dir);
    if (next !== state) {
      state = next;
      draw(state);
    }
  }

  atlas.addEventListener('load', function () {
    draw(state);
    // Registered here rather than at parse time so that "never draw before the
    // atlas is ready" is structural instead of a flag to remember to check.
    window.addEventListener('keydown', onKeyDown);
  });

  atlas.src = 'assets/dock_bot.png';
}

// Guarded so the browser ignores it and Node can import the core. A plain script
// tag leaves `module` undefined, so this block simply does not run there.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVEL, parseLevel, step, isSolved, renderText, playMoves };
}
