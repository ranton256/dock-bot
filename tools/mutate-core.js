'use strict';

// Mutation check for the core test suite.
//
// A green suite proves the tests ran, not that they would notice a defect. Each
// mutation below breaks one rule in game.js; the suite must fail for every one.
// If a mutation survives, the suite has a blind spot exactly there.
//
// Usage: node tools/mutate-core.js

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

// Each mutation is [file, find, replace]. Applying it must make the suite fail.
const MUTATIONS = [
  {
    name: 'freeze removed',
    why: 'a solved board would keep counting moves',
    edits: [['game.js', '  if (isSolved(state)) return state;', '  // freeze removed']],
  },
  {
    name: 'wall turned to floor, off the solution path',
    why: 'the level constant would be silently wrong',
    edits: [['game.js', "  '########',\n  '#..P...#',", "  '.#######',\n  '#..P...#',"]],
  },
  {
    name: 'input mutated in place',
    why: 'step would modify the state it was given',
    edits: [['game.js', '    const crates = new Set(state.crates);', '    const crates = state.crates;']],
  },
  {
    name: 'crate pushed into an occupied cell',
    why: 'two crates could occupy one cell',
    edits: [['game.js',
      '    if (isBlocked(state, beyondCol, beyondRow) || state.crates.has(beyond)) return turned;',
      '    if (isBlocked(state, beyondCol, beyondRow)) return turned;']],
  },
  {
    name: 'blocked press does not turn the bot',
    why: 'the only visible sign a press registered would be gone',
    edits: [['game.js',
      '  const turned = { ...state, bot: { col: state.bot.col, row: state.bot.row, facing: dir } };',
      '  const turned = state;']],
  },
  {
    name: 'bounds check removed',
    why: 'a level without a wall ring would walk the bot off the board',
    edits: [['game.js',
      '  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;',
      '  // bounds check removed']],
  },
];

// Not a mutation to catch - a control. It applies the same wall typo to the
// game constant AND to the test file's own copy, which is the situation you get
// when expected values are derived from the thing under test. It is expected to
// SURVIVE, and that is the whole argument for typing the map out independently.
const CONTROL = {
  name: 'wall typo applied to the test transcription as well',
  edits: [
    ['game.js', "  '########',\n  '#..P...#',", "  '.#######',\n  '#..P...#',"],
    ['test.js', "  '########',\n  '#..P...#',", "  '.#######',\n  '#..P...#',"],
    ['test.js', "  '########',\n  '#..XB..#',", "  '.#######',\n  '#..XB..#',"],
  ],
};

function runWith(edits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dock-bot-mutant-'));
  for (const f of ['game.js', 'test.js']) {
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  for (const [file, find, replace] of edits) {
    const p = path.join(dir, file);
    const before = fs.readFileSync(p, 'utf8');
    assert.ok(before.includes(find), `mutation target not found in ${file}: ${find.slice(0, 48)}`);
    fs.writeFileSync(p, before.replace(find, replace));
  }
  try {
    execFileSync(process.execPath, ['--test', 'test.js'], { cwd: dir, stdio: 'pipe' });
    return { failed: false, failures: 0 };
  } catch (err) {
    const out = String(err.stdout || '');
    return { failed: true, failures: (out.match(/^not ok/gm) || []).length };
  }
}

console.log('mutation check - every mutation must be caught\n');

let survived = 0;
for (const m of MUTATIONS) {
  const r = runWith(m.edits);
  if (r.failed) {
    console.log(`  caught    ${m.name} (${r.failures} test${r.failures === 1 ? '' : 's'})`);
  } else {
    survived++;
    console.log(`  SURVIVED  ${m.name}\n            without this being caught, ${m.why}`);
  }
}

const control = runWith(CONTROL.edits);
console.log(`\ncontrol - expected to survive:`);
console.log(`  ${control.failed ? 'caught (unexpected)' : 'survived, as designed'}  ${CONTROL.name}`);
console.log('  With the map typed out independently in test.js, the same typo is caught.');
console.log('  That control is the argument for the transcription.');

if (survived > 0) {
  console.error(`\n${survived} mutation(s) survived: the suite has a blind spot.`);
  process.exit(1);
}
if (control.failed) {
  console.error('\nThe control was caught, which means it no longer demonstrates what it claims.');
  process.exit(1);
}
console.log('\nall mutations caught');
