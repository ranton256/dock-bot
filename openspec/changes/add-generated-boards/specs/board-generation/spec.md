## Purpose

Producing a playable board from a seed, and the search that decides whether a board is
playable at all: solvable, and not so easy that generating it was not worth the press.

## ADDED Requirements

### Requirement: Solving a board

The core SHALL provide a search that, given a state, returns a **shortest** sequence of
directions that solves it, or nothing if no such sequence exists. Returning merely *a*
solution is not sufficient: the length is used as the board's par and as the measure of
its difficulty, and both are meaningless if the sequence is not minimal.

The search MUST be bounded. Once it has examined the solver cap in distinct positions it
MUST stop and report the board as unsolvable rather than continue, so that no board can
hang the page.

The search MUST NOT modify the state it is given.

#### Scenario: Finding the shortest solution

- **WHEN** the search is given a freshly parsed hand-authored level
- **THEN** it returns a solution of exactly 15 moves, the optimal length recorded in the specification

#### Scenario: A returned solution actually solves the board

- **WHEN** the search returns a solution for any board
- **THEN** replaying that solution from the board's initial state leaves the level solved

#### Scenario: Reporting an unsolvable board

- **WHEN** the search is given a board with a crate pushed into a corner that is not a pad
- **THEN** it returns nothing, having examined no more than the solver cap in positions

#### Scenario: Searching does not disturb the board

- **WHEN** the search runs on a state
- **THEN** that state renders identically afterwards

### Requirement: Generating a board from a seed

The core SHALL provide a generator that, given a seed, returns level text in the format
§3 defines, which parsing accepts unchanged.

The generator MUST be deterministic: the same seed MUST always produce the same text. It
MUST NOT consult any source of randomness other than the seed it was given.

#### Scenario: A seed determines a board

- **WHEN** the generator is called twice with the same seed
- **THEN** both calls return exactly the same level text

#### Scenario: Different seeds give different boards

- **WHEN** the generator is called with a range of different seeds
- **THEN** the boards it returns are not all identical

#### Scenario: Generated text is a valid level

- **WHEN** the generator returns a board
- **THEN** parsing it succeeds and rendering the result reproduces that text exactly

### Requirement: Every generated board is solvable

A board MUST NOT be returned to the player unless the search has already found a solution
for it. Solvability is established by evidence, never by the construction being believed
correct.

#### Scenario: Solvable by evidence

- **WHEN** the generator returns a board for any seed
- **THEN** the search finds a solution for that board

### Requirement: Every generated board is worth playing

A generated board MUST hold exactly three crates and three pads and one bot, on the outer
wall ring with no interior walls. No crate MAY start on a pad, since a board that begins
partly solved is a board that was partly not generated.

Its shortest solution MUST be at least the difficulty floor. A board below the floor MUST
be discarded and another generated.

#### Scenario: Board composition

- **WHEN** the generator returns a board
- **THEN** it holds three crates, three pads and one bot, and no crate stands on a pad

#### Scenario: Not trivially easy

- **WHEN** the generator returns a board
- **THEN** its shortest solution is at least the difficulty floor

### Requirement: Generation terminates

The generator MUST give up after the candidate cap rather than searching indefinitely for
an acceptable board. Giving up MUST be reported to the caller, which keeps whatever board
it already had; it MUST NOT be reported as success, and it MUST NOT return a board that
failed the acceptance rules.

#### Scenario: Giving up rather than looping

- **WHEN** the generator has rejected the candidate cap in candidates
- **THEN** it returns nothing, having consumed a bounded amount of work

#### Scenario: Giving up never yields a bad board

- **WHEN** the generator gives up
- **THEN** it has returned no board at all, rather than the best of the rejects
