import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    expect(cached).toBeLessThan(fresh);
  });

  it('counts a cache write at its premium rather than pretending it is free', () => {
    const written = costCents({
      model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000,
      cacheWriteTokens: 13_000,
    });
    const fresh = costCents({ model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000 });
    expect(written).toBeGreaterThanOrEqual(fresh);
  });

  it('every priced model declares both cache rates, or the estimate lies', () => {
    for (const [model, p] of Object.entries(PRICES)) {
      if (model === 'gemini-free') continue;
      expect(p.cachedInput, `${model} cachedInput`).toBeDefined();
      expect(p.cacheWrite, `${model} cacheWrite`).toBeDefined();
      expect(p.cachedInput!).toBeLessThan(p.input);
    }
  });
});
