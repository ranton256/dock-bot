# Dock Bot — Game Design Document and Feature Specification

## How to read this document

This document is a product overview followed by art/asset requirements, hard technical constraints, exact game constants, and functional requirements as BDD (behavior-driven development) scenarios in Gherkin format. The Gherkin features are the required game. The final "Optional features" section is parked: **do not implement anything in it unless it is specifically requested.** There is no reference implementation; where this spec adopts a genre convention, the "Reference notes" section says so.

## 1. High level

A small delivery robot pushes cargo crates onto glowing dock pads in a one-screen warehouse. Every crate on a pad solves the level. Nothing moves unless the player moves: no clock, no enemies, no lives. The only pressure is the move counter.

- **Platform:** desktop web browser, opened from the local filesystem
- **Engine / stack:** plain JavaScript and HTML canvas, zero dependencies, no build step
- **Genre:** turn-based grid puzzle (crate-pushing)
- **Scope:** one hand-authored level to learn on, then generated boards for as long as you want them; a few minutes per session, restart at will

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
| Board line | a second DOM element below the HUD | `Par 15` on the hand-authored level, `Seed <s> · Par <p>` on a generated one |
| Key legend | static text below the board line | `Arrows move · R restart · N new board`; nothing else on the page tells a player that N exists |
| Bot spawn | column 1, row 3, facing right | the `B` in the level map |
| Move keys | ArrowUp, ArrowDown, ArrowLeft, ArrowRight | one cell per press; no repeat while held |
| Restart key | R | any state; restores the *current* board, generated or not; ignore presses carrying Ctrl, Cmd or Alt, so Cmd+R still reloads |
| New board key | N | any state; takes a fresh seed and generates a board |
| Generated board | 3 crates, 3 pads, bot | the outer wall ring only, no interior walls |
| Difficulty floor | shortest solution ≥ 12 moves | a board below it is rejected and another generated |
| Candidate cap | 60 boards per press | give up rather than loop forever; about eight are needed in practice, so this is ample headroom, and it bounds a failed press near 0.7 s where 200 would allow 2.3 s |
| Solver cap | 200 000 states | past that, treat the board as unsolvable |
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

Canonical form is six lines joined by a single newline, with no leading or trailing
newline. `renderText` emits exactly that. This matters less where you compare its
output against the level constant — there the convention cancels out — than in the
first expected board you type by hand, which picks up a leading newline from a
template literal and fails against output that never had one.

## 4. Technical constraints

1. **Stack:** HTML5 canvas 2D and the DOM only. No framework, library, CDN, transpiler, or package manager. Node 20+ for tests. Do not add a `package.json` either: its absence is what keeps `.js` resolving as CommonJS, and therefore what lets `test.js` call `require('./game.js')`. Running `npm init` will break the test suite in a way that looks nothing like its cause.
2. **Files:** exactly `index.html`, `style.css`, `game.js`, `test.js`, and `assets/dock_bot.png`. No `<script type="module">` and no runtime `fetch`; both are blocked over `file://`. The atlas loads through an `<img>` element.
3. **Architecture:** `game.js` is a pure core plus a thin browser shell. Core: `parseLevel(text)`, `step(state, dir)`, `isSolved(state)`, `renderText(state)`, `playMoves(state, moves)`, `generateLevel(seed)`, `solve(state)`; none touch the DOM, and `step` returns a new state without mutating its input. Shell: canvas, key listener, HUD elements, `draw(state)`.
   `generateLevel` returns the board it made: the **level text** in the §3 format, which `parseLevel` already consumes, together with the **seed** and the board's **par**. It cannot usefully return the text alone — par comes out of the search that accepted the board, and discarding it means searching the same board a second time to put par on screen. Generation therefore joins the existing pipeline at one seam and changes nothing downstream of it.
   It also accepts optional overrides for the difficulty floor and the candidate cap. These exist solely so that the giving-up path below can be reached from a test: with the real floor a board is accepted after about eight candidates, so the cap never binds and that path is otherwise unreachable. Nothing in the game passes them.
