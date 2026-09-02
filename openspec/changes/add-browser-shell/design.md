## Context

See `proposal.md` — Why, and `specs/browser-shell/spec.md` for the behavior contract. What
shapes the approach:

- **The core is already proven and already pure.** This milestone adds no rules. It binds
  keys to operations that exist, draws state that is already correct, and formats two
  strings.
- **`game.js` now holds both halves.** The core milestone established the seam; the shell
  is appended below it and must not disturb what is above.
- **Nothing here can be asserted mechanically.** Canvas readback is blocked when the atlas
  came from `file://` (§5), so there is no pixel assertion to write. Acceptance is the §7
  checklist performed by a person.

## Goals / Non-Goals

**Goals:**

- Complete the §4.2 file list exactly, and make the game playable by double-clicking a file.
- Keep the shell thin enough that a reader can see it holds no rules — every decision below
  is about presentation, input, or lifecycle, never about what a move means.
- Name the failure modes a checklist tends to miss, so human review knows where to look.

**Non-Goals:**

- Any change to the rules. If something here seems to need a rule, that is a signal the
  core milestone missed a requirement, not licence to add one in the shell.
- Anything in the spec's parked section. Sound, undo, animation, a second level, and a
  stored best score are all excluded; the animation one is parked precisely because it
  would require the frame loop §4.4 forbids.
- Any automated visual test. The medium for inspecting a board remains the core's textual
  rendering.

## Decisions

### The shell is guarded on `document`, mirroring the export guard

The shell half is wrapped so it only executes when a document exists.

*Why:* `test.js` imports `game.js` under Node, where touching `document` or `canvas` would
throw at import time and take the whole suite down with it. The core milestone guarded the
export block for the browser's benefit; this is the same seam viewed from the other side,
and it is what keeps "the core still runs headless" true after the shell lands.

### The key listener is attached when the atlas finishes loading

Rather than attaching at parse time and testing a "ready" flag on every press, the listener
is registered inside the atlas's load handler, alongside the first draw.

*Why:* it makes "never draw before the atlas is ready" structural rather than something a
guard has to remember. A press arriving before the image resolves has nowhere to land, which
is the specified behavior, and there is no half-initialized window in which a draw could
produce a blank or partial board.

### Keys are listened for on the window, and auto-repeat is rejected via the event's own flag

The listener sits on `window`, and any event whose repeat flag is set is discarded.

*Why:* listening on the canvas would require making it focusable and would silently do
nothing until the player clicked it — a bad first ten seconds for a game opened by
double-click. On repeat: browsers emit a stream of key events while a key is held, and the
event's own repeat flag distinguishes them from a fresh press without the shell having to
track which keys are currently down.

Arrow presses that the game consumes also suppress their default action, which would
otherwise scroll the page under the board.

### Reference inequality is the redraw signal

A press computes the next state and redraws only when it is not the same object as the
current one.

*Why:* the core milestone deliberately returns the identical object for a press after a
solve, and a new object for every other outcome including a blocked press that only turns
the bot. That makes object identity an exact answer to "did anything change", so the shell
needs no comparison logic and no special case for the solved board — which is also what
keeps the freeze a rule rather than something the shell re-implements.

Restarting is the one intentional exception: `R` re-parses and redraws unconditionally,
without consulting identity. Comparing states to decide whether a restart was a no-op costs
more than the redraw it would save.

### The canvas is sized by attribute and pinned against rescaling

Intrinsic size is set with the canvas's width and height attributes; the stylesheet does not
set a conflicting displayed size, and the canvas carries a pixelated rendering hint.

*Why:* two different mechanisms can blur this game. Disabling image smoothing on the drawing
context governs how the atlas is magnified *into* the canvas. It says nothing about how the
browser then scales the canvas *element* — under browser zoom or on a high-density display,
the compositor resamples the finished canvas with its own smoothing, and the art softens
despite the context flag being correctly set. The rendering hint governs that second stage.
Fixing only the first is the more common mistake because the code looks right.

### Frame source rectangles are derived from a cell table

Each named frame is recorded once as its `(column, row)` cell in the atlas; source
rectangles are computed from that rather than written out as four numbers per frame.

*Why:* nine frames times four hand-written coordinates is thirty-six chances to transpose a
digit, and a transposed source rectangle produces a wrong-looking tile rather than an error.
One table of nine cells matches how the atlas is specified and how it was generated.

### The solved message avoids depending on file encoding

The page declares a UTF-8 character set, and the em dash in the solved message is written as
an escape in the script rather than as a literal character.

*Why:* the required string contains a character outside the basic Latin range. A script
loaded from `file://` inherits the document's encoding, so a page without an explicit
declaration can decode it by a locale default and display mojibake — visible only to whoever
happens to run it in that locale. Declaring the charset fixes the common case; writing the
character as an escape means the string survives even a file saved in the wrong encoding.

### Display text is set as text, not as markup

The heads-up display is updated through its text content.

*Why:* the strings are plain text and there is no reason to invoke HTML parsing on them.

## Risks / Trade-offs

- **Acceptance is human, so a regression can ship silently** → the checklist is enumerated
  as explicit tasks rather than left as "run through §7", and each names the specific thing
  to look at.
- **A wrong source rectangle draws a plausible-looking wrong tile, not an error** → the cell
  table above reduces the surface, and the checklist includes looking at every distinct tile
  type at least once on a real board.
- **High-density displays and browser zoom soften the art even when the context flag is
  right** → addressed by the rendering hint above; worth checking on a high-density display
  specifically, since it looks correct on an ordinary one.
- **A missing or misnamed atlas yields a blank canvas with no console error** → the load
  handler is where drawing begins, so nothing appears at all, which is conspicuous. Adding
  failure reporting is deliberately not done here; it would be shell logic the spec does not
  ask for.
- **The shell shares a file with the core and could quietly reach into it** → the `document`
  guard, the identity-based redraw, and the absence of any rule logic in the shell are the
  three things a reviewer should confirm; all three are separately verified as tasks.

## Open Questions

- Page presentation around the board — centering, background, HUD typography. Safe to defer:
  the spec fixes the canvas size, the HUD's position below it, and its exact strings, and
  nothing else about the page's appearance affects a requirement, the file list, or a task.
