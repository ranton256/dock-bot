## Purpose

Defines Dock Bot's rules as a pure, deterministic state machine that runs without a
browser: how level text becomes state, what a single directional press does, when the
level is solved, how a board renders back to text, and how a move string replays. This is
the contract the browser shell draws from and the test suite asserts against.

## ADDED Requirements

### Requirement: Core is importable without a browser

The five core operations — parsing a level, stepping, testing for solved, rendering to
text, and replaying a move string — MUST run with no `window`, `document`, or canvas
present. They MUST be reachable from a Node test file through a guarded export block that
has no effect when the same file is loaded in a browser.

The level text MUST be reachable the same way, so that a caller can construct a fresh
state without transcribing the map.

#### Scenario: Importing the core under Node

- **WHEN** a Node test file imports the core and calls each of the five operations
- **THEN** every one runs to completion without a canvas, window, or document

#### Scenario: Export block is inert in a browser

- **WHEN** the same file is loaded in a browser by a plain script tag
- **THEN** it evaluates without error and the export block has no observable effect

### Requirement: Level parsing

Parsing SHALL accept a board as text, one line per row, top row first, and produce a state
holding the bot's position and facing, the crate positions, the pad positions, the wall
positions, and a move counter.

Cells are `(column, row)` integer pairs with the origin at the top-left, columns
increasing rightward and rows increasing downward. The board is 8 columns by 6 rows, so
valid cells satisfy `0 <= column < 8` and `0 <= row < 6`.

The input alphabet is `#` wall, `.` floor, `P` empty pad, `C` crate on floor, `B` bot on
floor. Parsing MUST additionally accept `X` crate on a pad and `b` bot on a pad, the two
glyphs rendering emits, so that any rendered board can be read back.

A freshly parsed state MUST have a move counter of zero.

#### Scenario: Parsing the level

- **WHEN** the level text is parsed
- **THEN** the bot is at (1,3) facing right; crates are at (2,2), (4,2) and (3,4); pads are at (3,1), (3,3) and (5,4); the move counter is 0; and the level is not solved

#### Scenario: Parsing a board containing docked crates

- **WHEN** a board containing `X` is parsed
- **THEN** each `X` cell holds both a pad and a crate

#### Scenario: Parsing a board with the bot on a pad

- **WHEN** a board containing `b` is parsed
- **THEN** that cell holds both a pad and the bot

### Requirement: Rendering a board to text

Rendering SHALL produce an exact textual picture of a state: one line per row, top row
first, rows joined by a single newline, with no leading or trailing newline. This is the
diagnostic substitute for a screenshot, so its output MUST be suitable for byte-for-byte
comparison.

Each cell renders as exactly one character, chosen by what occupies it: `#` wall,
`b` bot on a pad, `B` bot on floor, `X` crate on a pad, `C` crate on floor, `P` empty pad,
`.` floor.

Rendering MUST be the inverse of parsing: parsing a rendered board and rendering it again
MUST reproduce the same text.

#### Scenario: Rendering the initial board

- **WHEN** a freshly parsed state is rendered
- **THEN** the output is byte-for-byte identical to the level text in its canonical form

#### Scenario: Rendering round-trips through parsing

- **WHEN** any reachable state is rendered, parsed, and rendered again
- **THEN** the second rendering is byte-for-byte identical to the first

#### Scenario: A crate on a pad renders distinctly

- **WHEN** a state in which a crate occupies a pad is rendered
- **THEN** that cell renders as `X`, not as `C` or `P`

### Requirement: Stepping onto an empty cell

A step SHALL take a state and one of the four directions and return a new state. When the
cell ahead of the bot is floor or an empty pad, the bot MUST move into it and the move
counter MUST increase by exactly one.

#### Scenario: Moving onto floor

- **WHEN** the bot at (1,3) is stepped upward and (1,2) is floor
- **THEN** the bot is at (1,2) facing up and the move counter is 1

#### Scenario: Moving onto an empty pad

- **WHEN** the bot is stepped toward an adjacent empty pad
- **THEN** the bot occupies the pad, the pad remains in place, and the move counter increases by one

### Requirement: Blocked movement

When the cell ahead of the bot is a wall or lies outside the board, nothing MUST move and
the move counter MUST NOT change. The bot MUST still turn to face the pressed direction —
turning is the only visible confirmation that a blocked press registered.

#### Scenario: Blocked by a wall

- **WHEN** the bot at (1,3) is stepped left and (0,3) is a wall
- **THEN** the bot remains at (1,3), the move counter is unchanged, and the bot faces left

#### Scenario: Repeated blocked presses

- **WHEN** a freshly parsed state is replayed with the move string `LLL`
- **THEN** the bot is still at (1,3), facing left, with the move counter at 0

### Requirement: Pushing a crate