4. **No animation loop.** No `requestAnimationFrame`. The shell draws once after the atlas loads and once after every key event that changes state.
5. **Coordinates:** cells are `(col, row)` integers, origin top-left, exclusive upper bounds (`0 ≤ col < 8`, `0 ≤ row < 6`). Screen position is `col*16*3, row*16*3`.
6. **Randomness:** seeded only. A **seed plus a key sequence** fully determines everything — the board and the play on it. Where the seed itself comes from is unconstrained (a clock is fine), but once chosen nothing may consult an unseeded source again. The point is unchanged from having no randomness at all: any position must be reproducible from a short description, which is what keeps the game testable and a bug report actionable.
7. **Two scaling stages, not one.** Disabling image smoothing on the 2D context governs how the atlas is magnified *into* the canvas. It says nothing about how the browser then scales the canvas *element*: under page zoom, or on a high-density display, the compositor resamples the finished canvas with its own smoothing and the art goes soft while the JavaScript still looks correct. Give the canvas its intrinsic 384×288 through the `width` and `height` attributes, never a conflicting CSS size, and set `image-rendering: pixelated` on the element. Check this on a high-density display; it looks right on an ordinary one either way.
8. **Generation is verified, not trusted.** No board reaches the player without `solve` finding a solution for it first. A generator *believed* to produce solvable boards is not enough; the only acceptable evidence is a solution in hand. `solve` returns a shortest solution or nothing, and its search is bounded by the solver cap so that a pathological board cannot hang the page.
9. **Encoding:** declare `<meta charset="utf-8">`. The solved message contains an em dash, and a script loaded over `file://` inherits the document's encoding — without a declaration a browser may fall back to a locale default and render mojibake for some users and not others. Writing the character as a `\u2014` escape makes the string survive a source file saved in the wrong encoding as well.

## 5. Diagnostics and playtest tooling

Trimmed for a turn-based game:

- **Pause:** not applicable; nothing advances without input.
- **Screenshot:** not required. Canvas pixel readback is blocked in Chrome when the atlas came from `file://`, which is how students run the game. `renderText(state)` is the substitute: an exact ASCII picture of the board that tests compare byte-for-byte and bug reports paste as text.
- **Seeds:** a generated board is described completely by its seed, so "seed 48213, then `UURDLD`" reproduces any position exactly. This is strictly better than the fixed level allowed, where a report could only ever concern the one board. Show the seed; a bug you cannot reproduce is a bug you cannot fix.
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
  And step enforces this, not the key listener, so a scripted replay is frozen too

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
  And updates the board line from the current board's seed and par
```

### Feature: Generated boards

```gherkin
Scenario: A seed determines a board
  Given any seed
  When generateLevel is called with that seed twice
  Then both calls return exactly the same level text and the same par
  And parseLevel accepts that text

Scenario: Every generated board is solvable
  Given any seed
  When generateLevel returns a board
  Then solve returns a move string for it
  And playMoves with that string leaves isSolved true

Scenario: Every generated board is worth playing
  Given any seed
  When generateLevel returns a board
  Then it holds three crates and three pads, and no crate starts on a pad
  And its shortest solution is at least the difficulty floor

Scenario: Solving finds the shortest solution, not merely a solution
  Given a freshly parsed hand-authored level
  When solve is called
  Then it returns a 15-move string, matching the optimal solution in §3

Scenario: Solving gives up on an unsolvable board
  Given a board with a crate in a corner and no pad in that corner
  When solve is called
  Then it returns nothing, without exceeding the solver cap

Scenario: Generation terminates
  Given a difficulty floor no board can meet, which is how a test reaches this path
  When generateLevel has tried the candidate cap without success
  Then it returns nothing rather than looping, and rather than the best of the rejects
  And the game keeps the board it already had

Scenario: Asking for a new board
  Given the game is in any state, solved or not
  When the player presses N
  Then a generated board is drawn, the HUD reads "Moves: 0"
  And the board line shows that board's seed and par

