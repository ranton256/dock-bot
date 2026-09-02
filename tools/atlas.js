'use strict';

// Source of truth for the sprite atlas.
//
// Frames are authored as 16 lines of 16 characters. One character is one pixel
// and names a palette entry; '.' is transparent. The source looks like the thing
// it produces, so a frame can be read and edited without running anything, and a
// diff shows the shape that changed.
//
// This also makes the alpha requirement structural: every palette entry is fully
// opaque and '.' writes alpha zero, so partial alpha cannot be expressed at all.

const CELL = 16;
const GRID = 4;
const ATLAS_SIZE = CELL * GRID;

const TRANSPARENT = '.';

// Cool palette: steel greys for structure, teal for pads, amber for crates.
const PALETTE = {
  k: [0x0d, 0x11, 0x17], // outline, near-black
  d: [0x16, 0x20, 0x2b], // dark steel
  m: [0x22, 0x30, 0x3f], // mid steel
  s: [0x3a, 0x4f, 0x63], // steel
  h: [0x56, 0x71, 0x8a], // steel highlight
  t: [0x0d, 0x4a, 0x4e], // pad teal, dark
  T: [0x14, 0x93, 0x9b], // pad teal
  G: [0x35, 0xe0, 0xe6], // glow teal
  a: [0x6e, 0x42, 0x11], // amber shade
  A: [0xb0, 0x74, 0x1c], // amber
  Y: [0xe8, 0xa8, 0x38], // amber highlight
  c: [0xa8, 0xf0, 0xff], // visor cyan
};

// --- Terrain: opaque edge to edge, drawn as a cell's base layer. -------------

const floor = [
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmsmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmsmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'mmmmmmmmmmmmmmmd',
  'dddddddddddddddd',
];

const wall = [
  'hhhhhhhkhhhhhhhh',
  'ssssssskssssssss',
  'ssssssskssssssss',
  'kkkkkkkkkkkkkkkk',
  'hhhkhhhhhhhkhhhh',
  'ssskssssssskssss',
  'ssskssssssskssss',
  'kkkkkkkkkkkkkkkk',
  'hhhhhhhkhhhhhhhh',
  'ssssssskssssssss',
  'ssssssskssssssss',
  'kkkkkkkkkkkkkkkk',
  'hhhkhhhhhhhkhhhh',
  'ssskssssssskssss',
  'ssskssssssskssss',
  'kkkkkkkkkkkkkkkk',
];

const pad = [
  'dddddddddddddddd',
  'dddddddddddddddd',
  'ddGGTTTTTTTTGGdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddTddddttddddTdd',
  'ddTddddttddddTdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddTddddddddddTdd',
  'ddGGTTTTTTTTGGdd',
  'dddddddddddddddd',
  'dddddddddddddddd',
];

// --- Entities: transparent background, composited over terrain. --------------

const crate = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kYYYYYYYYYYYYk.',
  '.kYaAAAAAAAAaak.',
  '.kYAaAAAAAAaAak.',
  '.kYAAaAAAAaAAak.',
  '.kYAAAaAAaAAAak.',
  '.kYAAAAaaAAAAak.',
  '.kYAAAAaaAAAAak.',
  '.kYAAAaAAaAAAak.',
  '.kYAAaAAAAaAAak.',
  '.kYAaAAAAAAaAak.',
  '.kYaAAAAAAAAaak.',
  '.kaaaaaaaaaaaak.',
  '.kkkkkkkkkkkkkk.',
  '................',
];

// The docked crate is the same crate, pixel for pixel, with its outline turned to
// glow teal and a soft halo added in the margin. Same object, visibly energised.
const crateDocked = [
  '.tttttttttttttt.',
  '.GGGGGGGGGGGGGG.',
  'tGYYYYYYYYYYYYGt',
  'tGYaAAAAAAAAaaGt',
  'tGYAaAAAAAAaAaGt',
  'tGYAAaAAAAaAAaGt',
  'tGYAAAaAAaAAAaGt',
  'tGYAAAAaaAAAAaGt',
  'tGYAAAAaaAAAAaGt',
  'tGYAAAaAAaAAAaGt',
  'tGYAAaAAAAaAAaGt',
  'tGYAaAAAAAAaAaGt',
  'tGYaAAAAAAAAaaGt',
  'tGaaaaaaaaaaaaGt',
  '.GGGGGGGGGGGGGG.',
  '.tttttttttttttt.',
];

