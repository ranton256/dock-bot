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
  module.exports = { LEVEL_TEXT, parseLevel, renderText };
}

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('board');
  const context = canvas.getContext('2d');
  const atlas = document.getElementById('atlas');
  const hud = document.getElementById('hud');
  const state = parseLevel(LEVEL_TEXT);
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

  // Register before assigning src so even a cached atlas uses this one draw path.
  atlas.addEventListener('load', () => draw(state), { once: true });
  atlas.src = 'assets/dock_bot.png';
}
