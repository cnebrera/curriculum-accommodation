import { describe, it, expect } from 'vitest';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, dirname, relative, extname } from 'node:path';

/**
 * The repository contains no pictogram asset (018 T001, SC-1601, FR-1601).
 *
 * ## Why this is written before the feature
 *
 * A licence assertion added after the feature works is an assertion written to fit
 * what already happens. This one has to be able to fail.
 *
 * ## What is actually at stake
 *
 * ARASAAC's pictograms are the property of the Gobierno de Aragón, created by
 * Sergio Palao, under **CC BY-NC-SA**. Rampa is Apache-2.0 for code and CC BY-SA
 * for content, and the incompatibility runs both ways:
 *
 * - **NonCommercial.** Apache-2.0 permits commercial use and BY-NC-SA forbids it.
 *   Bundling would hand every downstream user a restriction the rest of the licence
 *   says they do not have, and they would find out by being wrong.
 * - **ShareAlike**, which is sharper. BY-SA and BY-NC-SA are different licences, so
 *   this content cannot enter our corpus at all — and a worksheet with a pictogram
 *   embedded is a derivative work, so **her** sheet would become BY-NC-SA. A
 *   condition on her material that she did not choose and we imposed silently.
 *
 * So the set is hers, fetched under terms she accepts directly, and Rampa reads it
 * from where she put it.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const repoRoot = join(appRoot, '..');

/**
 * Ours, and each one accounted for. Anything else is a finding.
 *
 * Prefixes rather than exact paths for the screenshots, because `013`'s
 * before-and-after set grows when somebody documents a change — and an allow-list
 * that fails on documenting the interface is one somebody widens to `**` in
 * frustration.
 */
const OURS: Array<string | RegExp> = [
  // The application's own icon (`016`'s dock question, drawn by us).
  'app/build/icon.png',
  // Screenshots of our own interface, in the repository because `013`'s argument
  // is visual and a diff cannot carry it.
  /^docs\/screenshots\//,
  /*
   * The rehearsal's sample «photo» (`035` T005).
   *
   * Drawn by us, as an SVG rather than a photograph — inspectable instead of opaque,
   * which is the same argument `022` makes for diagrams. It depicts the worksheet a
   * teacher would bring, with the authored flaw in it, and it ships CC BY-SA like the
   * rest of the sample.
   *
   * Narrow on purpose: `sample/ensayo/` may hold **this** image and no other. A
   * directory-wide allowance here would be the hole this whole file exists to keep shut
   * — «no pictogram asset is in this repository» is a licence claim, and a wildcard is
   * how the next one arrives without anybody deciding.
   */
  'sample/ensayo/material/ensayo-1/source/pagina-1.svg',
];

const isOurs = (path: string): boolean =>
  OURS.some((o) => (typeof o === 'string' ? o === path : o.test(path)));

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.heic', '.tiff']);
const SKIP = new Set(['node_modules', '.git', 'out', 'dist', 'corpus', 'test-results',
  'playwright-report', 'deleteme', '.rampa']);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try { entries = await readdir(dir); } catch { return out; }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

describe('no pictogram asset is in this repository', () => {
  it('and no image at all that is not one of ours', async () => {
    const files = await walk(repoRoot);
    const images = files
      .filter((f) => IMAGE.has(extname(f).toLowerCase()))
      .map((f) => relative(repoRoot, f))
      .filter((f) => !isOurs(f));

    // The failure names the file, because «hay una imagen» sends somebody hunting.
    expect(images, 'an image not accounted for — see this file\'s header').toEqual([]);
  });

  /**
   * **This assertion found a real defect on its first run.**
   *
   * Atkinson Hyperlegible is bundled — SIL Open Font License 1.1, Copyright (c)
   * 2020 Braille Institute of America — and it was credited nowhere: not in
   * `NOTICE`, not in `LICENSE-CONTENT.md`, not in the built application. The OFL
   * requires the copyright notice to accompany the files.
   *
   * The same class of failure the whole of `018` is built around, found in our own
   * repository while writing the check meant to catch it elsewhere. **Closed the
   * same day** (backlog G21): the authoritative OFL 1.1 text was fetched from SIL's
   * own site rather than reproduced from memory, and sits beside the fonts.
   */
  it('credits every third-party asset it does bundle', async () => {
    const notice = await readFile(join(repoRoot, 'NOTICE'), 'utf8');
    expect(notice).toMatch(/Atkinson Hyperlegible/i);
    expect(notice).toMatch(/Open Font License/i);
    expect(notice).toMatch(/Braille Institute/i);
    // And it says what Rampa deliberately does not bundle, so a reader of NOTICE
    // learns the rule rather than inferring it from an absence.
    expect(notice).toMatch(/ARASAAC/);
  });

  /**
   * The licence text itself, beside the files it licenses.
   *
   * In the fonts' own directory rather than a central licence folder, because a
   * licence that can be separated from what it licenses is a licence that will be.
   */
  it('ships the OFL text, whole, with the fonts', async () => {
    const ofl = await readFile(
      join(appRoot, 'ui', 'src', 'assets', 'fonts', 'OFL.txt'), 'utf8');

    // Every section, so a truncated paste fails rather than passing quietly.
    for (const section of ['PREAMBLE', 'DEFINITIONS', 'PERMISSION & CONDITIONS',
      'TERMINATION', 'DISCLAIMER']) {
      expect(ofl, `OFL.txt is missing ${section}`).toContain(section);
    }
    expect(ofl).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
    // And the copyright line for the typeface actually bundled, not the template's
    // `<Copyright Holder>` placeholder.
    expect(ofl).toContain('Braille Institute of America');
    expect(ofl).not.toContain('<Copyright Holder>');
  });

  /**
   * The other half of FR-1601: nothing in the code fetches a set.
   *
   * A download button is what makes us the distributor, and it is the one line of
   * convenience anybody would add without thinking about it.
   */
  /**
   * The other half of FR-1601: nothing **fetches** a set.
   *
   * My first version flagged any file mentioning ARASAAC near a URL, and it caught
   * two of its own: `render/attribution.ts`, whose ARASAAC URL is **required by the
   * licence**, and `pictograms/set.ts`, whose comment says we do not download.
   * Seventh time in this project that a scan has flagged the thing explaining the
   * rule.
   *
   * What is actually forbidden is a network call, so that is what is checked —
   * over code with the comments stripped, in the modules that would do it.
   */
  it('nothing in the pictogram path can reach the network', async () => {
    const strip = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

    const files = [
      ...(await walk(join(appRoot, 'packages', 'core', 'src', 'pictograms'))),
      join(appRoot, 'packages', 'core', 'src', 'render', 'attribution.ts'),
      ...(await walk(join(appRoot, 'ui', 'src', 'pictograms'))),
    ].filter((f) => /\.tsx?$/.test(f));

    // A download button is what makes us the distributor, and it is the one line of
    // convenience anybody would add without thinking about it.
    const NETWORK = /\bfetch\s*\(|https?\.(get|request)\s*\(|XMLHttpRequest|axios|node-fetch/;
    const offenders: string[] = [];
    for (const f of files) {
      if (NETWORK.test(strip(await readFile(f, 'utf8')))) offenders.push(relative(appRoot, f));
    }

    expect(offenders, 'the set is fetched by her, never by us').toEqual([]);
    // And the scan is not passing because it found nothing to scan.
    expect(files.length).toBeGreaterThan(1);
  });
});
