## Purpose

Display Dock Bot's hand-authored board as crisp, correctly layered pixel art when the game is opened directly from the local filesystem.

## ADDED Requirements

### Requirement: Filesystem boot

The game SHALL open from `index.html` over `file://` without a server, build step, installed dependencies, or remote resources. It SHALL use the existing level parser and supplied atlas, display the initial board after the atlas is loaded, and declare UTF-8 document encoding.

#### Scenario: Opening the static game
- **GIVEN** the game files and supplied atlas are present
- **WHEN** the player opens `index.html` directly in a desktop browser
- **THEN** the 8×6 hand-authored level is visible on a 384×288 canvas
- **AND** the bot is at `(1,3)` facing right, crates at `(2,2)`, `(4,2)`, `(3,4)`, and pads at `(3,1)`, `(3,3)`, `(5,4)`
- **AND** a DOM HUD below the canvas reads `Moves: 0`
- **AND** there are no console errors, remote network requests, or runtime data requests; page resources are limited to the local HTML, stylesheet, script, and atlas

#### Scenario: Atlas load timing
- **WHEN** the atlas finishes loading, whether on the initial open or a subsequent reload
- **THEN** the complete static board is drawn once without requiring user input
- **AND** no image drawing occurs before the atlas is ready

### Requirement: Crisp fixed-size pixels

The canvas SHALL have intrinsic dimensions of 384×288 and no conflicting CSS size. Each 16×16 atlas frame SHALL occupy a 48×48 destination cell at `(col*48, row*48)`. Canvas image smoothing SHALL be disabled and the canvas element SHALL use pixelated image rendering.

#### Scenario: Inspecting scaled art
- **WHEN** the board is viewed at default zoom and at increased page zoom on a high-density display
- **THEN** sprite edges remain crisp and unsmoothed through both scaling stages
- **AND** the eight columns and six rows fit the intrinsic canvas without clipping

### Requirement: Terrain and entity compositing

Drawing SHALL clear the full canvas, draw all terrain cells, draw crates over their terrain, then draw the bot last. Frames SHALL match the supplied atlas inventory in `Dock Bot.md` §2. A crate on a pad SHALL use `crate_docked`, and the bot SHALL use its facing-specific frame. Drawing SHALL leave the supplied board state unchanged.

#### Scenario: Drawing the initial level
- **WHEN** the initial state is drawn
- **THEN** walls, floors, and empty pads use their respective terrain frames
- **AND** all three crates use the ordinary crate frame over floor
- **AND** the bot uses the right-facing frame over its floor tile

#### Scenario: Drawing constructed pad occupancy and facing
- **GIVEN** a constructed state with a crate on a pad and a bot facing any of the four directions
- **WHEN** the state is drawn
- **THEN** the pad remains beneath the docked-crate frame, without a doubled backdrop
- **AND** the bot uses the corresponding direction frame and preserves the terrain visible around its transparent edges
- **AND** the state is unchanged

### Requirement: Static shell preserves headless operation

The browser shell SHALL leave the P1 core callable through CommonJS without browser globals. P2 SHALL draw once on successful atlas load with no animation loop or polling, and SHALL not register gameplay key handlers.

#### Scenario: Running core tests after adding the shell
- **WHEN** `test.js` requires `game.js` under Node without `window` or `document`
- **THEN** parsing and text-rendering tests continue to pass without browser initialization

#### Scenario: Idle static board
- **WHEN** the loaded P2 page is left idle or arrow, R, or N keys are pressed
- **THEN** the board and move count do not change
- **AND** the game does not schedule redraws
