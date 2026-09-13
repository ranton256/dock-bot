## Context

See `proposal.md` for motivation. The inspected `game.js` exports `LEVEL_TEXT`, `parseLevel`, and `renderText` through guarded CommonJS exports. Its state contains a terrain array, crate positions, bot position/facing, move count, and initial solved flag. Five Node tests cover the P1 behavior. There is no HTML or CSS yet; `assets/dock_bot.png` is already supplied.

`Dock Bot.md` §§2–4 define the atlas and runtime constraints. Section 9 assigns static drawing and HUD to P2, input to P3, solved/restart behavior to P4, and board metadata to P5. The full §6 rendering scenario includes later behavior; P2 implements its static subset. The key legend will accompany the completed controls by P5 rather than advertise unavailable actions in this milestone. The zero-dependency boot wording about requests is interpreted as allowing the explicitly required local stylesheet and script as well as the atlas, with no additional requests.

## Goals / Non-Goals

**Goals:** Establish the browser shell without changing core state or exports; reuse the supplied atlas; make initial rendering reliable across image load timing; retain the exact fixed-size pixel presentation.

**Non-Goals:** Gameplay handlers, movement, solved HUD, restart, solver, generation, board line, key legend, animation, responsive canvas resizing, new assets, or added runtime/test dependencies.

## Decisions

### Browser setup stays in game.js behind a DOM guard

Append a browser-only shell behind `typeof document !== 'undefined'`. Keep core functions and CommonJS exports usable without running any DOM setup. A classic deferred script in `index.html` ensures DOM elements exist before initialization. A separate browser module would violate the prescribed file layout and classic-script constraint.

Create the initial state with `parseLevel(LEVEL_TEXT)` once. Keep canvas, context, image, and `draw(state)` in the shell's scope; there is no need to export the renderer through the core's CommonJS API. Preserve a callable local draw function for P3's eventual redraw path.

### Load the atlas with an image element and explicit readiness

Include a hidden image element for the atlas. Attach a once-only load handler before assigning its local `src` in shell setup, so the listener cannot miss a cached load. Draw only from successful load completion. Avoid polling, `fetch`, image readback, module loading, and animation scheduling. This provides one initialization path rather than racing an existing image load against script execution.

### Draw from the existing terrain and occupants

Use a hard-coded mapping of atlas cells: bot up/down/left/right `(0,0)` through `(3,0)`, crate `(0,1)`, docked crate `(1,1)`, floor `(2,1)`, wall `(3,1)`, pad `(0,2)`. A small tile helper converts these to 16×16 source rectangles and 48×48 destination rectangles.

Clear `(0,0,384,288)`, traverse terrain, draw all crates with pad-aware frame selection, then draw the bot from its facing. Read the state without changing it. Layering follows the atlas transparency contract; replacing an entire cell with an entity sprite would lose its terrain. Use constructed states during browser verification to exercise docked crates and all bot facings without introducing gameplay.

Update the unsolved HUD from `state.moves` using DOM text content, initially `Moves: 0`. The solved-message branch is deferred to P4 along with solve detection.

### Preserve both scaling stages

Set canvas `width="384"` and `height="288"` attributes, disable context image smoothing before drawing, and set `image-rendering: pixelated` in CSS. Do not give the canvas a responsive width, transform, or conflicting CSS dimensions. Use simple page centering, local system fonts, and the design's steel/teal palette for the surrounding page and readable HUD. Include UTF-8 metadata, a page title, and descriptive canvas fallback text; do not load fonts or other external assets.

### Combine existing unit coverage with direct browser verification

Run the complete `node --test test.js` suite to catch accidental DOM access on import and core regressions. Verify actual rendering from `file://`, including fresh open/reload, console and resource activity, initial board/HUD, transparent overlays, and high-density zoom. Browser developer tools can pause inside the local draw function to inspect draw order and exercise constructed states without adding a public debugging API or persisted fixture files. No screenshot readback from the canvas is required.

## Risks / Trade-offs

- [Image load occurs before setup] → Assign `src` only after registering the load handler; check fresh opens and reloads.
- [Browser shell breaks Node imports] → Guard all DOM work and rerun all five existing tests.
- [Art looks correct at ordinary density but blurs on Retina] → Verify both smoothing settings and inspect on a high-density display at default and increased zoom.
- [Entity transparency hides missing terrain layers on the initial board] → Exercise a docked crate and bot-on-pad state during browser verification.
- [Canvas pixel readback fails under file URLs] → Use visual inspection and the existing text diagnostics; do not add screenshot tooling to the game.

## Migration Plan

Add the HTML/CSS and browser shell on top of committed P1. There is no data migration or hosted deployment: open `index.html` directly to verify. Reverting the P2 file additions and shell restores the P1 headless implementation. Keep the supplied atlas unchanged.
