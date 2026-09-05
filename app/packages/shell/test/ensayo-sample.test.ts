import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { load as loadYaml } from 'js-yaml';

/**
 * The sample tells the truth (035 T007, FR-3307/3310, quickstart §3).
 *
 * Its own file, apart from the module-graph boundary: that one is about what the code may
 * import, this one is about whether the authored material is honest. They fail for
 * completely different reasons and a person reading either failure should not have to
 * work out which kind it is.
 *
 * The claim: **this is the one adaptation every new user will see**, so every sentence in
 * it has to survive being read carefully by somebody deciding whether to trust the
 * application. A cited recipe that does not exist, a fictional child that does not say so,
 * a sample sheet without its «material de ejemplo» — each of them is the first thing
 * Rampa teaches her, and each of them would be false.
 */
const shellSrc = join(dirname(new URL(import.meta.url).pathname), '..', 'src');
const repo = join(shellSrc, '..', '..', '..', '..');
const sample = join(repo, 'sample', 'ensayo');
const read = (rel: string): string => readFileSync(join(sample, rel), 'utf8');

describe('the authored sample says what it is', () => {

  it('the fictional learner declares itself, in the field and in its prose', () => {
    /*
     * FR-3307, Principle VII applied to the sample itself: a fabricated child has to be
     * fabricated **loudly**. `sample: true` is what the code reads; the sentence in the
     * notes is what a person reads, including a person who opened the file in Obsidian
     * with no application in front of them.
     */
    const profile = loadYaml(read('profiles/E00/profile.yaml')) as Record<string, unknown>;
    expect(profile['sample']).toBe(true);
    expect(profile['code']).toBe('E00');
    expect(read('profiles/E00/notes.md')).toContain('Este alumno no existe');
  });

  it('and resembles nothing personal: a given name, no surname, an invented school', () => {
    const profile = loadYaml(read('profiles/E00/profile.yaml')) as Record<string, string>;
    // The register `scripts/seed-learners.mjs` already uses for invented learners.
    expect(profile['school']).toMatch(/ejemplo/i);
    // No name field at all in the profile: names live in the encrypted store, never here.
    expect(Object.keys(profile)).not.toContain('name');
  });

  it('leaves axes out rather than scoring all ten', () => {
    /*
     * The sample is also her first example of what a good profile looks like, so a
     * profile that scored every axis would teach the opposite of `010`/`018`'s rule:
     * absent is not zero, and a 0 she never checked is a fact she did not establish.
     */
    const axes = (loadYaml(read('profiles/E00/profile.yaml')) as
      { axes: Record<string, number> }).axes;
    expect(Object.keys(axes).length).toBeLessThan(10);
    expect(Object.keys(axes).length).toBeGreaterThan(2);
  });

  it('the reading carries its one authored flaw, and the manifest names it', () => {
    /*
     * FR-3310. The verification screen exists because OCR gets things wrong, and a
     * flawless sample teaches her nothing about looking at it. Named in the manifest so
     * this test can hold it in place — a sample whose flaw somebody «fixed» with the best
     * of intentions is a verification screen with nothing to teach.
     */
    const manifest = loadYaml(read('manifest.yaml')) as { flaw: { page: number; what: string } };
    expect(manifest.flaw.what).toBeTruthy();
    // The flaw itself, still in the reading: an «x» where the photo has «×».
    expect(read('material/ensayo-1/ir.md')).toContain('5 x 4');
    expect(read('material/ensayo-1/source/pagina-1.svg')).toContain('5 x 4');
    // …and the adaptation shows what it looks like once she has corrected it.
    expect(read('material/ensayo-1/E00/adapted.md')).toContain('5 × 4');
  });

  it('the sample sheet says it is a sample, in the document', () => {
    /*
     * FR-3305: the mark is **in the document**, so every rendering carries it by
     * construction — the HTML, the ODT, the audio and the PDF she prints. A banner added
     * by a screen is a banner the other three renderers do not have.
     */
    const adapted = read('material/ensayo-1/E00/adapted.md');
    expect(adapted).toContain('material_de_ejemplo: true');
    expect(adapted).toContain('Material de ejemplo');
    expect(adapted).toContain('No la imprimas para nadie');
  });

  it('and its report is genuine: real recipes, at versions that exist', () => {
    /*
     * The one adaptation everybody will see. A report citing a recipe that does not exist
     * would be the first thing this application taught her, and it would be false.
     */
    const report = read('material/ensayo-1/E00/report.md');
    const cited = [...report.matchAll(/`([a-z-]+)@(\d+)`/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(cited.length).toBeGreaterThan(2);

    for (const [id, version] of cited) {
      const path = join(repo, 'recipes', 'core', `${id}.md`);
      expect(existsSync(path), `${id} is cited and does not exist`).toBe(true);
      expect(readFileSync(path, 'utf8'), `${id}@${version}`).toContain(`version: ${version}`);
    }
  });

  it('and the would-be cost is an estimate, with no ledger anywhere in the sample', () => {
    const manifest = loadYaml(read('manifest.yaml')) as
      { wouldCost: { readCents: number; adaptCents: number } };
    expect(manifest.wouldCost.readCents).toBeGreaterThan(0);
    expect(manifest.wouldCost.adaptCents).toBeGreaterThan(0);
    // An empty ledger and no ledger are different facts, and the second is the true one.
    expect(existsSync(join(sample, '.rampa', 'costs.json'))).toBe(false);
  });
});
