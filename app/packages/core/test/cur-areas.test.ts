import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault } from '../src/vault/io.js';
import { loadLearner, saveProfile } from '../src/vault/profile.js';
import { learnerProfile } from '../src/vault/paths.js';
import { curFor, axisLevelOf, validateWithRepair, type Profile } from '../src/vault/schema.js';
import { vaultSchema, VAULT_SCHEMA_CUR_AREAS, VAULT_SCHEMA_V1 } from '../src/vault/version.js';
import { knownAreas, nearDuplicate } from '../src/vault/areas.js';

/**
 * The CUR that governs one area (032 T002, FR-3001/3002/3005, quickstart §2).
 *
 * ## One helper, because a fallback re-derived twice is two fallbacks
 *
 * «No pair for this area» must mean «use the general», and it must mean that in the
 * prompt, in the compose level, in the ACNS draft and on the profile screen. Written
 * once, each of those would express it slightly differently, and the one that expressed
 * it as `?? 0` would silently assert that a child is at his year's level in a subject
 * nobody has assessed. So there is one function and every consumer calls it — the same
 * argument `031` makes for `sheetFreshness`.
 *
 * ## The catastrophe this file is really guarding
 *
 * `cur_areas` is a **sibling** of `axes`, never a key inside it, and the last test here
 * is why (research R1). An older build parses profiles through a schema that has never
 * heard of the field. If the pairs lived inside `axes`, that schema's repair would set
 * the whole `axes` object aside as malformed — and a learner whose axes are all gone
 * selects no recipes at all: every adaptation off, silently, on the machine of whichever
 * colleague has not updated. As an unknown top-level key it is carried verbatim instead,
 * which is a property of the shape and not of anybody's care.
 */
const profile = (
  axes: Record<string, 0 | 1 | 2 | 3>,
  cur_areas?: Record<string, 0 | 1 | 2 | 3>,
): Profile => ({
  code: 'M01', axes, works: [], avoid: [], interests: [],
  response: {}, language: {}, ...(cur_areas ? { cur_areas } : {}),
} as Profile);

describe('the CUR that governs one area', () => {
  const marco = profile({ CUR: 2, COG: 1 }, { 'Matemáticas': 2, 'Lengua': 0 });

  it('is the pair, where she detailed one', () => {
    expect(curFor(marco, 'Matemáticas')).toBe(2);
    expect(curFor(marco, 'Lengua')).toBe(0);
  });

  it('is the general where she did not — fallback, never zero by omission', () => {
    /*
     * The whole point of the feature, stated as its sharpest failure: reading an absent
     * pair as 0 would assert «al nivel de su curso» about a subject nobody assessed, and
     * 0 is an assertion a person makes (`011`).
     */
    expect(curFor(marco, 'Inglés')).toBe(2);
    expect(curFor(marco, 'Inglés')).not.toBe(0);
  });

  it('is the general when no area is named at all', () => {
    expect(curFor(marco)).toBe(2);
  });

  it('is null when there is neither a pair nor a general', () => {
    const p = profile({ COG: 2 }, { 'Lengua': 0 });
    expect(curFor(p, 'Matemáticas')).toBeNull();
    expect(curFor(p)).toBeNull();
    // …and the pair she did write still answers, so «null» is about absence, not about
    // the profile being unusable.
    expect(curFor(p, 'Lengua')).toBe(0);
  });

  it('a general of 0 is a value, and does not fall through to null', () => {
    const p = profile({ CUR: 0 });
    expect(curFor(p, 'Matemáticas')).toBe(0);
    expect(curFor(p)).toBe(0);
  });

  it('for a profile with only the general, every area gets it — today, bit for bit', () => {
    const old = profile({ CUR: 3 });
    for (const area of ['Matemáticas', 'Lengua', 'Inglés', 'Conocimiento del Medio']) {
      expect(curFor(old, area)).toBe(axisLevelOf(old, 'CUR'));
    }
    expect(curFor(old)).toBe(3);
  });

  it('keys are exact strings: «Mates» and «Matemáticas» are two areas', () => {
    /*
     * Deliberate. The near-duplicate flag happens at entry time in the editor (FR-3007);
     * canonicalising **stored** data would be Rampa rewriting what she typed in her own
     * file, and the vault is hers.
     */
    const p = profile({ CUR: 1 }, { 'Mates': 3 });
    expect(curFor(p, 'Mates')).toBe(3);
    expect(curFor(p, 'Matemáticas')).toBe(1);
  });
});

