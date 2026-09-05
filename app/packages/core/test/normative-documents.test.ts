import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  draftAcns, buildReport, parseIR, acnsDocument, signAcns, acnsIsSigned, renderAcnsHTML,
  parseGuideCorpus, parseNormativeCorpus, resolveNormative, DRAFT_PREFIX,
  type RecordEntry,
} from '../src/index.js';

/**
 * What a drafted document says about where its words came from
 * (029 T012/T015/T017/T018, FR-2703/2705/2706/2710).
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const generic = parseGuideCorpus(
  readFileSync(join(repoRoot, 'instructions', 'guide.md'), 'utf8'));
const esAn = parseNormativeCorpus(
  readFileSync(join(repoRoot, 'instructions', 'normative', 'es-an.md'), 'utf8'), 'es-an.md')!;

/** The artefacts of one territory, as `no-territory-outside-corpus.test.ts` names them. */
const TERRITORIAL = [/S[ée]neca/, /\bACNS\b/, /\bACS\b/, /\bDIAC\b/, /Andaluc[íi]a/i,
  /8-3-2017|8 de marzo de 2017/];

const entry = (): RecordEntry => ({
  jobId: 'job-1', learner: 'A1B2', date: '2026-03-03', schoolYear: '2025-2026',
  kind: 'worksheet', signedOff: true, revision: 1,
  source: { of: 'pasted' },
  documents: {
    ir: 'material/job-1/ir.md', adapted: 'material/job-1/A1B2/adapted.md',
    revisions: [], rendered: [],
  },
  missing: [],
});

const resolved = (
  available: Parameters<typeof resolveNormative>[0]['available'], selected?: string,
) => resolveNormative({ available, ...(selected ? { selected } : {}) });

const wordingFor = (r: ReturnType<typeof resolveNormative>) => ({
  generic: generic.phrases,
  provenanceLine: r.provenanceLine,
  ...(r.of === 'corpus'
    ? { phrases: r.corpus.phrases, ...(r.corpus.register ? { register: r.corpus.register } : {}) }
    : {}),
});

const draftUnder = (r: ReturnType<typeof resolveNormative>) => draftAcns({
  learnerCode: 'A1B2', year: '5.º de Primaria', stage: 'Primaria',
  /*
   * Her territory's sections when it declares any, the generic scaffold otherwise —
   * exactly the fallback `jobs/guide.ts` makes. A corpus that carries only phrases is a
   * valid corpus, and the Galician fixture below is one.
   */
  sections: r.of === 'corpus'
    ? r.corpus.documents.find((d) => !d.touchesObjectives)?.sections ?? generic.draftSections
    : generic.draftSections,
  on: '2026-06-12', overlay: null, record: [entry()],
  wording: wordingFor(r),
});

describe('every drafted document names the corpus it followed (FR-2705)', () => {
  const withCorpus = resolved([{ corpus: esAn, origin: 'bundled' }], 'es-an');

  it('in the document, not only on the screen', () => {
    /*
     * The distinction the whole of `017` turns on: the real flow is that she copies the
     * text out of the printed page into her register. A provenance line that only ever
     * lived on screen would be lost in exactly that copy — the same failure P46 had to
     * fix for the draft mark.
     */
    expect(draftUnder(withCorpus).markdown)
      .toContain('Siguiendo el corpus normativo: **Andalucía**');
  });

  it('and the report says it too, because she signs after reading that one', () => {
    const md = buildReport({
      adapted: parseIR(['---', '---', '', '::: {#b1 .exercise}', 'x', ':::'].join('\n')),
      wording: { phrases: esAn.phrases, generic: generic.phrases },
      provenanceLine: withCorpus.provenanceLine,
    }).markdown;
    expect(md).toContain('Siguiendo el corpus normativo: **Andalucía**');
  });

  it('and it survives the signature, because it is not the draft mark', () => {
    /*
     * «Sin firmar» stops being true when she signs. «Esto salió del corpus de Andalucía,
     * sin revisar» never stops being true — and a signature that deleted it would turn a
     * signed document into one that claims no provenance at all.
     */
    const doc = acnsDocument(draftUnder(withCorpus).markdown, 'A1B2', '2026-06-12',
      esAn.phrases['signed-title']!);
    const signed = signAcns(doc, 'la tutora', '2026-06-20');
    expect(acnsIsSigned(signed)).toBe(true);
    expect(signed).not.toContain('Sin firmar');
    expect(signed).toContain('Siguiendo el corpus normativo: **Andalucía**');
  });

  it('and it never claims a review nobody did (FR-2706)', () => {
    // Asserted at the document, not only at the resolver: this is where it is read.
    expect(draftUnder(withCorpus).markdown).toContain('sin revisar por ninguna docente');
    expect(draftUnder(withCorpus).markdown).not.toMatch(/revisado por/);
  });
});

