import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { sheetFontFaces } from '../src/sheet-fonts.js';

/**
 * The two faces the sheet needs, read from the repository's own font files (G76).
 *
 * The root is an argument, so no Electron is needed here — which is the shape
 * `boundary.test.ts` has pushed seven times: inject it, and it stops being bridge.
 */
const fonts = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', 'ui', 'src', 'assets', 'fonts');

describe('the sheet font faces', () => {
  it('are the regular and the bold, as woff2 data URIs with real bytes in them', async () => {
    const faces = await sheetFontFaces(fonts);
    expect(faces.map((f) => f.weight).sort()).toEqual([400, 700]);
    for (const f of faces) {
      expect(f.family).toBe('Atkinson Hyperlegible');
      expect(f.dataUri.startsWith('data:font/woff2;base64,')).toBe(true);
      // ~24 KB each; a stub or an empty read would be far shorter.
      expect(f.dataUri.length).toBeGreaterThan(10_000);
    }
  });

  it('degrades to what it finds rather than throwing', async () => {
    expect(await sheetFontFaces('/nowhere/at/all')).toEqual([]);
  });
});