describe('only CUR gains an area dimension (FR-3002)', () => {
  it('`curFor` ignores every other axis, whatever the area', () => {
    /*
     * Asserted rather than assumed, because the temptation is structural: the moment a
     * per-area lookup exists, a generic `axisLevelOf(p, axis, area)` looks like tidying
     * up. The other nine axes describe barriers that travel with the child between
     * subjects — a per-area DEC is a category error in the opposite direction.
     */
    const p = profile({ CUR: 1, DEC: 3 }, { 'Lengua': 0 });
    expect(axisLevelOf(p, 'DEC')).toBe(3);
    expect(curFor(p, 'Lengua')).toBe(0);
    // And there is no second map: `cur_areas` is the only area-keyed field.
    expect(Object.keys(p).filter((k) => /areas|by_area/.test(k))).toEqual(['cur_areas']);
  });
});

describe('an older build reading a profile that has areas (research R1)', () => {
  /** `profileSchema` as it was before this feature: no `cur_areas`, everything else the same. */
  const oldSchema = z.object({
    code: z.string(),
    axes: z.record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
      .optional(),
    works: z.array(z.string()).optional(),
    avoid: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
  });

  const onDisk = {
    code: 'M01',
    axes: { CUR: 2, COG: 1 },
    cur_areas: { 'Matemáticas': 2, 'Lengua': 0 },
    interests: ['dinosaurios'],
  };

  it('keeps the whole `axes` record intact', () => {
    const { value, unparsed } = validateWithRepair(oldSchema, onDisk, 'profiles/M01/profile.yaml');
    /*
     * The catastrophe test. Were the pairs nested inside `axes`, this record would be the
     * thing the old schema rejected — and a learner with no axes selects no recipes at
     * all. Every adaptation off, on the machine of whoever has not updated, with nothing
     * on screen to say so.
     */
    expect(value.axes).toEqual({ CUR: 2, COG: 1 });
    expect(unparsed['cur_areas']).toEqual({ 'Matemáticas': 2, 'Lengua': 0 });
  });

  it('and carries the pairs verbatim through a save', async () => {
    const v = new Vault(await mkdtemp(join(tmpdir(), 'rampa-curareas-')));
    await v.writeRaw(learnerProfile('M01'), `---
code: M01
axes:
  CUR: 2
cur_areas:
  Matemáticas: 2
  Lengua: 0
---
`);
    const { profile: loaded } = await loadLearner(v, 'M01');
    await saveProfile(v, loaded);
    const after = (await v.readRaw(learnerProfile('M01'))) ?? '';

    // Whether this build understands the field or merely carries it, her numbers survive.
    expect(after).toContain('Matemáticas: 2');
    expect(after).toContain('Lengua: 0');
    expect(curFor(loaded, 'Matemáticas')).toBe(2);
    expect(curFor(loaded, 'Lengua')).toBe(0);
  });
});