describe('generic mode is a product, not a blanked Andalucía (FR-2703)', () => {
  const nothing = resolved([]);
  const draft = draftUnder(nothing);

  it('zero territory artefacts in the whole rendered document, not just the markdown', () => {
    /*
     * SC-2702, asserted over what she actually prints. The markdown is the source; the
     * HTML is what carries the banner, the watermark and the page title — the three
     * places a platform name survived a careless extraction.
     */
    const html = renderAcnsHTML(acnsDocument(draft.markdown, 'A1B2', '2026-06-12'));
    for (const pattern of TERRITORIAL) {
      expect(html, `${pattern} reached a generic rendering`).not.toMatch(pattern);
    }
  });

  it('and it still refuses to look filed, which is the half that must not be lost', () => {
    expect(draft.markdown).toContain(DRAFT_PREFIX);
    expect(draft.markdown).toContain('Esto no está presentado');
    expect(draft.markdown).toContain('Rampa no ha escrito esta adaptación');
  });

  it('and it names what she has to verify, and who with', () => {
    // The sentence that makes generic honest rather than vague: what Rampa did not
    // assume, and the one person who can settle it.
    expect(draft.markdown).toContain('borrador genérico');
    expect(draft.markdown).toContain('orientador');
    expect(draft.markdown).toContain('qué documento');
  });

  it('and the sections are the ones Rampa can source, not an imitation of a real form', () => {
    /*
     * R3's argument. A generic draft with seven headings and the labels sanded off would
     * look as complete as a territorial one and be backed by no regulation at all —
     * which is the «looks filed» failure with nothing behind it.
     */
    expect(draft.markdown).toContain('## Datos del alumno');
    expect(draft.markdown).not.toContain('Documento: **');
  });
});

describe('changing normativa changes new drafts only (FR-2710)', () => {
  it('a document already written is not rewritten by a selection change', () => {
    /*
     * There is nothing to assert about a writer here, and that is the point: resolving a
     * different corpus produces a **new string**, and no code path in this layer takes a
     * stored document and re-words it. The test that would fail is the one that found
     * such a path.
     */
    const before = acnsDocument(
      draftUnder(resolved([{ corpus: esAn, origin: 'bundled' }], 'es-an')).markdown,
      'A1B2', '2026-06-12', esAn.phrases['signed-title']!);

    // She switches to generic, and drafts again.
    const after = draftUnder(resolved([]));

    expect(after.markdown).not.toContain('Séneca');
    // The first document is untouched, provenance and all.
    expect(before).toContain('Séneca');
    expect(before).toContain('Siguiendo el corpus normativo: **Andalucía**');
  });

  it('and signing after the switch keeps the title the document was drafted with', () => {
    /*
     * The concrete way FR-2710 could have been broken: she drafts under Andalucía, picks
     * Madrid on Tuesday, signs on Wednesday. The signed heading comes from the file's own
     * `signed_title`, so what she signs is what she read.
     */
    const doc = acnsDocument(
      draftUnder(resolved([{ corpus: esAn, origin: 'bundled' }], 'es-an')).markdown,
      'A1B2', '2026-06-12', esAn.phrases['signed-title']!);
    const signed = signAcns(doc, 'la tutora', '2026-06-20');
    expect(signed).toContain('# Adaptación curricular NO significativa (ACNS)');
  });

  it('and the stored title is what is read, not something rederived from the draft line', () => {
    /*
     * The first version of the case above passed for the wrong reason. In Andalucía the
     * signed title happens to be the draft title with «de » removed and capitalised, so
     * ignoring `signed_title` entirely produced the same string and the mutation
     * survived.
     *
     * A territory whose two titles are genuinely different is what tells them apart —
     * and there is no reason a normativa should have to name its documents in a shape
     * Spanish grammar makes derivable. That is precisely why the document stores it.
     */
    const galicia = parseNormativeCorpus(
      '---\nid: es-ga\nlabel: Galicia\nregister: XADE\nphrases:\n'
      + '  draft-title: "do documento de adaptación"\n'
      + '  signed-title: "Adaptación curricular individualizada"\n---\n\n# x\n', 'es-ga.md')!;

    const draft = draftUnder(resolved([{ corpus: galicia, origin: 'subido' }], 'es-ga'));
    const doc = acnsDocument(draft.markdown, 'A1B2', '2026-06-12',
      galicia.phrases['signed-title']!);

    expect(doc).toContain('# BORRADOR do documento de adaptación');
    const signed = signAcns(doc, 'la tutora', '2026-06-20');
    expect(signed).toContain('# Adaptación curricular individualizada');
    // Not the draft line with a word taken off it, which is what a derivation would give.
    expect(signed).not.toContain('Do documento de adaptación');
  });

  it('and a draft written before this existed still signs, with the line it always had', () => {
    /*
     * Every ACNS already in a vault has no `signed_title`. Refusing to sign those would
     * be `029` breaking the one flow `017` exists for, so the fallback is what that line
     * always was — the draft line minus the BORRADOR token.
     */
    const old = acnsDocument(
      draftUnder(resolved([{ corpus: esAn, origin: 'bundled' }], 'es-an')).markdown,
      'A1B2', '2026-06-12');
    expect(old).not.toContain('signed_title');
    expect(signAcns(old, 'la tutora', '2026-06-20'))
      .toContain('# Adaptación curricular NO significativa (ACNS)');
  });
});

describe('the corpus she selected has gone (FR-2711)', () => {
  it('the document comes out generic, and says so and why', () => {
    const gone = resolved([{ corpus: esAn, origin: 'bundled' }], 'es-ga');
    const draft = draftUnder(gone);
    expect(draft.markdown).toContain('es-ga');
    expect(draft.markdown).toContain('No he puesto otra en su lugar');
    // Never the other corpus that happened to be available.
    expect(draft.markdown).not.toContain('Séneca');
  });
});
