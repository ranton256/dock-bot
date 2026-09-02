## 1. Page and stylesheet

- [x] 1.1 Create `index.html` with a UTF-8 charset declaration, a canvas whose `width` and
      `height` attributes are 384 and 288, a heads-up display element below the canvas, and a
      plain script tag for `game.js`. Verify there is no `type="module"` anywhere and that
      opening the file from `file://` produces no console error.
- [x] 1.2 Create `style.css` covering page and display presentation only. Verify it sets no
      `width` or `height` on the canvas that would differ from its intrinsic size, and that
      the canvas carries a pixelated image-rendering hint.
- [x] 1.3 Verify the file list is exactly `index.html`, `style.css`, `game.js`, `test.js`,
      and `assets/dock_bot.png` — complete, with nothing added beyond it.

## 2. Shell seam

- [x] 2.1 Append the shell half to `game.js`, wrapped in a guard on `document` existing.
      Verify `node --test test.js` still passes, which it cannot if the guard is missing or
      wrong, since the shell would touch a browser global at import time.
- [x] 2.2 Verify the core half above the seam is unmodified by this milestone, by diffing it
      against the previous milestone's version.
- [x] 2.3 Verify the shell contains no rule logic: no cell arithmetic, no push legality
      check, no move counting, and no second copy of the post-solve freeze. Every state
      transition goes through the core.

## 3. Atlas loading and first draw

- [x] 3.1 Load the atlas through an `<img>` element and perform the first draw inside its
      load handler. Verify the board appears when the page is opened from `file://` with no
      server running.
- [x] 3.2 Attach the key listener inside the same load handler. Verify that a key pressed
      before the atlas resolves produces no blank or partially drawn board.
- [x] 3.3 Verify no request is made other than the atlas, using the browser's network panel,
      and that no fetch or module import appears anywhere in the sources.

## 4. Drawing

- [x] 4.1 Obtain the 2D context, disable image smoothing on it, and record the nine atlas
      frames as a table of `(column, row)` cells with source rectangles derived from them.
      Verify each of the nine frames draws the expected art by rendering all nine side by side
      once during development.
- [x] 4.2 Implement `draw(state)` in the specified order: clear the whole canvas, draw every
      cell's base tile, draw crates, draw the bot last, then update the display. Verify a cell
      at column `c`, row `r` lands at pixel `c*48, r*48` by comparing a drawn board against the
      core's textual rendering of the same state.
- [x] 4.3 Draw a crate with the docked frame when its cell is a pad and the plain frame
      otherwise. Verify on a board holding both that the two are distinguishable and that the
      pad remains visible around a docked crate rather than being covered or doubled.
- [x] 4.4 Select the bot frame from its facing. Verify all four facings by turning the bot
      against a wall in each direction and confirming the drawn frame changes each time.

## 5. Input

- [x] 5.1 Listen for key events on the window, mapping the four arrow keys to a step and
      suppressing their default scrolling. Verify one press yields exactly one move and that
      the page does not scroll under the board.
- [x] 5.2 Discard events whose repeat flag is set. Verify that holding an arrow key down
      produces exactly one move, not a stream of them.
- [x] 5.3 Bind `R` to re-parsing the level and redrawing unconditionally. Verify it restarts
      from a mid-game state and from a solved one, with the display returning to `Moves: 0`.
- [x] 5.4 Verify every other key is inert: press letters, digits, modifiers, space, and tab,
      and confirm the board does not change and no redraw occurs.
- [x] 5.5 Redraw only when the next state is not the same object as the current one. Verify a
      blocked press redraws the turned bot, and that an arrow press after solving redraws
      nothing at all.

## 6. Heads-up display

- [x] 6.1 Derive the display text from state on every draw, as text content rather than
      markup. Verify it reads `Moves: 0` at boot and tracks the counter as moves are made.
- [x] 6.2 Show `Solved in N moves — press R` once solved, with the em dash written as an
      escape in the source. Verify the message appears on the solving push with the correct
      count, and that the em dash renders correctly from `file://` rather than as substitute
      characters.

## 7. Checklist verification from `file://`

- [x] 7.1 Verify the game opens with no console errors and the display reads `Moves: 0`.
- [x] 7.2 Verify pixels are crisp at scale 3, checking on a high-density display or under
      browser zoom as well as at ordinary scale — the context smoothing flag alone does not
      cover the element being resampled by the compositor.
- [x] 7.3 Verify one cell of movement per arrow press, with no repeat while a key is held.
- [x] 7.4 Verify a crate seated on a pad glows and is obviously distinct from one on floor.
- [x] 7.5 Verify solving the level freezes the arrows — no movement, no counter change, no
      turning — and shows the solved message.
- [x] 7.6 Verify `R` restarts from any state with the counter back at 0.
- [x] 7.7 Play the canonical 15-move solution `UURDLDRDRRUURUL` by hand and verify the game
      solves with the display reading `Solved in 15 moves — press R`, matching what the core's
      replay test already asserts headlessly.
