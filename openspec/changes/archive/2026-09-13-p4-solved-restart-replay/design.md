## Context

See `proposal.md` and `specs/solving-and-restart/spec.md`. P3's `game.js` has pure `step`, `parseLevel`, `renderText`, and a guarded browser shell. The shell keeps active state in a `let`, handles arrows only after atlas load, redraws on move/facing changes, and currently displays `Moves: N`. The P3 main spec is archived at `openspec/specs/movement-and-pushing/spec.md`.

`Dock Bot.md` §3 gives the canonical 15-move solution `UURDLDRDRRUURUL`; §6 defines solve, replay, restart, modifier, and solved-HUD scenarios; §9 assigns all of these to P4. P5 will later add generation, N, board seed/par, and the final key legend. The current `state.solved` field is initialized by parsing but is not maintained after movement.

## Goals / Non-Goals

**Goals:** Make the solved condition derived from board contents, enforce the same solved freeze in core and shell, support replay through the exact transition path, and restore the fixed board with a clear keyboard command.

**Non-Goals:** Generated boards or generated-board restart identity, solver implementation, board metadata, N, key legend, undo, score persistence, sound, animation, or new dependencies.

## Decisions

### Derive solved state after each transition

Implement `isSolved` by checking every crate against pad terrain. In `step`, first return a fresh deep copy with the existing solved flag when `isSolved(state)` is true; this prevents a solved state from changing even if a stale caller supplied `solved: false`. For successful and blocked transitions, compute `solved` from the resulting crate positions. A stored flag alone was rejected because callers can construct valid states and the core must enforce the freeze itself.

Maintain `solved` as a convenience field for the shell and HUD, while treating crate/pad membership as the source of truth. Empty crate arrays are outside the documented game shape; use the natural all-check semantics and cover the three-crate board in tests.

### Replay delegates to step

Map uppercase and lowercase `U/D/L/R` to direction strings and fold over the move string. Unknown characters do nothing. Start from the supplied state and return each `step` result; once solved, `step` freezes subsequent inputs automatically. Do not mutate the input or add a separate replay movement implementation. This guarantees script and keyboard behavior remain identical and gives P4 an API P5 can reuse for solver playtests.

### Add restart as a shell-only fixed-board action

On an unmodified `r` or `R`, replace active state with `parseLevel(LEVEL_TEXT)` and draw once. Handle restart after the solved check so it works in both lifecycle states. Ignore Ctrl/Meta/Alt modified R events and leave them uncanceled. Keep restart in the browser shell for P4; a separate pure `restart` function is unnecessary while there is only one hand-authored board. P5 can generalize the shell action to generated board text without changing the key contract.

### Make HUD text state-derived

Render `state.solved ? \`Solved in ${state.moves} moves — press R\` : \`Moves: ${state.moves}\``. Use the literal em dash in a UTF-8 source file already declared by the page; later implementation may use the documented `\\u2014` escape. Arrow handlers always prevent default and invoke `step`, but compare values after a solved call and skip draw when no values changed. Restart always draws because it replaces a changed board, including a solved-to-unsolved transition.

### Verify core, shell, and lifecycle boundaries

Extend `test.js` with solved fixtures, canonical replay, suffix freeze, unknown-character handling, deep-freeze purity, and solved derivation. Browser checks should verify the final HUD, frozen arrows, one restart draw, modifier pass-through, and restart from both unsolved and solved states. Keep existing P3 redraw and input tests. Use debugger instrumentation only outside the repository; no debug surface is added to game.js.

## Risks / Trade-offs

- [Stale solved flag allows post-solve movement] → Derive solve status from crates/pads inside `step` and test a solved fixture with both flag values.
- [Replay diverges from keyboard behavior] → Implement replay solely by calling `step` and compare the canonical result to the scripted expected board.
- [R breaks Cmd+R browser reload] → Ignore all Ctrl/Meta/Alt modified R events and verify they are not prevented.
- [Solved message uses wrong punctuation or count] → Assert the exact string `Solved in 15 moves — press R` in Node/browser checks.
- [Restart accidentally broadens to generated boards] → Parse only `LEVEL_TEXT` in P4 and leave generated board identity to P5.

## Migration Plan

Add the new core exports and extend the existing shell in `game.js`; expand `test.js`. No persisted or external state needs migration. Run the full Node suite and direct `file://` lifecycle checks. Reverting the P4 additions restores P3 movement behavior and HUD.
