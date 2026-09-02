## Context

See `proposal.md` — Why, and the delta specs for the contract. `Dock Bot.md` §3, §4 and §6
carry the requirements; this milestone is their first reader, so anything awkward in them
is a finding, not an obstacle to work around.

Constraints that shape the approach:

- **No package manager**, so the PRNG and the search are written by hand. Neither needs a
  library.
- **`game.js` already has both halves.** Generation and search go in the core, above the
  seam; the key and the board line go below it.
- **Generation blocks the key press that asked for it.** There is no animation loop and no
  worker, so a board must be produced in a time a player will not notice.

## Goals / Non-Goals

**Goals:**

- Boards that are always solvable, never trivial, and reproducible from a seed.
- Validate the specification. Report back anything it gets wrong.
- Keep the change additive: every existing test passes untouched.

**Non-Goals:**

- Entering a seed by hand, or difficulty tiers. Both are parked in the spec.
- A fast solver. The board is small enough that a plain breadth-first search is
  comfortably within budget, and cleverness here would be unpaid-for risk.
- Interior walls in generated boards. §3 excludes them, and that exclusion is what makes
  every interior cell mutually reachable.

## Decisions

### Breadth-first search, because par has to be the *shortest* solution

The search explores by increasing depth and returns the first solution it reaches.

*Why:* the length is used twice — as the board's par, and as the difficulty test that
decides whether the board is worth playing. Both are wrong if the sequence is not minimal.
Depth-first search, or any greedy walk, would return *a* solution and make par a lie.

*Alternatives considered:* A\* with a matching-distance heuristic is the standard answer
for real Sokoban and is entirely unnecessary here. The whole space of the hand-authored
level is 8,506 positions, explored in about 24ms.

### Positions are deduplicated by crates plus bot

A position's identity is the sorted crate cells together with the bot's cell.

*Why:* revisiting positions is what makes the difference between a search that finishes
and one that does not. The usual refinement is to normalise the bot to a canonical cell in
its reachable region, so that positions differing only by where the bot stands collapse
into one; that is worth real time on large boards and is not worth the extra machinery on
this one.

### The search is bounded, and the bound means unsolvable

The search stops after the solver cap in distinct positions and reports no solution.

*Why:* the caller is a key press. An unbounded search is a hung page, and the honest
report for "I could not find a solution within my budget" is the same as for "there is
none" — the board is not offered either way. The cap is far above what this board size can
reach, so it is a guard, not a policy.

### Generate and verify, not generate by construction

Crates, pads and the bot are placed at random and the board is then solved; anything
unsolvable or below the floor is discarded.

*Why:* recorded in `Dock Bot.md` §8 and measured before the spec was written. Reverse
generation from a solved board is solvable by construction but produces boards whose
shortest solution is about six moves against fifteen for the hand-authored level, because
the walk drifts back towards where it started. Filtering those for difficulty needs the
search anyway, so the pull logic buys nothing.

### A small integer PRNG, carried explicitly

A linear congruential generator, seeded from the board's seed, threaded through generation
as an explicit function rather than module state.

*Why:* determinism is the requirement, not statistical quality — a board only needs to
look arbitrary to a person. An explicit generator keeps `generateLevel` a pure function of
its seed, which is what makes "the same seed gives the same board" testable rather than
merely intended.

### Seeds are chosen by the shell, not by the core

`generateLevel` takes a seed. Nothing in the core invents one; the shell picks one from
the clock when the player presses `N`.

*Why:* it puts the single unseeded moment in the game at exactly one place, in the half
that is already impure, and leaves the core a pure function of its argument. §4.6 allows
the seed's origin to be anything; it is everything *after* that which must be determined.

### Par is computed once, when the board is made

The board's par is worked out at generation time and carried alongside the level text, not
recomputed on each draw.

*Why:* drawing happens on every key press that changes something. Re-running a search
each time would put tens of milliseconds into a keystroke to recompute a constant.

## Risks / Trade-offs

- **Generation blocks the key press.** Measured at roughly 77ms for a board, on a
  development machine; several times that on a slow one is plausible. Accepted: it happens
  only on `N`, and the caps bound the worst case. If it proves objectionable the answer is
  a lower floor, not a cleverer search.
- **A difficulty floor of 12 is a judgement, not a derivation.** It sits above the measured
  median of 14 being comfortable and below where acceptance rates fall away. If boards feel
  samey, the floor is the first dial to turn.
- **Generated boards are visually plainer** than the hand-authored one, having no interior
  walls. That is what the spec asks for and what keeps every cell reachable, but it does
  cap how interesting a generated board can get.
- **The search is the piece most likely to be subtly wrong**, and a wrong search that
  returns *a* solution rather than the shortest would silently corrupt par and the
  difficulty filter at once → the suite checks it against the hand-authored level, whose
  optimal length the specification states independently.
