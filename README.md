# Dock Bot

A small delivery robot pushes cargo crates onto glowing dock pads in a one-screen
warehouse. Every crate on a pad solves the level. Nothing moves unless you move.

This repo is your starting point. It contains the specification, not the game —
you are going to write the game.

## Read this first

**[`Dock Bot.md`](./Dock%20Bot.md) is the spec, and it is the authority.** Read all of
it before you write a line. Where this README and the spec disagree, the spec wins.

Two things about it are easy to miss:

- **Section 6 is the requirement.** The Gherkin scenarios are not illustrations, they
  are the definition of "correct". Your tests should trace back to them.
- **The "Optional features" section at the end is parked.** Undo, sound, a second
  level, animation — do not build any of it unless you are specifically asked. Extra
  features are not extra credit here.

## The rules of the build

These are hard constraints, and most of them exist to keep the game runnable by
double-clicking a file:

1. **No dependencies.** Plain JavaScript, HTML canvas, and the DOM. No framework, no
   library, no CDN, no bundler, no package manager. There is no `package.json` and
   you should not add one.
2. **Exactly five files**, no more:
   ```
   index.html
   style.css
   game.js
   test.js
   assets/dock_bot.png
   ```
3. **It must run from `file://`.** No `<script type="module">`, no `fetch` — both are
   blocked when a page is opened straight off disk. The sprite atlas loads through an
   `<img>` element.
4. **`game.js` is a pure core plus a thin browser shell.** The core —
   `parseLevel`, `step`, `isSolved`, `renderText`, `playMoves` — never touches the
   DOM, and `step` returns a new state instead of modifying the one it was given.
   Everything that knows about a canvas or a keyboard lives in the shell.
5. **No animation loop.** No `requestAnimationFrame`. Draw once when the atlas
   loads, and once after any keypress that actually changes something.
6. **No randomness.** The level text plus your key presses fully determine the state.

## Running it

```
open index.html      # or just double-click it. No server, ever.
node --test test.js  # Node 20 or newer
```

`test.js` uses only `node:test` and `node:assert`. Nothing else is installed, so
nothing else is available.

## How you know you are done

Tests green, the 15-move solution in the spec solves the level, and this checklist
passes with the game opened from `file://`:

- no console errors
- crisp pixels, no blurring
- one cell of movement per arrow press, no repeat while a key is held
- a crate sitting on a pad glows
- solving the level freezes the arrows and shows the solved message
- `R` restarts from any state, with the move counter back at `0`

## A suggested order of attack

You do not have to work this way, but it front-loads everything a test can prove:

1. **The core first, with no browser at all.** `parseLevel`, `step`, `isSolved`,
   `renderText`, `playMoves`, plus `test.js` covering the Section 6 scenarios that
   name a core function. You can finish this entire step and verify it with
   `node --test` before `index.html` exists.
2. **Then the shell.** `index.html`, `style.css`, `draw`, the key listener, the HUD.
   This is the part only a human can check, so it is the part you want resting on
   logic you have already proven.

`renderText` is your debugging tool. Canvas screenshots do not work from `file://`,
so an exact ASCII picture of the board is how you inspect state, how tests assert on
it, and how you paste a bug into a message to someone else.

## Before you start

`assets/dock_bot.png` is provided: a single 64x64 atlas holding nine 16x16 frames.
Do not redraw or replace it — the frame layout is hard-coded against it. Section 2 of
the spec maps every cell and, just as importantly, says which frames are opaque terrain
and which are transparent-backed entities drawn over them. Read that before you write
`draw`.
