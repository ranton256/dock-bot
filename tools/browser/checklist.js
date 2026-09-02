'use strict';

// The specification's section 7 acceptance checklist, driven against a file://
// URL. See README.md in this directory for why this is the one tool with a
// dependency, and why the repository root must stay free of a package.json.
//
// Usage: node tools/browser/checklist.js [--shots <dir>]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..', '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const argShots = process.argv.indexOf('--shots');
const SHOTS = argShots > -1 ? process.argv[argShots + 1] : path.join(__dirname, 'shots');

// playwright-core never downloads browsers, so find one already installed.
function findChromium() {
  if (process.env.DOCK_BOT_CHROMIUM) return process.env.DOCK_BOT_CHROMIUM;
  const caches = [
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
    path.join(os.homedir(), '.cache/ms-playwright'),
  ];
  const candidates = [
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-linux/chrome',
  ];
  for (const cache of caches) {
    if (!fs.existsSync(cache)) continue;
    const versions = fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const v of versions) {
      for (const c of candidates) {
        const exe = path.join(cache, v, c);
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  throw new Error('No Chromium found. Set DOCK_BOT_CHROMIUM to a Chromium executable.');
}

const failures = [];
const checks = [];
function check(name, actual, expected, note) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ name, pass, actual, expected, note });
  if (!pass) failures.push(name);
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChromium() });
  // Device scale 2 exercises the second scaling stage: the compositor resampling
  // the finished canvas, which disabling context smoothing does nothing about.
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const consoleMessages = [];
  const pageErrors = [];
  const requests = [];
  page.on('console', (m) => consoleMessages.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('requestfailed', (r) => pageErrors.push(`request failed: ${r.url()}`));
  page.on('request', (r) => requests.push(r.url().replace('file://' + ROOT + '/', '')));

  await page.goto(URL);
  await page.waitForFunction(() => document.getElementById('hud').textContent === 'Moves: 0');
  await page.waitForTimeout(500);

  const hud = () => page.evaluate(() => document.getElementById('hud').textContent);
  const canvas = page.locator('#board');
  const press = async (k) => page.keyboard.press(k);
  const ARROW = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  const play = async (moves) => { for (const c of moves) await press(ARROW[c]); };

  // 7.1 boot
  check('7.1 boots reading "Moves: 0"', await hud(), 'Moves: 0');
  check('7.1 no console messages', consoleMessages, []);
  check('7.1 no page errors', pageErrors, []);

  // 3.3 the atlas is the only resource beyond the document's own files
  check('3.3 requests only the document files and the atlas',
    requests.filter((r) => !['index.html', 'style.css', 'game.js'].includes(r)),
    ['assets/dock_bot.png']);

  // The specification's premise for renderText, verified rather than assumed.
  check('canvas readback is blocked once the atlas came from file://',
    await page.evaluate(() => {
      try { document.getElementById('board').getContext('2d').getImageData(0, 0, 1, 1); return 'allowed'; }
      catch (e) { return e.name; }
    }), 'SecurityError');

  // 3.1 the board appeared
  await canvas.screenshot({ path: path.join(SHOTS, 'boot.png') });
  check('3.1 the board is drawn', fs.statSync(path.join(SHOTS, 'boot.png')).size > 1000, true);

  // 7.3 one cell per press, and no repeat while a key is held
  await press('ArrowUp');
  check('7.3 one press is one move', await hud(), 'Moves: 1');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowDown');
  check('7.3 holding a key for 1200ms still yields one move', await hud(), 'Moves: 2',
    'real OS auto-repeat, not a synthesised flag');

  // 7.6 restart
  await press('r');
  check('7.6 R restarts mid-game', await hud(), 'Moves: 0');

  // 7.4 a docked crate glows
  await play('UURDLDR');
  await canvas.screenshot({ path: path.join(SHOTS, 'one-docked.png') });
  check('7.4 one crate docked', await hud(), 'Moves: 7');

  // 7.7 the canonical solution
  await press('r');
  await play('UURDLDRDRRUURUL');
  const solved = await hud();
  check('7.7 the canonical solution solves in 15', solved, 'Solved in 15 moves — press R');
  check('7.7 the dash is a real em dash',
    'U+' + solved.codePointAt(solved.indexOf('—')).toString(16).toUpperCase(), 'U+2014');
  await canvas.screenshot({ path: path.join(SHOTS, 'solved.png') });

  // 7.5 solving freezes the arrows, byte for byte
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) await press(k);
  for (const k of ['a', 'Z', '5', 'Space', 'Tab', 'Enter']) await press(k);
  await canvas.screenshot({ path: path.join(SHOTS, 'solved-after-keys.png') });
  check('7.5 the display is unchanged after a solve', await hud(), 'Solved in 15 moves — press R');
  check('7.5 the canvas is unchanged after a solve',
    fs.readFileSync(path.join(SHOTS, 'solved.png')).equals(fs.readFileSync(path.join(SHOTS, 'solved-after-keys.png'))),
    true, 'screenshots compared byte for byte');

  // 7.6 restart from a solved board
  await press('R');
  check('7.6 R restarts from a solved board', await hud(), 'Moves: 0');

  check('no console messages for the whole run', consoleMessages, []);
  check('no page errors for the whole run', pageErrors, []);

  await browser.close();

  for (const c of checks) {
    console.log(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.name}${c.note ? '  (' + c.note + ')' : ''}`);
    if (!c.pass) console.log(`        expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`);
  }
  console.log(`\nscreenshots in ${SHOTS}`);
  console.log(`${checks.length - failures.length}/${checks.length} checks passed`);
  if (failures.length) process.exit(1);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
