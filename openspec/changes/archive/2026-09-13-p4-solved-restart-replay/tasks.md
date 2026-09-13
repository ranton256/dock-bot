## 1. Solved core and replay

- [x] 1.1 Add and export pure `isSolved(state)` using crate/pad membership; update `step` to derive `solved` after transitions and freeze solved inputs, including stale-flag fixtures. Verify solved/unsolved fixtures, input immutability, and exact crate/pad occupancy through `node --test test.js`.
- [x] 1.2 Add and export pure `playMoves(state, moves)` with U/D/L/R mapping, blocked-move semantics, ignored unknown characters, delegation to `step`, and post-solve freeze. Verify the canonical 15-move string solves the hand-authored board, move count is exactly 15, suffix moves have no effect, and frozen inputs remain unchanged.

## 2. Solved lifecycle in the browser

- [x] 2.1 Update `draw` to derive exact solved HUD text and update the browser key handler for restart plus solved arrow freeze; verify the final push displays `Solved in 15 moves — press R`, arrows remain prevented but do not redraw, and restart is available after solve.
- [x] 2.2 Implement unmodified R/r restart from a fresh `LEVEL_TEXT` parse, ignoring Ctrl/Cmd/Alt modifiers; verify unsolved and solved restart restore the initial board, reset facing/moves, redraw once, and modified R events preserve state and browser-default behavior.

## 3. P4 acceptance

- [x] 3.1 Run every project unit test with Node 20+ using `node --test test.js`; fix all failures and confirm the complete suite passes with no skips, including all P1/P3 coverage and new P4 lifecycle scenarios.
- [x] 3.2 Complete and record direct `file://` browser verification: play the 15-move solution with individual arrows, inspect exact solved HUD and frozen arrows, restart from solved and unsolved states, test modified R keys, and confirm draw counts, no errors, local-only resources, and no animation/timer scheduling.
- [x] 3.3 Review the final diff against P4 and the five-file constraint; verify only `game.js` and `test.js` change implementation, no generated-board/N/metadata/legend/optional feature code appears, and P3's archived spec remains unchanged.

## Verification results

- `node --test test.js`: 25 passed, 0 failed, 0 skipped. Coverage includes solved detection, stale solved flags, solved transition freeze, canonical replay, suffix freeze, unknown replay characters, deep-frozen purity, and all prior P1/P3 behavior.
- Chrome 152 on macOS, direct `file://`: the individual-arrow canonical solution displayed `Solved in 15 moves — press R`; a further arrow caused no redraw and preserved the solved HUD. Unsolved and solved `r`/`R` restarts restored `Moves: 0` and the initial lifecycle.
- Ctrl+R, Cmd+R, and Alt+R were dispatched with browser modifier flags and left state, HUD, and redraw count unchanged. No page exceptions or console errors occurred; resource activity remained limited to local HTML, CSS, script, and atlas files.
- Browser checks used temporary debugger instrumentation outside the repository; it was removed before the final reload. No animation or timer scheduling was observed. Generated boards, N, metadata, legend, and optional features remain out of scope.