// One chassis, four facings. The silhouette never changes; a bright visor moves
// to the facing edge. Four separately drawn silhouettes read as four robots.
//
// The body is lighter than the floor on purpose: at 16x16 the bot has to separate
// from the tile beneath it before any of its detail can be read. Dark blocks at the
// four inner corners read as wheels from above and keep the chassis rotationally
// symmetric, so nothing about the body itself suggests a direction except the visor.
function bot(visor) {
  const rows = [];
  for (let y = 0; y < CELL; y++) {
    if (y < 2 || y > 13) { rows.push(TRANSPARENT.repeat(16)); continue; }
    if (y === 2 || y === 13) { rows.push('..' + 'k'.repeat(12) + '..'); continue; }

    const iy = y - 3;
    const cells = [];
    for (let ix = 0; ix < 10; ix++) {
      const corner = (ix < 2 || ix > 7) && (iy < 2 || iy > 7);
      const centre = ix >= 4 && ix <= 5 && iy >= 4 && iy <= 5;
      if (corner) cells.push('d');
      else if (centre) cells.push('m');
      else cells.push(iy >= 8 ? 's' : 'h');
    }

    // The visor is a bright bar backed by a dark line. Local contrast is what makes
    // it read; a light bar alone disappears into a body light enough to separate
    // from the floor.
    const band = (i) => i >= 2 && i <= 7;
    if (visor === 'U' && iy <= 1) for (let i = 0; i < 10; i++) if (band(i)) cells[i] = iy === 0 ? 'c' : 'k';
    if (visor === 'D' && iy >= 8) for (let i = 0; i < 10; i++) if (band(i)) cells[i] = iy === 9 ? 'c' : 'k';
    if (visor === 'L' && band(iy)) { cells[0] = 'c'; cells[1] = 'k'; }
    if (visor === 'R' && band(iy)) { cells[9] = 'c'; cells[8] = 'k'; }

    rows.push('..k' + cells.join('') + 'k..');
  }
  return rows;
}

// --- Placement: cell (col, row) for each named frame. ------------------------

const FRAMES = {
  bot_up:       { col: 0, row: 0, map: bot('U') },
  bot_down:     { col: 1, row: 0, map: bot('D') },
  bot_left:     { col: 2, row: 0, map: bot('L') },
  bot_right:    { col: 3, row: 0, map: bot('R') },
  crate:        { col: 0, row: 1, map: crate },
  crate_docked: { col: 1, row: 1, map: crateDocked },
  floor:        { col: 2, row: 1, map: floor },
  wall:         { col: 3, row: 1, map: wall },
  pad:          { col: 0, row: 2, map: pad },
};

function checkMap(name, map) {
  if (map.length !== CELL) {
    throw new Error(`${name}: expected ${CELL} rows, got ${map.length}`);
  }
  map.forEach((line, y) => {
    if (line.length !== CELL) {
      throw new Error(`${name}: row ${y} is ${line.length} characters, expected ${CELL}`);
    }
    for (const ch of line) {
      if (ch !== TRANSPARENT && !PALETTE[ch]) {
        throw new Error(`${name}: row ${y} uses unknown character '${ch}'`);
      }
    }
  });
}

function buildAtlasPixels() {
  const buf = Buffer.alloc(ATLAS_SIZE * ATLAS_SIZE * 4);

  for (const [name, frame] of Object.entries(FRAMES)) {
    checkMap(name, frame.map);
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const ch = frame.map[y][x];
        if (ch === TRANSPARENT) continue;
        const [r, g, b] = PALETTE[ch];
        const px = frame.col * CELL + x;
        const py = frame.row * CELL + y;
        const i = (py * ATLAS_SIZE + px) * 4;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
      }
    }
  }

  return buf;
}

module.exports = { PALETTE, FRAMES, CELL, GRID, ATLAS_SIZE, TRANSPARENT, buildAtlasPixels, checkMap };
