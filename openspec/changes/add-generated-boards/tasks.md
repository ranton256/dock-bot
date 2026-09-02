## 1. Searching

- [ ] 1.1 Implement `solve(state)` in the core as a bounded breadth-first search returning a
      shortest move string or `null`. Verify it returns exactly 15 moves for the
      hand-authored level, the optimal length §3 states independently.
- [ ] 1.2 Verify a returned solution is real by replaying it: `playMoves` with it must leave
      the level solved, for the hand-authored level and for generated boards.
- [ ] 1.3 Verify `solve` reports an unsolvable board by constructing one — a crate pushed
      into a corner that is not a pad — and confirming it returns nothing.
- [ ] 1.4 Verify the search is bounded: confirm it stops at the solver cap rather than
      running on, and that it does not mutate the state it was given (snapshot the
      rendering before and after).

## 2. Generating

- [ ] 2.1 Implement a seeded pseudo-random generator threaded explicitly through generation.
      Verify the same seed yields the same sequence and different seeds diverge.
- [ ] 2.2 Implement candidate board construction: the outer wall ring, three pads, three
      crates and a bot placed on distinct interior cells, no crate on a pad. Verify the
      composition and that rendering the parsed result reproduces the text exactly.
- [ ] 2.3 Implement `generateLevel(seed)`: draw candidates, solve each, accept the first
      that is solvable and whose solution is at least the difficulty floor. Verify the same
      seed always returns the same board.
- [ ] 2.4 Verify every generated board is solvable and meets the floor, across a wide range
      of seeds rather than one.
- [ ] 2.5 Enforce the candidate cap and verify generation gives up rather than looping,
      returning nothing rather than a board that failed the rules.
- [ ] 2.6 Verify generated boards actually differ across seeds, so that a bug collapsing
      them all to one board would be caught.

## 3. Shell

- [ ] 3.1 Add the board line element to `index.html` and style it in `style.css`. Verify the
      heads-up display keeps its exact existing wording and the board line is additional.
- [ ] 3.2 Track the current board as text plus seed plus par, so a restart can restore it.
      Verify `R` on a generated board returns the same board with the counter at 0 and the
      seed unchanged.
- [ ] 3.3 Bind `N` to a fresh seed and a generated board, in any state including solved.
      Verify the counter reads 0 afterwards and the board line shows seed and par.
- [ ] 3.4 Verify generation giving up leaves the board on screen untouched.
- [ ] 3.5 Update the board line on every draw from the current board. Verify it reads par
      alone on the hand-authored level and seed plus par on a generated one.

## 4. Verification

- [ ] 4.1 Run `node --test test.js` and verify every previously existing test still passes
      unchanged, which is what makes this milestone additive rather than a rewrite.
- [ ] 4.2 Extend `tools/shell-harness.js` for the `N` key, the board line, and restart
      keeping the board. Verify it passes.
- [ ] 4.3 Extend `tools/mutate-core.js` with mutations aimed at the new code — a search that
      returns a non-shortest solution, and a generator that skips the solvability check —
      and verify both are caught.
- [ ] 4.4 Measure generation time over many seeds and record it, so the risk noted in the
      design is a number rather than a guess.
- [ ] 4.5 Run the `file://` checklist in `tools/browser` and extend it to press `N`, confirm
      a fresh solvable board appears, and confirm `R` keeps it.
- [ ] 4.6 Report back anything the specification got wrong, underspecified, or made awkward
      to implement. Validating the spec is the reason this milestone exists.
