## Why

P3 makes the warehouse playable, but a completed puzzle has no clear finish, the player cannot restart, and the documented solution cannot be replayed through the core. Roadmap P4 completes the hand-authored game loop with solved detection, a frozen solved state, restart, and scripted playtest support.

## What Changes

- Add and export pure `isSolved(state)` to detect when every crate occupies a pad.
- Update `step` so solved states ignore arrow transitions entirely, including facing and move count.
- Add and export pure `playMoves(state, moves)` for deterministic `U/D/L/R` replay through `step`, freezing after solve.
- Add restart handling for `R`, restoring the current hand-authored board from a fresh parse and resetting moves; ignore modified R presses carrying Ctrl, Cmd, or Alt.
- Update the HUD to show `Solved in N moves — press R` and keep arrow input frozen after completion.
- Extend unit and browser tests with the 15-move canonical solution, blocked replay suffixes, restart from solved/unsolved states, and modifier behavior.
- Keep generated boards, N, board seed/par metadata, and the key legend for P5.

## Capabilities

### New Capabilities

- `solving-and-restart`: Solved-state detection, replay, solved HUD/freeze, and restarting the hand-authored board.

### Modified Capabilities

None. The existing `movement-and-pushing` requirements remain valid as the base transition contract; this change adds the solved-state lifecycle around them.

## Impact

Implementation changes `game.js`, `test.js`, and the existing HUD text behavior in the browser shell. No dependencies, new assets, package manifest, animation loop, generated-board code, or persisted data are introduced. P4 uses the current `LEVEL_TEXT`; generated-board restart and board metadata are deliberately deferred to P5.
