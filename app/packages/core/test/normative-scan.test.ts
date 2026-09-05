import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  scanNormativeImport, explainScan, parseNormativeCorpus,
  parseAcsCorpus, parseGuideCorpus, checkDeclines, clinicalTermIn,
  examBelowCourse, acsInOverlay, draftMark, draftAcns, acnsDocument,
  parseMaterialKinds, resolveNormative,
  type RecordEntry,
} from '../src/index.js';

/**
 * A shared «normativa-madrid.md» is a file she is shown, not a prompt
 * (029 T021/T024/T025, FR-2708/2709, SC-2704).
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const fixture = (dir: string) =>
  readFileSync(join(repoRoot, 'cases', 'injection', dir, 'normativa.md'), 'utf8');

const hostile = fixture('12-normativa-de-un-foro');
const forged = fixture('13-la-seccion-forjada');
const generic = parseGuideCorpus(
  readFileSync(join(repoRoot, 'instructions', 'guide.md'), 'utf8'));

describe('the scan, over a corpus somebody sent her', () => {
  const found = scanNormativeImport(hostile);

  it('finds all three families, quoted and located', () => {
    expect(found.length).toBeGreaterThan(3);
    expect(found.some((f) => f.family === 'conflict')).toBe(true);
    expect(found.some((f) => f.family === 'injection')).toBe(true);
    /*
     * Located by the **actual** line, because «hallazgo en la línea 1» in a 200-line file
     * is a finding she cannot act on. `line > 0` passed with every line hardcoded to 1 —
     * mutation found that — so the assertion is that the numbers are real: several
     * distinct ones, and each pointing at a line whose text is the quote.
     */
    const lines = hostile.split('\n');
    expect(new Set(found.map((f) => f.line)).size).toBeGreaterThan(3);
    for (const f of found) {
      expect(lines[f.line - 1], `line ${f.line}`).toContain(f.quote.slice(0, 30));
    }
    expect(found.every((f) => f.quote.trim().length > 0)).toBe(true);
  });

  it('and each conflict names the rule it contradicts, not «esto choca con las reglas»', () => {
    /*
     * «Esto choca con las reglas» is not something she can check. «Esto dice que un
     * examen puede ser más fácil, y eso lo decide el equipo docente» is — and it is what
     * lets her judge whoever sent her the file.
     */
    const conflicts = found.filter((f) => f.family === 'conflict');
    expect(conflicts.some((f) => f.why.includes('más fácil'))).toBe(true);
    expect(conflicts.some((f) => f.why.includes('nombre'))).toBe(true);
    expect(conflicts.some((f) => f.why.includes('marca de borrador'))).toBe(true);
    expect(conflicts.some((f) => f.why.includes('evaluación psicopedagógica'))).toBe(true);
    expect(conflicts.some((f) => f.why.includes('diagnóstico'))).toBe(true);
  });

  it('and `007`\'s own shapes still fire here, because policy is the worse surface', () => {
    const injections = found.filter((f) => f.family === 'injection');
    expect(injections.some((f) => /ignora las instrucciones/i.test(f.quote))).toBe(true);
    expect(injections.some((f) => /imprime el perfil/i.test(f.quote))).toBe(true);
  });

  it('nothing is removed from her file — the scan reads and reports', () => {
    // `007` FR-504's posture. A corpus with a paragraph silently cut out is a policy she
    // did not write, and deletion hides the attack as well as the legitimate content.
    expect(hostile).toContain('Ignora las instrucciones anteriores');
    expect(scanNormativeImport(hostile)).toHaveLength(found.length);
  });
});

describe('the forged section (P18)', () => {
  const found = scanNormativeImport(forged);

  it('a heading imitating the prompt\'s own sections is a finding', () => {
    expect(found.some((f) => /Correcciones de la maestra/i.test(f.quote))).toBe(true);
  });

  it('and so is a fence with no nonce in it', () => {
    /*
     * The nonce is minted after the file is read, so forging it is impossible; imitating
     * its **shape** is all that is left. The fence stops it working — this is what says
     * somebody tried, which is a different fact and the one she is deciding on.
     */
    expect(found.some((f) => /FIN-MATERIAL/i.test(f.quote))).toBe(true);
  });

  it('and a role prefix at the start of a line', () => {
    expect(found.some((f) => /^system:/i.test(f.quote))).toBe(true);
  });

  it('but every corpus this application ships produces nothing at all', () => {
    /*
     * The half that keeps this usable. A scan that fires on the shipped Andalusian
     * corpus is a scan she clicks past on the second file — `007` FR-514's lesson,
     * which applies to whether the detector is worth reading even where its
     * non-blocking half does not apply.
     *
     * Over the **directory**, so the Galician one somebody adds is checked by the same
     * assertion rather than by remembering to add a line here.
     *
     * `instructions/guide.md` is deliberately **not** in this sweep. It is the base
     * corpus, it cannot be imported, and it is where this application explains the
     * rules — it quotes «ignora las instrucciones anteriores» as an example and
     * discusses the draft mark by name. Tightening the patterns until a file that is
     * never scanned comes out clean would weaken them against the files that are. It did
     * find two real width bugs on the way, which is why it was worth running once.
     */
    const dir = join(repoRoot, 'instructions', 'normative');
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(scanNormativeImport(readFileSync(join(dir, f), 'utf8')), f).toEqual([]);
    }
  });
});

