import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Icon, type IconName } from '../src/components/Icon.js';

/**
 * The icon set is closed, and this is the lock (041 FR-3916–FR-3918).
 *
 * The contract (`specs/041-el-acabado-visual/contracts/icon-set.md`) lists every name
 * with the place it is used. The component holds the strokes. The two are two copies of
 * one truth — the shape every defect in this repository has had — so they are checked
 * against each other: a name in one and not the other fails.
 */
const here = dirname(new URL(import.meta.url).pathname);
const contract = readFileSync(
  join(here, '..', '..', '..', 'specs', '041-el-acabado-visual', 'contracts', 'icon-set.md'), 'utf8');
const contractNames = [...contract.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]!);

const source = readFileSync(join(here, '..', 'src', 'components', 'Icon.tsx'), 'utf8');
const sourceNames = [...source.matchAll(/^  '([a-z0-9-]+)': \[/gm)].map((m) => m[1]!);

describe('the icon set', () => {
  it('is the thirty the contract lists — no more, no fewer', () => {
    expect(contractNames.length).toBe(30);
    expect([...sourceNames].sort()).toEqual([...contractNames].sort());
  });

  it('ships its licence beside the strokes', () => {
    const licence = readFileSync(join(here, '..', 'src', 'components', 'LICENSE-lucide.txt'), 'utf8');
    expect(licence).toContain('ISC License');
    expect(licence).toContain('Lucide');
  });

  it('is hidden from the accessibility tree and coloured by its text', () => {
    for (const name of sourceNames as IconName[]) {
      const html = renderToStaticMarkup(<Icon name={name} />);
      expect(html, name).toContain('aria-hidden="true"');
      expect(html, name).toContain('stroke="currentColor"');
      expect(html, name).toContain('viewBox="0 0 24 24"');
      // Nothing empty: a name with no strokes would render an invisible box.
      expect(html, name).toMatch(/<(path|circle|rect|line|polyline)\b/);
    }
  });

  it('is 1em by default, so it is the size of the word beside it', () => {
    expect(renderToStaticMarkup(<Icon name="check" />)).toContain('width="1em"');
    expect(renderToStaticMarkup(<Icon name="users" size={20} />)).toContain('width="20"');
  });
});
