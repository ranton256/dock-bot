'use strict';

// Proves the atlas validator rejects what it claims to reject.
//
// A validator that has never failed proves nothing, and this one is guarding a
// hand-rolled encoder. Each case below builds a synthetic atlas that is valid
// except for one deliberate defect, and asserts the validator catches it and
// blames the right requirement.
//
// Synthetic rather than derived from the real atlas, so this runs regardless of
// whether the real atlas exists yet, and tests the validator rather than the art.
//
// Usage: node tools/validate-selftest.js

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encodePNG } = require('./png.js');
const { validate } = require('./validate-atlas.js');

const SIZE = 64;
const CELL = 16;

const USED = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1],
  [0, 2],
];
const TERRAIN = [[2, 1], [3, 1], [0, 2]];

const isTerrain = (col, row) => TERRAIN.some(([c, r]) => c === col && r === row);
const isUsed = (col, row) => USED.some(([c, r]) => c === col && r === row);

function blank() {
  return Buffer.alloc(SIZE * SIZE * 4);
}

function put(buf, x, y, [r, g, b, a]) {
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function at(buf, x, y) {
  const i = (y * SIZE + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
}

// A minimal atlas that satisfies every mechanical requirement: terrain cells
// filled solid, entity cells inset by one pixel so their border is transparent,
// unused cells untouched.
function validAtlas() {
  const buf = blank();
  for (const [col, row] of USED) {
    const terrain = isTerrain(col, row);
    const inset = terrain ? 0 : 1;
    for (let y = inset; y < CELL - inset; y++) {
      for (let x = inset; x < CELL - inset; x++) {
        put(buf, col * CELL + x, row * CELL + y, terrain ? [40, 60, 80, 255] : [200, 140, 40, 255]);
      }
    }
  }
  return buf;
}

function writeTemp(buf, name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-selftest-'));
  const file = path.join(dir, `${name}.png`);
  fs.writeFileSync(file, encodePNG(SIZE, SIZE, buf));
  return file;
}

function check(name, mutate, expectedRequirement) {
  const buf = validAtlas();
  if (mutate) mutate(buf);
  const failures = validate(writeTemp(buf, name));

  if (expectedRequirement === null) {
    assert.deepStrictEqual(failures, [], `${name}: expected a clean atlas to pass`);
    console.log(`  ok  ${name} -> accepted`);
    return;
  }

  assert.ok(failures.length > 0, `${name}: expected the validator to reject this`);
  const blamed = failures.map((f) => f.requirement);
  assert.ok(
    blamed.includes(expectedRequirement),
    `${name}: expected blame on "${expectedRequirement}", got ${JSON.stringify(blamed)}`
  );
  console.log(`  ok  ${name} -> rejected [${expectedRequirement}]`);
}

console.log('validator self-test');

check('clean', null, null);

check('feathered-edge', (buf) => {
  // A single anti-aliased pixel on the crate frame.
  const [r, g, b] = at(buf, 0 * CELL + 4, 1 * CELL + 4);
  put(buf, 0 * CELL + 4, 1 * CELL + 4, [r, g, b, 128]);
}, 'Pixel discipline for unsmoothed scaling');

check('opaque-entity-background', (buf) => {
  // Fill the crate cell edge to edge, so it would occlude the floor beneath.
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) put(buf, 0 * CELL + x, 1 * CELL + y, [200, 140, 40, 255]);
  }
}, 'Entity frames are transparent-backed');

check('stray-pixel-in-unused-cell', (buf) => {
  put(buf, 1 * CELL + 8, 2 * CELL + 8, [255, 0, 0, 255]);
}, 'Frame placement');

check('hole-in-terrain', (buf) => {
  // One transparent pixel in the floor tile.
  put(buf, 2 * CELL + 8, 1 * CELL + 8, [0, 0, 0, 0]);
}, 'Terrain frames are opaque');

check('missing-frame', (buf) => {
  // Erase bot_left entirely.
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) put(buf, 2 * CELL + x, 0 * CELL + y, [0, 0, 0, 0]);
  }
}, 'Frame placement');

check('too-many-colours', (buf) => {
  // Give the wall tile a gradient.
  let n = 0;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) put(buf, 3 * CELL + x, 1 * CELL + y, [n++, 60, 80, 255]);
  }
}, 'Pixel discipline for unsmoothed scaling');

// Wrong dimensions cannot reuse the 64x64 buffer.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-selftest-'));
  const file = path.join(dir, 'wrong-size.png');
  fs.writeFileSync(file, encodePNG(32, 32, Buffer.alloc(32 * 32 * 4)));
  const failures = validate(file);
  assert.ok(failures.some((f) => f.requirement === 'Atlas file and dimensions'),
    'wrong-size: expected blame on dimensions');
  console.log('  ok  wrong-size -> rejected [Atlas file and dimensions]');
}

console.log('validator self-test passed');
