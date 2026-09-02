## Why

Dock Bot's rules — how a press moves the bot, when a push is legal, what counts as
solved — are the whole game, and none of them need a canvas to be true. `Dock Bot.md` §4.3
already requires `game.js` to be a pure core plus a thin shell, and §5 makes
`renderText` the diagnostic substitute for screenshots because canvas readback is blocked
under `file://`.

Building that core on its own, before any browser code exists, means every rule in §6 is
settled by `node --test` rather than by a human squinting at a canvas. The shell milestone
then renders logic that is already proven instead of debugging rules and rendering at the
same time.

## What Changes

- Add `game.js` containing the five core functions §4.3 names — `parseLevel`, `step`,
  `isSolved`, `renderText`, `playMoves` — none of which touch the DOM, and with `step`
  returning a new state rather than mutating its argument.
- Add the level text from §3 as a module constant, and expose it alongside the five
  functions through the guarded `module.exports` block §6 requires.
- Add `test.js` covering every §6 scenario that names a core function, using only
  `node:test` and `node:assert`.
- Accept a documented superset of the §3 input alphabet: `parseLevel` also reads the `X`
  and `b` glyphs `renderText` emits, making the two functions genuine inverses so a board
  pasted from a bug report can be loaded back and reproduced.

Out of scope, deliberately: `index.html`, `style.css`, `draw`, the key listener, and the
HUD. Those are the shell milestone. The three §6 scenarios that straddle the boundary —
pushing onto a pad, level solved, restarting — are satisfied here only in their core half;
frame selection and HUD text remain unverified until the shell exists.

## Capabilities

### New Capabilities
- `core-rules`: the game's rules as a pure, deterministic state machine — parsing a level
  into state, the movement and pushing rules for a single step, the solved condition and
  the freeze it imposes, the textual rendering of a board, and replay of a move string.

### Modified Capabilities

None. `sprite-atlas` is untouched; this milestone needs no atlas and draws nothing.

## Impact

- **New files:** `game.js`, `test.js`. Both are members of §4.2's five-file list, so no
  file budget is consumed beyond what the spec already allocates.
- **Depends on:** nothing. Independent of the atlas milestone; the two can proceed in
  either order or at once.
- **Unblocks:** the browser shell milestone, which imports no new logic — it binds keys to
  `step`, draws from state, and reads `isSolved` for HUD text.
- **Constraint honored:** no package manager, so no `package.json`. This is load-bearing
  rather than incidental — its absence keeps `.js` as CommonJS, which is what lets
  `test.js` `require('./game.js')` and what makes `node --test test.js` the entry point.
- **Risk:** `game.js` is one file shared with the shell milestone, which will append to it.
  The exports block and the core/shell seam are established here so that later work adds
  to a stated boundary rather than negotiating one.
