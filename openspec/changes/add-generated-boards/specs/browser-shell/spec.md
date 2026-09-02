## Purpose

The presentation side of generated boards: asking for one, keeping the one you are on, and
showing enough about it that a player can talk about it afterwards.

## ADDED Requirements

### Requirement: Asking for a new board

Pressing `N` SHALL take a fresh seed, generate a board from it, and show that board with
the move counter at zero. It MUST work in any state, including a solved one — a solved
board is exactly when a player most wants another.

If generation gives up, the game MUST keep the board it already had rather than showing
an empty or partly built one.

#### Scenario: Pressing N mid-game

- **WHEN** the player presses `N` partway through a board
- **THEN** a generated board is drawn and the display reads `Moves: 0`

#### Scenario: Pressing N after solving

- **WHEN** the player presses `N` on a solved board
- **THEN** a generated board is drawn and the display reads `Moves: 0`

#### Scenario: Generation giving up changes nothing

- **WHEN** the player presses `N` and generation gives up
- **THEN** the board on screen is unchanged and the move counter is not reset

### Requirement: Restarting keeps the current board

Pressing `R` SHALL restore the board currently being played, with the move counter at
zero. On a generated board that means **the same board**, from the same seed — not another
one. Restarting is how a player retries a puzzle they have understood; handing them a
different puzzle instead destroys the thing they were about to use.

#### Scenario: Restarting a generated board

- **WHEN** the player presses `R` partway through a generated board
- **THEN** the same board returns, the move counter reads 0, and the seed shown is unchanged

#### Scenario: Restarting still works on the hand-authored level

- **WHEN** the player presses `R` on the hand-authored level
- **THEN** that level returns with the move counter at 0

### Requirement: The board line

A second element below the heads-up display SHALL describe the board being played: its par
on the hand-authored level, and its seed together with its par on a generated one. Its
text MUST be derived from the current board on each draw.

The heads-up display itself MUST keep its existing wording exactly — `Moves: N` while
unsolved and `Solved in N moves — press R` once solved. The board line is additional to
it, never a replacement, so that everything already specified about the display stays true.

#### Scenario: The board line on the hand-authored level

- **WHEN** the hand-authored level is shown
- **THEN** the board line gives its par, and the display still reads `Moves: 0`

#### Scenario: The board line on a generated board

- **WHEN** a generated board is shown
- **THEN** the board line gives that board's seed and its par

#### Scenario: The seed shown identifies the board

- **WHEN** a board is generated from the seed shown on the board line
- **THEN** the board produced is identical to the one on screen
