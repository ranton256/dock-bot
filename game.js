'use strict';

const LEVEL_TEXT = [
  '########',
  '#..P...#',
  '#.C.C..#',
  '#B.P...#',
  '#..C.P.#',
  '########',
].join('\n');

// Level input uses the canonical alphabet: # . P C B.
function parseLevel(text) {
  const crates = [];
  let bot;
  const terrain = text.split('\n').map((line, row) =>
    Array.from(line, (cell, col) => {
      if (cell === 'C') {
        crates.push({ col, row });
        return '.';
      }
      if (cell === 'B') {
        bot = { col, row, facing: 'right' };
        return '.';
      }
      return cell;
    })
  );

  return {
    width: terrain[0].length,
    height: terrain.length,
    terrain,
    crates,
    bot,
    moves: 0,
    solved: false,
  };
}

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function step(state, dir) {
  const [dc, dr] = DIRECTIONS[dir];
  const next = {
    ...state,
    terrain: state.terrain.map((row) => row.slice()),
    crates: state.crates.map((crate) => ({ ...crate })),
    bot: { ...state.bot, facing: dir },
  };
  const walkable = (col, row) => col >= 0 && col < state.width
    && row >= 0 && row < state.height && state.terrain[row][col] !== '#';
  const col = state.bot.col + dc;
  const row = state.bot.row + dr;
  if (!walkable(col, row)) return next;

  const crateIndex = state.crates.findIndex((crate) => crate.col === col && crate.row === row);
  if (crateIndex !== -1) {
    const beyondCol = col + dc;
    const beyondRow = row + dr;
    if (!walkable(beyondCol, beyondRow)
      || state.crates.some((crate) => crate.col === beyondCol && crate.row === beyondRow)) {
      return next;
    }
    next.crates[crateIndex] = { col: beyondCol, row: beyondRow };
  }

  next.bot.col = col;
  next.bot.row = row;
  next.moves += 1;
  return next;
}

function renderText(state) {
  const rows = state.terrain.map((row) => row.slice());
  for (const { col, row } of state.crates) {
    rows[row][col] = state.terrain[row][col] === 'P' ? 'X' : 'C';
  }
  const { col, row } = state.bot;
  rows[row][col] = state.terrain[row][col] === 'P' ? 'b' : 'B';
  return rows.map((cells) => cells.join('')).join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVEL_TEXT, parseLevel, renderText, step };
}

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('board');
  const context = canvas.getContext('2d');
  const atlas = document.getElementById('atlas');
  const hud = document.getElementById('hud');
  let state = parseLevel(LEVEL_TEXT);
  const arrowDirections = new Map([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
  ]);
  const frames = {
    up: [0, 0],
    down: [1, 0],
    left: [2, 0],
    right: [3, 0],
    crate: [0, 1],
    crate_docked: [1, 1],
    '.': [2, 1],
    '#': [3, 1],
    P: [0, 2],
  };

  function drawTile(frame, col, row) {
    const [sourceCol, sourceRow] = frames[frame];
    context.drawImage(atlas, sourceCol * 16, sourceRow * 16, 16, 16,
      col * 48, row * 48, 48, 48);
  }

  function draw(state) {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    state.terrain.forEach((cells, row) => {
      cells.forEach((terrain, col) => drawTile(terrain, col, row));
    });
    for (const { col, row } of state.crates) {
      drawTile(state.terrain[row][col] === 'P' ? 'crate_docked' : 'crate', col, row);
    }
    drawTile(state.bot.facing, state.bot.col, state.bot.row);
    hud.textContent = `Moves: ${state.moves}`;
  }

  function handleKeyDown(event) {
    const dir = arrowDirections.get(event.key);
    if (!dir) return;
    event.preventDefault();
    if (event.repeat) return;

    const next = step(state, dir);
    // Every successful move/push changes the counter; blocked turns change facing.
    const changed = next.moves !== state.moves || next.bot.facing !== state.bot.facing;
    state = next;
    if (changed) draw(state);
  }

  // Enable input only after the initial board has been drawn with a ready atlas.
  atlas.addEventListener('load', () => {
    draw(state);
    document.addEventListener('keydown', handleKeyDown);
  }, { once: true });
  atlas.src = 'assets/dock_bot.png';
}