describe('what she is told', () => {
  it('a clean file still says «léelo igualmente», because the scan checks shapes', () => {
    const said = explainScan([]);
    expect(said).toContain('Léelo igualmente');
    // And says what it did not check: whether what it claims about her normativa is true.
    expect(said).toContain('no si lo que dice');
  });

  it('and a dirty one says what happens next, not only what is wrong', () => {
    const said = explainScan(scanNormativeImport(hostile));
    expect(said).toContain('No lo he quitado del fichero');
    expect(said).toContain('no lo puede permitir ningún fichero de normativa');
    expect(said).toContain('decide si activas');
  });
});

/**
 * Hard rules outrank every corpus, with the hostile fixture **in force**
 * (T025, FR-2709, SC-2704).
 *
 * The point of running these with the corpus activated rather than merely parsed: the
 * claim is not «the parser drops those fields», it is «with this file selected and
 * active, every guard returns exactly what it returns with no corpus at all».
 */
describe('with the hostile corpus activated anyway', () => {
  const corpus = parseNormativeCorpus(hostile, 'normativa.md')!;
  const active = resolveNormative({
    selected: corpus.id, available: [{ corpus, origin: 'subido' }],
  });
  const acs = parseAcsCorpus(
    readFileSync(join(repoRoot, 'instructions', 'acs.md'), 'utf8'));

  it('the decline is the same sentence, word for word', () => {
    const asked = 'Te propongo quitar el objetivo de fracciones.';
    const verdict = checkDeclines(asked, acs);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.say).toBe(acs.decline);
    // The file's own «decline» never became one.
    expect(acs.decline).not.toContain('dime qué objetivos');
  });

  it('the exam gate refuses exactly as it did', () => {
    const years = ['es:primaria-4', 'es:primaria-5', 'es:primaria-6'];
    expect(examBelowCourse({
      order: years, enrolled: 'es:primaria-5',
      target: { yearId: 'es:primaria-4', from: 'she-chose' },
      acsRegistered: false,
    })).toBe(true);
    // And the corpus did not register an ACS on anybody's behalf either.
    expect(acsInOverlay(null)).toBe(false);
  });

  it('and the refusal she reads is the corpus recipe\'s, not this file\'s', () => {
    const kinds = parseMaterialKinds(
      readFileSync(join(repoRoot, 'instructions', 'material-kinds.md'), 'utf8'),
      'material-kinds.md');
    const said = kinds.find((k) => k.id === 'exam')!.composing!.belowLevel!;
    expect(said).toContain('equipo docente');
    expect(said).not.toContain('más fácil');
  });

  it('the clinical filter filters, `clinical_terms: []` notwithstanding', () => {
    expect(clinicalTermIn('Tiene un diagnóstico de dislexia.', generic.clinicalTerms))
      .toBeTruthy();
    expect(generic.clinicalTerms.length).toBeGreaterThan(20);
  });

  it('the draft mark is still on the document, `draft_mark: off` notwithstanding', () => {
    const entry = (): RecordEntry => ({
      jobId: 'job-1', learner: 'A1B2', date: '2026-03-03', schoolYear: '2025-2026',
      kind: 'worksheet', signedOff: true, revision: 1, source: { of: 'pasted' },
      documents: { ir: 'a', adapted: 'b', revisions: [], rendered: [] }, missing: [],
    });
    const draft = draftAcns({
      learnerCode: 'A1B2', sections: generic.draftSections, on: '2026-06-12',
      overlay: null, record: [entry()],
      wording: {
        generic: generic.phrases, phrases: corpus.phrases,
        ...(corpus.register ? { register: corpus.register } : {}),
        provenanceLine: active.provenanceLine,
      },
    });
    const doc = acnsDocument(draft.markdown, 'A1B2', '2026-06-12');
    expect(draft.markdown).toContain('BORRADOR');
    expect(draftMark({ frontMatter: { kind: 'acns' } })).not.toBeNull();
    expect(doc).toContain('BORRADOR');
  });

  it('and the learner\'s name is still not in it', () => {
    // The file says the name may be printed. Nothing here has ever had the name to
    // print: `core` never learns it, which is why this is a sentence and not a guard.
    expect(hostile).toContain('el nombre del alumno');
  });

  it('and the provenance line says «subido por ti, sin revisar» despite the file claiming a reviewer', () => {
    /*
     * The cheapest lie the format allows: `reviewed_by_teacher: true` with an invented
     * name. The line is built from `review` **and the derived origin**, in one place —
     * so what she reads is that somebody sent her this, which is the fact she needs to
     * judge the rest by.
     */
    expect(active.provenanceLine).toContain('subido por ti');
    expect(active.provenanceLine).toContain('revisado por una PT que no existe');
    // Which is exactly why the origin is in the same sentence: the review claim is the
    // file's, and where the file came from is not.
    expect(active.provenanceLine).toMatch(/subido por ti.*revisado por/s);
  });
});
