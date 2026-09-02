# Dock Bot — Game Design Document and Feature Specification

## How to read this document

This document is a product overview followed by art/asset requirements, hard technical constraints, exact game constants, and functional requirements as BDD (behavior-driven development) scenarios in Gherkin format. The Gherkin features are the required game. The final "Optional features" section is parked: **do not implement anything in it unless it is specifically requested.** There is no reference implementation; where this spec adopts a genre convention, the "Reference notes" section says so.

## 1. High level

A small delivery robot pushes cargo crates onto glowing dock pads in a one-screen warehouse. Every crate on a pad solves the level. Nothing moves unless the player moves: no clock, no enemies, no lives. The only pressure is the move counter.

- **Platform:** desktop web browser, opened from the local filesystem
- **Engine / stack:** plain JavaScript and HTML canvas, zero dependencies, no build step
- **Genre:** turn-based grid puzzle (crate-pushing)
- **Scope:** one hand-authored level, a few minutes per session, restart at will

## 2. Visuals and art direction

16×16 pixel art, flat shading, cool palette (steel greys, teal pads, amber crates), drawn at ×3 with image smoothing off.

### Asset inventory

Nine 16×16 frames in one 64×64 PNG atlas, `assets/dock_bot.png`, on a 4×4 grid of cells. Cell (c, r) is the source rectangle `x = c*16, y = r*16, w = 16, h = 16`, hard-coded in the game.

| Cell (col,row) | Asset | Status | Role |
|---|---|---|---|
| (0,0) | `bot_up` | PROVIDED | bot facing up |
| (1,0) | `bot_down` | PROVIDED | bot facing down |
| (2,0) | `bot_left` | PROVIDED | bot facing left |
| (3,0) | `bot_right` | PROVIDED | bot facing right |
| (0,1) | `crate` | PROVIDED | crate on floor |
| (1,1) | `crate_docked` | PROVIDED | crate seated on a pad, glowing edge |
| (2,1) | `floor` | PROVIDED | walkable floor |
| (3,1) | `wall` | PROVIDED | solid wall |
| (0,2) | `pad` | PROVIDED | empty dock pad |

### Frame compositing contract

The nine frames are not interchangeable tiles. §6's draw order paints a cell's base tile
and then composites entities over it, which splits the inventory in two:

| Kind | Frames | Requirement |
|---|---|---|
| Terrain | `floor`, `wall`, `pad` | fully opaque across all 256 pixels; drawn as a cell's base layer |
| Entity | the four `bot_*` frames, `crate`, `crate_docked` | transparent background; drawn over a terrain tile |

`crate_docked` draws **on top of** the `pad` tile, so it carries no pad backdrop of its
own. A docked-crate frame that included one would show a doubled pad edge in every filled
cell.

The seven cells the inventory does not name — (1,2), (2,2), (3,2), (0,3), (1,3), (2,3),
(3,3) — are fully transparent, so a source rectangle aimed at an unused cell draws nothing
rather than stray pixels.

Every pixel in the atlas is either fully opaque or fully transparent; nothing uses partial
alpha. The atlas is magnified ×3 with smoothing off, which turns a feathered edge into a
hard, discoloured step rather than a soft one.

**The four bot frames share one chassis.** Only the visor moves, to the facing edge. They
are meant to read as one robot facing four ways, not as four robots.

**Palette (informative).** The supplied atlas uses twelve flat colours. Nothing in the
game references them — they are recorded here so page and HUD styling can be tuned to the
art rather than guessed at.

| Role | Colours |
|---|---|
| Structure | `#0d1117` outline · `#16202b` dark steel · `#22303f` mid steel · `#3a4f63` steel · `#56718a` steel highlight |
| Pads | `#0d4a4e` teal dark · `#14939b` teal · `#35e0e6` glow teal |
| Crates | `#6e4211` amber shade · `#b0741c` amber · `#e8a838` amber highlight |
| Bot | `#a8f0ff` visor cyan |

## 3. Game constants

