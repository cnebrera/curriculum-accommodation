import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  resolveNormative, parseNormativeCorpus, GENERIC_LINE,
  type NormativeCorpus, type NormativeOrigin,
} from '../src/index.js';

/**
 * The precedence, and the one line every document prints (029 T007/T015,
 * FR-2701/2702/2705/2706/2711).
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const esAn = parseNormativeCorpus(
  readFileSync(join(repoRoot, 'instructions', 'normative', 'es-an.md'), 'utf8'),
  'instructions/normative/es-an.md')!;

const corpus = (id: string, label: string, review = {}): NormativeCorpus => ({
  id, label, review: { reviewed: false, ...review }, documents: [], phrases: {},
  clinicalTermsExtra: [], unknown: {}, raw: '',
});
const at = (c: NormativeCorpus, origin: NormativeOrigin = 'bundled') => ({ corpus: c, origin });

const madrid = corpus('es-md', 'Madrid');
const available = [at(esAn), at(madrid, 'subido')];

describe('learner ▸ configuración ▸ generic', () => {
  it('nothing chosen anywhere is generic, and says why in the document', () => {
    const r = resolveNormative({ available });
    expect(r.of).toBe('generic');
    expect(r.of === 'generic' && r.because).toBe('nothing-selected');
    expect(r.provenanceLine).toContain('borrador genérico');
  });

  it('what Configuración says, when nothing else does', () => {
    const r = resolveNormative({ selected: 'es-an', available });
    expect(r.of === 'corpus' && r.via).toBe('configuracion');
    expect(r.of === 'corpus' && r.corpus.label).toBe('Andalucía');
  });

  it('and the learner beats Configuración, which is the whole point of the field', () => {
    // The child who arrived in October from another comunidad, in a caseload that
    // otherwise shares one territory.
    const r = resolveNormative({ learnerChoice: 'es-md', selected: 'es-an', available });
    expect(r.of === 'corpus' && r.corpus.label).toBe('Madrid');
    expect(r.of === 'corpus' && r.via).toBe('learner');
  });

  it('a learner set to `none` forces generic even with a corpus configured', () => {
    /*
     * The cross-territory case: schooled in two places, and a document claiming either
     * one would be claiming something about his schooling that nobody established.
     */
    const r = resolveNormative({ learnerChoice: 'none', selected: 'es-an', available });
    expect(r.of).toBe('generic');
    expect(r.of === 'generic' && r.because).toBe('learner-override');
  });

  it('a learner naming a corpus that is gone falls to Configuración, not to generic', () => {
    /*
     * The override means «use this instead of the school's». When hers has gone, the
     * school's is still the honest answer — dropping straight to generic would take
     * away a corpus she never stopped selecting.
     */
    const r = resolveNormative({ learnerChoice: 'es-ga', selected: 'es-an', available });
    expect(r.of === 'corpus' && r.corpus.id).toBe('es-an');
  });
});

describe('the corpus she selected is gone (FR-2711)', () => {
  const r = resolveNormative({ selected: 'es-ga', available });

  it('generic, and never a different corpus', () => {
    expect(r.of).toBe('generic');
    expect(r.of === 'generic' && r.because).toBe('selected-missing');
  });

  it('with a notice that names what is missing and says nothing was substituted', () => {
    // The half she has to act on. «Esto es genérico» describes the document; «la que
    // elegiste ya no está» is news about her setup.
    expect(r.provenanceLine).toContain('es-ga');
    expect(r.provenanceLine).toContain('No he puesto otra en su lugar');
    expect(r.provenanceLine).toContain('Configuración');
  });

  it('and it still carries the generic line, because the document is still generic', () => {
    expect(r.provenanceLine).toContain(GENERIC_LINE);
  });
});

describe('the provenance line, built here and nowhere else (FR-2705/2706)', () => {
  it('names the corpus, where the file came from, and its review status', () => {
    const line = resolveNormative({ selected: 'es-an', available }).provenanceLine;
    expect(line).toContain('Andalucía');
    expect(line).toContain('incluido con Rampa');
    expect(line).toContain('sin revisar');
  });

  it('an uploaded corpus says so, and an edited one says that too', () => {
    /*
     * «Modificado por ti» is visibility, not punishment. Editing is what the format is
     * for; a document drafted under an edited file that claimed the shipped one would be
     * the provenance line lying in the direction that costs most.
     */
    expect(resolveNormative({ selected: 'es-md', available }).provenanceLine)
      .toContain('subido por ti');
    expect(resolveNormative({
      selected: 'es-md', available: [at(madrid, 'modificado')],
    }).provenanceLine).toContain('modificado después');
  });

  it('and NOTHING outside this file can make an unreviewed corpus print as reviewed', () => {
    /*
     * FR-2706 as one function rather than as a rule people have to remember: the line is
     * built from `review` in the same expression that builds the origin, so there is no
     * caller-supplied path to a claim nobody earned. Asserted over **every** origin,
     * because «subido» and «modificado» are exactly the two a hostile file arrives as.
     */
    for (const origin of ['bundled', 'subido', 'modificado'] as const) {
      const line = resolveNormative({
        selected: 'x', available: [at(corpus('x', 'Sin revisar'), origin)],
      }).provenanceLine;
      expect(line, origin).toContain('sin revisar por ninguna docente');
      expect(line, origin).not.toMatch(/revisado por/);
    }
  });

  it('and a reviewed one names who disagreed and when, because that is the claim', () => {
    const line = resolveNormative({
      selected: 'y',
      available: [at(corpus('y', 'Galicia', { reviewed: true, by: 'una PT de Vigo', on: '2026-10-02' }))],
    }).provenanceLine;
    expect(line).toContain('revisado por una PT de Vigo el 2026-10-02');
  });

  it('a corpus claiming a reviewer while saying `false` still prints as unreviewed', () => {
    // The obvious way to fake it: fill `reviewed_by` and leave the flag alone. The
    // flag is what is read, and the name is carried only so a human can see the state.
    const line = resolveNormative({
      selected: 'z',
      available: [at(corpus('z', 'Z', { reviewed: false, by: 'alguien', on: '2026-01-01' }))],
    }).provenanceLine;
    expect(line).toContain('sin revisar');
    expect(line).not.toContain('alguien');
  });
});
