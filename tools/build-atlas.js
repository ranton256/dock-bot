'use strict';

// Writes assets/dock_bot.png from the frame maps in atlas.js.
//
// Usage: node tools/build-atlas.js

const fs = require('node:fs');
const path = require('node:path');
const { encodePNG } = require('./png.js');
const { buildAtlasPixels, ATLAS_SIZE } = require('./atlas.js');

const OUT = path.join(__dirname, '..', 'assets', 'dock_bot.png');

function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, encodePNG(ATLAS_SIZE, ATLAS_SIZE, buildAtlasPixels()));
  console.log(`wrote ${path.relative(path.join(__dirname, '..'), OUT)} (${ATLAS_SIZE}x${ATLAS_SIZE})`);
}

if (require.main === module) main();
