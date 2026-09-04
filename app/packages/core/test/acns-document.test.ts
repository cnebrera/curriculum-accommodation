import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  draftAcns, acnsDocument, acnsIsSigned, signAcns, renderAcnsHTML, draftMark,
  ACNS_DRAFT_HEADING, ACNS_SIGNED_HEADING, nextAcnsRevision,
  parseGuideCorpus, learnerAcns, learnerAcnsRevision, learnerAcnsPdf,
  Vault, planForget, executeForget, verifyForgotten,
  type RecordEntry, type NameStore,
} from '../src/index.js';

/**
 * The ACNS is a document, and the signature is the only thing that unmarks it
 * (017 FR-1516, review COD-22, decision P46).
 *
 * ## What was wrong, in one sentence
 *
 * FR-1516 said the mark was «removable only by sign-off», and there was no sign-off
 * that could reach an ACNS — `job:signOff` resolves documents by (job × learner), and
 * an ACNS is neither. So the mark could never come off, the draft was never saved, and
 * the real flow was her retyping the text into Séneca **with the mark lost in the
 * copy-paste and no review having happened anywhere**.
 *
 * The conservative half of that (a mark that never lifts) reads as safe and is not: a
 * mark she cannot remove is a mark she works around, and working around it here means
 * an unreviewed draft arriving at the official record.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseGuideCorpus(readFileSync(join(root, 'instructions', 'guide.md'), 'utf8'));

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

const draft = () => draftAcns({
  learnerCode: 'A1B2', year: '5.º de Primaria', stage: 'Primaria',
  sections: corpus.acnsSections, on: '2026-06-12', overlay: null, record: [entry()],
}).markdown;

const stored = () => acnsDocument(draft(), 'A1B2', '2026-06-12');

describe('the document she keeps', () => {
  it('says what it is, and who it is about, without her name', () => {
    const doc = stored();
    expect(doc).toMatch(/^---\nkind: acns\n/);
    expect(doc).toContain('for_learner: "A1B2"');
  });

  /**
   * `isGenerated` decides whether a document is **composed material**, and an ACNS is
   * not material at all. A stray `generated: true` here would give it the composed
   * draft mark and, worse, offer it as something printable for a child.
   */
  it('is not composed material', () => {
    expect(stored()).not.toContain('generated: true');
  });

  /**
   * The printed copy too, and this one was **wrong first**.
   *
   * It was written to `output/acns/<code>/acns.pdf`, following «renderings live under
   * `output/`» — and it survived an erasure. `planForget` deletes
   * `output/<job>/<code>` for each job in `material/`, «acns» is not a job, so nothing
   * reached it; and `verifyForgotten` greps file contents, so a code that appears only
   * in the *path* is invisible to it. A child's curricular adaptation, printed, staying
   * in her folder after «bórralo todo».
   */
  it('keeps the printed copy where the erasure deletes wholesale', () => {
    expect(learnerAcnsPdf('A1B2')).toBe('profiles/A1B2/acns.pdf');
  });

  it('lives beside his profile, where the erasure already walks', () => {
    // Not under `material/`: nobody hands an ACNS to a child, and a document in
    // `material/` shows up in his record as something prepared for him. Inside
    // `profiles/<code>/` it is forgettable by construction — `executeForget` walks
    // that directory — rather than by somebody remembering to add it to a list.
    expect(learnerAcns('A1B2')).toBe('profiles/A1B2/acns.md');
  });
});

describe('the mark is in the file, not only on the screen', () => {
  /**
   * The whole point of P46. For a worksheet the banner is a rendering and `ir.md`
   * carries none — because nobody hands out `ir.md`. Here the **file is what travels**:
   * she opens it and copies it into Séneca.
   */
  it('the stored draft carries the mark', () => {
    expect(stored()).toContain(ACNS_DRAFT_HEADING);
    expect(stored()).toContain('Sin firmar');
  });

  it('and says what the risk is, not just that it is a draft', () => {
    expect(stored()).toContain('estarás presentando algo que no ha revisado nadie');
  });

  it('is unsigned until somebody signs it', () => {
    expect(acnsIsSigned(stored())).toBe(false);
  });
});

describe('the signature, and the only thing it removes', () => {
  const signed = () => signAcns(stored(), 'la tutora', '2026-06-20');

  it('takes the mark off', () => {
    const out = signed();
    expect(out).not.toContain(ACNS_DRAFT_HEADING);
    expect(out).not.toContain('Sin firmar');
    expect(out).toContain(ACNS_SIGNED_HEADING);
  });

  it('records who and when, in the document and in the front matter', () => {
    const out = signed();
    expect(out).toContain('Revisada y firmada** por la tutora el 2026-06-20');
    expect(acnsIsSigned(out)).toBe(true);
    expect(out).toContain('signed_off: true');
    expect(out).toContain('date: "2026-06-20"');
  });

  /**
   * The two claims are not the same claim.
   *
   * «Sin firmar» stops being true when she signs. «El registro es Séneca» and «la
   * coordina el tutor» never stop being true — Rampa cannot file anything and did not
   * write the curricular proposal. A signature that deleted those would turn a signed
   * ACNS into a document that looks filed, which is what SC-1506 exists against.
   */
  it('leaves standing what the signature does not change', () => {
    const out = signed();
    expect(out).toContain('El registro es **Séneca**');
    expect(out).toContain('la coordina el tutor');
    expect(out).toContain('Rampa no la ha escrito');
  });

  it('keeps the body, which is the part she is signing', () => {
    expect(signed()).toContain('## Datos del alumno');
    expect(signed()).toContain('A1B2');
  });

  it('signing twice is the same answer, not an event', () => {
    const once = signed();
    expect(signAcns(once, 'otra persona', '2026-07-01')).toBe(once);
  });

  /**
   * Refusal, never repair — the direction `resolveInVault` already takes.
   *
   * She may edit the body in Obsidian before signing; that is what the vault is for.
   * But a file with **no mark at all** is a file whose state we cannot establish, and
   * stamping `signed_off: true` onto it would assert a review of something we did not
   * recognise.
   */
  it('refuses a file that no longer has the mark', () => {
    const mangled = stored().replace(ACNS_DRAFT_HEADING, '# Mi ACNS');
    expect(() => signAcns(mangled, 'la tutora', '2026-06-20'))
      .toThrow(/no sé en qué estado está/);
  });

  it('does not quietly sign a document that never had a mark', () => {
    expect(() => signAcns('---\nkind: acns\n---\n\nlo que sea\n', 'x', '2026-06-20')).toThrow();
  });
});

