## 1. Local page and presentation

- [x] 1.1 Add `index.html` with UTF-8 metadata, a descriptive title, a 384×288 intrinsic canvas with fallback text, a DOM HUD below it, a hidden atlas image element, local stylesheet, and a classic deferred `game.js` script; verify the DOM structure and local resource paths by opening the page from `file://`.
- [x] 1.2 Add `style.css` with simple centered layout, readable HUD styling using local fonts and the design palette, and `image-rendering: pixelated`; verify the canvas retains its 384×288 size with no conflicting CSS dimensions or transforms.

## 2. Browser initialization and drawing

- [x] 2.1 Add browser-only setup in `game.js`, parse `LEVEL_TEXT`, register the atlas load handler before setting its source, and draw once on successful load; verify fresh open and reload both render without premature image drawing, repeated initialization, or console errors.
- [x] 2.2 Implement local `draw(state)` with the exact atlas cell mapping, 16×16 source and 48×48 destination rectangles, disabled smoothing, full-canvas clear, terrain then crates then bot, and `Moves: <count>` HUD text; verify the initial board's positions, facing, frames, and `Moves: 0` match the spec.
- [x] 2.3 Exercise constructed states in browser developer tools with a crate on a pad, a bot on a pad, and all four bot facings; verify the docked frame, underlying terrain, draw order, and unchanged state, then reload to restore the initial board without retaining debug code or fixtures.

## 3. P2 acceptance

- [x] 3.1 Run the entire project unit suite with Node 20+ using `node --test test.js`; inspect results and fix all failures, verifying all five P1 tests pass with no skips and the browser shell does not affect headless imports.
- [ ] 3.2 Complete the `file://` browser check at default and increased zoom on a high-density display: verify crisp edges, complete board, correct HUD, no console errors or additional resource requests, and no state changes or scheduled redraws while idle or pressing arrow/R/N keys. Record the browser, display/zoom conditions, and outcomes in the implementation report.
- [x] 3.3 Review the final diff against P2 and the five-file game constraint; verify only `index.html`, `style.css`, and the browser portion of `game.js` are needed for implementation, the atlas is unchanged, no dependencies or package manifest were added, and later gameplay/metadata features remain outside this change.

## Verification results

- Node unit suite: `node --test test.js`, 5 passed, 0 failed, 0 skipped.
- Chrome 152 on macOS, direct `file://`: correct 384×288 canvas and `Moves: 0`; fresh load and reload each performed one clear and 52 sprite draws, all after atlas readiness with smoothing disabled. Resource events contained only the local HTML, CSS, script, and atlas; no page console errors or exceptions.
- Browser debugger verification: all four bot facings, bot-on-pad and docked-crate overlays selected the correct frames and preserved state. Inspected initial and overlay browser screenshots. Arrow/R/N events caused no additional draws; no animation or timer scheduling occurred.
- Actual browser device pixel ratio was 1; system display inventory exposed no physical display. Additional emulated DPR 2 checks passed at normal scale and 1.5 visual-viewport scale; inspected enlarged sprite edges as crisp. This visual-viewport scaling is not a substitute for checking normal browser page zoom on a physical high-density display. Task 3.2 remains open for that verification.
- Temporary Chrome profile, debugger script, and screenshots stayed outside the repository. The isolated browser was closed after verification. No test instrumentation was added to game files.
