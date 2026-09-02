## Purpose

Defines the contract between the sprite atlas file and the code that draws from it: how
large the atlas is, which cell holds each named frame, which frames are opaque terrain
and which are transparent entities composited over it, and the pixel discipline required
for the frames to survive unsmoothed ×3 scaling.

## ADDED Requirements

### Requirement: Atlas file and dimensions

The game SHALL be accompanied by a single sprite atlas at `assets/dock_bot.png`. The
atlas MUST be a PNG of exactly 64×64 pixels with an alpha channel, divided into a 4×4
grid of 16×16 cells. The cell at column `c`, row `r` MUST occupy the source rectangle
`x = c*16, y = r*16, w = 16, h = 16`.

The atlas MUST be self-contained: a single file, loadable through an `<img>` element from
a `file://` origin, with no companion file or external resource required to render it
correctly.

#### Scenario: Atlas dimensions

- **WHEN** the atlas file is inspected
- **THEN** it is a valid PNG of exactly 64 pixels wide by 64 pixels tall, with an alpha channel

#### Scenario: Loading from the filesystem

- **WHEN** the game is opened directly from `file://` and the atlas is loaded through an `<img>` element
- **THEN** the image loads successfully and no request is made for any other resource

### Requirement: Frame placement

The atlas MUST carry nine named frames at exactly these cells, so that source rectangles
may be hard-coded against them:

| Cell (col,row) | Frame | Kind |
|---|---|---|
| (0,0) | `bot_up` | entity |
| (1,0) | `bot_down` | entity |
| (2,0) | `bot_left` | entity |
| (3,0) | `bot_right` | entity |
| (0,1) | `crate` | entity |
| (1,1) | `crate_docked` | entity |
| (2,1) | `floor` | terrain |
| (3,1) | `wall` | terrain |
| (0,2) | `pad` | terrain |

The seven remaining cells — (1,2), (2,2), (3,2), (0,3), (1,3), (2,3), (3,3) — MUST be
fully transparent, so that a source rectangle aimed at an unused cell draws nothing
rather than drawing stray pixels.

#### Scenario: Named frames are present

- **WHEN** each of the nine specified cells is examined
- **THEN** that cell contains non-transparent pixels forming the frame named for it

#### Scenario: Unused cells are empty

- **WHEN** any of the seven unused cells is examined
- **THEN** every pixel in that cell has an alpha value of zero

### Requirement: Terrain frames are opaque

The three terrain frames — `floor`, `wall`, and `pad` — are drawn as a cell's base layer
and MUST be fully opaque across all 256 pixels. A terrain frame with transparent pixels
would expose whatever the canvas held previously, since the renderer clears the canvas
once and then paints base tiles without repainting a backdrop beneath them.

`pad` MUST be visually distinguishable from `floor`, since an empty dock pad and plain
floor are the two states a player reads the board by.

#### Scenario: Terrain frame opacity

- **WHEN** the `floor`, `wall`, or `pad` cell is examined
- **THEN** every one of its 256 pixels has an alpha value of fully opaque

### Requirement: Entity frames are transparent-backed

The six entity frames — the four bot facings, `crate`, and `crate_docked` — are
composited over an already-drawn terrain tile. Each entity frame MUST leave its
background fully transparent so the terrain beneath remains visible, and MUST NOT
contain its own copy of the terrain it expects to sit on.

This applies to `crate_docked` in particular: it is drawn over the `pad` base tile, so it
MUST NOT embed a pad backdrop of its own.

#### Scenario: Entity frames have transparent backgrounds

- **WHEN** any of the six entity frames is examined
- **THEN** at least one pixel in that cell is fully transparent, and the frame's subject does not extend to fill all 256 pixels

#### Scenario: Docked crate composites over its pad

- **WHEN** `crate_docked` is drawn over a previously drawn `pad` tile in the same cell
- **THEN** the result reads as one crate seated on that pad, with no seam, doubled pad edge, or clipped pad visible around the crate

### Requirement: Pixel discipline for unsmoothed scaling

The atlas is drawn at ×3 with image smoothing disabled. Every pixel in the atlas
therefore MUST be either fully opaque or fully transparent; no partial alpha is
permitted, because feathered edges become hard, discolored steps when magnified without
interpolation.

Frames MUST use flat shading drawn from a small, shared, cool palette — steel greys for
structure, teal for pads, amber for crates.

#### Scenario: No partial alpha

- **WHEN** every pixel in the atlas is examined
- **THEN** each pixel's alpha value is either fully transparent or fully opaque, with no intermediate value

#### Scenario: Flat shading

- **WHEN** the set of distinct colors used across the atlas is collected
- **THEN** it is a small palette consistent with flat shading rather than a gradient or anti-aliased ramp

### Requirement: Frames are legible at their drawn size

Frames are read by a player at 16×16 magnified ×3, with no labels or other affordances to
disambiguate them. The following distinctions MUST be apparent at that size, and are
verified by human review rather than by inspecting pixels:

- The four bot frames MUST read as the same robot facing up, down, left, and right, and
  each MUST be distinguishable from the other three.
- `crate_docked` MUST be obviously distinct from `crate`, carrying the glowing edge that
  tells a player the crate is seated and counted.

#### Scenario: Bot facings are distinguishable

- **WHEN** the four bot frames are viewed side by side at ×3
- **THEN** each is recognizably the same robot, and each one's facing direction is identifiable without reference to the others

#### Scenario: Docked crate is distinguishable from an undocked one

- **WHEN** a board is viewed at ×3 containing both a crate on floor and a crate on a pad
- **THEN** which crates are docked is apparent at a glance
