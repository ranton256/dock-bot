# Tooling

None of this ships. The game is exactly the five files the specification lists —
`index.html`, `style.css`, `game.js`, `test.js`, `assets/dock_bot.png` — and
nothing here is referenced by any of them.

Everything in this directory uses the **Node standard library only**, matching the
project's no-package-manager constraint. The single exception is `browser/`, which
needs a browser driver and is quarantined with its own manifest; see its README.

**The repository root must never gain a `package.json`.** Its absence is what keeps
`.js` resolving as CommonJS, which is what lets `test.js` do `require('./game.js')`.
`test.js` asserts this.

## Producing the atlas

| File | Purpose |
|---|---|
| `atlas.js` | The frame maps and palette. Pixel art authored as ASCII, one character per pixel, so a shape or a colour is a reviewable diff. |
| `png.js` | A PNG writer over `node:zlib`. No dependency is available, and none is needed. |
| `build-atlas.js` | Writes `assets/dock_bot.png`. Reproducible byte for byte. |

## Checking the atlas

| File | Purpose |
|---|---|
| `decode-png.js` | A PNG decoder, deliberately sharing no code with the writer. |
| `validate-atlas.js` | Audits the shipped file: dimensions, frame placement, the terrain/entity opacity split, binary alpha, palette size. It decodes the bytes and transcribes the frame table from the specification rather than importing either from the generator — otherwise it would only prove the generator agrees with itself. |
| `validate-selftest.js` | Corrupts synthetic atlases to prove each check actually fails. A validator that has never failed proves nothing. |
| `preview.js` | Renders a review sheet at ×3 for the two judgements a machine cannot make: that the four bot facings read as one robot, and that a docked crate is obvious. Writes outside the repository by default. |

## Checking the game

| File | Purpose |
|---|---|
| `mutate-core.js` | Breaks one rule in `game.js` at a time and requires the suite to notice. Includes a control that is *expected* to survive, which is the argument for `test.js` transcribing the level map independently. |
| `shell-harness.js` | Runs `game.js` against a stubbed DOM and asserts on what it would have drawn: draw order, frame per facing, repeat suppression, redraw-on-change. |
| `browser/` | The §7 acceptance checklist against a real `file://` URL, with screenshots. The one tool with a dependency. |

## Running everything

```
node --test test.js              # the core suite
node tools/mutate-core.js        # does that suite have teeth
node tools/shell-harness.js      # the shell, headless
node tools/validate-atlas.js     # the shipped atlas
node tools/validate-selftest.js  # does the validator have teeth
cd tools/browser && npm install && npm run checklist
```
