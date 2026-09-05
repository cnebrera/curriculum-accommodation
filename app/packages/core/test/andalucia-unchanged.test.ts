import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  draftAcns, parseGuideCorpus, parseNormativeCorpus, type RecordEntry,
} from '../src/index.js';

/**
 * A teacher in Sevilla notices nothing (029 T002, FR-2704, US1).
 *
 * ## Why this is a snapshot and why it is taken now
 *
 * `029` extracts Andalucía from the base corpus into a territory file so that a teacher
 * in Galicia stops reading about a platform she does not have. The whole risk of that
 * refactor is borne by the person it is *not* for: the teacher in Sevilla, for whom
 * everything already worked and who has no reason to accept a regression.
 *
 * So her draft is captured **before anything moves**, with today's code, and after the
 * extraction the same draft with `es-an` selected must be identical. «Nothing changes for
 * her» as bytes rather than as a promise — the same argument `012` T001 and `032` T001
 * made, in the refactor where it matters most, because the output here is a document she
 * signs.
 *
 * ## The one declared exception
 *
 * The extraction adds a provenance line (T012): which corpus drafted this, and when it
 * was last checked. That is the only permitted difference, and it is declared **here**,
 * now, rather than discovered later as «well, obviously that line is new» — which is how
 * a snapshot test stops being evidence.
 *
 * Never edited after this commit. A baseline rewritten to fit what the refactor produced
 * is a baseline that ratifies whatever the refactor broke.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseGuideCorpus(
  readFileSync(join(repoRoot, 'instructions', 'guide.md'), 'utf8'));

/**
 * Added by the extraction, and the only edit this file will ever take.
 *
 * The baseline below was captured with today's code, when Andalucía was the base
 * corpus. After the extraction the same draft has to be produced **with `es-an`
 * selected** — that is the sentence T002 was written with, and this is what «selected»
 * looks like at this layer. The snapshot is untouched: what changed is which corpus the
 * wording is asked for, not what the wording must come out as.
 *
 * A file that had no `instructions/normative/es-an.md` to read would fail here rather
 * than fall back to generic, which is right: «Sevilla notices nothing» is not a claim
 * that survives the territory file going missing.
 */
const esAn = parseNormativeCorpus(
  readFileSync(join(repoRoot, 'instructions', 'normative', 'es-an.md'), 'utf8'),
  'es-an.md')!;

/** One learner, three pieces of work, so the draft has something to render. */
const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({
  jobId: 'job-1', learner: 'A1B2', date: '2026-03-03', schoolYear: '2025-2026',
  kind: 'worksheet', signedOff: true, revision: 1,
  source: { of: 'pasted' },
  documents: {
    ir: 'material/job-1/ir.md', adapted: 'material/job-1/A1B2/adapted.md',
    revisions: [], rendered: [],
  },
  missing: [],
  ...over,
});

const RECORD: RecordEntry[] = [
  entry(),
  entry({ jobId: 'job-2', date: '2026-04-14', kind: 'exam' }),
  entry({ jobId: 'job-3', date: '2026-05-20', kind: 'worksheet', signedOff: false }),
];

const PROVENANCE = 'Siguiendo el corpus normativo: **Andalucía** '
  + '(incluido con Rampa, sin revisar por ninguna docente).';

const golden = draftAcns({
  learnerCode: 'A1B2',
  year: '5.º de Primaria',
  stage: 'Primaria',
  subject: 'Matemáticas',
  record: RECORD,
  overlay: null,
  recipesByJob: {
    'job-1': ['how-much-at-once@1', 'chunk-the-prose@1'],
    'job-2': ['exam-access-not-difficulty@2'],
  },
  sections: corpus.draftSections,
  on: '2026-06-12',
  desfase: { cur: 2, fromPair: true },
  wording: {
    phrases: esAn.phrases, generic: corpus.phrases, register: esAn.register,
    /*
     * The declared exception, exercised rather than avoided.
     *
     * Passing no provenance line would make the snapshot match for the wrong reason —
     * it would prove that a code path nobody uses produces the old bytes. The line the
     * resolver actually builds is passed in, and stripped below, so what the snapshot
     * proves is «the only difference is that line» rather than «there is no difference
     * if you leave the new thing out».
     */
    provenanceLine: PROVENANCE,
  },
});

/** The draft as it was, with the one permitted addition taken back out. */
const withoutProvenance = (md: string): string => {
  const lines = md.split('\n');
  const at = lines.findIndex((l) => l.includes('Siguiendo el corpus normativo'));
  expect(at, 'the provenance line must be there before it can be excepted').toBeGreaterThan(-1);
  // The line, and the `>` separator `acnsHeader` puts above it.
  return [...lines.slice(0, at - 1), ...lines.slice(at + 1)].join('\n');
};

describe('the Andalusian draft, as it is the day before the extraction', () => {
  it('the whole document, byte for byte', () => {
    /*
     * A snapshot rather than a list of assertions, and that is the point: the assertions
     * a person writes are the parts they thought of, and what a refactor of a document
     * breaks is a heading level, a blank line, the order of two sections — the parts
     * nobody thinks to assert and every reader notices.
     */
    expect(withoutProvenance(golden.markdown)).toMatchSnapshot();
  });

  it('and what it says is missing, in order', () => {
    // The list she reads first, and the one that tells her what is still hers to write.
    expect(golden.missing).toMatchSnapshot();
  });

  it('and where every line came from', () => {
    expect([...new Set(golden.sources)].sort()).toMatchSnapshot();
  });

  it('the draft names the artefacts a teacher in Sevilla expects', () => {
    /*
     * The counterpart to `no-territory-outside-corpus.test.ts`, and the reason the two
     * are not in conflict: those words must **leave the base corpus** and must **still
     * reach her**, through the territory file she has selected. This case is what makes
     * the extraction a move rather than a deletion.
     */
    expect(golden.markdown).toContain('Séneca');
    expect(golden.markdown).toContain('ACNS');
  });

  it('and it says which corpus it followed, which is the exception declared above', () => {
    // T012, FR-2705: in the document, not only on screen — because the document is what
    // she copies into the register, and the screen is not.
    expect(golden.markdown).toContain('Siguiendo el corpus normativo: **Andalucía**');
    expect(golden.markdown).toContain('sin revisar');
  });
});
