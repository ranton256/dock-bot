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

function isSolved(state) {
  return state.crates.length > 0
    && state.crates.every(({ col, row }) => state.terrain[row][col] === 'P');
}

function step(state, dir) {
  const offset = DIRECTIONS[dir];
  const next = {
    ...state,
    terrain: state.terrain.map((row) => row.slice()),
    crates: state.crates.map((crate) => ({ ...crate })),
    bot: { ...state.bot, facing: dir },
  };
  if (isSolved(state)) {
    next.bot = { ...state.bot };
    next.solved = true;
    return next;
  }
  const [dc, dr] = offset;
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
  next.solved = isSolved(next);
  return next;
}

function playMoves(state, moves) {
  const directions = { U: 'up', D: 'down', L: 'left', R: 'right' };
  let result = state;
  for (const move of moves) {
    if (directions[move]) result = step(result, directions[move]);
  }
  return result;
}

function solve(state, { maxStates = 200000 } = {}) {
  if (isSolved(state)) return '';
  const key = (candidate) => {
    const crates = candidate.crates
      .map(({ col, row }) => `${col},${row}`)
      .sort()
      .join(';');
    return `${candidate.bot.col},${candidate.bot.row}|${crates}`;
  };
  const queue = [{ state, moves: '' }];
  const visited = new Set([key(state)]);
  let index = 0;
  const directions = [['U', 'up'], ['D', 'down'], ['L', 'left'], ['R', 'right']];
  while (index < queue.length && visited.size <= maxStates) {
    const current = queue[index++];
    for (const [letter, direction] of directions) {
      const next = step(current.state, direction);
      if (next.moves === current.state.moves) continue;
      const nextKey = key(next);
      if (visited.has(nextKey)) continue;
      if (isSolved(next)) return current.moves + letter;
      visited.add(nextKey);
      if (visited.size >= maxStates) return undefined;
      queue.push({ state: next, moves: current.moves + letter });
    }
  }
  return undefined;
}

function generateLevel(seed, options = {}) {
  const minimumPar = options.minimumPar ?? 12;
  const candidateCap = options.candidateCap ?? 60;
  const normalizedSeed = Number(seed) >>> 0;
  let randomState = normalizedSeed || 1;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x100000000;
  };
  const interior = [];
  for (let row = 1; row < 5; row += 1) {
    for (let col = 1; col < 7; col += 1) interior.push({ col, row });
  }
  for (let candidate = 0; candidate < candidateCap; candidate += 1) {
    const cells = interior.slice();
    const chosen = [];
    while (chosen.length < 7) {
      const index = Math.floor(random() * cells.length);
      chosen.push(cells.splice(index, 1)[0]);
    }
    const bot = chosen[0];
    const pads = chosen.slice(1, 4);
    const crates = chosen.slice(4);
    const rows = [];
    for (let row = 0; row < 6; row += 1) {
      const line = Array.from({ length: 8 }, (_, col) =>
        row === 0 || row === 5 || col === 0 || col === 7 ? '#' : '.');
      rows.push(line);
    }
    for (const { col, row } of pads) rows[row][col] = 'P';
    for (const { col, row } of crates) rows[row][col] = 'C';
    rows[bot.row][bot.col] = 'B';
    const text = rows.map((row) => row.join('')).join('\n');
    const par = solve(parseLevel(text));
    if (par !== undefined && par.length >= minimumPar) return { text, seed: normalizedSeed, par: par.length };
  }
  return undefined;
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
  module.exports = { LEVEL_TEXT, parseLevel, renderText, step, isSolved, playMoves, solve, generateLevel };
}

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('board');
  const context = canvas.getContext('2d');
  const atlas = document.getElementById('atlas');
  const hud = document.getElementById('hud');
  let activeBoard = { text: LEVEL_TEXT, par: 15 };
  let state = parseLevel(activeBoard.text);
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
    hud.textContent = state.solved
      ? `Solved in ${state.moves} moves — press R`
      : `Moves: ${state.moves}`;
    document.getElementById('board-meta').textContent = activeBoard.seed === undefined
      ? `Par ${activeBoard.par}`
      : `Seed ${activeBoard.seed} · Par ${activeBoard.par}`;
  }

  function handleKeyDown(event) {
    const dir = arrowDirections.get(event.key);
    if (event.key === 'r' || event.key === 'R') {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      state = parseLevel(activeBoard.text);
      draw(state);
      return;
    }
    if (event.key === 'n' || event.key === 'N') {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const generated = generateLevel((Date.now() ^ Math.random() * 0x100000000) >>> 0);
      if (generated) {
        activeBoard = generated;
        state = parseLevel(activeBoard.text);
        draw(state);
      }
      return;
    }
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
