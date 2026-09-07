import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseFrontMatter } from '../src/index.js';

/**
 * The disclosure and the permission are one list (034 T013, FR-3204).
 *
 * ## The failure this prevents is not the obvious one
 *
 * Two lists do not fail by the code connecting somewhere undeclared — that would be
 * caught by anybody watching. They fail by a **third destination being added and the
 * screen still saying two**: the disclosure keeps being accurate about the world it was
 * written in, and nobody notices it has stopped describing this one.
 *
 * So there is one list, in the corpus, and the screen renders it. This test is what says
 * the screen renders it rather than a copy.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const raw = readFileSync(join(repoRoot, 'instructions', 'updates.md'), 'utf8');
const declared = parseFrontMatter(raw, 'instructions/updates.md').data['destinations'] as
  Array<Record<string, string>>;

describe('what the corpus declares', () => {
  it('is a real list, and every entry says where, when and what it sends', () => {
    expect(Array.isArray(declared)).toBe(true);
    expect(declared.length).toBeGreaterThan(2);
    for (const d of declared) {
      expect(d['url']?.startsWith('https://'), d['id']).toBe(true);
      expect(d['what'], d['id']).toBeTruthy();
      // «Cuándo» and «qué manda» are the two a DPO asks about, and the two a list of
      // bare URLs cannot answer.
      expect(d['when'], d['id']).toBeTruthy();
      expect(d['sends'], d['id']).toBeTruthy();
    }
  });

  it('and covers the four things this feature can do', () => {
    const ids = declared.map((d) => d['id']);
    expect(ids).toContain('release-check');
    expect(ids).toContain('releases-page');
    expect(ids).toContain('corpus-manifest');
    expect(ids).toContain('corpus-files');
  });

  it('and says plainly that nothing is downloaded, installed or sent', () => {
    expect(raw).toContain('No se descarga ni se instala');
    expect(raw).toContain('No se manda nada tuyo');
    // Including the honest half: an HTTP request carries an IP because every request
    // does, and pretending otherwise would be the kind of claim that gets found out.
    expect(raw.replace(/\s+/g, ' ')).toContain('dirección IP');
  });
});

describe('and the screen renders that list rather than a copy of it', () => {
  const about = readFileSync(
    join(repoRoot, 'app', 'ui', 'src', 'about', 'AboutScreen.tsx'), 'utf8');

  it('«Acerca de» reads the declaration through the data layer', () => {
    expect(about).toContain('useUpdateDestinations');
    expect(about).toContain('¿A dónde se conecta exactamente?');
  });

  it('and hardcodes no host of its own', () => {
    /*
     * The thing that would make the two lists two again: a screen that spells out
     * `api.github.com` is a screen that keeps saying it after the code stops.
     */
    const code = about.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(code).not.toContain('api.github.com');
    expect(code).not.toContain('raw.githubusercontent.com');
  });

  it('and the reacher reads it too, so neither can drift from the other', () => {
    /*
     * `updates/release.ts` since 2026-09-07, and the move is the point rather than a
     * detail: this lived in `corpus/links.ts` until the Electron-surface bound refused
     * it there, so the check now takes the version as an argument and imports no
     * framework. What this guard is about did not change — whoever reaches the network
     * reads the **declared** destination and never a host of its own.
     */
    const reacher = readFileSync(
      join(repoRoot, 'app', 'packages', 'shell', 'src', 'updates', 'release.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(reacher).toContain("destination('release-check')");
    expect(reacher).not.toContain('api.github.com');

    // And the file it left behind does not grow its own copy.
    const links = readFileSync(
      join(repoRoot, 'app', 'packages', 'shell', 'src', 'corpus', 'links.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(links).not.toContain('api.github.com');
  });
});
