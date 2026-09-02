## 1. Module seam and level constant

- [x] 1.1 Create `game.js` with the level text from §3 as a module constant in canonical
      form — no leading or trailing newline — and a guarded `module.exports` block exposing
      the five core functions plus that constant. Verify `require('./game.js')` under Node
      returns all six bindings.
- [x] 1.2 Verify the export block is inert in a browser: confirm it is guarded on `module`
      being defined, and that loading the file by a plain script tag raises no error and
      defines no unexpected global.
- [x] 1.3 Create `test.js` using only `node:test` and `node:assert`, containing an
      independently hand-typed copy of the level map asserted equal to the exported
      constant. Verify `node --test test.js` runs and this assertion passes. This is the
      only check that catches a wall typo in the constant.

## 2. Parsing and text rendering

- [x] 2.1 Implement `parseLevel`: split trimmed text into rows and build state with `walls`
      and `pads` as sets of `"col,row"` keys, `crates` as a set, `bot` as `{col,row,facing}`
      facing right, and `moves` at 0. Verify against the §6 parsing scenario — bot (1,3),
      crates (2,2)/(4,2)/(3,4), pads (3,1)/(3,3)/(5,4), counter 0, not solved.
- [x] 2.2 Extend parsing to accept `X` and `b`. Verify a board containing `X` yields a cell
      holding both a pad and a crate, and one containing `b` yields a cell holding both a
      pad and the bot.
- [x] 2.3 Implement `renderText` with the precedence `#`, `b`, `B`, `X`, `C`, `P`, `.`,
      joining rows with a single newline and emitting no trailing newline. Verify rendering
      a freshly parsed state is byte-for-byte equal to the test file's own copy of the map.
- [x] 2.4 Verify the round-trip property: render, parse, render again, and confirm the two
      renderings are byte-identical — including for a state with a crate on a pad, which
      exercises the `X` path in both directions.

## 3. Stepping

- [x] 3.1 Implement `isBlocked(state, col, row)` returning true for a wall or a cell outside
      `0 <= col < 8`, `0 <= row < 6`. Verify it reports blocked for every border cell and
      for coordinates beyond each of the four edges.
- [x] 3.2 Implement `step` for movement onto floor or an empty pad, updating facing and
      incrementing the counter. Verify stepping the initial state up puts the bot at (1,2)
      facing up with the counter at 1, and that stepping onto a pad leaves the pad in place.
- [x] 3.3 Implement blocked movement: turn to face the direction, move nothing, count
      nothing. Verify stepping the initial state left leaves the bot at (1,3) facing left
      with the counter at 0.
- [x] 3.4 Implement pushing onto floor or an empty pad — crate forward one cell, bot into
      its former cell, counter plus exactly one. Verify from the bot at (1,2) that stepping
      right moves the crate at (2,2) to (3,2) and the bot to (2,2) with the counter up by 1.
- [x] 3.5 Implement blocked pushes for a wall, an out-of-bounds cell, or a second crate
      beyond the first. Verify with the replay `RRD` (crate at (3,4) backed against the
      boundary wall, counter stays 2) and `URR` (crate pushed to (3,2) meets the crate at
      (4,2), counter stays 2), both leaving the bot turned toward the press.
- [x] 3.6 Verify exactly one crate moves per push and that no rule moves a crate toward the
      bot, by asserting crate count and positions across each pushing case above.
- [x] 3.7 Make `step` throw on a direction outside `U`, `D`, `L`, `R`. Verify the throw, so
      a mistyped move string in a test fails loudly instead of reading as a blocked press.

## 4. Solving and the freeze

- [x] 4.1 Implement `isSolved` derived from crates and pads, with no stored flag. Verify it
      is false for the initial state and false whenever any crate is off a pad.
- [x] 4.2 Implement the post-solve freeze as the first branch of `step`, returning the
      identical state object. Verify that stepping a solved state in all four directions
      returns a state equal in board, counter, and facing — including facing, which a
      blocked press would otherwise change.
- [x] 4.3 Verify reference identity holds on the frozen branch, since the shell milestone
      will use `next !== state` as its redraw signal, and verify a blocked press does return
      a new object so that a turn still redraws.

## 5. Replay

- [x] 5.1 Implement `playMoves` as a fold of `step` over the string's characters. Verify
      replaying `LLL` leaves the bot at (1,3) facing left with the counter at 0.
- [x] 5.2 Verify the canonical solution: replaying `UURDLDRDRRUURUL` from a freshly parsed
      state solves the level with the counter at exactly 15, and renders to the expected
      board with `X` at (3,1), (3,3) and (5,4) and no `C` anywhere.
- [x] 5.3 Verify replay cannot count past a solve: append extra directions to the canonical
      solution and confirm the counter still reads 15 and the board is unchanged.

## 6. Immutability, determinism, and restart

- [x] 6.1 Verify a step does not mutate its argument, by snapshotting the original state's
      rendering, stepping, and re-rendering from the original reference. Assert on the
      snapshot, not on object identity of the crates set — an unchanged set is legitimately
      shared and a reference assertion would fail on correct code.
- [x] 6.2 Verify determinism: replaying the same move string twice from freshly parsed
      states yields identical renderings and identical counters.
- [x] 6.3 Verify restart equivalence: a state parsed afresh equals a freshly parsed state
      with the counter at 0, asserted both after a solve and partway through a game.

## 7. Milestone verification

- [x] 7.1 Run `node --test test.js` and verify the whole suite passes with no test skipped.
- [x] 7.2 Verify every §6 scenario naming a core function has a corresponding test, and that
      the three straddling scenarios — pushing onto a pad, level solved, restarting — are
      covered in their core half only, with their rendering and HUD halves left to the shell
      milestone.
- [x] 7.3 Verify no `package.json` was added and that `game.js` and `test.js` reference no
      DOM global, so the core still loads and runs headless.
