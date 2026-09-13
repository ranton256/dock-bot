# P5: Solving and seeded generated boards

## Why

P4 completes the hand-authored board loop, but the game still has one fixed level and no way to measure or discover new boards. P5 adds a bounded shortest-path solver and deterministic generation so every generated board can be checked, replayed, and displayed with a useful par value.

## What changes

- Add a pure breadth-first `solve` operation that returns the shortest legal move string within a 200,000-state limit.
- Add seeded `generateLevel` with a 60-candidate cap, exactly three crates and pads, no interior walls, and a minimum par of 12 moves.
- Track board text, seed, and par for the active board; add `N` to generate a fresh board and make `R` restart the current generated board with the same metadata.
- Show the board's par and seed plus a compact keyboard legend beneath the board.
- Cover solver correctness, generation determinism and bounds, lifecycle behavior, and browser smoke checks.

## Capabilities

### New capabilities
- `generated-boards`: bounded shortest-path solving, deterministic seeded generation, and generated-board UI lifecycle.

### Modified capabilities
- None.

## Impact

Implementation will extend `game.js`, `index.html`, and `test.js`. No external dependencies or new assets are required. The existing hand-authored level remains the default starting board and participates in the same metadata and restart flow.