describe('the printed page, and where its mark comes from', () => {
  it('the banner names what must not happen: it reaching Séneca unsigned', () => {
    const html = renderAcnsHTML(stored());
    expect(html).toContain('no lo lleves a Séneca todavía');
    // Not «no entregar al alumnado»: nobody was ever going to hand an ACNS to a child,
    // and a warning about the wrong risk is a warning she learns to skip.
    expect(html).not.toContain('no entregar al alumnado');
  });

  /**
   * Page two of a stapled draft carries nothing otherwise, and the way an unsigned
   * ACNS reaches the official record is somebody reading it off paper.
   */
  it('watermarks every page, not just the first', () => {
    expect(renderAcnsHTML(stored())).toContain('BORRADOR DE ACNS — SIN FIRMAR');
  });

  it('the signed one has neither', () => {
    const html = renderAcnsHTML(signAcns(stored(), 'la tutora', '2026-06-20'));
    expect(html).not.toContain('draft-banner');
    expect(html).not.toContain('SIN FIRMAR');
  });

  /**
   * There is **no `signedOff` parameter**, and there must not be. That exact parameter
   * is how `job:render` could once produce an unmarked worksheet with no sign-off
   * having happened at all (007 FR-509) — a convention where a structure was promised.
   */
  it('derives the mark from the document, so no caller can choose', () => {
    expect(renderAcnsHTML.length).toBe(1);
    expect(draftMark({ frontMatter: { kind: 'acns' } })).not.toBeNull();
    expect(draftMark({ frontMatter: { kind: 'acns', review: { signed_off: true } } })).toBeNull();
  });

  it('renders the Markdown instead of dumping it as text', () => {
    // The screen showed `{result.markdown}` in a div: the headings, the lists and the
    // table arrived as literal `##` and `|`. This is the document she prints.
    const html = renderAcnsHTML(stored());
    expect(html).toContain('<h1>');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('## Datos del alumno');
  });

  it('does not print the machinery', () => {
    expect(renderAcnsHTML(stored())).not.toContain('kind: acns');
  });
});

describe('a signed one is never overwritten', () => {
  /**
   * She will press «guardarla otra vez»: a term moves on and the draft is assembled
   * from work that has grown since. Overwriting a signed ACNS would destroy the only
   * record that anybody reviewed it.
   */
  it('numbers from what is on disk, not from a counter', () => {
    expect(nextAcnsRevision([])).toBe(1);
    expect(nextAcnsRevision(['acns.md', 'profile.yaml'])).toBe(1);
    expect(nextAcnsRevision(['acns.md', 'acns.r1.md'])).toBe(2);
  });

  it('skips past a gap instead of reusing a number', () => {
    // A deleted `acns.r2.md` must not make the next save overwrite `acns.r3.md`.
    expect(nextAcnsRevision(['acns.r1.md', 'acns.r3.md'])).toBe(4);
  });

  it('is not confused by an adaptation revision', () => {
    expect(nextAcnsRevision(['adapted.r7.md', 'notes.md'])).toBe(1);
  });
});

describe('and it is forgettable, by construction', () => {
  /**
   * The reason `profiles/<code>/` was chosen (`003` FR-2xx).
   *
   * A new file holding a child's curricular adaptation is exactly the kind of thing
   * that survives «bórralo todo» because nobody added it to a list. It does not need
   * adding to one: `executeForget` walks six directories and this document is inside
   * two of them — his profile directory, and `output/` for the PDF.
   *
   * Asserted rather than assumed, because the last review found `handover/` and
   * `.rampa/` surviving an erasure for precisely this reason.
   */
  const names = (initial: Record<string, string>): { map: Record<string, string>; store: NameStore } => {
    const map = { ...initial };
    return { map, store: {
      forget: async (code: string) => { delete map[code]; },
      knows: async (code: string) => code in map,
    } };
  };

  it('the document, the kept revision and the PDF all go', async () => {
    const vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-acns-')), 'Rampa'));
    await vault.writeRaw(learnerAcns('E38'), stored());
    await vault.writeRaw(learnerAcnsRevision('E38', 1), signAcns(stored(), 'la tutora', '2026-06-20'));
    await vault.writeRaw(learnerAcnsPdf('E38'), 'no es un pdf de verdad');

    const plan = await planForget(vault, 'E38');
    // The plan names his profile directory, which is what the ACNS is inside — and
    // that is the point of the location rather than an accident of it.
    expect(plan.paths, 'the ACNS is not covered by the plan').toContain('profiles/E38');

    const who = names({ E38: 'Lucía' });
    await executeForget(vault, plan, who.store);

    expect(await vault.readRaw(learnerAcns('E38'))).toBeNull();
    expect(await vault.readRaw(learnerAcnsRevision('E38', 1))).toBeNull();
    expect(await vault.readRaw(learnerAcnsPdf('E38'))).toBeNull();
    expect(await verifyForgotten(vault, 'E38', who.store)).toEqual([]);
  });
});
