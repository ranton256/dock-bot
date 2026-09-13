## Purpose

Provide a headless representation of Dock Bot levels and exact ASCII diagnostics so later gameplay can be verified without a browser.

## ADDED Requirements

### Requirement: Parse the hand-authored level

`parseLevel(text)` SHALL interpret the canonical 8-column, 6-row level using `#` for wall, `.` for floor, `P` for a pad, `C` for a crate on floor, and `B` for the bot on floor. Coordinates SHALL be zero-based `(col, row)` with the origin at the top left. Terrain SHALL retain pad locations independently of occupants.

#### Scenario: Parsing the level map
- **GIVEN** the following exact level text, without a leading or trailing newline:
  ```text
  ########
  #..P...#
  #.C.C..#
  #B.P...#
  #..C.P.#
  ########
  ```
- **WHEN** `parseLevel` is called with that text
- **THEN** the board has 8 columns and 6 rows with the walls and floor specified by the map
- **AND** the bot is at `(1,3)` facing right
- **AND** crates are at `(2,2)`, `(4,2)`, and `(3,4)`
- **AND** pads are at `(3,1)`, `(3,3)`, and `(5,4)`
- **AND** the move counter is 0 and the level is not solved

### Requirement: Render canonical board text

`renderText(state)` SHALL return six rows of eight symbols joined by single newlines, with no leading or trailing newline. It SHALL render terrain as `#`, `.`, or `P`, crates as `C` on floor or `X` on pads, and the bot as `B` on floor or `b` on a pad. Rendering SHALL leave the supplied state unchanged.

#### Scenario: Fresh level round trip
- **WHEN** a freshly parsed hand-authored level is passed to `renderText`
- **THEN** the result equals the exact input level text byte-for-byte

#### Scenario: Occupants on pads
- **GIVEN** the hand-authored terrain with the crate formerly at `(2,2)` now at `(3,1)` and the bot at `(3,3)`
- **WHEN** that state is passed to `renderText`
- **THEN** the result is exactly the following text without a leading or trailing newline:
  ```text
  ########
  #..X...#
  #...C..#
  #..b...#
  #..C.P.#
  ########
  ```
- **AND** rendering does not alter the state or its underlying pads

### Requirement: Independent headless core

The P1 functions `parseLevel` and `renderText` SHALL be callable through `require('./game.js')` under Node 20+ without `window`, `document`, canvas, or third-party dependencies. Each parse SHALL return independent mutable state so changing one parsed board cannot affect a separately parsed board.

#### Scenario: Import without a browser
- **WHEN** a Node test requires `game.js` and calls both P1 functions
- **THEN** import and calls succeed without browser globals or setup

#### Scenario: Parsing creates independent boards
- **GIVEN** two states parsed separately from the hand-authored level
- **WHEN** the bot, crates, terrain, or move counter in one state is changed
- **THEN** the other state still describes the original level with its original counter and facing
