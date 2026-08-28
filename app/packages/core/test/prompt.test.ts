import { describe, it, expect } from 'vitest';
import { buildAdaptPrompt, boundNotes, NOTES_BUDGET_CHARS } from '../src/prompt/adapt.js';
import { parseRecipe, type Recipe } from '../src/recipes/index.js';
import { profileSchema, type Profile } from '../src/vault/schema.js';

const profile = (over: Partial<Profile> = {}): Profile => ({
  ...profileSchema.parse({ code: 'A3', axes: { COG: 3, EJE: 3 } }),
  ...over,
});

const recipe = (id: string): Recipe =>
  parseRecipe(`---\nid: ${id}\nversion: 2\naxes: [COG>=2]\nscope: [exercise]\n---\n\nHaz esto.\n`,
    `${id}.md`, 'core')!;

describe('the prompt carries what the teacher has taught it (T084)', () => {
  /**
   * The defect this pins: the shell loaded the learner's notes and then dropped
   * them before building the prompt, so a learner-scope correction never reached
   * the next run. That is 003 SC-201 — "a correction is never made twice" —
   * failing silently, and it is the loop the whole project rests on.
   */
  it('includes the learner notes, which were previously discarded', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile(),
      notes: '---\nlearner: A3\n---\n\n## 2026-09-04 · Casillas\nSe las cuenta como tareas.\n',
      recipes: [recipe('one-task-per-page')],
      material: '::: {#b1 .explanation}\nTexto.\n:::',
    });
    expect(prompt).toContain('Se las cuenta como tareas');
    expect(prompt).toContain('Notas de la maestra');
  });

  it('states that corrections beat the recipes but never the hard rules', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile(),
      recipes: [recipe('lectura-facil-es')],
      corrections: [{ text: 'No partas las frases en el examen', scope: 'learner' }],
      material: 'x',
    });
    // The previous hardcoded wording said corrections outrank "las reglas",
    // full stop — which would let a correction override the assessment guard.
    expect(prompt).toContain('No manda sobre las reglas duras');
    expect(prompt).not.toMatch(/Si contradice una regla, gana esto/);
  });

  it('carries the qualitative fields, not just the axis numbers', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile({
        works: ['Primer ejercicio hecho como ejemplo'],
        avoid: ['Nada con reloj'],
        interests: ['dinosaurios'],
        response: { writing: 'Dicta y un adulto transcribe' },
      } as Partial<Profile>),
      recipes: [recipe('explicit-steps')],
      material: 'x',
    });
    for (const expected of ['Primer ejercicio hecho', 'Nada con reloj', 'dinosaurios', 'Dicta y un adulto']) {
      expect(prompt).toContain(expected);
    }
  });

  it('records the recipe version, so provenance does not point at a moving target', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile(), recipes: [recipe('one-task-per-page')], material: 'x',
    });
    expect(prompt).toContain('one-task-per-page@2');
  });

  it('an unobserved axis is reported as unobserved, never as zero', () => {
    const { prompt } = buildAdaptPrompt({
      profile: profile(), recipes: [], material: 'x',
    });
    expect(prompt).toContain('PER-V: sin observar');
    expect(prompt).toContain('COG: 3');
  });
});

describe('notes stay bounded without losing the newest (T084)', () => {
  it('keeps everything when it fits', () => {
    const r = boundNotes('## 2026-09-04 · Una\nCorta.');
    expect(r.omitted).toBe(0);
    expect(r.text).toContain('Corta');
  });

  it('drops the oldest whole sections and says how many', () => {
    const long = Array.from({ length: 40 },
      (_, i) => `## 2026-09-${String(i + 1).padStart(2, '0')} · Nota ${i}\n${'x'.repeat(400)}`).join('\n');
    const r = boundNotes(long);
    expect(r.text.length).toBeLessThanOrEqual(NOTES_BUDGET_CHARS + 500);
    expect(r.omitted).toBeGreaterThan(0);
    // The newest survives; the oldest is what goes.
    expect(r.text).toContain('Nota 39');
    expect(r.text).not.toContain('Nota 0\n');
  });

  it('never truncates a note mid-sentence', () => {
    const long = Array.from({ length: 30 },
      (_, i) => `## Día ${i}\n${'y'.repeat(500)}`).join('\n');
    const r = boundNotes(long);
    // Every kept chunk still starts as a whole section.
    expect(r.text.startsWith('## ')).toBe(true);
  });
});
