'use strict';

// Validates the sprite atlas that ships, by decoding the file itself.
//
// The frame table below is transcribed independently from the specification,
// not imported from the generator. Importing the generator's own cell table
// would only prove the generator agrees with itself; a transcription is what
// catches a frame written to the wrong cell.
//
// Usage: node tools/validate-atlas.js [path]

const path = require('node:path');
const { decodeFile, pixelAt } = require('./decode-png.js');

const ATLAS_SIZE = 64;
const CELL = 16;
const GRID = 4;
const MAX_DISTINCT_COLOURS = 24;

const TERRAIN = 'terrain';
const ENTITY = 'entity';

const FRAMES = [
  { name: 'bot_up',       col: 0, row: 0, kind: ENTITY },
  { name: 'bot_down',     col: 1, row: 0, kind: ENTITY },
  { name: 'bot_left',     col: 2, row: 0, kind: ENTITY },
  { name: 'bot_right',    col: 3, row: 0, kind: ENTITY },
  { name: 'crate',        col: 0, row: 1, kind: ENTITY },
  { name: 'crate_docked', col: 1, row: 1, kind: ENTITY },
  { name: 'floor',        col: 2, row: 1, kind: TERRAIN },
  { name: 'wall',         col: 3, row: 1, kind: TERRAIN },
  { name: 'pad',          col: 0, row: 2, kind: TERRAIN },
];

function cellPixels(image, col, row) {
  const out = [];
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      out.push(pixelAt(image, col * CELL + x, row * CELL + y));
    }
  }
  return out;
}

function validate(file) {
  const failures = [];
  const fail = (requirement, detail) => failures.push({ requirement, detail });

  let image;
  try {
    image = decodeFile(file);
  } catch (err) {
    fail('Atlas file and dimensions', `could not decode ${file}: ${err.message}`);
    return failures;
  }

  if (image.width !== ATLAS_SIZE || image.height !== ATLAS_SIZE) {
    fail('Atlas file and dimensions',
      `expected ${ATLAS_SIZE}x${ATLAS_SIZE}, got ${image.width}x${image.height}`);
    return failures;
  }

  const used = new Set(FRAMES.map((f) => `${f.col},${f.row}`));

  for (const frame of FRAMES) {
    const pixels = cellPixels(image, frame.col, frame.row);
    const opaque = pixels.filter((p) => p[3] === 255).length;
    const transparent = pixels.filter((p) => p[3] === 0).length;

    if (opaque + transparent === 0 || transparent === pixels.length) {
      fail('Frame placement',
        `${frame.name} at cell (${frame.col},${frame.row}) is empty`);
    }

    if (frame.kind === TERRAIN && opaque !== pixels.length) {
      fail('Terrain frames are opaque',
        `${frame.name} has ${pixels.length - opaque} non-opaque pixels; terrain must be fully opaque`);
    }

    if (frame.kind === ENTITY && transparent === 0) {
      fail('Entity frames are transparent-backed',
        `${frame.name} has no fully transparent pixel; it would occlude the terrain beneath it`);
    }
  }

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (used.has(`${col},${row}`)) continue;
      const stray = cellPixels(image, col, row).filter((p) => p[3] !== 0).length;
      if (stray > 0) {
        fail('Frame placement',
          `unused cell (${col},${row}) has ${stray} non-transparent pixels`);
      }
    }
  }

  const colours = new Set();
  let partial = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const [r, g, b, a] = pixelAt(image, x, y);
      if (a !== 0 && a !== 255) partial++;
      if (a === 255) colours.add(`${r},${g},${b}`);
    }
  }

  if (partial > 0) {
    fail('Pixel discipline for unsmoothed scaling',
      `${partial} pixels have partial alpha; edges would blur when magnified`);
  }

  if (colours.size > MAX_DISTINCT_COLOURS) {
    fail('Pixel discipline for unsmoothed scaling',
      `${colours.size} distinct colours exceeds the flat-shading ceiling of ${MAX_DISTINCT_COLOURS}`);
  }

  return failures;
}

function main() {
  const file = process.argv[2]
    || path.join(__dirname, '..', 'assets', 'dock_bot.png');
  const failures = validate(file);

  if (failures.length > 0) {
    console.error(`FAIL ${file}`);
    for (const { requirement, detail } of failures) {
      console.error(`  [${requirement}] ${detail}`);
    }
    process.exit(1);
  }

  console.log(`OK ${file}`);
  console.log(`  64x64, 9 frames placed, 7 cells empty, binary alpha, flat palette`);
}

if (require.main === module) main();

module.exports = { validate, FRAMES, MAX_DISTINCT_COLOURS };
