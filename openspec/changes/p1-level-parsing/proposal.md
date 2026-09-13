## Why

Dock Bot currently contains the game specification and sprite atlas but no implementation. Roadmap phase P1 establishes the headless level representation and exact text diagnostics needed to test subsequent gameplay milestones.

## What Changes

- Add `game.js` with pure `parseLevel(text)` and `renderText(state)` functions and guarded CommonJS exports.
- Parse the exact 8×6 hand-authored level from `Dock Bot.md` §3 into terrain, crates, bot position and facing, and initial move/solved state.
- Render canonical ASCII boards, preserving underlying pads and representing occupants on pads with `X` and `b`.
- Add `test.js` using only `node:test` and `node:assert` to verify the §6 parsing scenario, canonical text output, and headless import.
- Limit delivery to roadmap P1; browser rendering, movement, pushing, solve detection during play, restart, replay, solving, and generation belong to P2–P5.

## Capabilities

### New Capabilities

- `level-state`: Headless level parsing and canonical text rendering for Dock Bot's board state.

### Modified Capabilities

None; the project has no existing OpenSpec capability specs.

## Impact

Implementation will introduce only `game.js` and `test.js` at the project root. Tests run with Node 20+ using `node --test test.js`; no dependencies, package manifest, build tooling, or Python environment are needed. Existing design documents and the supplied atlas remain the source material. P1 does not require a browser or the later HTML/CSS files.
