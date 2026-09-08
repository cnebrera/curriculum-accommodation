#!/usr/bin/env node
/**
 * The application icon (013 T030).
 *
 * The dock showed Electron's default, which announces the framework rather than
 * the product on the one surface a teacher sees before she has opened anything —
 * the same complaint that started this whole feature.
 *
 * `ui/src/components/Logo.tsx` already holds a designed mark with an argument
 * behind it: ground, ramp, threshold, door, and the door drawn identically
 * however you arrive. This renders that mark rather than inventing a second one,
 * because two marks drifting apart is this project's most familiar defect.
 *
 * ## Why it is drawn differently here
 *
 * Not scaled — redrawn for the size. The in-app mark is a thin stroke in the
 * accent colour on the page's own background, which is right at 19px beside a
 * wordmark and wrong at 32px in a dock, where a hairline disappears. So: a solid
 * plate in the brand teal with the mark in white, and the stroke thickened until
 * it survives the 32px render macOS actually uses in a menu bar.
 *
 * The component makes the same decision for the same reason — it draws a
 * separate path below 20px rather than scaling one down.
 *
 * ## Why Electron and not a converter
 *
 * No `rsvg-convert`, no `sharp`, and adding either for one PNG would be a
 * dependency for a build step. Playwright's own Chromium is not installed either
 * — `playwright.config.ts` says so in as many words: "No browsers are installed
 * and none are needed."
 *
 * But a Chromium *is* here, and it is the reason this application is Electron at
 * all (ADR 0008). So the icon is rendered by the same engine that renders the
 * PDF a teacher photocopies, launched the same way the screenshot script
 * launches it. Zero new dependencies for a build step that runs once a year.
 *
 *   npm run icon
 */
import { _electron as electron } from 'playwright';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'build');
mkdirSync(out, { recursive: true });

/** `--blue-600`, the fill that carries white text at 6.4:1. */
const BLUE = '#1b5fad';
const SIZE = 1024;

/*
 * The mark, at icon proportions.
 *
 * The viewBox is the component's own 36×32 so the geometry is literally the same
 * four paths; the plate around it supplies the margin a dock icon needs. macOS
 * leaves roughly a tenth of the canvas clear on each side and rounds the corners
 * at about 22% — matching that is what stops it looking like a web favicon
 * somebody dragged into an app bundle.
 *
 * The scale was 22 on the first attempt, which put the mark edge to edge with no
 * margin at all: it read as cramped rather than as an icon. Found by generating
 * it and looking at it, which is FR-1113 applying to the one image in this
 * application that a teacher sees before she has opened anything.
 */
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" rx="228" fill="${BLUE}"/>
  <g transform="translate(512 512) scale(19) translate(-18 -16)">
    <g fill="none" stroke="#ffffff" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 17 V11 Q24 6 29 6 Q34 6 34 11 V17"/>
      <path d="M24 17 H34"/>
      <path d="M2 26 H21"/>
      <path d="M3 26 L24 17"/>
    </g>
  </g>
</svg>`;

const app = await electron.launch({
  args: [join(process.cwd(), 'out', 'main', 'main.js'),
         `--user-data-dir=${mkdtempSync(join(tmpdir(), 'rampa-icon-'))}`],
  // Inactive and out of the dock — see the note in packages/shell/src/main.ts.
  env: { ...process.env, RAMPA_TEST: '1' },
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
await page.setViewportSize({ width: SIZE, height: SIZE });
// Replaces the application's own document. Nothing is saved: this window is
// thrown away with the temporary user-data directory below it.
await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
await page.screenshot({ path: join(out, 'icon.png'), omitBackground: true });
await app.close();

console.log(`Icono en ${join(out, 'icon.png')} (${SIZE}×${SIZE})`);
console.log('electron-builder deriva .icns, .ico y los tamaños de Linux de este fichero.');
