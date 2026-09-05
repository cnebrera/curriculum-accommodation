import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Every rehearsal screen is marked, and that is a property of the tree
 * (035 T010, FR-3305, SC-3304).
 *
 * ## Why this is a test about imports
 *
 * «100% of rehearsal screens carry the mark» is true the day it is written and false four
 * screens later — somebody adds one, forgets the banner, and the screen that looks most
 * like the real application is the one with nothing on it saying it is not.
 *
 * What is at stake is not confusion. It is a teacher printing the example sheet and
 * handing it to a child, which is why the sample documents also carry «material de
 * ejemplo» in their own content: the page says it even when no screen did.
 */
const uiSrc = join(dirname(new URL(import.meta.url).pathname), '..', 'src');
const ensayo = join(uiSrc, 'ensayo');

const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? walk(p) : (/\.tsx$/.test(e) ? [p] : []);
});

describe('the rehearsal mark is structural', () => {
  it('there are rehearsal screens to check', () => {
    // The guard on the guard: an empty directory satisfies every assertion below.
    expect(walk(ensayo).length).toBeGreaterThan(1);
  });

  it('every screen renders inside `EnsayoFrame`', () => {
    const offenders = walk(ensayo)
      .filter((f) => !f.endsWith('EnsayoFrame.tsx'))
      .filter((f) => !readFileSync(f, 'utf8').includes('<EnsayoFrame'))
      .map((f) => f.replace(`${uiSrc}/`, ''));
    expect(offenders, 'a rehearsal screen with no mark on it').toEqual([]);
  });

  it('and the frame says what this is in words, not in colour', () => {
    /*
     * `010` FR-812, and here more than anywhere: a colourblind reader, a bad school
     * screen and a photocopy all have to be able to tell a rehearsal from the real thing.
     */
    const frame = readFileSync(join(ensayo, 'EnsayoFrame.tsx'), 'utf8');
    expect(frame).toContain('Estás en un ensayo');
    expect(frame).toContain('no existe');
    expect(frame).toContain('No cuesta dinero');
  });

  it('and the way out is always there', () => {
    // Never a flow she has to finish: she came to look, and «salir» is one press from
    // anywhere inside it.
    expect(readFileSync(join(ensayo, 'EnsayoFrame.tsx'), 'utf8'))
      .toContain('Salir del ensayo');
  });
});
