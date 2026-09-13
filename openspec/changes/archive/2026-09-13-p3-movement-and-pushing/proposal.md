## Why

Dock Bot currently draws the starting board but cannot be played. Roadmap P3 adds deterministic movement and single-crate pushing so the player can interact with the warehouse using the arrow keys.

## What Changes

- Add and export pure `step(state, dir)` for four-direction movement, wall blocking, and single-crate pushes onto free floor or pads, without mutating the input state.
- Count each successful step or push as one move; blocked attempts only update facing.
- Connect arrow-key presses to the core after atlas readiness, suppress held-key repeats, and redraw only when state values change.
- Reuse the existing canvas renderer and HUD for changed positions, facing, docked frames, and move counts.
- Extend `test.js` with movement, pushing, terrain preservation, and immutability coverage, and verify the keyboard path directly over `file://`.
- Keep solved-state detection/freeze, R restart, and `playMoves` in P4; generation, N, board metadata, and the final key legend remain later work.

## Capabilities

### New Capabilities

- `movement-and-pushing`: Pure movement transitions, crate collision rules, arrow input, and state-driven redraws.

### Modified Capabilities

None in main specs, which are currently empty. P1 and P2 exist as unarchived changes. P3 advances beyond P2's explicitly phase-scoped static/no-key behavior; its boot, rendering, and headless-core guarantees still apply.

## Impact

Implementation changes `game.js` and `test.js`. The existing state shape, atlas, HTML, CSS, fixed canvas size, classic-script loading, and zero-dependency setup are sufficient. P3 does not archive earlier changes or claim completion of P2's pending physical high-density display check.