| Constant | Value | Notes |
|---|---|---|
| Tile / board | 16 px · 8 columns × 6 rows | column 0 left, row 0 top |
| Scale / canvas | ×3 · 384 × 288 px | the HUD is a DOM element below the canvas |
| Bot spawn | column 1, row 3, facing right | the `B` in the level map |
| Move keys | ArrowUp, ArrowDown, ArrowLeft, ArrowRight | one cell per press; no repeat while held |
| Restart key | R | any state |
| Move counter | starts at 0, +1 per successful move | a push is one move; a blocked press is zero |
| Optimal solution | 15 moves: `UURDLDRDRRUURUL` | used by the scripted playtest |

**Level map.** The one level is this text, exactly, top row first. The game parses it at boot.

```
########
#..P...#
#.C.C..#
#B.P...#
#..C.P.#
########
```

`#` wall · `.` floor · `P` empty pad · `C` crate on floor · `B` bot on floor. `renderText` output adds `X` crate on a pad and `b` bot on a pad.

## 4. Technical constraints

1. **Stack:** HTML5 canvas 2D and the DOM only. No framework, library, CDN, transpiler, or package manager. Node 20+ for tests.
2. **Files:** exactly `index.html`, `style.css`, `game.js`, `test.js`, and `assets/dock_bot.png`. No `<script type="module">` and no runtime `fetch`; both are blocked over `file://`. The atlas loads through an `<img>` element.
3. **Architecture:** `game.js` is a pure core plus a thin browser shell. Core: `parseLevel(text)`, `step(state, dir)`, `isSolved(state)`, `renderText(state)`, `playMoves(state, moves)`; none touch the DOM, and `step` returns a new state without mutating its input. Shell: canvas, key listener, HUD element, `draw(state)`.
4. **No animation loop.** No `requestAnimationFrame`. The shell draws once after the atlas loads and once after every key event that changes state.
5. **Coordinates:** cells are `(col, row)` integers, origin top-left, exclusive upper bounds (`0 ≤ col < 8`, `0 ≤ row < 6`). Screen position is `col*16*3, row*16*3`.
6. **Randomness:** none. Level text plus key sequence fully determines the state.

## 5. Diagnostics and playtest tooling

Trimmed for a turn-based game:

- **Pause:** not applicable; nothing advances without input.
- **Screenshot:** not required. Canvas pixel readback is blocked in Chrome when the atlas came from `file://`, which is how students run the game. `renderText(state)` is the substitute: an exact ASCII picture of the board that tests compare byte-for-byte and bug reports paste as text.
- **Scripted playtest:** `test.js` drives the core with move strings through `playMoves` (`U`, `D`, `L`, `R` are the four arrows) and asserts on `renderText` and `isSolved`.

## 6. Feature specification — BDD

### Feature: Zero-dependency boot

```gherkin
Scenario: Opening the game from the filesystem
  Given index.html, style.css, game.js, and assets/dock_bot.png are in place
  When the player opens index.html directly in a browser with no server
  Then a 384×288 canvas shows the level with crisp, unsmoothed pixels
  And the HUD below the canvas reads "Moves: 0"
  And there are no console errors and no network request other than the atlas

Scenario: Importing the core outside a browser
  Given game.js exposes the five core functions through a guarded module.exports block
  When test.js requires game.js under Node
  Then every core function runs without a canvas, window, or document
  And loading game.js in the browser is unaffected by the exports block
```

### Feature: Level parsing

```gherkin
Scenario: Parsing the level map
  Given the level text from §3
  When parseLevel is called with it
  Then the bot is at (1,3) facing right
  And crates are at (2,2), (4,2), and (3,4), and pads at (3,1), (3,3), and (5,4)
  And the move counter is 0, the level is not solved, and renderText returns the level text exactly
```

### Feature: Movement

```gherkin
Scenario: Moving onto floor
  Given the bot is at (1,3) facing right and (1,2) is floor
  When the player presses ArrowUp
  Then the bot is at (1,2) facing up and the move counter reads 1

Scenario: Blocked by a wall
  Given the bot is at (1,3) and (0,3) is a wall
  When the player presses ArrowLeft
  Then the bot stays at (1,3) and the move counter does not change
  And the bot now faces left

Scenario: Other keys do nothing
  Given the game is in any state
  When the player presses any key other than the four arrows or R
  Then the state is unchanged and nothing is redrawn
```

