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
