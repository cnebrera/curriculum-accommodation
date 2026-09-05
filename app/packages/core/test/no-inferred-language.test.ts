import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { buildAdaptPrompt, type Profile } from '../src/index.js';

/**
 * Nothing anywhere guesses a child's language (033 T001, FR-3102, SC-3103).
 *
 * ## The failure this exists to make impossible
 *
 * A learner arrives in March without the classroom's language. Somewhere in her notes is
 * a sentence like «llegó de Marruecos en febrero» — because that is what a teacher writes
 * — and somewhere a well-meaning line of code turns «Marruecos» into «árabe» and starts
 * offering Arabic glosses.
 *
 * It would be right often enough to look like a feature. It is a guess about a child's
 * home language made from his country, and it would be wrong for the Amazigh speaker, for
 * the French-schooled child, for the one whose family speaks Spanish at home. What
 * arrives on the page is a **claim about him that nobody made**, and it arrives in a
 * record that follows him.
 *
 * So the only source is `vehicular.languages`: what **she** wrote down. Asserted two
 * ways, because the behavioural half cannot see a mapping table that is not reached yet
 * and the structural half cannot see a language interpolated at runtime.
 *
 * Written before the feature, red against nothing, so every later task lands inside it.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');

/** Languages that must never appear unless she named them. */
const LANGUAGES = ['árabe', 'arabe', 'rumano', 'chino', 'ucraniano', 'wolof', 'amazig',
                   'bereber', 'francés', 'frances', 'inglés', 'ingles', 'portugués'];

const profile = (over: Partial<Profile> = {}): Profile => ({
  code: 'V01', axes: { LIN: 1 }, works: [], avoid: [], interests: [],
  response: {}, language: { instruction: 'es' },
  ...over,
} as Profile);

describe('behaviourally: no language reaches the model that she did not write', () => {
  /**
   * The three places a teacher's own words go into a prompt, each carrying the kind of
   * sentence that invites the guess.
   */
  const TEMPTING = [
    'Llegó de Marruecos en febrero, escolarizado allí hasta 4.º.',
    'La familia habla en casa, él contesta en clase con gestos.',
    'Vino de Rumanía el curso pasado.',
  ];

  it('a note naming a country produces no language anywhere in the prompt', () => {
    for (const notes of TEMPTING) {
      const { prompt } = buildAdaptPrompt({
        profile: profile(),
        recipes: [],
        notes,
        material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
      });
      /*
       * The note itself is in the prompt — it is hers and it belongs there. What must not
       * be there is a **language** that nothing recorded: the country is a fact she
       * wrote, and the language would be an inference Rampa made.
       */
      expect(prompt).toContain(notes);
      for (const language of LANGUAGES) {
        expect(prompt.toLowerCase(), `«${language}» appeared from «${notes}»`)
          .not.toContain(language);
      }
    }
  });

  it('nor from her free text about interests or what works', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile({
        interests: ['fútbol', 'la música de su país'],
        works: ['Traduce con el móvil cuando no entiende una palabra'],
      } as Partial<Profile>),
      recipes: [],
      material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
    });
    for (const language of LANGUAGES) {
      expect(prompt.toLowerCase()).not.toContain(language);
    }
  });

  it('and today the prompt says nothing about language at all — recorded, not asserted', () => {
    /*
     * The counterpart, and it turned out to be a finding rather than a check.
     *
     * The first version of this asserted that `language.instruction` reaches the prompt,
     * so that «no language appears» could not be satisfied by sending nothing about
     * language. It does not: `buildAdaptPrompt` never mentions the classroom's language,
     * and the material being in that language is what has carried it so far.
     *
     * That is fine for a native speaker and it is the gap `033` exists in. So this
     * records the state instead of asserting a behaviour that does not exist — and when
     * a later task puts the classroom language in the prompt, this case is where it has
     * to be updated, deliberately, by whoever does it.
     */
    const { prompt } = buildAdaptPrompt({
      profile: profile({ language: { instruction: 'ca' } } as Partial<Profile>),
      recipes: [],
      material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
    });
    expect(prompt).not.toMatch(/\bca\b|catal/i);
    // What the profile *does* send is the axes and her own words — that much is not empty.
    expect(prompt).toContain('LIN: 1');
  });
});

/* ── The structural half ─────────────────────────────────────────────────────── */

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'out' || entry === 'corpus'
        || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
};

/** Comments stripped: this file's own prose names every country it forbids. */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

describe('structurally: no source maps anything to a language', () => {
  const sources = (): Array<{ path: string; text: string }> =>
    [join(appRoot, 'packages'), join(appRoot, 'ui'), join(appRoot, 'scripts')]
      .flatMap(walk)
      .map((f) => ({ path: f.replace(`${appRoot}/`, ''), text: code(readFileSync(f, 'utf8')) }));

  it('found sources to check', () => {
    // The guard on the guard: an empty list satisfies everything below it.
    expect(sources().length).toBeGreaterThan(50);
  });

  it('no country or nationality appears as a key beside a language', () => {
    /*
     * The shape of the mapping table this forbids, rather than a word list: a country
     * name near a language code, which is what `{ Marruecos: 'ar' }` looks like however
     * it is spelled.
     */
    const offenders = sources()
      .filter(({ text }) =>
        /(Marruecos|Rumania|Ruman[íi]a|Ucrania|Senegal|China|Argelia|Pakist[áa]n)[^\n]{0,40}['"][a-z]{2,3}['"]/
          .test(text))
      .map(({ path }) => path);
    expect(offenders, 'a country mapped to a language is a guess about a child').toEqual([]);
  });

  it('and no name is mapped to a language either', () => {
    /*
     * The other half of the same guess, and the more tempting one: «Mohamed» → Arabic.
     * It is a claim about a child derived from what his parents called him.
     */
    const offenders = sources()
      .filter(({ text }) => /(nameToLanguage|languageFromName|guessLanguage|inferLanguage)/i
        .test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('and `vehicular.languages` is read from the profile and nowhere else', () => {
    /*
     * Once the block exists, this is what keeps it the only source. Written now, with the
     * list empty, so the assertion is in place before the first reader — which is the
     * whole argument for writing this file first.
     *
     * The readers are named as they arrive. A new one is a decision somebody makes at
     * this line, which is the point: «where does this language come from» has exactly one
     * answer, and it is «she wrote it down».
     */
    const readers = sources()
      .filter(({ text }) => /vehicular[\s\S]{0,40}languages|languages[\s\S]{0,20}vehicular/
        .test(text))
      .map(({ path }) => path)
      .sort();
    expect(readers).toEqual([
      /*
       * The first one arrived on 2026-09-05, and this assertion went red for it — which
       * is the whole point of writing the list empty before the feature existed.
       *
       * `prompt/adapt.ts` puts her recorded languages into the mark's section so the model
       * knows which language the bridge words are in. It reads them off the input the
       * caller hands it, and the caller reads them off `profile.vehicular` — the one
       * place they live. Nothing here derives, defaults or completes them.
       */
      'packages/core/src/prompt/adapt.ts',
    ].sort());
  });
});