describe('writing a per-area value upgrades the vault, and nothing else does (FR-3005)', () => {
  const vault = async () => new Vault(await mkdtemp(join(tmpdir(), 'rampa-curbump-')));

  it('a profile she never details leaves the vault at version 1', async () => {
    const v = await vault();
    await saveProfile(v, profile({ CUR: 2, COG: 1 }));
    /*
     * The marker must not cry wolf. If a save stamped the version whenever the field
     * merely existed, every profile screen sending `cur_areas: {}` would mark her whole
     * vault as carrying a shape older readers cannot handle — for nothing.
     */
    expect(await vaultSchema(v)).toBe(VAULT_SCHEMA_V1);
  });

  it('an empty map is «nobody detailed anything», not a new shape', async () => {
    const v = await vault();
    await saveProfile(v, profile({ CUR: 2 }, {}));
    expect(await vaultSchema(v)).toBe(VAULT_SCHEMA_V1);
  });

  it('the first real pair bumps it, at the write and not at the read', async () => {
    const v = await vault();
    await saveProfile(v, profile({ CUR: 2 }, { 'Matemáticas': 2 }));
    expect(await vaultSchema(v)).toBe(VAULT_SCHEMA_CUR_AREAS);

    // Reading it again changes nothing: a version bumped on read rewrites vaults that
    // gained nothing, and on a folder synced with a colleague that is a conflict.
    await loadLearner(v, 'M01');
    expect(await vaultSchema(v)).toBe(VAULT_SCHEMA_CUR_AREAS);
  });

  it('and it never goes back down when she clears the areas again', async () => {
    const v = await vault();
    await saveProfile(v, profile({ CUR: 2 }, { 'Matemáticas': 2 }));
    await saveProfile(v, profile({ CUR: 2 }));
    /*
     * Monotonic. Lowering it is how the shared-folder case corrupts the marker itself:
     * the older application would then stop looking for shapes that are still in the
     * other files.
     */
    expect(await vaultSchema(v)).toBe(VAULT_SCHEMA_CUR_AREAS);
  });
});

describe('the area vocabulary, and the flag that never merges (FR-3007)', () => {
  const known = knownAreas({
    roster: ['Matemáticas', 'Lengua', 'Matemáticas'],
    record: ['Naturales', ' Lengua '],
  });

  it('is the union of what the vault already knows, deduplicated and ordered', () => {
    expect(known).toEqual(['Lengua', 'Matemáticas', 'Naturales']);
  });

  it('flags «Mates» against «Matemáticas», and a stray capital against anything', () => {
    expect(nearDuplicate('Mates', known)).toBe('Matemáticas');
    expect(nearDuplicate('MATEMÁTICAS', known)).toBe('Matemáticas');
  });

  it('and folds accents — with a case that only accent-folding can answer', () => {
    /*
     * «matematicas» would be caught by the shared prefix anyway, so it proves nothing
     * about the fold. «Música» does: the accent falls **inside** the first four letters,
     * so without folding «Musica» shares no prefix with it and the flag never appears —
     * she ends up with two subjects one keystroke apart.
     *
     * Written this way because the first version of this case asserted on «matematicas»
     * and stayed green with accent-folding deleted: a test that cannot fail is a test
     * that reports safety.
     */
    expect(nearDuplicate('Musica', ['Música'])).toBe('Música');
    expect(nearDuplicate('Educacion Fisica', ['Educación Física'])).toBe('Educación Física');
  });

  it('does not flag a distinct subject, nor a name she has barely started', () => {
    expect(nearDuplicate('Inglés', known)).toBeNull();
    // Three shared letters is not enough: «Natación» is not «Naturales».
    expect(nearDuplicate('Natación', known)).toBeNull();
    // «L» is not a near-duplicate of «Lengua»; it is an unfinished word.
    expect(nearDuplicate('L', known)).toBeNull();
    expect(nearDuplicate('Len', known)).toBeNull();
  });

  it('flags the case that matters most: a longer name starting the same way', () => {
    // She would end up with «Lengua» and «Lenguaje musical» as two areas. Perhaps she
    // means to — that is her call, and the flag is what puts the call in front of her.
    expect(nearDuplicate('Lenguaje musical', known)).toBe('Lengua');
  });

  it('and flags nothing when she types exactly what already exists', () => {
    // There is nothing to warn about: she picked the existing one.
    expect(nearDuplicate('Lengua', known)).toBeNull();
  });

  it('flagging is all it does — nothing here rewrites a stored name', () => {
    /*
     * The function returns the candidate and stops. A merge she did not ask for is the
     * tool renaming her subjects, and «Lengua» folded silently into «Lenguaje musical»
     * is exactly the plausible-wrong this project fears most. Her spelling wins if she
     * insists; that decision belongs to the screen, and the screen can only make it
     * because this returns an answer rather than performing one.
     */
    const before = [...known];
    nearDuplicate('Mates', known);
    expect(known).toEqual(before);
  });
});
