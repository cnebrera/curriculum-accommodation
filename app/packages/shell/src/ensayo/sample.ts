import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { corpusRoot } from '../corpus/bundle.js';

/**
 * Where the authored sample is, and what it says (035 T004/T005).
 *
 * ## Why locating the corpus is its own module
 *
 * `corpus-guarantees.test.ts` refuses any shell module that can **both** locate the corpus
 * and write — the corpus is read-only at runtime (`006` FR-413), and a module that knows
 * where it is and also calls `writeFile` is one line away from writing into it.
 *
 * The store had both: it read `corpusRoot()/sample` and wrote the rehearsal root. Nothing
 * was wrong with what it did, and the guard was still right — so the read lives here and
 * the writes live there. It is also the better shape: the thing that touches read-only
 * files cannot write, by construction rather than by care.
 */

/** The authored sample, in the bundle. Read-only: seeding copies out of it. */
export const sampleRoot = (): string => join(corpusRoot(), 'sample', 'ensayo');

/**
 * The manifest, read from the bundle rather than from the rehearsal copy.
 *
 * Deliberately not seeded into the rehearsal root: it describes the sample — the authored
 * flaw, the would-be costs — and is not part of the material she rehearses with. A copy
 * inside the root would be a second version of it that her signing could touch.
 */
export const sampleManifest = (): Promise<string> =>
  readFile(join(sampleRoot(), 'manifest.yaml'), 'utf8');