When the cell ahead of the bot holds a crate and the cell beyond that crate is floor or an
empty pad, the bot MUST push that crate: the crate moves one cell in the pressed
direction, the bot moves into the crate's former cell, and the move counter MUST increase
by exactly one. A push costs the same one move as a step.

Exactly one crate moves per push. There is no pulling: a crate never moves toward the bot.

#### Scenario: Pushing a crate onto floor

- **WHEN** the bot at (1,2) is stepped right, a crate is at (2,2), and (3,2) is floor
- **THEN** the crate is at (3,2), the bot is at (2,2), and the move counter increases by exactly 1

#### Scenario: Pushing a crate onto a pad

- **WHEN** a crate sits directly between the bot and an empty pad and the bot is stepped toward the crate
- **THEN** the crate occupies the pad and counts as filled

### Requirement: Blocked pushes

When the cell ahead holds a crate and the cell beyond it is a wall, lies outside the
board, or holds another crate, neither the bot nor any crate MUST move and the move
counter MUST NOT change. The bot MUST still turn to face the pressed direction.

#### Scenario: Push blocked by a wall

- **WHEN** a freshly parsed state is replayed with the move string `RRD`, placing the bot on the pad at (3,3) facing a crate at (3,4) whose far side is the boundary wall
- **THEN** the crate remains at (3,4), the bot remains at (3,3) facing down, and the move counter is 2

#### Scenario: Push blocked by another crate

- **WHEN** a freshly parsed state is replayed with the move string `URR`, bringing a pushed crate to (3,2) with another crate already at (4,2)
- **THEN** no crate moves on the final press, the move counter is 2, and the bot faces right

### Requirement: Solved condition

The level SHALL be solved when every crate occupies a pad. The solved condition MUST be
derived from the positions of crates and pads rather than stored as separate state, so it
cannot disagree with the board.

#### Scenario: Not solved while a crate is off a pad

- **WHEN** any crate does not occupy a pad
- **THEN** the level is not solved

#### Scenario: Solved on the final push

- **WHEN** the last remaining empty pad is filled by a push
- **THEN** the level is solved

### Requirement: Solving freezes the board

Once the level is solved, a step in any direction MUST leave the state completely
unchanged — no movement, no change to the move counter, and no change to the bot's facing.
The facing exception matters: a blocked press normally turns the bot, and after a solve
even that MUST NOT happen.

This freeze MUST hold in the core rather than only where keys are handled, so that a
replayed move string cannot count moves past a solve.

#### Scenario: Arrows are inert after a solve

- **WHEN** a solved state is stepped in any direction
- **THEN** the resulting state is unchanged in board, move counter, and facing

#### Scenario: Replay cannot count past a solve

- **WHEN** a move string that solves the level is replayed with extra directions appended
- **THEN** the final move counter equals the count at the moment the level was solved

### Requirement: Move counting

The move counter SHALL begin at zero and increase by exactly one for each step or push
that changes the board. A blocked press MUST cost zero. A press after the level is solved
MUST cost zero.

#### Scenario: Counter reflects only successful moves

- **WHEN** a move string mixing successful and blocked presses is replayed
- **THEN** the move counter equals the number of presses that moved the bot

### Requirement: Replaying a move string

Replay SHALL apply a sequence of directions to a state in order, returning the resulting
state, where `U`, `D`, `L` and `R` denote up, down, left and right. Replay MUST apply the
same rules as a single step, including the freeze after a solve.

#### Scenario: Replaying the canonical solution

- **WHEN** a freshly parsed state is replayed with `UURDLDRDRRUURUL`
- **THEN** the level is solved and the move counter is 15

#### Scenario: The solved board

- **WHEN** the state resulting from the canonical solution is rendered
- **THEN** crates on pads appear at (3,1), (3,3) and (5,4), and no crate appears off a pad anywhere on the board

### Requirement: State is immutable and the game deterministic

A step MUST NOT modify the state it was given; it MUST return a new state. A caller
holding a state before a step MUST observe that state unchanged afterwards.

The game SHALL contain no randomness: the level text together with a sequence of
directions MUST fully determine the resulting state.

#### Scenario: Stepping leaves the prior state intact

- **WHEN** a state is rendered, stepped, and rendered again from the original reference
- **THEN** the second rendering of the original is identical to the first

#### Scenario: Replay is reproducible

- **WHEN** the same move string is replayed twice from freshly parsed states
- **THEN** both runs produce identical renderings and identical move counters

### Requirement: Restarting yields a freshly parsed state

Restarting SHALL be defined as parsing the level text again. A restarted state MUST equal
a freshly parsed one in every respect, including a move counter of zero, whether the level
was solved or in progress when the restart happened.

#### Scenario: Restart from a solved state

- **WHEN** the level text is parsed again after the level has been solved
- **THEN** the resulting state equals a freshly parsed state and the move counter is 0

#### Scenario: Restart mid-game

- **WHEN** the level text is parsed again partway through a game
- **THEN** the resulting state equals a freshly parsed state and the move counter is 0
