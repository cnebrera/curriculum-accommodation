import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { applyPictograms, parseIR, selectRecipes, readSet, type SetReader } from '../src/index.js';

/**
 * No axis value can enable pictograms (018 T005, FR-1605, SC-1603).
 *
 * ## Why this is the sharpest instance of Principle V in the project
 *
 * Every other recipe family fires from an axis, and that is safe: reducing load
 * when it was not needed costs nothing. **This family adds to the page**, and it is
 * the most visible difference there is. A child in an aula ordinaria holding a
 * sheet covered in pictograms while thirty classmates hold a plain one is being
 * marked out by the tool meant to include him. A dyslexic fifteen-year-old does not
 * want a worksheet that looks like it is for a five-year-old, and would be right.
 *
 * ## Structural, not a convention
 *
 * `015` proved the version of this that lasts: make it unexpressible rather than
 * forbidden. `applyPictograms` takes no profile and cannot reach an axis; the
 * recipe corpus has no pictogram family for `selectRecipes` to return. So there is
 * no code in which an axis value enables this — and the day somebody adds one,
 * these tests fail rather than a reviewer noticing.
 */
const srcDir = join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'pictograms');
/**
 * **Code, with the comments stripped.**
 *
 * My first version scanned the whole file and flagged `apply.ts` for the word
 * «axes» — inside the comment explaining that it cannot reach an axis. A test that
 * fails on the document explaining the test is one somebody deletes rather than
 * fixes, and this project has now produced that mistake six times.
 *
 * The prose *should* say «axis»: that is where the reasoning lives. What must not
 * exist is a line of code that reads one.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

const sources = readdirSync(srcDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: f, src: stripComments(readFileSync(join(srcDir, f), 'utf8')) }));

const AXES = ['VIS', 'AUD', 'MOT', 'ATE', 'COG', 'COM', 'DEC', 'EJE', 'PER', 'LEC'];

describe('the module cannot see a barrier', () => {
  it('mentions no axis code anywhere', () => {
    for (const { file, src } of sources) {
      for (const code of AXES) {
        expect(src, `pictograms/${file} mentions ${code}`)
          .not.toMatch(new RegExp(`\\b${code}\\b`));
      }
    }
  });

  it('reads no axis field, and takes no profile', () => {
    for (const { file, src } of sources) {
      expect(src, `pictograms/${file} reads axes`).not.toMatch(/\baxes\b|axisLevelOf|\.axes/);
      expect(src, `pictograms/${file} takes a profile`).not.toMatch(/\bprofile\b/i);
    }
  });

  /**
   * The decision arrives as `enabled` plus a scope, and nothing else. A function
   * that accepted a profile could consult an axis by mistake in a later edit; one
   * that never had it cannot.
   */
  it('applies with no knowledge of the learner beyond her decision', async () => {
    const set = await loadFixture();
    const doc = parseIR(['---', 'lang: es', '---', '',
      '::: {#b1 .instruction}', 'Rodea la casa.', ':::'].join('\n'));

    // No profile is passed, because there is no parameter for one.
    const { used } = applyPictograms(doc, set, { language: 'es', scope: 'all' });
    expect(used).toHaveLength(1);
  });
});

describe('the recipe corpus offers nothing that could fire on its own', () => {
  it('no shipped recipe mentions pictograms', () => {
    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const recipesDir = join(root, 'recipes');
    const found: string[] = [];

    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!e.name.endsWith('.md')) continue;
        if (/pictograma|pictogram/i.test(readFileSync(p, 'utf8'))) found.push(e.name);
      }
    };
    walk(recipesDir);

    /*
     * A recipe is selected by an axis. A pictogram recipe would therefore be a
     * pictogram enabled by an axis, whatever its prose said — which is why this
     * family is a transform and not a recipe at all (research R1).
     */
    expect(found, 'a pictogram recipe is a pictogram enabled by an axis').toEqual([]);
  });

  it('selection returns nothing about pictograms for any profile', () => {
    // Over a profile with every axis at its maximum, which is the case a
    // well-meaning implementation would fire on.
    const profile = {
      code: 'X1',
      axes: Object.fromEntries(AXES.map((a) => [a, 3])),
      works: [], avoid: [], interests: [], response: {}, language: {},
    };
    const selected = selectRecipes([], profile as never, 'es');
    expect(JSON.stringify(selected)).not.toMatch(/pictogram/i);
  });
});

async function loadFixture() {
  const reader: SetReader = {
    list: async () => ['1001.png', 'pictograms.es.json'],
    readText: async (p) => (p.endsWith('.json')
      ? JSON.stringify([{ id: '1001', keywords: ['casa'] }]) : null),
  };
  const { set } = await readSet('/set', reader);
  if (!set) throw new Error('fixture');
  return set;
}
