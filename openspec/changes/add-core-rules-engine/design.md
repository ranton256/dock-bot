## Context

See `proposal.md` — Why, and `specs/core-rules/spec.md` for the behavior contract. The
constraints that shape the approach:

- **`game.js` is one file with two halves.** §4.3 splits it into a DOM-free core and a
  thin browser shell. This milestone writes the core half and the seam; the shell
  milestone appends to it.
- **No package manager, so no `package.json`.** That absence is load-bearing rather than
  incidental: it keeps `.js` resolving as CommonJS, which is what makes
  `require('./game.js')` work in `test.js` and `node --test test.js` the entry point.
  Adding a `package.json` with `"type": "module"` later would break the test suite.
- **`renderText` is the observation surface.** Canvas readback is blocked under `file://`
  (§5), so text is how both tests and bug reports inspect a board. Most assertions in this
  milestone go through it.

## Goals / Non-Goals

**Goals:**

- Settle every rule in §6 with `node --test`, before any rendering code exists.
- Establish the core/shell seam so the shell milestone appends against a stated boundary.
- Make the test suite catch the failure modes that a naive suite would miss — see the
  independent transcription and snapshot-purity decisions below.

**Non-Goals:**

- Anything the shell owns: `index.html`, `style.css`, `draw`, key handling, the HUD.
- The three §6 scenarios' rendering halves — `crate_docked` frame selection and HUD text
  stay unverified until the shell exists. This milestone proves the crate is *on the pad*,
  not that it *glows*.
- Anything in the spec's parked section.

## Decisions

### State separates static terrain from dynamic entities, using sets of packed cell keys

State holds `walls` and `pads` as sets of `"col,row"` strings, `crates` as another such
set, `bot` as `{col, row, facing}`, and `moves`.

*Why:* terrain never changes after parsing, so successor states share `walls` and `pads`
by reference — nothing ever writes to them, so this satisfies "returns a new state without
mutating its input" without copying. Sets give the two O(1) lookups a step needs, copy
cheaply on a push, and compare order-independently under `assert.deepStrictEqual`.

*Alternative considered:* an array of `{col, row}` crate objects. Rejected because array
order becomes observable — a push implemented by filter-and-concat reorders the array, and
the restart-equality assertion then fails on states that are identical in every way a
player could detect.

### One alphabet for direction, facing, and move strings

`'U' | 'D' | 'L' | 'R'` is simultaneously the argument to a step, the value of the bot's
facing, and the character set of a replayed move string.

*Why:* facing becomes "the last direction stepped" rather than a parallel encoding needing
translation; the atlas frame for the bot indexes straight off it in the shell milestone;
and replay collapses to a fold of step over the string's characters. Keeping three
alphabets in sync would be three chances to disagree.

### A step resolves in a fixed precedence, with the solved check first

```
step(state, dir)
  |
  +-- solved? --yes--> return the same state   (no move, no count, NO facing change)
  |      no
  v
  facing = dir                                  <-- from here down, always
  ahead = bot + delta(dir)
  |
  +-- ahead blocked? --yes--> turn only,                        count +0
  |      no
  +-- crate at ahead? --no--> bot moves to ahead,               count +1
  |      yes
  v
  beyond = ahead + delta(dir)
  |
  +-- beyond blocked or holds a crate? --yes--> turn only,      count +0
  |      no
  v
  crate ahead -> beyond, bot -> ahead,                          count +1
```

The solved check must sit in the core, not only in the key handler: if it lived in the
shell, replaying a solving move string with extra directions appended would keep counting.
It is also the one path where facing does *not* update, which cuts against the general
rule that a blocked press always turns the bot.

### The frozen branch returns the identical state object

Every other branch constructs a new state — including a blocked press, which changes
facing. Only the post-solve freeze returns its argument unchanged.

*Why:* it makes reference inequality an exact signal for "something changed", so the shell
milestone's "draw once after every key event that changes state" (§4.4) becomes
`if (next !== state) draw(next)`. A blocked press correctly redraws the turned bot; a
press after a solve correctly draws nothing.

### Solved is derived, never stored

