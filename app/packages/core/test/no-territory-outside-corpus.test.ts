import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Nothing Andalusian outside its own corpus file (029 T001, FR-2704, SC-2701/2702).
 *
 * ## What is wrong today, and why it is not a small thing
 *
 * The normative layer hardcodes one autonomous community's model and presents it as
 * Spain. Séneca is Andalucía's platform; the ACNS/ACS pair and the Instrucciones de
 * 8-3-2017 are Andalucía's framework. A teacher in Galicia or Aragón reads sentences
 * naming a platform she does not have and a document pair her regulation does not use,
 * and concludes — correctly — that this was not built for her.
 *
 * It is also the failure mode this project is least able to see from inside: everybody
 * who wrote it works in the same regulatory frame, so «España» and «Andalucía» read as
 * synonyms in the source and nowhere says otherwise.
 *
 * ## Written before anything moves
 *
 * The inventory was pinned at every site the extraction has to touch — the corpus
 * files, the TypeScript, and the drafts the suite renders in generic mode — **before**
 * the first file moved. A grep written after a refactor is a grep written to fit it: it
 * finds what the refactor happened to move and is silent about what it left. Each
 * extracted site empties one line of the lists below, in a diff, where it can be read.
 *
 * ## What the allowlist is, and what it is not
 *
 * `instructions/normative/` is where a territory's corpus lives — that is the point of
 * the feature. `docs/normativa-andalucia.md` is the sourcing note a human keeps.
 * `specs/` is the record of decisions, which necessarily names what was decided.
 *
 * Everything else — including the application's own strings — must be able to run for a
 * teacher whose regulation nobody here has read.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const repoRoot = join(appRoot, '..');

/**
 * The artefacts, and each one is a territory's and not Spain's.
 *
 * Named individually rather than matched by a pattern: «ACNS» is a real acronym in
 * several communities and a different thing in some, and a pattern loose enough to catch
 * the concept would catch the generic word for it too. The list is the finding.
 */
const ANDALUSIAN: Array<{ pattern: RegExp; what: string }> = [
  { pattern: /S[ée]neca/, what: 'Andalucía\'s registration platform' },
  { pattern: /8-3-2017|8 de marzo de 2017|Instrucciones de 8/, what: 'the 2017 Instrucciones' },
  { pattern: /\bACNS\b/, what: 'the non-significant adaptation, as Andalucía names it' },
  { pattern: /\bACS\b/, what: 'the significant adaptation, as Andalucía names it' },
  { pattern: /\bDIAC\b/, what: 'the individualised document, as Andalucía names it' },
  { pattern: /Andaluc[íi]a|andaluz/i, what: 'the community itself' },
];

const walk = (dir: string, keep: (f: string) => boolean): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'out' || e === 'corpus' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
};

/** Comments stripped: this file's own prose names every artefact it forbids. */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const offenders = (files: string[], strip: boolean): Array<{ path: string; what: string }> => {
  const found: Array<{ path: string; what: string }> = [];
  for (const f of files) {
    const text = strip ? code(readFileSync(f, 'utf8')) : readFileSync(f, 'utf8');
    for (const { pattern, what } of ANDALUSIAN) {
      if (pattern.test(text)) found.push({ path: f.replace(`${repoRoot}/`, ''), what });
    }
  }
  return found;
};

describe('the base corpus is the product, not one community', () => {
  it('found instruction files to check', () => {
    // The guard on the guard: an empty list satisfies everything below it.
    const files = walk(join(repoRoot, 'instructions'), (f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThan(5);
  });

  /**
   * The **inventory**, pinned before the extraction moves anything (`029` T001).
   *
   * ## Why a list of what is, rather than an assertion that there is nothing
   *
   * The end state is `[]` — no territory's artefacts anywhere outside its own corpus
   * file. Written as `[]` today this test is red, and a red test cannot be committed, so
   * it would either sit uncommitted until the whole refactor lands or be weakened into
   * something that passes.
   *
   * So it asserts **what is true today**, exactly, and the extraction empties it file by
   * file. That is the `selection-baseline.test.ts` pattern (`012` T001): assert what is,
   * so that what changes is visible in a diff rather than described in a commit message.
   * And it is stronger than the red version in one way that matters — it fails if a
   * **new** site appears, which is precisely how «España» and «Andalucía» became synonyms
   * in this source in the first place.
   *
   * ## The corpus half is done (`029` T003/T004); the source half is what remains
   *
   * Five corpus files were on this list and none is now: the Andalusian vocabulary
   * lives in `instructions/normative/es-an.md` and the base corpus speaks of «el
   * documento de adaptación vigente en tu territorio» and «tu plataforma de registro».
   *
   * The fourteen source files are the reason this is a feature rather than a
   * documentation pass — a sentence about one community's platform compiled into the
   * application cannot be replaced by a teacher choosing her own corpus.
   */
  it('no corpus file outside instructions/normative names a territory', () => {
    const files = walk(join(repoRoot, 'instructions'), (f) => f.endsWith('.md'))
      .filter((f) => !f.includes(join('instructions', 'normative')));
    const found = [...new Set(offenders(files, false).map((o) => o.path))].sort();
    expect(found).toEqual([]);
  });

  it('and the source files are exactly these, which is why this is code and not prose', () => {
    const files = [join(appRoot, 'packages'), join(appRoot, 'ui')]
      .flatMap((d) => walk(d, (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)));
    expect(files.length).toBeGreaterThan(50);

    const found = [...new Set(offenders(files, true).map((o) => o.path))].sort();
    expect(found).toEqual([
      'app/packages/core/src/compose/exam-gate.ts',    // «es una **ACS**» in the overlay check
      'app/packages/core/src/errors.ts',               // an error sentence naming the pair
      'app/packages/core/src/guide/acns-document.ts',  // the document's own headers
      'app/packages/core/src/guide/acns.ts',           // the draft's sentences
      'app/packages/core/src/guide/overlay.ts',        // reading which kind a guide is
      'app/packages/core/src/render/draft.ts',         // the draft mark's wording
      'app/packages/core/src/render/html.ts',          // the banner
      'app/packages/core/src/report/index.ts',         // the significant-adaptation flag
      'app/packages/shell/src/ipc/guide.ts',           // channel names and messages
      'app/packages/shell/src/jobs/guide.ts',          // the job's own sentences
      'app/ui/src/compose/ComposeScreen.tsx',          // a screen sentence
      'app/ui/src/guide/GuideScreen.tsx',              // the whole guide surface
      'app/ui/src/i18n/es.ts',                         // the interface strings
      'app/ui/src/learners/LearnerSections.tsx',       // the section's own copy
    ]);
  });

  it('and nothing has crept in outside the fourteen that are left', () => {
    /*
     * The half that guards the future rather than the past. Until the extraction
     * finishes, the list above is the permitted state — and a **fifteenth** file is a
     * new place a teacher in Vigo meets a platform she has not got, arriving after this
     * was written down.
     */
    const corpusFiles = walk(join(repoRoot, 'instructions'), (f) => f.endsWith('.md'))
      .filter((f) => !f.includes(join('instructions', 'normative')));
    const sourceFiles = [join(appRoot, 'packages'), join(appRoot, 'ui')]
      .flatMap((d) => walk(d, (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)));
    const total = new Set([
      ...offenders(corpusFiles, false).map((o) => o.path),
      ...offenders(sourceFiles, true).map((o) => o.path),
    ]);
    expect(total.size).toBe(14);
  });
});
