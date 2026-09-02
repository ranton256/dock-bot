# Browser acceptance checks

Runs the specification's §7 checklist against a `file://` URL — the way the game
is actually meant to be opened — and saves screenshots of the canvas.

This is the one piece of tooling with a dependency. Everything in `tools/` above
this directory uses the Node standard library only; driving a real browser does
not have a stdlib answer, so it is quarantined here with its own manifest.

**The root of the repository must never gain a `package.json`.** It would change
how `game.js` resolves and break `require('./game.js')` in `test.js`. A manifest
in this subdirectory only governs files inside it, which is why it is safe here.

## Running

```
cd tools/browser
npm install
npm run checklist
```

`playwright-core` does not download browsers. It needs a Chromium already on the
machine; set `DOCK_BOT_CHROMIUM` to one, or let the script find a Playwright
browser cache at `~/Library/Caches/ms-playwright` (macOS) or `~/.cache/ms-playwright`.

## What it checks

Boot state and console cleanliness, that the atlas is the only resource beyond
the document's own files, one move per press, that a *held* key still yields one
move, restart, the freeze after solving, the solved message and its em dash, and
the canonical 15-move solution. It also confirms the specification's premise for
`renderText`: that canvas readback throws once the atlas came from `file://`.

Screenshots land in `shots/`. They are the evidence for the two checks a machine
cannot make on its own — that the art is crisp, and that a docked crate glows.
