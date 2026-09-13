## 1. Headless level parsing

- [x] 1.1 Create `game.js` with the canonical `LEVEL_TEXT`, `parseLevel(text)`, and guarded CommonJS exports using the plain-data shape in `design.md`; create parsing tests in `test.js` asserting exact terrain, bot `(1,3)` facing right, all crate and pad coordinates, zero moves, and unsolved state. Verify these tests pass under `node --test test.js` without browser globals.
- [x] 1.2 Ensure each parse allocates independent terrain rows, crate positions, and bot data; add a test that changes these fields and the counter in one parsed state and verifies another separately parsed state remains original. Verify the independence test passes.

## 2. Canonical text diagnostics

- [x] 2.1 Implement and export `renderText(state)` with fresh output rows and terrain/crate/bot compositing; add a byte-exact round-trip test against the independently written §3 map, including six eight-character rows and no edge newlines. Verify the round-trip test passes.
- [x] 2.2 Add the constructed pad-occupancy scenario from `specs/level-state/spec.md`, asserting the full expected board with `X` and `b`, unchanged state after rendering, and retained pad terrain. Verify this scenario passes without implementing movement.

## 3. P1 acceptance

- [x] 3.1 Run the complete project unit suite with Node 20+ via `node --test test.js`, inspect the results, and fix every failure before marking P1 complete; verify all level-state scenarios are covered and no tests fail or are skipped.
- [x] 3.2 Review the implementation diff against `Dock Bot.md` §9 P1 and §4 constraints; verify implementation adds only `game.js` and `test.js`, uses only built-in Node test dependencies, introduces no package manifest or browser work, and leaves the supplied atlas unchanged.
