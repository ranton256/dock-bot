## Why

`Dock Bot.md` now specifies generated boards, and nothing implements them. The point of
building it here is to find out whether that specification survives contact with code
before students receive it: the spec change is held back from `main` until this milestone
either validates it or sends corrections back.

The player-facing reason is in §1 — one hand-authored level stops being interesting after
the first solve.

## What Changes

- Add `generateLevel(seed)` to the core: a seeded generator returning level text in the §3
  format, accepted only once `solve` has found a solution for it that meets the difficulty
  floor.
- Add `solve(state)` to the core: a bounded breadth-first search returning a *shortest*
  solution or nothing. It is what makes generation safe, and it yields par for free.
- Bind `N` in the shell to a fresh seed and a generated board; keep `R` restoring the
  current board, seed included.
- Add the board line below the HUD, showing par on the hand-authored level and seed plus
  par on a generated one.
- Extend `test.js` to cover the §6 "Generated boards" scenarios.

Out of scope: entering a seed by hand, and difficulty tiers. Both are parked in the spec.

## Capabilities

### New Capabilities
- `board-generation`: producing a playable board from a seed, and the search that decides
  whether a board is playable at all — solvable, and not so easy it is not worth the press.

- `browser-shell`: the additions on the presentation side — a new key, a second display
  element, and the rule that a restart keeps the current board rather than drawing a new
  one. Recorded as added requirements rather than modified ones because no earlier change
  has been archived, so `openspec/specs/` holds nothing to modify; nothing already
  specified changes in any case.

### Modified Capabilities

None. No rule stated for the hand-authored level changes: `parseLevel(LEVEL)` still yields
the same board, every movement and pushing requirement holds unaltered, and the existing
HUD strings keep their exact wording.

## Impact

- **Modified:** `game.js` (both halves), `test.js`, `index.html`, `style.css`. No new
  files; the game is still the five §4.2 files.
- **Depends on:** the existing core. `generateLevel` returns text that `parseLevel`
  already consumes, so generation attaches at one seam.
- **Risk — performance:** generation is synchronous and blocks the key press that asked
  for it. Measured at roughly 77ms for a board on a development machine; a slower one
  could be several times that. The candidate and solver caps in §3 exist so a bad seed
  degrades into "no new board" rather than a hung page.
- **Risk — the spec itself:** this milestone is the spec's first reader. Anything awkward,
  underspecified, or wrong goes back to `main` as a correction rather than being worked
  around here in silence.