### Feature: Pushing crates

```gherkin
Scenario: Pushing a crate onto floor
  Given the bot is at (1,2), a crate is at (2,2), and (3,2) is floor
  When the player presses ArrowRight
  Then the crate is at (3,2), the bot is at (2,2), and the move counter increments by exactly 1

Scenario: Pushing a crate onto a pad
  Given a crate is directly between the bot and an empty pad
  When the player presses the arrow toward the crate
  Then the crate sits on the pad, draws with the crate_docked frame, and counts as filled

Scenario: Push blocked
  Given a crate is directly ahead of the bot and the cell beyond it is a wall or another crate
  When the player presses the arrow toward the crate
  Then neither the bot nor any crate moves and the move counter does not change
  And the bot faces the pressed direction
```

### Feature: Solving and restarting

```gherkin
Scenario: Level solved
  Given exactly one pad is still empty and a crate is one push from it
  When the player completes that push
  Then isSolved returns true and every crate draws with the crate_docked frame
  And the HUD reads "Solved in N moves — press R", where N is the move counter
  And arrow keys no longer change the state, including facing and the counter

Scenario: Restarting
  Given the game is in any state, solved or not
  When the player presses R
  Then the state equals a fresh parseLevel of the level text and the HUD reads "Moves: 0"
```

### Feature: Rendering

```gherkin
Scenario: Draw order
  Given a state to draw
  When draw runs
  Then it clears the whole canvas, then draws every cell's base tile (wall, floor, or pad)
  And then draws each crate over its cell, using crate_docked when that cell is a pad
  And then draws the bot last, using the frame for its facing
  And updates the HUD text from the move counter and solved flag
```

### Feature: Scripted playtest

```gherkin
Scenario: Replaying a move string
  Given a freshly parsed state
  When playMoves is called with "UURDLDRDRRUURUL"
  Then isSolved returns true and the move counter is 15
  And renderText shows X at (3,1), (3,3), and (5,4) and no C anywhere

Scenario: Blocked moves inside a script
  Given a freshly parsed state
  When playMoves is called with "LLL"
  Then the bot is still at (1,3), facing left, with the move counter at 0
```

## 7. Build, test, and verify

```
open index.html      # or double-click it; no server
node --test test.js
```

`test.js` uses only `node:test` and `node:assert` and covers every §6 scenario that names a core function. **Done means:** tests green, the 15-move script solves the level, and this checklist passes from `file://`: no console errors, crisp pixels, one cell per arrow press with no key repeat, a docked crate glows, solving freezes the arrows and shows the solved HUD, R restarts from any state with the counter at 0.

## 8. Reference notes

No reference implementation. Classic Sokoban conventions apply, stated so nobody has to guess: one crate per push (a crate behind a crate blocks); no pulling; a step and a push each cost one move; a blocked press costs nothing but still turns the bot, the only visible sign the key registered.

## 9. Roadmap (phased delivery)

| Phase | Delivers | Verified by |
|---|---|---|
| P1 | `parseLevel`, `renderText`, `test.js` with the parsing scenario | tests green, no browser yet |
| P2 | `index.html`, `style.css`, atlas, `draw` of the static level, HUD | level visible from `file://`, crisp pixels |
| P3 | `step` with movement and push rules, key listener, redraw on change | movement and push scenarios green |
| P4 | solved state, restart, `playMoves`, the 15-move solution | all §6 scenarios; full checklist |

## Optional features (parked)

- **Undo:** U reverts the last successful move, crate included, and decrements the counter; R clears the stack.
- **Second level:** another map in the same text format; keys 1 and 2 switch level and restart.
- **Slide animation:** bot and crate interpolate between cells over 100 ms. The first feature that would need an animation loop, which is why it is parked.
- **Best score:** lowest solving move count kept in `localStorage`, shown in the HUD.
- **Sound:** Web Audio API blip per move, low tone on a blocked press, chord on solve.
