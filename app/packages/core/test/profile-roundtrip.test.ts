import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';
import { profileSchema, validateWithRepair, curFor } from '../src/vault/schema.js';
import { Vault } from '../src/vault/io.js';
import { loadLearner, saveProfile } from '../src/vault/profile.js';
import { learnerProfile } from '../src/vault/paths.js';
import { costCents, PRICES } from '../src/cost/index.js';

/**
 * T092c — her words survive a save.
 *
 * The vault exists so a teacher can edit her own files by hand. The profile
 * editor sent `interests: [], response: {}` unconditionally, so opening a
 * learner in the app and pressing Guardar deleted whatever she had written
 * there. `docs/profile-schema.md` says the qualitative fields carry more weight
 * in practice than the numbers, which makes this a data-loss bug in the fields
 * that matter most.
 */
describe('a profile round-trip loses nothing (T092c)', () => {
  const vault = async () => new Vault(await mkdtemp(join(tmpdir(), 'rampa-profile-')));

  const handWritten = `---
code: A3
axes:
  COG: 3
  EJE: 3
works:
  - Primer ejercicio hecho como ejemplo
avoid:
  - Nada con reloj
interests:
  - dinosaurios
  - fútbol
response:
  default: short
  writing: Dicta y un adulto transcribe
language:
  instruction: es
  l1: ar
axes_confirmed:
  COG: '2026-09-04'
---
`;

  it('keeps every qualitative field she wrote by hand', async () => {
    const v = await vault();
    await v.writeRaw(learnerProfile('A3'), handWritten);

    const loaded = await loadLearner(v, 'A3');
    expect(loaded.profile.interests).toEqual(['dinosaurios', 'fútbol']);
    expect(loaded.profile.response['writing']).toBe('Dicta y un adulto transcribe');
    expect(loaded.profile.language['l1']).toBe('ar');

    // Save it straight back, as pressing Guardar does.
    await saveProfile(v, loaded.profile);
    const again = await loadLearner(v, 'A3');

    expect(again.profile.interests).toEqual(['dinosaurios', 'fútbol']);
    expect(again.profile.response['writing']).toBe('Dicta y un adulto transcribe');
    expect(again.profile.language['l1']).toBe('ar');
    expect(again.profile.works).toEqual(['Primer ejercicio hecho como ejemplo']);
    expect(again.profile.avoid).toEqual(['Nada con reloj']);
  });

  it('keeps fields the schema does not know about', async () => {
    const v = await vault();
    await v.writeRaw(learnerProfile('B7'), `---
code: B7
axes:
  PER-V: 3
una_cosa_mia: la que sea
---
`);
    const loaded = await loadLearner(v, 'B7');
    await saveProfile(v, loaded.profile);
    const raw = (await v.readRaw(learnerProfile('B7'))) ?? '';
    expect(raw).toContain('una_cosa_mia');
  });

  it('never turns an unobserved axis into a zero on the way through', async () => {
    const v = await vault();
    await v.writeRaw(learnerProfile('C4'), `---\ncode: C4\naxes:\n  COG: 2\n---\n`);
    const loaded = await loadLearner(v, 'C4');
    await saveProfile(v, loaded.profile);
    const raw = (await v.readRaw(learnerProfile('C4'))) ?? '';
    expect(raw).not.toMatch(/PER-V:\s*0/);
    expect(raw).toContain('COG: 2');
  });
});

/**
 * T092 — the cost the teacher is shown depends on prompt caching, which was
 * never requested. These pin the arithmetic the promise rests on.
 */
describe('cached prefixes are what make it cents (T092)', () => {
  it('a cached prefix costs a fraction of a fresh one', () => {
    const fresh = costCents({ model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000 });
    const cached = costCents({
      model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000,
      cachedInputTokens: 13_000,
    });
    expect(cached!).toBeLessThan(fresh!);
  });

  it('counts a cache write at its premium rather than pretending it is free', () => {
    const written = costCents({
      model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000,
      cacheWriteTokens: 13_000,
    });
    const fresh = costCents({ model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000 });
    expect(written!).toBeGreaterThanOrEqual(fresh!);
  });

  it('every priced model declares both cache rates, or the estimate lies', () => {
    // Sin excepciones desde que `gemini-free` se retiró (backlog G67): la entrada que
    // saltaba este invariante era la que valoraba Google a cero.
    for (const [model, p] of Object.entries(PRICES)) {
      expect(p.cachedInput, `${model} cachedInput`).toBeDefined();
      expect(p.cacheWrite, `${model} cacheWrite`).toBeDefined();
      expect(p.cachedInput!).toBeLessThan(p.input);
    }
  });
});

describe('the example profiles are profiles', () => {
  const examples = join(
    dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..', 'profiles.example');

  /*
   * `docs/profile-schema.md` tells her these are «safe to read and copy», and until now
   * nothing checked that they parse. A broken example is a teacher copying a file that
   * this application then repairs fields out of — and the only place she would notice is
   * a worksheet that came out wrong.
   *
   * Added 2026-09-05 with `M1.yaml` (`032`), because a third example with a field the
   * other two do not have is exactly when an unchecked directory starts to drift.
   */
  it('every one parses cleanly, with no field repaired away', () => {
    const files = readdirSync(examples).filter((f) => f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThanOrEqual(3);

    for (const file of files) {
      /*
       * `yaml.load`, not `parseFrontMatter`: these files are plain YAML with no `---`
       * fences, and the front-matter parser reads that as an empty document — so the
       * first version of this test validated `{}` four times and passed on `M1.yaml`
       * without ever seeing it.
       */
      const data = loadYaml(readFileSync(join(examples, file), 'utf8')) as Record<string, unknown>;
      const { value, repairs, unparsed } = validateWithRepair(
        profileSchema, data, `profiles.example/${file}`);
      expect(repairs, `${file} must not need repairing`).toEqual([]);
      expect(value.code, `${file} must have a code`).toBeTruthy();
      /*
       * And nothing left over. An unknown key here is either a typo or a field this
       * schema forgot — both worth seeing, and neither visible while the directory is
       * read by nobody.
       */
      expect(Object.keys(unparsed), `${file} has fields the schema does not know`)
        .toEqual([]);
    }
  });

  it('and `M1.yaml` is the per-área example the docs point at', () => {
    const data = loadYaml(readFileSync(join(examples, 'M1.yaml'), 'utf8')) as Record<string, unknown>;
    const { value } = validateWithRepair(profileSchema, data, 'M1.yaml');
    expect(value.cur_areas).toEqual({ 'Matemáticas': 2, 'Lengua': 0 });
    // The general is what an undetailed área uses — «Inglés» is absent on purpose.
    expect(value.axes?.['CUR']).toBe(2);
    expect(curFor(value as Parameters<typeof curFor>[0], 'Inglés')).toBe(2);
  });
});
