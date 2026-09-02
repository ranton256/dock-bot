## Why

After the atlas and the rules engine land, Dock Bot still cannot be played. The pieces
that make it a game rather than a test suite — a canvas showing the board, arrow keys
bound to the rules, a HUD counting moves — are all the DOM-facing half that `Dock Bot.md`
§4.3 deliberately separates from the core.

This is also the only milestone whose acceptance is a human checklist rather than
`node --test`. §5 notes that canvas pixel readback is blocked in Chrome when the atlas
came from `file://`, which is exactly how the game is meant to be run, so nothing here can
assert on rendered pixels. Sequencing it last means that when a human does sit down with
the §7 checklist, every rule behind what they are looking at is already proven.

## What Changes

- Add `index.html`: a 384×288 canvas, a HUD element below it, and plain script tags — no
  `<script type="module">`, which is blocked over `file://`.
- Add `style.css` for page and HUD presentation, leaving the canvas at its intrinsic size
  so nothing rescales and blurs it.
- Extend `game.js` with the shell half against the seam the core milestone established:
  atlas loading through an `<img>` element, `draw(state)`, a key listener, and HUD updates.
- Bind the four arrow keys to the core's step and `R` to a restart, ignoring every other
  key and suppressing the auto-repeat that fires while a key is held.
- Draw once when the atlas finishes loading and once after any key event that changes
  state — no `requestAnimationFrame`, per §4.4.

This completes the five-file game surface in §4.2. Nothing in the spec's parked section is
built: no undo, no second level, no animation, no stored best score, no sound.

## Capabilities

### New Capabilities
- `browser-shell`: everything the game does outside the rules — booting from `file://`,
  translating key events into core operations, compositing state onto the canvas from the
  atlas, and keeping the HUD in step with the move counter and solved condition.

### Modified Capabilities

None. `core-rules` gains no requirement and changes no behavior; the shell calls it as
specified. `sprite-atlas` is consumed as specified, not altered.

## Impact

- **New files:** `index.html`, `style.css`. Together with `game.js`, `test.js` and
  `assets/dock_bot.png` this is exactly the §4.2 file list, complete and not exceeded.
- **Modified:** `game.js` gains its shell half. The core half added by the previous
  milestone is not edited.
- **Depends on:** both prior milestones. The atlas must exist for anything to draw, and the
  rules must exist for anything to draw *about*.
- **Completes:** the three §6 scenarios previously satisfied only in their core half —
  pushing onto a pad, level solved, and restarting — by supplying the `crate_docked` frame
  selection and the HUD text those scenarios also assert.
- **Risk:** acceptance rests on human verification from `file://`. The failure modes that a
  checklist misses — a wrong source rectangle, a smoothing flag set too early, an encoding
  slip in the HUD string — are called out in `design.md` so the review knows where to look.
