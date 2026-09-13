## Context

See `proposal.md` for motivation and `specs/level-state/spec.md` for the behavior contract. Inspection found only `Dock Bot.md`, `README.md`, the supplied atlas, and OpenSpec scaffolding; there is no game code, test suite, or package manifest. `Dock Bot.md` §9 explicitly limits P1 to parsing, text rendering, and parsing tests. Its §§3–4 specify coordinates, canonical text, and the dependency-free core; §6 supplies the parsing scenario.

The README's suggested first step includes additional gameplay functions, but it explicitly defers to `Dock Bot.md`. Follow the design's P1 row. The design's headless-import scenario mentions five functions while §4 lists seven for the eventual game; P1 exports just its two completed functions, with later phases extending the export surface. Neither inconsistency requires expanding P1.

## Goals / Non-Goals

**Goals:** Establish a concrete state representation that retains terrain beneath entities, supports independent parsing, and can be consumed by subsequent pure gameplay functions and canvas rendering.

**Non-Goals:** A browser shell, gameplay transitions, a public `isSolved` function, malformed-input policy, generalized board sizes, or parsing diagnostic-only `X`/`b` symbols. P1 accepts the documented canonical level alphabet; those two symbols are output representations for states constructed in tests and later by gameplay.

## Decisions

### Use a small plain-data state

Proposed shape: `{ width: 8, height: 6, terrain, crates, bot, moves: 0, solved: false }`. Store terrain as a row-major nested array of `#`, `.`, and `P`; crate positions as an array of `{ col, row }`; and bot as `{ col, row, facing: 'right' }`. Parsing `C` or `B` leaves floor in the corresponding terrain cell. Create all arrays and position objects afresh on each parse.

Separate terrain and occupants preserve pads when entities move later. A single mutable ASCII grid would erase this distinction or require repeated symbol conversion. Plain arrays are sufficient for 48 cells and three crates, and avoid introducing a class hierarchy or encoding positions prematurely for the P5 solver. `solved: false` records the initial P1 state; live solve detection and its consistency after movement belong to P4.

### Render from terrain plus occupants

Build output rows from terrain, overlay crates using pad membership, then overlay the bot using pad membership. Join each row and join rows with `\n`. Work on fresh output rows so rendering cannot mutate terrain. Test pad overlays with constructed states; movement is unnecessary to establish the text contract. Returning the saved input string was considered but cannot represent later board positions.

### Keep the documented level in game.js

Define the exact hand-authored text as a constant in `game.js`, using six strings joined with `\n` to avoid template-literal edge newlines. Export it as `LEVEL_TEXT` alongside `parseLevel` and `renderText` through `if (typeof module !== 'undefined' && module.exports)`. Tests also contain a literal expected board, so a changed source constant cannot silently change the oracle. This keeps the fixed level available to P2 without a separate file or filesystem reads.

No top-level browser work is needed in P1. ES-module syntax and a package manifest are excluded by the project's explicit compatibility constraints.

### Verify with the built-in Node runner

Create root `test.js` with `node:test` and strict assertions from `node:assert`. Cover exact terrain and entity positions, initial fields, byte-exact round trip, pad overlays without mutation, and independent parse results. Requiring `game.js` in this suite verifies headless loading. Run all tests with `node --test test.js`; no install or Python tooling is involved.

## Risks / Trade-offs

- [Output whitespace breaks exact comparisons] → Use canonical joined rows and an independent literal expected string.
- [Shared mutable structures leak state between restarts or tests] → Allocate fresh nested structures per parse and exercise independence in tests.
- [Terrain is lost beneath occupants] → Keep terrain separate and test `X`/`b` output while asserting pad preservation.
- [Later requirements creep into the initial milestone] → Restrict new implementation files to `game.js` and `test.js`, and export only the P1 API plus the fixed-level constant.
- [Input validation is unspecified] → Limit acceptance to the documented valid format; do not establish an accidental public error or normalization contract in this milestone.

## Migration Plan

This is an additive first implementation with no existing callers or persisted data. After implementation, run the entire Node suite before accepting P1. No browser deployment is needed. Rollback consists of reverting the P1 implementation files; the provided atlas and design remain unchanged.
