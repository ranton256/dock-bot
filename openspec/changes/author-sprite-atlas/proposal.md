## Why

`Dock Bot.md` §2 lists all nine sprite frames as `PROVIDED`, but `assets/dock_bot.png`
does not exist in the repository. Every frame's source rectangle is hard-coded against
that atlas, so the rendering milestone cannot start — and cannot be checked against the
§7 "crisp pixels, a docked crate glows" checklist — until the file exists and matches
§2 exactly.

Authoring it first also settles a contract that §2 leaves implicit. §6's draw order
composites entities over terrain, which means six of the nine frames must have
transparent backgrounds. An atlas drawn without that constraint looks correct in
isolation and is wrong the first time it renders.

## What Changes

- Add `assets/dock_bot.png`: a 64×64 PNG holding nine 16×16 frames on a 4×4 cell grid,
  at the exact cells §2 specifies.
- Add a generator under `tools/` that emits the atlas from an explicit palette and
  per-frame pixel maps, so a color or shape correction is a reviewable diff rather than
  a manual redraw.
- Add a validator that asserts the machine-checkable half of the frame contract:
  dimensions, populated and empty cells, per-frame opacity, and palette discipline.
- Establish the terrain/entity opacity split as a stated requirement rather than an
  inference from §6's draw order.

Neither `tools/` file ships with the game. §4.2's five-file list governs what the game
consists of; the generator and validator are authoring tooling that sits outside it and
is never loaded by `index.html`.

## Capabilities

### New Capabilities
- `sprite-atlas`: the atlas file's contract with the renderer — its dimensions, the cell
  each named frame occupies, which frames are opaque terrain and which are transparent
  entities, and the pixel discipline required for unsmoothed ×3 scaling.

### Modified Capabilities

None. No game behavior specified in §3–§6 changes; this change supplies an asset those
sections already assume.

## Impact

- **New files:** `assets/dock_bot.png`, plus a generator and validator under `tools/`.
- **Unblocks:** the browser shell milestone, which hard-codes source rectangles against
  this atlas and cannot satisfy the §7 checklist without it.
- **Does not touch:** the pure core (`parseLevel`, `step`, `isSolved`, `renderText`,
  `playMoves`). That milestone is independent of this one and needs no atlas.
- **Constraint honored:** the shipped game remains the five files in §4.2. Tooling added
  here is instructor-side and excluded from that count.
- **Risk:** "flat shading, cool palette" and four bot facings legible at 16×16 are
  judgment calls a validator cannot make. Those stay human-reviewed and are called out
  as such rather than being asserted mechanically.
