import { describe, it, expect } from 'vitest';
import { buildAdaptPrompt, buildReport, parseIR, profileSchema, type Profile } from '../src/index.js';

/**
 * `school` never leaves the machine (015 FR-1306/1307).
 *
 * It is not needed for any adaptation, and a school plus a course plus a set of
 * barriers identifies a child far more sharply than a code does. So it is in the
 * never-sent set beside the name.
 *
 * ## Why this is a test rather than a mechanism
 *
 * `buildAdaptPrompt` reads named fields and never spreads the profile, so today a
 * school is not sent because nothing sends it. That is a weaker guarantee than a
 * chokepoint, and it is the honest one available: there is no single place a
 * prompt passes through that could strip a field on the way.
 *
 * A comment saying "do not add a spread here" would be the kind of defence this
 * project's own doctrine ranks last (Principle IX, one level up). A test that
 * fails the day somebody adds one is the kind it ranks first.
 */
const SCHOOL = 'CEIP Las Encinas de Villanueva';

const withSchool = (): Profile => profileSchema.parse({
  code: 'E38',
  axes: { COG: 3, ATE: 2 },
  works: ['Le funciona empezar en voz alta'],
  avoid: ['Nada con cuenta atrás'],
  interests: ['dinosaurios'],
  age: 10,
  year: 'es:primaria-5',
  stage: 'Primaria',
  school: SCHOOL,
}) as Profile;

describe('the school reaches no prompt', () => {
  it('is stored on the profile', () => {
    expect(withSchool().school).toBe(SCHOOL);
  });

  it('does not appear in an adaptation prompt', () => {
    const { prompt } = buildAdaptPrompt({
      profile: withSchool(),
      recipes: [],
      material: '::: {#b1 .exercise}\nCalcula\n:::\n',
      age: 10, year: '5.º de Primaria', stage: 'Primaria',
    });
    expect(prompt).not.toContain(SCHOOL);
    expect(prompt).not.toContain('Encinas');
    // And the fields that *are* meant to be there still are, so this is not
    // passing because the prompt came back empty.
    expect(prompt).toContain('dinosaurios');
    expect(prompt).toContain('5.º de Primaria');
  });

  it('does not appear in a report', () => {
    const report = buildReport({
      adapted: parseIR('::: {#b1 .exercise data-recipe="r@1" data-axis="COG" data-from="b1"}\nx\n:::\n'),
    });
    expect(report.markdown).not.toContain(SCHOOL);
  });

  /**
   * The assertion that survives a refactor: whatever else changes, a prompt built
   * from a profile whose every string field is the same sentinel must not contain
   * that sentinel via `school`.
   */
  it('stays absent when every other field is present too', () => {
    const p = profileSchema.parse({
      code: 'E38', axes: { COG: 2 },
      works: ['w'], avoid: ['a'], interests: ['i'],
      school: SCHOOL,
    }) as Profile;
    const { prompt } = buildAdaptPrompt({ profile: p, recipes: [], material: 'x' });
    expect(prompt).not.toContain(SCHOOL);
  });
});
