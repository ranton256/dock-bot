# Design: P5 solving and seeded generated boards

## Context

P4 provides parsing, immutable movement, crate pushing, solved freezing, replay, and restart for one level. The next milestone needs a trustworthy par value and a reproducible stream of boards without adding a dependency or changing the board format.

## Decisions

### Pure breadth-first solver

`solve(state)` will search states produced by the existing `step` function. A search key will contain the bot coordinate and a sorted crate-coordinate list; facing and move count do not affect reachability. The queue records move strings (or parent links) in U/D/L/R order, so the first solved state is shortest. A visited-state counter stops expansion at 200,000, and deadlock checks may prune obviously trapped crates without changing the result for valid boards.

### Seeded candidate generator

`generateLevel(seed, options)` will normalize the seed, drive a small deterministic PRNG, and place one bot, three pads, and three crates on a fixed-size open interior surrounded by walls. Candidates with a crate on a pad are rejected before solving. Each candidate is parsed and passed to `solve`; candidates below the default floor of 12 moves are rejected. The generator stops after 60 candidates and returns no result if none qualifies. Optional test-only overrides can lower the floor or candidate cap; the normal game path uses the defaults.

### Active-board metadata

The shell will store an active board record containing `text`, `seed` (when generated), and `par`. The hand-authored record has no generated seed and par 15. Rendering receives this record so it can draw the board, a metadata line (`Par 15` or `Seed <seed> · Par <par>`), and a keyboard legend. `N` chooses a fresh seed, calls the generator, and replaces the record only on success; `R` always reparses the current record's text, preserving its identity.

### Compatibility and failure behavior

The existing `parseLevel`, `step`, `isSolved`, and `playMoves` contracts remain the shared source of movement truth. If generation cannot find a qualifying candidate, the current board stays visible and playable. No network, clock-based board content, or unbounded search is allowed.

## Risks and tradeoffs

- Breadth-first search is simple and auditable but can use substantial memory near the cap; parent-link reconstruction keeps the queue state compact.
- Open interiors make generation predictable and satisfy the milestone constraint, while reducing puzzle variety; later milestones can add interior walls.
- A failed `N` attempt must leave the current board untouched so a low-quality seed cannot interrupt play.

## Migration

No data migration is required. Existing hand-authored level text remains valid and is parsed through the same pipeline.