Scenario: Restarting a generated board keeps it
  Given the player is partway through a generated board
  When the player presses R
  Then the same board returns with the move counter at 0
  And the seed on the board line is unchanged
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

Scenario: A replay cannot count past the solve
  Given a freshly parsed state
  When playMoves is called with "UURDLDRDRRUURUL" followed by any further moves
  Then isSolved returns true and the move counter is still 15
  And the board is unchanged by those further moves
```

## 7. Build, test, and verify

```
open index.html      # or double-click it; no server
node --test test.js
```

`test.js` uses only `node:test` and `node:assert` and covers every §6 scenario that names a core function.

**Keep it fast.** This is the file you run after every change, and a suite that takes fifteen seconds stops being run. The generated-board scenarios are what threaten that: each wants a board, and making one costs tens of milliseconds because the search runs over every candidate. Written the obvious way — generating inside each assertion, across a few dozen seeds — the suite goes from well under a second to roughly fifteen. Generate a small sample of boards once, and have the assertions share it. A dozen seeds prove as much as forty, and the suite stays about a second. **Done means:** tests green, the 15-move script solves the level, and this checklist passes from `file://`: no console errors, crisp pixels (checked on a high-density display, where the second scaling stage bites), one cell per arrow press with no key repeat, a docked crate glows, solving freezes the arrows and shows the solved HUD, R restarts from any state with the counter at 0, N produces a fresh board that is solvable and no easier than the floor, and R on a generated board brings back that same board rather than another one.

## 8. Reference notes

**Generating boards.** Two approaches are standard, and the obvious one is the wrong one
here. *Reverse generation* starts from a solved board and pulls crates backwards; every
position it reaches is solvable by construction, so it appears to remove the need for a
solver entirely. Measured on this board, it produces boards whose shortest solution is
typically about six moves, against fifteen for the hand-authored level, because a random
walk drifts back towards the state it started from. Recovering difficulty means solving
the candidates and keeping the hard ones — so the solver comes back, and with it the pull
logic you took on to avoid it.

*Generate and verify* is therefore what this specification asks for: place the crates,
pads and bot at random, solve, and reject anything unsolvable or below the floor. About
eight candidates are rejected per board kept, which sounds wasteful and costs well under
a tenth of a second, because an 8×6 board with three crates has only a few thousand
reachable states. Sokoban is PSPACE-complete in general; at this size that is irrelevant.

The outer wall ring and no interior walls is a deliberate simplification: it leaves every
interior cell mutually reachable, so a generated board can never strand the bot away from
a crate, and no connectivity check is needed.

No reference implementation. Classic Sokoban conventions apply, stated so nobody has to guess: one crate per push (a crate behind a crate blocks); no pulling; a step and a push each cost one move; a blocked press costs nothing but still turns the bot, the only visible sign the key registered.

## 9. Roadmap (phased delivery)

| Phase | Delivers | Verified by |
|---|---|---|
| P1 | `parseLevel`, `renderText`, `test.js` with the parsing scenario | tests green, no browser yet |
| P2 | `index.html`, `style.css`, atlas, `draw` of the static level, HUD | level visible from `file://`, crisp pixels |
| P3 | `step` with movement and push rules, key listener, redraw on change | movement and push scenarios green |
| P4 | solved state, restart, `playMoves`, the 15-move solution | all §6 scenarios for the hand-authored level |
| P5 | `solve`, then `generateLevel` on top of it, the N key, the board line | generated boards are solvable and no easier than the floor; full checklist |

## Optional features (parked)

- **Undo:** U reverts the last successful move, crate included, and decrements the counter; R clears the stack.
- **Entering a seed:** typing or pasting a seed to replay a specific board. Worth having for bug reports, but showing the seed is enough to file one.
- **Difficulty tiers:** easy, normal and hard varying the crate count and the difficulty floor.
- **Slide animation:** bot and crate interpolate between cells over 100 ms. The first feature that would need an animation loop, which is why it is parked.
- **Best score:** lowest solving move count kept in `localStorage`, shown in the HUD.
- **Sound:** Web Audio API blip per move, low tone on a blocked press, chord on solve.
