'use strict';

const test = require('node:test');
const assert = require('node:assert').strict;
const { LEVEL_TEXT, parseLevel, renderText, step } = require('./game.js');

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
  assert.equal(step(parseLevel(EXPECTED_LEVEL), 'up').moves, 1);
});

function fixture(bot, crates = []) {
  const state = parseLevel(LEVEL_TEXT);
  state.bot = { ...state.bot, ...bot };
  state.crates = crates;
  state.moves = 4;
  return state;
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test('moving onto floor preserves the starting state', () => {
  const state = parseLevel(LEVEL_TEXT);
  const next = step(state, 'up');
  assert.deepEqual(next.bot, { col: 1, row: 2, facing: 'up' });
  assert.equal(next.moves, 1);
  assert.deepEqual(next.crates, state.crates);
  assert.deepEqual(next.terrain, state.terrain);
  assert.equal(renderText(state), EXPECTED_LEVEL);
  assert.equal(state.moves, 0);
  assert.equal(state.bot.facing, 'right');
});

for (const [dir, col, row] of [
  ['up', 4, 2], ['down', 4, 4], ['left', 3, 3], ['right', 5, 3],
]) {
  test(`walking ${dir} moves exactly one cell`, () => {
    const next = step(fixture({ col: 4, row: 3 }), dir);
    assert.deepEqual(next.bot, { col, row, facing: dir });
    assert.equal(next.moves, 5);
  });
}

test('walking across a pad reveals the pad again', () => {
  const state = fixture({ col: 2, row: 3 });
  const onPad = step(state, 'right');
  const offPad = step(onPad, 'right');
  assert.equal(renderText(onPad).split('\n')[3], '#..b...#');
  assert.equal(renderText(offPad).split('\n')[3], '#..PB..#');
  assert.deepEqual(offPad.terrain, state.terrain);
  assert.equal(offPad.moves, 6);
});

test('wall blocking turns the bot without counting a move', () => {
  const state = parseLevel(LEVEL_TEXT);
  const next = step(state, 'left');
  assert.deepEqual(next.bot, { col: 1, row: 3, facing: 'left' });
  assert.equal(next.moves, 0);
  assert.deepEqual(next.crates, state.crates);
  assert.equal(renderText(next), EXPECTED_LEVEL);
  assert.deepEqual(step(next, 'left'), next);
});

for (const [dir, col, row, behindCol, behindRow] of [
  ['up', 3, 0, 3, 1], ['down', 3, 5, 3, 4],
  ['left', 0, 3, 1, 3], ['right', 7, 3, 6, 3],
]) {
  test(`board bounds block walking and pushing ${dir}`, () => {
    const state = fixture({ col, row });
    state.terrain[row][col] = '.';
    const next = step(state, dir);
    assert.deepEqual(next.bot, { col, row, facing: dir });
    assert.equal(next.moves, state.moves);
    state.bot = { col: behindCol, row: behindRow, facing: 'right' };
    state.crates = [{ col, row }];
    const blockedPush = step(state, dir);
    assert.deepEqual(blockedPush.crates, state.crates);
    assert.deepEqual(blockedPush.bot, { ...state.bot, facing: dir });
    assert.equal(blockedPush.moves, state.moves);
  });
}

test('pushing onto floor moves one crate and counts one move', () => {
  const state = step(parseLevel(LEVEL_TEXT), 'up');
  const next = step(state, 'right');
  assert.deepEqual(next.bot, { col: 2, row: 2, facing: 'right' });
  assert.equal(next.moves, 2);
  assert.deepEqual(next.crates, [
    { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 4 },
  ]);
  assert.equal(renderText(next), [
    '########', '#..P...#', '#.BCC..#', '#..P...#', '#..C.P.#', '########',
  ].join('\n'));
});

test('pushing onto and off pads preserves terrain and occupancy text', () => {
  const onto = fixture({ col: 3, row: 3 }, [{ col: 3, row: 2 }]);
  const docked = step(onto, 'up');
  assert.deepEqual(docked.crates, [{ col: 3, row: 1 }]);
  assert.deepEqual(docked.bot, { col: 3, row: 2, facing: 'up' });
  assert.equal(renderText(docked).split('\n')[1], '#..X...#');
  assert.equal(docked.moves, 5);
  assert.deepEqual(docked.terrain, onto.terrain);

  const off = fixture({ col: 3, row: 2 }, [{ col: 3, row: 3 }]);
  const undocked = step(off, 'down');
  assert.deepEqual(undocked.crates, [{ col: 3, row: 4 }]);
  assert.deepEqual(undocked.bot, { col: 3, row: 3, facing: 'down' });
  assert.equal(renderText(undocked).split('\n')[3], '#..b...#');
  assert.equal(renderText(undocked).split('\n')[4], '#..C.P.#');
  assert.equal(undocked.moves, 5);
  assert.deepEqual(undocked.terrain, off.terrain);
});

test('walls and a second crate block pushes without moving any occupant', () => {
  for (const [state, dir] of [
    [fixture({ col: 2, row: 1 }, [{ col: 1, row: 1 }]), 'left'],
    [fixture({ col: 1, row: 2, facing: 'up' }, [{ col: 2, row: 2 }, { col: 3, row: 2 }]), 'right'],
  ]) {
    const next = step(state, dir);
    assert.deepEqual(next, { ...state, bot: { ...state.bot, facing: dir } });
  }
});

test('moving away does not pull a crate', () => {
  const state = fixture({ col: 3, row: 2 }, [{ col: 2, row: 2 }]);
  const next = step(state, 'right');
  assert.deepEqual(next.bot, { col: 4, row: 2, facing: 'right' });
  assert.deepEqual(next.crates, state.crates);
  assert.equal(next.moves, 5);
});

test('walks, pushes, and blocked attempts are immutable and deterministic', () => {
  for (const [state, dir] of [
    [parseLevel(LEVEL_TEXT), 'up'],
    [fixture({ col: 1, row: 2 }, [{ col: 2, row: 2 }]), 'right'],
    [parseLevel(LEVEL_TEXT), 'left'],
    [fixture({ col: 1, row: 2 }, [{ col: 2, row: 2 }, { col: 3, row: 2 }]), 'right'],
  ]) {
    const before = structuredClone(state);
    freezeDeep(state);
    const next = step(state, dir);
    assert.notEqual(next, state);
    assert.deepEqual(state, before);
    assert.deepEqual(next, step(state, dir));
    next.bot.col = 0;
    next.terrain[1][1] = '#';
    next.crates[0].row = 0;
    assert.deepEqual(state, before);
  }
});
