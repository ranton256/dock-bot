'use strict';

// Renders a review sheet at the size the game actually draws (scale 3), for the
// legibility checks the validator cannot make: that the four bot facings read as
// one robot, and that a docked crate is obvious next to an undocked one.
//
// Usage: node tools/preview.js [out.png]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encodePNG } = require('./png.js');
const { FRAMES, PALETTE, CELL } = require('./atlas.js');

const SCALE = 3;
const TILE = CELL * SCALE;
const GAP = 12;

// Magenta behind the frame strip: an entity frame with an opaque background
// would be impossible to miss.
const STRIP_BG = [255, 0, 255, 255];
const PAGE_BG = [10, 12, 16, 255];

const LEVEL = [
  '########',
  '#..P...#',
  '#.C.C..#',
  '#B.P...#',
  '#..C.P.#',
  '########',
];

const BASE_OF = { '#': 'wall', '.': 'floor', P: 'pad', C: 'floor', B: 'floor', X: 'pad', b: 'pad' };
const ENTITY_OF = { C: 'crate', X: 'crate_docked', B: 'bot_right', b: 'bot_right' };

// base tile, then entity over it - the same order the game draws in.
const DEMO = [
  [['floor'], ['floor', 'crate'], ['pad'], ['pad', 'crate_docked'], ['floor'], ['floor', 'bot_up'], ['floor', 'bot_down'], ['floor']],
  [['wall'], ['floor', 'bot_left'], ['floor', 'bot_right'], ['floor'], ['pad', 'bot_up'], ['floor', 'crate'], ['pad', 'crate_docked'], ['wall']],
];

const STRIP = ['bot_up', 'bot_down', 'bot_left', 'bot_right', 'crate', 'crate_docked', 'floor', 'wall', 'pad'];

const W = Math.max(STRIP.length * TILE, 8 * TILE);
const H = TILE + GAP + LEVEL.length * TILE + GAP + DEMO.length * TILE;

const buf = Buffer.alloc(W * H * 4);

function fill(x0, y0, w, h, [r, g, b, a]) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * W + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
}

// Draws one 16x16 frame magnified by SCALE with no interpolation, which is what
// the game does with image smoothing disabled.
function blit(name, dx, dy) {
  const map = FRAMES[name].map;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const ch = map[y][x];
      if (ch === '.') continue;
      const [r, g, b] = PALETTE[ch];
      fill(dx + x * SCALE, dy + y * SCALE, SCALE, SCALE, [r, g, b, 255]);
    }
  }
}

fill(0, 0, W, H, PAGE_BG);
fill(0, 0, STRIP.length * TILE, TILE, STRIP_BG);
STRIP.forEach((name, i) => blit(name, i * TILE, 0));

let y = TILE + GAP;
LEVEL.forEach((row, r) => {
  [...row].forEach((ch, c) => {
    blit(BASE_OF[ch], c * TILE, y + r * TILE);
    if (ENTITY_OF[ch]) blit(ENTITY_OF[ch], c * TILE, y + r * TILE);
  });
});

y += LEVEL.length * TILE + GAP;
DEMO.forEach((row, r) => {
  row.forEach((stack, c) => {
    stack.forEach((name) => blit(name, c * TILE, y + r * TILE));
  });
});

// Defaults outside the repository: the game ships exactly five files and a
// stray preview.png next to them would muddy that.
const out = process.argv[2] || path.join(os.tmpdir(), 'dock-bot-preview.png');
fs.writeFileSync(out, encodePNG(W, H, buf));
console.log(`wrote ${out} (${W}x${H}, scale ${SCALE})`);
