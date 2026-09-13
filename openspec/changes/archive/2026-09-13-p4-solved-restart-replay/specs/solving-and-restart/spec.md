## Purpose

Complete Dock Bot's hand-authored puzzle loop by detecting solved boards, freezing completed play, replaying move strings, and restoring the level on demand.

## ADDED Requirements

### Requirement: Solved-state detection

`isSolved(state)` SHALL return true exactly when every crate position is on a pad in the state's terrain. It SHALL not mutate the state and SHALL be callable from Node without browser globals.

#### Scenario: Unsolved initial level
- **WHEN** `isSolved(parseLevel(LEVEL_TEXT))` is called
- **THEN** it returns false

#### Scenario: All crates on pads
- **GIVEN** a state with crates at `(3,1)`, `(3,3)`, and `(5,4)` on the three pads
- **WHEN** `isSolved` is called
- **THEN** it returns true without changing bot, crates, terrain, moves, or facing

### Requirement: Solved transitions freeze

`step(state, dir)` SHALL return an unchanged equivalent state when `state` is solved, including facing and move count. Arrow input SHALL not redraw or alter a solved board.

#### Scenario: Solved state ignores arrows
- **GIVEN** a solved state with 15 moves and bot facing up
- **WHEN** `step` is called with `down` or any other direction
- **THEN** the returned state remains solved with the same positions, facing, and move count

### Requirement: Scripted replay

`playMoves(state, moves)` SHALL apply `U`, `D`, `L`, and `R` in order through the same transition rules as arrow input and return the resulting state. Blocked moves SHALL follow `step`; unknown characters SHALL be ignored. Replay SHALL stop having effects after the state becomes solved.

#### Scenario: Canonical 15-move solution
- **WHEN** `playMoves(parseLevel(LEVEL_TEXT), "UURDLDRDRRUURUL")` is called
- **THEN** the result is solved in exactly 15 moves
- **AND** `renderText` contains `X` at `(3,1)`, `(3,3)`, and `(5,4)` with no floor crate symbols

#### Scenario: Blocked moves in a script
- **WHEN** `playMoves(parseLevel(LEVEL_TEXT), "LLL")` is called
- **THEN** the bot remains at `(1,3)` facing left with move count 0

#### Scenario: Replay cannot count past solve
- **WHEN** the canonical solution is followed by any additional moves
- **THEN** the result remains solved at move count 15 with the solved board unchanged

#### Scenario: Replay is pure and deterministic
- **WHEN** a deeply frozen initial state is replayed twice with the same move string
- **THEN** both results are equal and the frozen input is unchanged

### Requirement: Restart the hand-authored board

The browser SHALL recognize an unmodified `R` key in any unsolved or solved hand-authored state and replace the active state with a fresh parse of `LEVEL_TEXT`. Restart SHALL reset moves and facing, restore all crate positions and terrain, and redraw once. R carrying Ctrl, Cmd, or Alt SHALL be ignored so browser reload shortcuts retain their normal behavior.

#### Scenario: Restart an unsolved level
- **WHEN** the player moves the bot or pushes a crate and presses `R`
- **THEN** the initial board returns with `Moves: 0` and the bot facing right

#### Scenario: Restart a solved level
- **WHEN** the player completes the 15-move solution and presses `R`
- **THEN** the hand-authored board returns unsolved with `Moves: 0`

#### Scenario: Modified restart key
- **WHEN** Ctrl+R, Cmd+R, or Alt+R is pressed
- **THEN** the game state and redraw count are unchanged and the browser shortcut is not canceled

### Requirement: Solved HUD and input lifecycle

The HUD SHALL read `Solved in N moves — press R` when the active state is solved and `Moves: N` otherwise. Arrow keys SHALL remain handled but have no effect after solve; R SHALL remain available for restart. The browser SHALL not use timers or animation to manage lifecycle transitions.

#### Scenario: Solved message and frozen controls
- **WHEN** the final successful push solves the hand-authored level
- **THEN** the HUD reads `Solved in 15 moves — press R`
- **AND** further arrows cause no state change or redraw

#### Scenario: Restart clears solved HUD
- **WHEN** R restarts a solved state
- **THEN** the HUD returns to `Moves: 0`
