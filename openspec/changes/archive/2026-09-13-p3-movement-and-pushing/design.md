## Context

See `proposal.md` for motivation. The inspected core has `parseLevel`, `renderText`, and a plain-data state with terrain rows, crate positions, bot position/facing, moves, and initial `solved: false`. The browser shell keeps the state in a `const`, draws after atlas load, and has no input listeners. Its existing `draw` already selects all facing frames and docked crates from terrain membership and updates `Moves: <count>`. Five unit tests currently cover parsing and text rendering.

The governing roadmap is `Dock Bot.md` §9; movement/pushing scenarios are in §6 and turn/counter constants in §3. P2's static/no-arrow scenario is explicitly scoped to P2 and is superseded for interactive play by this milestone, not treated as a permanent prohibition. Main OpenSpec specs are still empty, so the new capability does not create a MODIFIED delta against a nonexistent main spec. P2's physical display verification remains pending independently.

## Goals / Non-Goals

**Goals:** Keep collision and move-count decisions in the pure core; connect the shell through one transition function; retain terrain beneath entities and redraw only when something visible changes.

**Non-Goals:** Solve detection/freezing, restart, replay API, new-board generation, metadata/legend, undo, animation, or new runtime dependencies. `solved` remains the existing initial field in P3; detecting all-filled boards and ending play is P4. Filled-pad status in P3 means crate occupancy, already understood by both renderers.

## Decisions

### Direction strings match existing facing values

Use `up`, `down`, `left`, and `right` for `step(state, dir)`, with a four-entry offset map. Translate browser arrow-key names in the shell. This keeps DOM event names out of the core and lets P4 map replay letters to the same API. P3 defines behavior for valid directions and valid board states; no additional malformed-input contract is introduced.

### Return fresh state for every supported attempt

Copy the state object, bot object, crate objects, and terrain rows before modifying the result. On this 48-cell board the copy is small, avoids mutable aliases with prior states, and satisfies the explicit new-state contract even for blocked attempts. Reusing the input object for no-ops was considered but would conflict with that contract. Sharing terrain could work with a documented immutable terrain type; the current state is plain mutable data, so copying is simpler here.

Set facing on the result. Check the next cell against bounds and walls. If it contains a crate, check the cell beyond for bounds, walls, and any crate; move that one crate only after every check passes. Move the bot and add one to `moves` only when walking or pushing succeeds. Copy other fields unchanged. A small bounds/walkability helper and linear crate lookup are sufficient for three crates; a second occupancy structure adds synchronization work without a useful benefit at this size.

### Compare values before drawing

Change the shell's active state binding to `let`. After calling `step`, compare the previous and next move count and bot facing, then replace active state. In P3 every position or crate change increments the counter, and blocked visible changes affect only facing, so these comparisons cover all transition outcomes. Object identity would redraw no-ops because the core returns new objects. If later phases introduce changes with neither a counter nor facing change, revisit this small comparison at that time.

### Enable input after the first draw

Extend the existing once-only atlas load callback to draw the initial state and then register one document keydown listener. This avoids movement or drawing while the atlas is unavailable and leaves the startup state deterministic. The listener maps only the four arrow keys, prevents their default scrolling, and ignores `event.repeat` before invoking `step`. Unknown keys return without cancellation; R and N are not wired yet. No keyup state machine, timer, or animation loop is needed for the specified browser auto-repeat suppression.

The design gives no special modifier rule for arrow keys; recognized arrows follow the same handler even with modifiers if the browser delivers them. The explicit modifier exception for R belongs to P4. This decision avoids adding undocumented shortcut modes in P3.

### Verify behavior at both layers

Extend existing `test.js` with independent expected positions/text boards for four directions, floor/pad travel, successful pushes, walls, crate chains, bounds, terrain preservation, and immutability. Use constructed valid state fixtures for cases the initial arrangement does not reach conveniently. Deep-freeze inputs to detect accidental writes; compare repeated calls for deterministic results. Keep all current tests and run the entire suite using `node --test test.js`.

Verify the actual key listener over `file://` with individual presses, held-key repeats, unhandled keys, early input while the atlas is delayed, move-count updates, and a blocked-facing-only redraw followed by a no-op. Temporary browser debugger instrumentation can count clears and inspect state without adding a debug API or dependencies. Use the move prefix Up, Up, Right, Down, Left, Down, Right, Down: it docks a crate at `(3,3)` in eight moves and provides a real-input visual check before the P4 replay API exists. Inspect the occupied pad and HUD, and reload the page between independent scenarios since R is not implemented yet.

## Risks / Trade-offs

- [Blocked attempts increment moves or fail to turn] → Assert both position/counter preservation and updated facing for each blocking rule.
- [Pushes erase pads or move multiple crates] → Preserve terrain separately and test pushing onto/off pads plus two-crate blocking.
- [Fresh objects cause unnecessary redraws] → Compare counter/facing values rather than references and measure redraw counts in the browser.
- [Held arrows move repeatedly or scroll the page] → Cancel recognized arrows before discarding repeat events, then verify a press/hold/release/press cycle.
- [Milestone acceptance silently expands to solving] → Keep P3 tests focused on movement and occupancy; leave solved-state behavior for P4.

## Migration Plan

Implement in `game.js` and `test.js` on top of P2. No persisted state, external API, package install, or deployment changes are involved. Run all tests and the local-browser scenarios before accepting the change. Reverting the step export and keyboard hookup restores P2's static page. Existing P2 verification records remain unchanged.
