## Purpose

Defines everything Dock Bot does outside its rules: booting from a local file with no
server, turning key presses into rule operations, compositing board state onto a canvas
from the sprite atlas, and keeping the heads-up display in step with the move counter and
the solved condition.

## ADDED Requirements

### Requirement: Booting from the filesystem

The game SHALL run when its page is opened directly from disk, with no server and no
network access. It MUST NOT use module script tags or runtime fetching, both of which are
blocked under a `file://` origin; the sprite atlas MUST be loaded through an image
element.

The game MUST consist of exactly five files: the page, its stylesheet, the game script,
the test file, and the sprite atlas.

#### Scenario: Opening the page with no server

- **WHEN** the page is opened directly in a browser from the filesystem
- **THEN** the level is displayed, the heads-up display reads `Moves: 0`, and no error appears in the console

#### Scenario: No network activity beyond the atlas

- **WHEN** the page loads
- **THEN** the only resource request made is for the sprite atlas, and no fetch or module import is attempted

### Requirement: Canvas presentation

The board SHALL be drawn on a canvas of exactly 384 by 288 pixels, being 8 columns by 6
rows of 16-pixel tiles at a scale factor of 3. A cell at column `c`, row `r` MUST be drawn
at pixel position `c*48, r*48`.

Image smoothing MUST be disabled so that magnified pixel art stays crisp, and the canvas
MUST NOT be rescaled by styling, which would reintroduce blurring the disabled smoothing
was meant to prevent.

#### Scenario: Canvas dimensions

- **WHEN** the page has loaded
- **THEN** the canvas is 384 pixels wide and 288 pixels tall, and its displayed size equals its intrinsic size

#### Scenario: Pixels stay crisp

- **WHEN** the board is drawn at scale 3
- **THEN** tile edges are hard, with no blurring or interpolation between source pixels

### Requirement: Draw order

A draw SHALL composite the board in a fixed order: clear the entire canvas; draw every
cell's base tile, being wall, floor, or empty pad; draw each crate over its cell; then draw
the bot last. The heads-up display MUST be updated as part of the same draw.

A crate MUST be drawn with the docked frame when its cell is a pad and the plain crate
frame otherwise. The bot MUST be drawn with the frame matching its current facing.

#### Scenario: Compositing a cell

- **WHEN** a cell holding a crate on a pad is drawn
- **THEN** the pad tile is drawn first and the docked crate frame is drawn over it, with the pad still visible around the crate

#### Scenario: The bot draws above everything

- **WHEN** the bot occupies a pad
- **THEN** the pad is drawn, then the bot over it, and the bot is not obscured

#### Scenario: Facing selects the bot frame

- **WHEN** the bot's facing changes
- **THEN** the next draw uses the bot frame for that direction

### Requirement: Key handling

The four arrow keys SHALL each apply exactly one step in their direction per press, and
`R` SHALL restart the level from any state, solved or not. Every other key MUST leave the
game entirely unchanged and MUST NOT cause a redraw.

Holding a key down MUST NOT produce repeated moves: the automatic repeat a browser emits
while a key is held MUST be ignored, so that one press yields one move.

Arrow keys MUST NOT also scroll the page.

#### Scenario: One press, one move

- **WHEN** an arrow key is pressed once
- **THEN** the bot advances or turns exactly once

#### Scenario: Holding a key does not repeat

- **WHEN** an arrow key is held down
- **THEN** no further moves occur beyond the one caused by the initial press

#### Scenario: Unrelated keys are inert

- **WHEN** any key other than the four arrows or `R` is pressed
- **THEN** the state is unchanged and nothing is redrawn

#### Scenario: Restarting

- **WHEN** `R` is pressed in any state
- **THEN** the board returns to its starting layout and the heads-up display reads `Moves: 0`

### Requirement: Redrawing only on change

The game SHALL NOT run an animation loop. It MUST draw once when the atlas has finished
loading, and thereafter only after a key event that changes the state.

A blocked press changes the bot's facing and therefore MUST redraw, since the turn is the
only visible confirmation that the press registered. A press after the level is solved
changes nothing and MUST NOT redraw.

#### Scenario: No animation loop

- **WHEN** the game is running and no key is pressed
- **THEN** no drawing occurs and no frame callback is scheduled

#### Scenario: A blocked press still redraws

- **WHEN** a press is blocked by a wall or an immovable crate
- **THEN** the board is redrawn showing the bot turned to face that direction

#### Scenario: A press after solving redraws nothing

- **WHEN** an arrow key is pressed after the level is solved
- **THEN** nothing is redrawn and the display is unchanged

### Requirement: Drawing waits for the atlas

The game MUST NOT attempt to draw before the sprite atlas has finished loading. A key
pressed before the atlas is ready MUST NOT produce a partially drawn or empty board.

#### Scenario: First draw follows the atlas

- **WHEN** the atlas finishes loading
- **THEN** the board is drawn for the first time, complete

#### Scenario: Early input does not draw an incomplete board

- **WHEN** a key is pressed before the atlas has loaded
- **THEN** no incomplete or blank board is displayed

### Requirement: Heads-up display

A heads-up display SHALL sit below the canvas as a page element rather than being drawn on
the canvas. While the level is unsolved it MUST read `Moves: N`, where `N` is the current
move counter. Once solved it MUST read `Solved in N moves — press R`, where `N` is the
counter at the moment of solving.

Its text MUST be derived from the state on each draw, so it cannot disagree with the board.
Characters outside the basic Latin range MUST render correctly when the page is opened
from the filesystem.

#### Scenario: Move counter display

- **WHEN** the board is drawn while the level is unsolved
- **THEN** the display reads `Moves: N` for the current move counter

#### Scenario: Solved message

- **WHEN** the final crate is pushed onto the last empty pad
- **THEN** the display reads `Solved in N moves — press R` for the counter at that moment

#### Scenario: Text renders without mojibake

- **WHEN** the page is opened from the filesystem and the solved message is shown
- **THEN** the em dash renders as an em dash, not as substitute characters

### Requirement: The core stays free of the DOM

Adding the shell MUST NOT introduce any dependency on a browser into the rules. The core
operations MUST continue to run under a test runner with no window, document, or canvas
present, and the existing test suite MUST continue to pass unchanged.

#### Scenario: Core still runs headless

- **WHEN** the test suite is run after the shell has been added
- **THEN** every test passes and no core operation touches a browser global

### Requirement: Solved state is presented, not enforced, by the shell

The freeze that follows solving is a rule, already enforced when a step is applied. The
shell MUST NOT implement a second copy of it by ignoring keys once solved; it MUST apply
presses as usual and let the unchanged result speak for itself.

#### Scenario: The shell does not special-case a solved board

- **WHEN** an arrow key is pressed after solving
- **THEN** the press is applied through the normal path, the resulting state is unchanged, and the counter and facing do not move
