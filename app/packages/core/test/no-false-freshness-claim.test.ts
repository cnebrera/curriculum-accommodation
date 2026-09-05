import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { renderVocabulary, parseVocabulary } from '../src/index.js';

/**
 * The sentence that was false is nowhere, and the true one has a source
 * (031 T018, FR-2907, SC-2904).
 *
 * ## Why a guard test and not just a fix
 *
 * Because this sentence has been wrong twice in opposite directions. It first claimed
 * «las hojas que ya hiciste quedan marcadas como desactualizadas» when nothing did that;
 * a review caught it and it became «todavía no sé avisarte», which was true then and is
 * false now. Both lived in **three** places at once — a doc comment, a screen and her own
 * vault file — and the vault file is the one that outlives the application.
 *
 * A fix removes today's wrong sentence. This makes the *shape* harder to repeat: the
 * phrases are asserted absent across the whole source tree, so the next person who writes
 * one has to delete a test that explains why.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

/** Every source file under a directory, comments included — the lie lived in one. */
function sources(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string): void => {
    for (const entry of readdirSync(at)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const path = join(at, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (/\.(ts|tsx|md)$/.test(entry)) out.push(path);
    }
  };
  walk(dir);
  return out;
}

const FALSE_CLAIMS: ReadonlyArray<[string, string]> = [
  ['no sé avisarte', 'said Rampa cannot report stale drawings — it can, since `031`'],
  ['todavía no sé hacerlo', 'the same claim, in her vault file'],
  ['las hojas que ya hiciste no cambian', 'the sentence before that one, equally false'],
  ['FR-2218 is NOT implemented', 'the doc comment that carried the claim'],
];

describe('the false sentences are gone from the whole tree', () => {
  const files = [
    ...sources(join(root, 'app', 'ui', 'src')),
    ...sources(join(root, 'app', 'packages')),
  ];

  /**
   * Comments stripped, because the history is the point.
   *
   * Each of these phrases now appears in exactly one place: a comment explaining that it
   * was false and why. Forbidding it there too would delete the reasoning along with the
   * sentence — and this repository's whole review culture is that the comment carries the
   * reasoning. What must not exist is the phrase where **she** can read it.
   */
  const live = (path: string): string => readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/[^\n]*$/gm, '')
    .replace(/^\s*\*[^\n]*$/gm, '');

  for (const [phrase, why] of FALSE_CLAIMS) {
    it(`«${phrase}» reaches her nowhere — ${why}`, () => {
      const offenders = files
        .filter((f) => !f.endsWith('no-false-freshness-claim.test.ts'))
        .filter((f) => live(f).includes(phrase))
        .map((f) => f.replace(`${root}/`, ''));
      expect(offenders).toEqual([]);
    });
  }

  it('and the history survives, so the guard did not delete its own reason', () => {
    // Otherwise the assertions above would pass on a tree where somebody removed the
    // explanation instead of the sentence — and the next person would write it again.
    const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(all).toContain('todavía no sé avisarte');
  });
});

describe('and the true sentence reaches her vault file', () => {
  const note = renderVocabulary(parseVocabulary(
    '---\nversion: 1\n---\n\n## es\n\n- casa → 6964\n', 'vocabulario.md'));

  it('says the sheets keep the old drawing **and** that she will be told', () => {
    /*
     * Both halves, because the first alone is what the false version also said. What
     * makes it true now is the second: the record marks them and names the words.
     */
    expect(note).toContain('se quedan con el dibujo anterior');
    expect(note).toContain('aparecen marcadas en el expediente');
  });

  it('and it still says nothing about any learner, because the file travels', () => {
    // `024`'s rule for this file, unchanged: it goes in a handover packet precisely
    // because it says nothing about anybody.
    expect(note).toContain('No pongas aquí nada de un alumno');
  });
});

describe('no type in the UI claims to «mirror» one in core', () => {
  /*
   * A comment is not a mechanism (`028`, applying `031`'s own lesson to itself).
   *
   * `ui/src/data/record.ts` held a hand-written `RecordSource` with «Mirrors
   * `packages/core/src/record/entry.ts`» above it. When `028` added a case in core the
   * copy did not change and **the compiler said nothing** — the record screen would have
   * gone on calling an agenda «lo que leyó Rampa», and the branch describing it would
   * have been unreachable code that type-checked.
   *
   * `031` fixed exactly this for `DocumentFreshness`, in the same directory, three weeks
   * earlier. Twice is a pattern, so this is the guard: if a UI type restates a core one,
   * import it. The word «mirrors» in a type comment is the tell, and it is what somebody
   * writes at the moment they decide not to import.
   */
  it('the word does not appear above a type declaration in `ui/`', () => {
    const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', 'ui');
    const offenders: string[] = [];
    for (const file of walkUi(uiRoot)) {
      const text = readFileSync(file, 'utf8');
      // «Mirrors <path>» followed, within a few lines, by a type or interface declaration.
      if (/[Mm]irrors?\s+`?[\w./-]*packages\/core[\s\S]{0,200}?\b(export\s+)?(type|interface)\s/
        .test(text)) {
        offenders.push(file.replace(`${uiRoot}/`, 'ui/'));
      }
    }
    expect(offenders, 'import the type instead of restating it').toEqual([]);
  });
});

function walkUi(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walkUi(path));
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}
