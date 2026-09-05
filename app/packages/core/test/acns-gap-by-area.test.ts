import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { draftAcns, parseGuideCorpus, curFor, type RecordEntry, type Profile } from '../src/index.js';

/**
 * Marco's ACNS conversation, per área (032 T017, FR-3004, SC-3003, quickstart §4).
 *
 * ## Why this one is separate from `guide-acns.test.ts`
 *
 * That file's claim is «an ACNS draft is a rendering of work that already exists, not a
 * generation», and it holds for every learner. This one's claim is narrower and sharper:
 * for a learner whose curricular level differs by subject, the draft must cite **this**
 * subject's, and must never present the general one as if it were the área's.
 *
 * What makes it worth its own file is what the document is. An ACNS is signed and filed:
 * a wrong number in a worksheet is a bad afternoon, and a wrong number here is a claim
 * about a child in a record that follows him. So the assertions below are mostly about
 * what must **not** appear.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseGuideCorpus(readFileSync(join(root, 'instructions', 'guide.md'), 'utf8'));

const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({
  jobId: 'job-1', learner: 'M01', date: '2026-03-03', schoolYear: '2025-2026',
  kind: 'worksheet', signedOff: true, revision: 1,
  source: { of: 'pasted' },
  documents: {
    ir: 'material/job-1/ir.md', adapted: 'material/job-1/M01/adapted.md',
    revisions: [], rendered: [],
  },
  missing: [],
  ...over,
});

/** Marco: at level in Lengua, two courses behind in Matemáticas, general 2. */
const marco = {
  code: 'M01', axes: { CUR: 2 }, cur_areas: { 'Matemáticas': 2, 'Lengua': 0 },
  works: [], avoid: [], interests: [], response: {}, language: {},
} as unknown as Profile;

/** What `draftAcnsJob` assembles, through the one helper every consumer uses. */
const draftFor = (subject?: string) => {
  const cur = curFor(marco, subject);
  return draftAcns({
    learnerCode: 'M01', year: '5.º de Primaria', stage: 'Primaria',
    sections: corpus.acnsSections, on: '2026-06-12', overlay: null,
    record: [entry()],
    ...(subject ? { subject } : {}),
    ...(cur !== null
      ? { desfase: {
          cur,
          fromPair: subject !== undefined && marco.cur_areas?.[subject] !== undefined,
        } }
      : {}),
  });
};

describe('each área\'s draft cites its own recorded level', () => {
  it('the Matemáticas draft cites the Matemáticas note', () => {
    const { markdown } = draftFor('Matemáticas');
    expect(markdown).toContain('Tú tienes apuntado');
    expect(markdown).toContain('**Matemáticas**');
    expect(markdown).toContain('con contenidos de cursos anteriores');
  });

  it('and the Lengua draft says he is at level there', () => {
    const { markdown } = draftFor('Lengua');
    expect(markdown).toContain('**Lengua**');
    expect(markdown).toContain('al nivel de su curso');
    /*
     * The failure this replaces: with one CUR per learner, Marco's Lengua ACNS cited a
     * two-course gap that his teacher had explicitly recorded as not existing in that
     * subject — in a document she signs.
     */
    expect(markdown).not.toContain('con contenidos de cursos anteriores');
  });

  it('never another área\'s number, in either direction (SC-3003)', () => {
    // Asserted both ways round, because a single-direction check passes on a draft that
    // simply prints both.
    expect(draftFor('Matemáticas').markdown).not.toContain('**Lengua**');
    expect(draftFor('Lengua').markdown).not.toContain('**Matemáticas**');
  });
});

describe('the general is cited only where there is no pair, and says so', () => {
  it('an área she never detailed is named as undetailed', () => {
    const { markdown } = draftFor('Inglés');
    expect(markdown).toContain('No tienes nada apuntado para **Inglés**');
    expect(markdown).toContain('en general');
    /*
     * «Never zero by omission» reaching the one document that gets filed: reading the
     * absent pair as 0 would have this draft assert, in writing, that a child is at his
     * year's level in a subject nobody assessed.
     */
    expect(markdown).not.toContain('al nivel de su curso');
  });

  it('and a draft with no área at all still says the value is the general one', () => {
    const { markdown } = draftFor();
    expect(markdown).toContain('en general');
    expect(markdown).toContain('este área');
  });
});

describe('what the draft still refuses to write', () => {
  it('the desfase itself is hers, whatever she has recorded', () => {
    /*
     * The line that must survive this feature. What is printed is her profile note; the
     * desfase the regulation asks for comes from a psycho-pedagogical evaluation, and a
     * profile note presented as its conclusion would be falsifying the *what*
     * (Principle III).
     */
    for (const subject of ['Matemáticas', 'Lengua', 'Inglés', undefined]) {
      const { markdown, missing } = draftFor(subject);
      expect(markdown, `${subject ?? 'sin área'}`).toContain('evaluación psicopedagógica');
      expect(missing.join(' '), `${subject ?? 'sin área'}`).toContain('Desfase curricular');
    }
  });

  it('and a learner with nothing recorded gets the empty section, exactly as before', () => {
    const blank = { code: 'B01', axes: {}, cur_areas: undefined } as unknown as Profile;
    const { markdown, missing } = draftAcns({
      learnerCode: 'B01', sections: corpus.acnsSections, on: '2026-06-12',
      overlay: null, record: [entry({ learner: 'B01' })], subject: 'Matemáticas',
      // `curFor` answers null, so the caller passes no `desfase` — the pre-`032` state.
      ...(curFor(blank, 'Matemáticas') !== null ? { desfase: { cur: 0 as const, fromPair: false } } : {}),
    });
    expect(missing).toContain('Desfase curricular');
    expect(markdown).toContain('Esto lo tienes que poner tú');
    expect(markdown).not.toContain('Tú tienes apuntado');
  });
});
