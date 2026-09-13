'use strict';

const test = require('node:test');
const assert = require('node:assert').strict;
const { LEVEL_TEXT, parseLevel, renderText } = require('./game.js');

const EXPECTED_LEVEL = [
  '########',
  '#..P...#',
  '#.C.C..#',
  '#B.P...#',
  '#..C.P.#',
  '########',
].join('\n');

test('parsing the level map initializes the exact terrain and entities', () => {
  assert.equal(LEVEL_TEXT, EXPECTED_LEVEL);
  const state = parseLevel(LEVEL_TEXT);

  assert.equal(state.width, 8);
  assert.equal(state.height, 6);
  assert.deepEqual(state.terrain, [
    '########',
    '#..P...#',
    '#......#',
    '#..P...#',
    '#....P.#',
    '########',
  ].map((row) => row.split('')));
  assert.deepEqual(state.bot, { col: 1, row: 3, facing: 'right' });
  assert.deepEqual(state.crates, [
    { col: 2, row: 2 },
    { col: 4, row: 2 },
    { col: 3, row: 4 },
  ]);
  assert.equal(state.moves, 0);
  assert.equal(state.solved, false);
});

test('parsing creates independent boards', () => {
  const changed = parseLevel(LEVEL_TEXT);
  const original = parseLevel(LEVEL_TEXT);
  const snapshot = structuredClone(original);

  changed.bot.col = 3;
  changed.bot.facing = 'left';
  changed.crates[0].row = 1;
  changed.crates.push({ col: 1, row: 1 });
  changed.terrain[1][3] = '.';
  changed.terrain.push(['#']);
  changed.moves = 7;
  changed.solved = true;

  assert.deepEqual(original, snapshot);
  assert.deepEqual(parseLevel(LEVEL_TEXT), snapshot);
});

test('fresh level round trip returns canonical text', () => {
  const state = parseLevel(LEVEL_TEXT);
  const snapshot = structuredClone(state);
  const text = renderText(state);

  assert.equal(text, EXPECTED_LEVEL);
  assert.equal(text.split('\n').length, 6);
  assert.ok(text.split('\n').every((row) => row.length === 8));
  assert.equal(text.startsWith('\n'), false);
  assert.equal(text.endsWith('\n'), false);
  assert.deepEqual(state, snapshot);
});

test('occupants on pads render as X and b without changing state', () => {
  const state = parseLevel(LEVEL_TEXT);
  state.crates[0] = { col: 3, row: 1 };
  state.bot = { col: 3, row: 3, facing: 'right' };
  const snapshot = structuredClone(state);

  assert.equal(renderText(state), [
    '########',
    '#..X...#',
    '#...C..#',
    '#..b...#',
    '#..C.P.#',
    '########',
  ].join('\n'));
  assert.deepEqual(state, snapshot);
  assert.equal(state.terrain[1][3], 'P');
  assert.equal(state.terrain[3][3], 'P');

  state.crates[0] = { col: 2, row: 2 };
  state.bot = { col: 1, row: 3, facing: 'right' };
  assert.equal(renderText(state), EXPECTED_LEVEL);
});

test('core imports and runs without a browser', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  assert.equal(renderText(parseLevel(EXPECTED_LEVEL)), EXPECTED_LEVEL);
});
