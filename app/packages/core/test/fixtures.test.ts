import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseIR } from '../src/ir/parse.js';

/**
 * The fixture set (008 T024, quickstart §4).
 *
 * This asserts the **ground truth**, not the extraction — the extraction needs a
 * key. That is the point: this is the harness SC-601 and SC-602 are measured
 * with, and a harness nobody runs rots. Checking that every fixture is
 * well-formed is what keeps it usable on the day someone has a key.
 *
 * A fixture with no ground truth is not a fixture. It is a photograph.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const root = join(repoRoot, 'cases', '003-ingest-fixtures');

const dirs = readdirSync(root)
  .filter((d) => statSync(join(root, d)).isDirectory())
  .sort();

describe('the fixture set exists and is usable', () => {
  it('has fixtures at all', () => {
    // A suite that finds nothing passes vacuously, which is the failure mode of
    // every fixture harness ever written.
    expect(dirs.length).toBeGreaterThanOrEqual(3);
  });

  it('explains what each one is for', () => {
    // The reason a fixture exists is the thing nobody remembers in a year, and
    // without it a badly-lit photograph is indistinguishable from an accident.
    for (const d of dirs) {
      const notes = join(root, d, 'notes.md');
      expect(existsSync(notes), `${d} has no notes.md`).toBe(true);
      const text = readFileSync(notes, 'utf8');
      expect(text.length, `${d}/notes.md is too short to say anything`).toBeGreaterThan(200);
      expect(text, `${d}/notes.md does not say what it measures`).toMatch(/mide|falla/i);
    }
  });

  it('says plainly which parts are missing, rather than looking complete', () => {
    // The photographs need a printer and a phone. Every fixture that has not
    // been photographed says so, so the gap is visible rather than discovered.
    for (const d of dirs) {
      const notes = readFileSync(join(root, d, 'notes.md'), 'utf8');
      const hasImage = readdirSync(join(root, d)).some((f) => /\.(jpe?g|png|heic)$/i.test(f));
      if (!hasImage) {
        expect(notes, `${d} has no photograph and does not say so`).toMatch(/falta|Lo que falta/i);
      }
    }
  });
});

describe('every ground truth is well-formed IR', () => {
  const withTruth = dirs.filter((d) => existsSync(join(root, d, 'ground-truth.md')));

  it('has at least one', () => {
    expect(withTruth.length).toBeGreaterThanOrEqual(2);
  });

  it.each(withTruth)('%s parses, and its blocks are complete', (d) => {
    const doc = parseIR(readFileSync(join(root, d, 'ground-truth.md'), 'utf8'));

    expect(doc.blocks.length, 'no blocks at all').toBeGreaterThan(2);

    const ids = doc.blocks.map((b) => b.id);
    expect(new Set(ids).size, 'duplicate block ids').toBe(ids.length);

    for (const b of doc.blocks) {
      expect(b.attrs['data-page'], `${b.id} has no page`).toBeTruthy();
      expect(b.attrs['data-source-id'], `${b.id} has no source block id`).toBeTruthy();
      expect(b.classes.length, `${b.id} has no class`).toBeGreaterThan(0);

      // Every figure carries a role and both descriptions — the accessibility
      // failure this project exists to prevent, arriving through its own harness.
      if (b.classes.includes('figure')) {
        expect(b.attrs['data-role'], `${b.id} figure has no role`).toBeTruthy();
        if (b.attrs['data-role'] !== 'decorative') {
          expect(b.attrs['data-alt'], `${b.id} has no short description`).toBeTruthy();
          expect(b.attrs['data-longdesc'], `${b.id} has no long description`).toBeTruthy();
        }
      }
    }
  });

  it.each(withTruth)('%s is never marked verified', (d) => {
    // A ground truth that claims to be verified would let a fixture run bypass
    // the gate it is meant to exercise.
    const raw = readFileSync(join(root, d, 'ground-truth.md'), 'utf8');
    expect(raw).toMatch(/"verified":\s*false/);
  });

  it.each(withTruth)('%s keeps its exercise numbers as printed', (d) => {
    const doc = parseIR(readFileSync(join(root, d, 'ground-truth.md'), 'utf8'));
    const exercises = doc.blocks.filter((b) => b.classes.includes('exercise'));
    expect(exercises.length, 'a worksheet fixture with no exercises').toBeGreaterThan(1);
    for (const b of exercises) {
      const n = b.attrs['data-number'];
      expect(n, `${b.id} has no printed number`).toBeTruthy();
      // As printed: a string, and never zero-padded or normalised.
      expect(n).not.toMatch(/^0\d/);
    }
  });

  it('has a fixture whose numbering restarts, because that case must not be rejected', () => {
    /*
     * `validate.ts` flags non-monotone numbering and deliberately does not reject
     * it: a worksheet may genuinely restart per section. That decision needs a
     * fixture, or the next person to read the code will "fix" it into a rejection.
     */
    const restarting = withTruth.filter((d) => {
      const doc = parseIR(readFileSync(join(root, d, 'ground-truth.md'), 'utf8'));
      const numbers = doc.blocks
        .filter((b) => b.classes.includes('exercise'))
        .map((b) => Number(b.attrs['data-number']))
        .filter((n) => Number.isFinite(n));
      return numbers.some((n, i) => i > 0 && n < numbers[i - 1]!);
    });
    expect(restarting.length, 'no fixture exercises restarting numbering').toBeGreaterThan(0);
  });

  it('carries no learner name and no real class material', () => {
    // Two reasons, each sufficient: publisher material is copyrighted, and a real
    // worksheet may carry a child's handwritten name — which is the exact residual
    // this feature documents. Committing one would be that failure, made
    // permanent, by us.
    for (const d of withTruth) {
      const raw = readFileSync(join(root, d, 'ground-truth.md'), 'utf8');
      expect(raw).not.toMatch(/Nombre:\s*\p{Lu}\p{Ll}+/u);
      expect(raw).not.toMatch(/\b(Santillana|Anaya|SM|Edelvives|Vicens Vives|Oxford)\b/);
    }
  });
});
