# generated-boards Specification

## Purpose
Define the bounded solving, deterministic board generation, and browser lifecycle that make Dock Bot replayable beyond its initial hand-authored level.

## Requirements

### Requirement: The solver returns a shortest legal solution within a fixed bound

The system SHALL expose a pure `solve(state)` operation that returns a shortest legal move string when a solution is found before 200,000 visited states, and SHALL return no solution when the board is unsolvable or the bound is exhausted.

#### Scenario: The hand-authored level has the expected par

- **GIVEN** the parsed hand-authored level
- **WHEN** `solve` is called
- **THEN** it returns `UURDLDRDRRUURUL`
- **AND** the returned string contains 15 moves

#### Scenario: An unsolvable board returns no solution

- **GIVEN** a valid board with a crate trapped in a non-pad corner
- **WHEN** `solve` is called
- **THEN** it returns no solution

#### Scenario: A solution never exceeds the search bound

- **GIVEN** any valid board passed to `solve`
- **WHEN** the search completes
- **THEN** no more than 200,000 distinct states are visited
- **AND** the operation returns a shortest solution if one was found

### Requirement: Seeded generation is deterministic and bounded

The system SHALL expose `generateLevel(seed, options?)`, using only deterministic pseudo-random choices derived from the supplied seed, and SHALL return either `{ text, seed, par }` or no result after at most 60 candidates. A returned board SHALL have an outer wall ring, no interior walls, exactly three crates, exactly three pads, one bot, no crate initially on a pad, and a solver par of at least 12.

#### Scenario: The same seed reproduces the same board

- **GIVEN** the same seed and generation options
- **WHEN** `generateLevel` is called twice
- **THEN** both results have identical text, seed, and par

#### Scenario: A generated board meets structural constraints

- **GIVEN** a successful generation result
- **WHEN** its text is parsed
- **THEN** it has exactly three crates, three pads, and one bot
- **AND** every boundary cell is a wall
- **AND** no interior cell is a wall
- **AND** no crate starts on a pad
- **AND** its par is at least 12

#### Scenario: Generation gives up at the candidate cap

- **GIVEN** generation options that make the minimum par impossible
- **WHEN** `generateLevel` exhausts 60 candidates
- **THEN** it returns no result without looping indefinitely

### Requirement: Generated boards have a restartable browser lifecycle

The browser SHALL keep the active board text, seed, and par together. Pressing `N` SHALL install a fresh generated board with zero moves and show `Seed <seed> · Par <par>`. Pressing `R` SHALL restore the active board's original text with zero moves, including the same generated seed and par. The hand-authored board SHALL show `Par 15`.

#### Scenario: New board starts clean

- **GIVEN** the game is running on any board
- **WHEN** the player presses `N`
- **THEN** a generated board is displayed
- **AND** the moves counter is zero
- **AND** the board metadata displays its seed and par

#### Scenario: Restart preserves generated identity

- **GIVEN** a generated board has been moved
- **WHEN** the player presses `R`
- **THEN** the original generated layout is restored
- **AND** moves returns to zero
- **AND** the displayed seed and par are unchanged

#### Scenario: The keyboard legend is visible

- **GIVEN** the game is displayed
- **THEN** text beneath the board identifies arrow-key movement, `R` restart, and `N` new board

### Requirement: Existing movement and solving behavior remains compatible

The new solver and generator SHALL use the existing parsing and movement rules, preserve immutable state transitions, and leave the P1–P4 hand-authored interactions and solved freeze behavior unchanged.

#### Scenario: Generated replay uses the shared movement rules

- **GIVEN** a generated result and its solver par
- **WHEN** the returned move string is replayed through the existing step operation
- **THEN** all crates finish on pads
- **AND** the move count equals the reported par
