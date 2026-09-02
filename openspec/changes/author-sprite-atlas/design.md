## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **No package manager anywhere.** `Dock Bot.md` §4.1 forbids one for the game, and the
  repository has no `package.json`. Tooling added here inherits that: it may use Node's
  standard library and nothing else. There is no image library available to write a PNG.
- **The atlas is a hard-coded contract.** Source rectangles are computed from cell
  coordinates in game code, so the file's geometry is not negotiable after the fact.
- **Half the contract is machine-checkable and half is not.** Dimensions, cell occupancy,
  and alpha discipline are decidable. "Reads as a robot facing left at 48 physical
  pixels" is not.

## Goals / Non-Goals

**Goals:**

- Produce `assets/dock_bot.png` satisfying every requirement in `specs/sprite-atlas/spec.md`.
- Make a correction — a color, a single pixel, a bot's silhouette — a reviewable diff and
  a re-run, not a redraw.
- Verify the mechanical requirements against the *file that ships*, independently of the
  data that produced it.

**Non-Goals:**

- Any game code. This change adds an asset and the tooling to author it; the pure core
  and the browser shell are separate milestones.
- A general-purpose sprite pipeline. One atlas, nine frames, fixed geometry.
- Frames for the parked features in the spec's final section. Nine frames, seven empty
  cells, as specified.

## Decisions

### Generate the atlas from source rather than drawing it in an editor

The atlas is authored as data in a generator under `tools/` that emits the PNG.

*Why:* nine 16×16 flat-shaded frames on a fixed palette is small enough to express
directly, and doing so buys properties a binary blob cannot have — a color change is a
one-line diff, the palette is shared by construction rather than by eyedropper, and the
file can be regenerated identically at any time.

*Alternatives considered:* Hand-drawing in a pixel editor is truer to the craft and would
almost certainly produce better art, but every adjustment becomes a manual round-trip
through an external tool and nothing is reviewable. Generating once and discarding the
generator keeps the repository minimal but throws away exactly the property that makes
this approach worth choosing.

### Frames are authored as ASCII pixel maps over a named palette

Each frame is 16 lines of 16 characters. One character is one pixel and indexes a named
palette entry; a designated character means transparent.

*Why:* the source looks like the thing it produces, so a frame can be read and edited
without running anything, and a diff shows the shape that changed. It also makes the
alpha requirement structural: palette entries are fully opaque and the transparent
character writes alpha zero, so no intermediate alpha can be expressed at all.

*Alternatives considered:* coordinate or run-length lists are more compact and entirely
unreadable at review time.

### Write the PNG by hand against `node:zlib`

The generator emits a PNG signature, `IHDR`, a single `IDAT`, and `IEND`, with scanlines
filtered and compressed via `zlib.deflateSync`. Truecolor with alpha, 8 bits per channel.

*Why:* no dependency is permitted and none is needed. A fixed-size, single-image PNG with
no interlacing is a short, well-specified format.

*Alternatives considered:* an indexed-color PNG would make the small-palette requirement
structurally impossible to violate, which is genuinely attractive — but it complicates
both the encoder and the independent decoder below, and the palette is already enforced
by the generator only being *able* to emit palette colors. Not worth the extra format
surface on both sides.

### The validator decodes the shipped PNG independently

The validator reads `assets/dock_bot.png` from disk, decodes it — `zlib.inflateSync`,
then reverse the per-scanline filters — and asserts against the spec. It does **not**
import the generator's palette or pixel maps.

*Why:* a validator fed by the generator's own in-memory data confirms that the generator
agrees with itself, which is not the question. Only a decode of the actual bytes catches
an encoder bug, and an encoder bug is the most likely defect in this change. This is the
same reasoning that puts an independently transcribed level map in the core milestone's
tests rather than importing the game's constant.

### Facing is conveyed by a moving high-contrast feature, not by four silhouettes

The bot's chassis silhouette stays identical across all four frames; a bright visor or
lamp moves to the facing edge, with a small directional cue for up versus down where no
edge is visible in profile.

*Why:* the requirement is that the four frames read as *the same robot* facing four ways.
Four independently drawn silhouettes tend to read as four different robots, and at 16×16
there are too few pixels to carry both identity and rotation independently.

### Tooling lives in `tools/` and does not ship

`tools/` is instructor-side. §4.2's five-file list defines what the *game* consists of;
nothing in `tools/` is referenced by `index.html` or loaded at runtime.

## Risks / Trade-offs

- **A hand-rolled PNG encoder is the likeliest source of a subtle bug** (a wrong CRC,
  a mis-filtered scanline) → the independent decode in the validator catches structural
  errors, and opening the atlas in a browser catches anything that survives both.
- **Legibility at 16×16 cannot be asserted mechanically** → the two legibility scenarios
  in the spec are explicitly human-verified, and the milestone is not done on a green
  validator alone.
- **Art authored as code will read as programmer art** → accepted. The palette and maps
  are centralized and cheap to iterate, so this is correctable rather than fatal, and the
  legibility bar in the spec is "distinguishable at a glance," not "good."
- **A `tools/` directory may look to a student like a sixth shipped file** → the
  distinction is stated in the proposal and belongs in whatever note accompanies the
  atlas; the README already tells students to ask for the atlas rather than draw one.
- **Rollback** is deleting the added files; nothing existing is modified, so there is
  nothing to migrate.

## Open Questions

- The exact palette values — how cold the greys, how saturated the teal and amber. Safe
  to defer: the spec constrains the palette's character and size, not its hex values, and
  changing them is a one-line edit and a re-run that alters no requirement, no approach,
  and no task.
