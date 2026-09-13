# movement-and-pushing Specification

## Purpose

Let players move Dock Bot and push individual cargo crates with deterministic, testable rules and immediate keyboard-driven visual feedback.

## Requirements

### Requirement: Pure directional step

`step(state, dir)` SHALL accept `up`, `down`, `left`, and `right`, return a new state, and leave its input unchanged. Movement SHALL be one orthogonal cell per successful step, with facing set to the requested direction and the move count incremented by exactly one. Empty floor and pads SHALL both be walkable; terrain SHALL remain unchanged. The function SHALL run through the guarded CommonJS export without browser globals.

#### Scenario: Moving onto floor
- **GIVEN** the freshly parsed hand-authored level
- **WHEN** `step(state, 'up')` is called
- **THEN** the returned bot is at `(1,2)` facing up with move count 1
- **AND** all crates and terrain retain their positions and values
- **AND** the input remains at `(1,3)` facing right with move count 0

#### Scenario: All four directions
- **GIVEN** the bot is at `(4,3)` with its four neighboring cells free of crates and walls
- **WHEN** each direction is applied independently to that state
- **THEN** up yields `(4,2)`, down `(4,4)`, left `(3,3)`, and right `(5,3)`
- **AND** each result faces its direction and adds exactly one move

#### Scenario: Walking across a pad
- **GIVEN** the bot is at `(2,3)` and `(3,3)` is an empty pad
- **WHEN** the bot steps right and then right again
- **THEN** text rendering first shows `b` at `(3,3)` and then `P` there as the bot reaches `(4,3)`
- **AND** the two successful steps add two moves without changing terrain

### Requirement: Blocked movement turns without counting

A wall or out-of-bounds destination SHALL block movement. A blocked attempt SHALL preserve positions and move count while setting facing to the requested direction.

#### Scenario: Blocked by a wall
- **GIVEN** the freshly parsed level
- **WHEN** the bot attempts to step left into the wall at `(0,3)`
- **THEN** the bot stays at `(1,3)` facing left with move count 0

#### Scenario: Board bounds are exclusive
- **GIVEN** a constructed state with the bot at a board edge and no enclosing wall at that cell
- **WHEN** it attempts to step outside `0 ≤ col < width` or `0 ≤ row < height`
- **THEN** it stays in place, faces the attempted direction, and does not increment the counter or throw an indexing error

### Requirement: Push one crate into a free cell

A step toward a crate SHALL push that crate exactly one cell only when the cell beyond is in bounds, walkable, and unoccupied. The bot SHALL enter the crate's former cell and the move count SHALL increase by one total. Crates SHALL neither be pulled nor pushed as a chain. Pad occupancy SHALL follow crate positions without changing terrain.

#### Scenario: Pushing onto floor
- **GIVEN** the hand-authored level after one upward step, with bot `(1,2)` and crate `(2,2)`
- **WHEN** the bot steps right
- **THEN** the bot is at `(2,2)`, the pushed crate at `(3,2)`, and the move count is 2
- **AND** the other crates are unchanged

#### Scenario: Pushing off a pad
- **GIVEN** a bot at `(3,2)`, a crate at `(3,3)` on its pad, and free floor at `(3,4)`
- **WHEN** the bot steps down
- **THEN** the crate moves to `(3,4)` and renders as `C`, and the bot renders as `b` on the preserved pad at `(3,3)`
- **AND** the counter increases by one

#### Scenario: Pushing onto a pad
- **GIVEN** a separate state with bot `(3,3)`, crate `(3,2)`, and empty pad `(3,1)`
- **WHEN** the bot steps up
- **THEN** the crate occupies `(3,1)`, renders as `X`, and draws with the existing docked-crate frame
- **AND** that pad is occupied and the counter increases by one

#### Scenario: A wall blocks a push
- **GIVEN** a bot at `(2,1)` and crate at `(1,1)` with wall `(0,1)` beyond
- **WHEN** the bot steps left
- **THEN** neither bot nor crates change position, the counter stays unchanged, and the bot faces left

#### Scenario: Another crate blocks a push
- **GIVEN** a bot at `(1,2)` and crates at `(2,2)` and `(3,2)`
- **WHEN** the bot steps right
- **THEN** neither crate nor bot moves, the counter stays unchanged, and the bot faces right

#### Scenario: Board bounds block a push
- **GIVEN** a constructed state with a crate at the board edge and a bot immediately behind it
- **WHEN** the bot attempts to push the crate out of bounds
- **THEN** both remain in place, facing updates, and the counter stays unchanged

#### Scenario: Transition inputs remain intact
- **WHEN** walking, successful pushes, and blocked attempts are applied to deeply frozen input states under Node
- **THEN** each returns a new state without modifying or throwing due to writes to the input
- **AND** identical inputs and directions produce equal results

### Requirement: One action per arrow press

After the initial atlas-ready draw, arrow keydown events SHALL invoke the corresponding directional step. Auto-repeat keydown events SHALL not move, turn, count, or redraw. Handled arrow events SHALL prevent default page scrolling, including repeats. Keys other than arrows SHALL leave game state and rendering unchanged in P3 and retain browser-default behavior. Input before atlas readiness SHALL not change the initial board or trigger drawing.

#### Scenario: Holding and releasing a key
- **WHEN** ArrowUp is pressed from the initial board and held through repeated keydown events
- **THEN** the bot moves only to `(1,2)` with counter 1
- **WHEN** ArrowUp is released and pressed again
- **THEN** it moves to `(1,1)` with counter 2
- **AND** the arrow events do not scroll the page

#### Scenario: Unhandled keys
- **WHEN** a non-arrow key such as A, R, or N is pressed in P3
- **THEN** game state and draw count are unchanged and the game does not cancel the event

#### Scenario: Input during image loading
- **WHEN** an arrow key is pressed before the atlas is ready
- **THEN** no transition or redraw occurs
- **AND** successful image loading still presents the original board with `Moves: 0`

### Requirement: Redraw only for changed state values

After each accepted arrow press, the shell SHALL redraw exactly once if position, facing, or move count changes, using the existing terrain/entity compositing and HUD. No redraw SHALL occur for an attempt whose resulting values are unchanged. The game SHALL use no animation loop or timer to process movement.

#### Scenario: A blocked turn is visible
- **WHEN** ArrowLeft is pressed from the initial right-facing state
- **THEN** the bot is redrawn facing left and the HUD remains `Moves: 0`
- **WHEN** ArrowLeft is released and pressed again
- **THEN** the unchanged blocked state is not redrawn

#### Scenario: Successful push updates the board and HUD
- **WHEN** ArrowUp then ArrowRight are pressed from the initial board
- **THEN** each action causes one redraw and the HUD reads `Moves: 2`
- **AND** the bot and pushed crate are drawn at `(2,2)` and `(3,2)` respectively
