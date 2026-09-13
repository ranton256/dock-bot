## Why

P1 provides a tested headless board, but there is no page on which to see Dock Bot. Roadmap P2 makes the hand-authored level visible directly from the filesystem and establishes the pixel-art rendering shell for later gameplay.

## What Changes

- Add `index.html` and `style.css` with a 384×288 canvas and a DOM HUD below it.
- Extend `game.js` with browser-only initialization and `draw(state)` using the existing `parseLevel(LEVEL_TEXT)` pipeline.
- Load the supplied atlas through an image element and draw the static board once it is ready, with terrain beneath crates and the facing-specific bot.
- Preserve crisp 3× pixels through both canvas drawing and browser element scaling.
- Preserve headless core imports and the five existing unit tests.
- Scope this milestone to static rendering and `Moves: 0`. Keyboard controls, live gameplay, solved/restart behavior, generated boards, board metadata, and the eventual key legend remain for later milestones.

## Capabilities

### New Capabilities

- `static-board-rendering`: Dependency-free filesystem boot, correctly composited atlas rendering, crisp scaling, and the initial HUD.

### Modified Capabilities

None. The P1 `level-state` behavior is retained; its completed change has not yet been archived into main specs.

## Impact

Implementation adds `index.html` and `style.css` and extends `game.js` within the prescribed five-file game layout. It reuses `assets/dock_bot.png` unchanged and requires no package manifest, dependency, build step, server, or deployment. Existing tests remain in `test.js`; P2 also requires direct `file://` browser verification, including a high-density display check.