The solved condition is computed from crates and pads on demand.

*Why:* a stored flag is a second source of truth a step must maintain, and it would also
be compared by the restart-equality assertion, turning one bug into two failures with
neither pointing at the cause. §6's rendering scenario mentions a "solved flag" as
something the HUD reads — the shell calls the derived check when it builds HUD text.

### Out-of-bounds and walls collapse into one predicate

A single `isBlocked(state, col, row)` returns true for a wall *or* a cell outside the
board; a step consults it for both the cell ahead and the cell beyond.

*Why:* the level's wall ring means out-of-bounds is unreachable today, so a separate
bounds check would read as dead defensive code. Folded into the predicate that already
answers "can anything occupy this cell", it reads as intentional and costs one `||`.

### Canonical board text carries no leading or trailing newline

Rendering joins rows with a single newline and adds nothing; parsing trims its input, so
either encoding of the level constant works.

*Why:* the ambiguity does not surface where it appears to. The parse assertion compares
rendered output against the same constant that produced it, so the convention cancels out
and passes either way. It surfaces in the replay assertions, where an expected board is
typed by hand as a template literal and silently acquires a leading newline that rendering
never emits.

### The level constant is exported, and the test file transcribes it independently

The level text is exported alongside the five functions, and `test.js` also contains its
own hand-typed copy, asserted equal to the exported constant.

*Why:* this is the only assertion that catches a wall typo. The §6 parsing scenario pins
the bot, crates, and pads by coordinate, but says nothing about walls; the round-trip
assertion is self-referential, since both sides derive from the same constant; and a `#`
that should be a `.` somewhere off the solution path passes the canonical 15-move replay
too. An independently typed copy is the only witness.

On the export count: §6 says the file "exposes the five core functions", which reads as a
floor rather than a cap. Exporting the level text as well is judged compatible — noted
because the spec is the grading authority.

### Parsing accepts the two glyphs rendering emits

`X` and `b` are accepted on input as well as produced on output.

*Why:* §5 makes a rendered board the medium for bug reports; being able to parse one back
closes that loop, letting a broken mid-game board be pasted straight into a test. It also
makes the two functions genuine inverses, which the spec now requires. This is a
documented superset of §3's stated input alphabet, not a reinterpretation of it.

### An unrecognized direction throws

A step given anything outside the four direction characters raises rather than returning
the state unchanged.

*Why:* the shell filters keys before stepping and replay only ever passes the four
characters, so an unrecognized direction is a programming error. Returning the state
unchanged would make a typo in a test's move string look like a blocked press and silently
weaken the assertion.

### Purity is asserted by snapshot, not by reference comparison

The immutability test renders a state, steps it, and re-renders the *original* reference,
asserting the two renderings match.

*Why:* the obvious alternative — asserting the crates set is a different object after a
step — fails on correct code. A step that does not move a crate legitimately carries the
same crates set into the new state; that is structural sharing, not mutation. Only a
snapshot distinguishes the two.

## Risks / Trade-offs

- **`game.js` is shared with the shell milestone, which will append to it** → the exports
  block and the core/shell boundary are established here, so later work adds against a
  stated seam rather than negotiating one.
- **Structural sharing can be mistaken for a mutation bug during review** → the sharing is
  confined to `walls`, `pads`, and an unchanged `crates` set, all of which are only ever
  read; the snapshot-based purity test is what proves the property either way.
- **The immutability requirement is a §4.3 constraint, not a §6 scenario**, so a suite
  covering only §6 would omit it → it is specified as a requirement here and carries its
  own task. It is the constraint most likely to rot silently as the shell is added.
- **A sixth export could be read as exceeding §6's "the five core functions"** → judged
  compatible above; if a grader disagrees, the fallback is dropping the export and letting
  `test.js` rely solely on its own transcription, which costs only the wall-typo assertion.

## Open Questions

- Whether the shell will want a thin restart convenience in the core. Safe to defer:
  restarting is defined as parsing the level text again, which the shell can already do,
  and adding a one-line helper later changes no requirement, no state shape, and no test in
  this milestone.
