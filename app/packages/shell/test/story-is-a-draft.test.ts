import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseIR, isSignedOff, isGenerated } from '@rampa/core';

/**
 * A social story leaves as a draft, and a classmate's name does not leave at all
 * (028 T026, FR-2609/2610/2611).
 *
 * ## The name in the situation text
 *
 * «El lunes empieza comedor. Le da miedo sentarse al lado de Martín.» That sentence is
 * the most natural thing a teacher could type into this box, and it contains another
 * child's name — a child who is not the subject of the story and who never consented to
 * anything.
 *
 * It is caught by the same gate as everything else, and this file's job is to prove that
 * the story path is **on** that gate rather than beside it: one chokepoint, asserted at
 * source level, because the failure mode is a second route to a provider where somebody
 * forgot the redaction rather than a bug inside the redaction itself.
 *
 * ## And the draft mark is derived
 *
 * A story arrives unsigned and the banner comes from the document. There is no
 * born-signed shortcut, and the reason is what a social story *is*: a plausible text
 * about a real morning, whose concrete details Rampa invented. Those are exactly the
 * lines a person has to read one at a time.
 */
const shell = join(dirname(new URL(import.meta.url).pathname), '..');
const repo = join(shell, '..', '..', '..');

const read = (rel: string): string => readFileSync(join(shell, 'src', rel), 'utf8');
const code = (rel: string): string =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

describe('the story goes out through the one gate', () => {
  it('reaches the provider only through `sendRedacted`, with the names', () => {
    const src = code('jobs/story.ts');
    /*
     * `sendRedacted(provider, request, key, known)` — the fourth argument is the name
     * map, and a call without it is a call that sends a classmate's name. It is the shape
     * `007` FR-510 turns into a chokepoint: one call site, checkable.
     */
    expect(src).toMatch(/sendRedacted\(\s*[\s\S]{0,200}?knownNames\(\)/);
    // And nothing else: no adapter reached directly, no second route.
    expect(src).not.toMatch(/provider\.send\(|\.send\(\s*\{/);
  });

  it('and the story\'s own words are an instruction while what she pasted is content', () => {
    /*
     * Principle IX, in the one place it is easiest to get wrong: a social story is *about*
     * a situation somebody described, so the description arrives as prose and looks like
     * an instruction. Her text is the instruction; a note from the family that she pasted
     * is content, and it is delimited like every other document this application reads.
     */
    const src = code('jobs/story.ts');
    expect(src).toContain('annotateInjection');
    expect(src).toContain('materialFence');
  });

  it('the judgement is corpus, not a string in the job', () => {
    /*
     * Principle I. What a social story is, how it is written and what it must not claim
     * belongs to a teacher — `instructions/social-story.md` is where she can disagree with
     * it. A prompt assembled from literals here would be pedagogy nobody can correct.
     */
    const src = code('jobs/story.ts');
    expect(src).toContain("loadInstruction('hard-rules')");
    expect(src).toContain("loadInstruction('social-story')");
    // No rule text inline: the longest quoted string is an error sentence, not a policy.
    expect(src).not.toMatch(/primera persona|frases cortas/i);
  });
});

describe('the corpus carries the judgement and the warning', () => {
  const md = readFileSync(join(repo, 'instructions', 'social-story.md'), 'utf8');

  it('says how a story is written, in a teacher\'s language', () => {
    expect(md).toMatch(/primera persona/i);
    expect(md).toMatch(/frases cortas/i);
    // Descriptive before directive: the rule that stops a story being a list of orders.
    expect(md).toMatch(/[Dd]escriptivas antes que directivas/);
  });

  it('and carries the invented-details warning that the report prints', () => {
    /*
     * FR-2611's sentence lives **here** and the job lifts it out. A copy in `jobs/` would
     * be a second version of the one sentence whose whole purpose is to be the one she
     * reads, and the two would differ the first time somebody improved one of them.
     */
    const quoted = md.split('\n').filter((l) => l.startsWith('> ')).join(' ');
    expect(quoted).toContain('Los detalles concretos');
    expect(quoted).toMatch(/me los he inventado/);
    expect(quoted).toMatch(/borrador plausible/);
  });

  it('and it ships an example and an anti-pattern, which is what makes it usable', () => {
    // A rule list with no worked case is a rule list a model interprets and a teacher
    // cannot check. The anti-pattern is the half that says what «wrong» looks like.
    expect(md).toMatch(/## Un ejemplo/);
    expect(md).toMatch(/## Un antipatrón/);
  });

  it('and forbids the four things that make a plausible story false', () => {
    for (const rule of [/No inventes hechos/, /No inventes lo que el niño siente/,
                        /No pongas nombres/, /No des diagnóstico/]) {
      expect(md).toMatch(rule);
    }
  });
});

describe('what comes out is a draft', () => {
  /** A story as `runStory` writes it: `structure: historia`, and no signature. */
  const story = `---
source: structure
structure: historia
for_learner: AL-07
language: es
created: "2026-09-07"
---

::: {#s1 .explanation}
Los lunes como en el comedor del colegio.
:::
`;

  it('is unsigned, and the mark is derived from the document', () => {
    const doc = parseIR(story);
    expect(isSignedOff(doc)).toBe(false);
    // And it is material Rampa produced, so the existing print and sign-off paths serve
    // it: the one existing sign-off is what removes the mark, and there is no shortcut.
    expect(isGenerated(doc)).toBe(true);
  });

  it('and there is no way to ask for it born-signed', () => {
    /*
     * Asserted as an absence, because the tempting shortcut is a `signed: true` in the
     * front matter the job writes — «she asked for it, so she has seen it». She has not:
     * the concrete details are the model's invention until she reads them.
     */
    expect(code('jobs/story.ts')).not.toMatch(/signed_off|review:/);
  });
});
