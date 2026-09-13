## 1. Pure movement transitions

- [x] 1.1 Add and export `step(state, dir)` with the documented direction strings, fresh state copies, wall/bounds checks, facing updates, and successful-step counting; add tests for all four directions, floor/pad walking, wall blocking, and exclusive bounds, verifying expected positions, text output, facing, and counters with `node --test test.js`.
- [x] 1.2 Implement single-crate pushing into free floor or pads and blocking by walls, crates, and board bounds; add tests for each push outcome, pushing off a pad, and moving away without pulling a crate. Verify only the intended crate moves, terrain is preserved, and successful pushes cost exactly one move.
- [x] 1.3 Add deeply frozen input cases for walks, pushes, and blocked attempts; verify the entire unit suite proves fresh returned states, unchanged inputs, and equal results for repeated identical calls without browser globals.

## 2. Arrow input and redraws

- [x] 2.1 Change the browser state binding to permit replacement and register one arrow keydown handler after the atlas-ready initial draw; map keys to core directions, cancel default scrolling for recognized arrows, ignore repeats, and leave other keys uncancelled. Verify press/hold/release/press behavior, unhandled A/R/N keys, and input before delayed atlas readiness over `file://`.
- [x] 2.2 Update active state through `step` and call the existing renderer only when counter or facing values change; verify one redraw per successful walk/push or blocked turn, zero redraws for a second identical blocked attempt or ignored key, and matching positions, facing, docked frames, and HUD text.

## 3. P3 acceptance

- [x] 3.1 Run all project unit tests with Node 20+ using `node --test test.js`; fix every failure and confirm the five existing tests plus all added movement/pushing cases pass with no skips.
- [x] 3.2 Complete and record the direct `file://` keyboard check: walk and push from the initial board, dock a crate using the direction prefix in `design.md`, verify hold/repeat suppression and default-scroll prevention, blocked-turn/no-op redraw counts, ignored keys, early-load input, and absence of page errors, extra resources, or animation/timer scheduling. Reload between independent scenarios and remove any temporary debugger instrumentation.
- [x] 3.3 Review the final diff against the P3 scope; verify implementation changes are confined to `game.js` and `test.js`, core remains DOM-free, existing rendering/scaling and atlas are preserved, and solved/restart/replay/generation features have not been added. Keep P2's outstanding physical-display check documented in its own change.

## Verification results

- `node --test test.js`: 21 passed, 0 failed, 0 skipped. Includes all five previous tests, movement in every direction, walking over pads, wall and edge blocking, pushing onto/off pads, crate-chain blocking, no pulling, deterministic transitions, and frozen-input/independent-output checks.
- Chrome 152 on macOS, direct `file://`: browser-dispatched key events verified press/repeat/release/press behavior, default-scroll prevention on a scrollable page, one redraw for a blocked turn and none for a repeated no-op, unchanged A/R/N events, successful walking/pushing, and blocked crate-chain pushing. A debugger pause before atlas source assignment verified early arrow input leaves the original state and zero draws; resuming produces the initial board normally.
- Up, Up, Right, Down, Left, Down, Right, Down produced `Moves: 8`, nine total draws including boot, and a docked crate at `(3,3)`. Inspected the browser screenshot for the docked frame and HUD. No page exceptions or console errors; only the local HTML, stylesheet, script, and atlas loaded, with no animation/timer scheduling.
- Temporary browser instrumentation and verification files stayed outside the repository; instrumentation was removed and the page reloaded after checks. The atlas, HTML, CSS, and P2 verification record are unchanged. P2's physical high-density display check remains pending there.
