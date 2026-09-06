import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The kind selects the pipeline, and the interests reach the wording only
 * (027 T008/T010/T018/T020, FR-2505/FR-2507/FR-2511).
 *
 * ## What can and cannot be run here
 *
 * `runCompose` needs a provider, a key, a vault and a window. What **is** run is the
 * three system prompts, against the repository's own corpus — so the claim that each
 * path carries the same judgement and a different wire format is checked by calling the
 * functions, not by reading them.
 *
 * The dispatch itself is asserted over the source, with the comments stripped, because
 * the defect it replaces was *wiring*: the kind selected the footnotes and every kind
 * produced a list of bare operations. There is nothing to unit-test in «the right
 * branch was taken» short of running the whole job against a model.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
vi.mock('../src/corpus/bundle.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  /*
   * `governingRoot` and not `corpusRoot` (`034` T006).
   *
   * Every reader of recipes and instructions now asks «which corpus **governs**» rather
   * than «where is the bundle», because an accepted update has to reach all of them or
   * none. Mocking the old name silently stopped reaching these callers — which is the
   * seam moving, and the tests following it.
   */
  corpusRoot: () => repoRoot,
  governingRoot: async () => repoRoot,
}));

const {
  judgementLayer, systemPrompt, contentSystemPrompt, problemSystemPrompt, examSystemPrompt,
} = await import('../src/jobs/compose.js');

const src = readFileSync(
  join(repoRoot, 'app', 'packages', 'shell', 'src', 'jobs', 'compose.ts'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('four paths, one judgement, four wire formats (FR-2507)', () => {
  it('every path carries the hard rules and compose.md', async () => {
    const layer = await judgementLayer();
    for (const [name, system] of [
      ['exercises', await systemPrompt()],
      ['content', await contentSystemPrompt()],
      ['problems', await problemSystemPrompt()],
      ['exam', await examSystemPrompt()],
    ] as const) {
      expect(system.startsWith(layer), `${name} does not carry the judgement layer`).toBe(true);
    }
  });

  it('and only the exercise path asks for one line per exercise', async () => {
    expect(await systemPrompt()).toContain('una línea por ejercicio');
    for (const system of [
      await contentSystemPrompt(), await problemSystemPrompt(), await examSystemPrompt(),
    ]) {
      // A word problem is unparseable under that format **by construction** — which is
      // why «problemas» could be offered, charged for, and never produced.
      expect(system).not.toContain('una línea por ejercicio');
    }
  });

  it('the problems format demands the operands be in the statement', async () => {
    const system = await problemSystemPrompt();
    expect(system).toContain('PROBLEMA');
    expect(system).toContain('ENUNCIADO');
    // Told to the model as well as checked in code: a rule it knows about costs one
    // proposal to satisfy and a rule it does not costs a rejected batch of her money.
    expect(system).toContain('tienen que aparecer en el ENUNCIADO');
    expect(system).toContain('no puede decir el resultado');
  });

  it('the exam format says the prompt is the only thing the learner sees', async () => {
    const system = await examSystemPrompt();
    expect(system).toContain('PREGUNTA');
    expect(system).toContain('TEXTO es lo único que ve el alumno');
    // `021` FR-1913/FR-1914: what a child's answer is worth is not this application's
    // decision, and the prompt says so rather than relying on the corpus alone.
    expect(system).toContain('baremos');
  });
});

describe('the kind selects the pipeline, not the footnotes (T018, FR-2505)', () => {
  it('problems and exam each reach their own loop', () => {
    expect(code).toMatch(/request\.kind === 'problems'/);
    expect(code).toMatch(/request\.kind === 'exam'/);
    expect(code).toContain('verifyProblem');
    expect(code).toContain('judgeQuestion');
  });

  it('each pipeline is given its own system, never the exercise one', () => {
    expect(code).toContain('await problemSystemPrompt()');
    expect(code).toContain('await examSystemPrompt()');
  });

  it('and they ride the same loop, so the budget and the cut come for free', () => {
    // Three `composeExercises` calls and no second loop: a private loop for the new
    // kinds would be a second place for the budget, the dedupe, reject-don't-repair and
    // the 100%-unknown cut to drift apart.
    expect((code.match(/composeExercises</g) ?? []).length).toBe(2);
    expect((code.match(/await composeExercises/g) ?? []).length).toBe(3);
  });

  it('the quantity she gave counts the unit of the kind she chose', () => {
    // One `wanted` through all three, and the noun in the prompt comes from the shape.
    expect(code).toContain("noun: 'problema(s)'");
    expect(code).toContain("noun: 'pregunta(s)'");
    expect(code).toContain("noun: 'ejercicio(s)'");
  });
});

describe('interests reach the wording, never a quantity (T010, FR-2511)', () => {
  /**
   * Structural, not a promise in a prompt.
   *
   * The sentence «úsalo en el contexto, no en la dificultad» is one instruction in one
   * place. What makes it *true* is underneath: `verifyProblem` is handed the proposal and
   * nothing else — it cannot see the interests — and it re-extracts the quantities from
   * the statement whatever the prompt asked for. A Pokémon in the story cannot become a
   * Pokémon in the numbers, because the numbers are checked against the story.
   */
  it('one prompt builder, so the sentence exists once', () => {
    // Matched on the tail of the sentence: it is written across two source lines, and a
    // pattern spanning the concatenation would fail on a reflow that changed nothing.
    expect((code.match(/en la dificultad/g) ?? []).length).toBe(1);
  });

  it('and it is only said when she recorded an interest', () => {
    expect(code).toMatch(/if \(args\.interests\.length\)/);
  });

  it('verification is not given the interests at all', () => {
    // The guarantee is the signature: `verifyProblem(verifier, skill, proposal)`.
    const core = readFileSync(
      join(repoRoot, 'app', 'packages', 'core', 'src', 'compose', 'problems.ts'), 'utf8');
    expect(core).not.toContain('interests');
  });
});

describe('a kind the catalogue lacks (T020)', () => {
  it('is refused by name, offering the four, and never mapped to the nearest', () => {
    const ipc = readFileSync(
      join(repoRoot, 'app', 'packages', 'shell', 'src', 'ipc', 'compose.ts'), 'utf8');
    expect(ipc).toContain("await materialKind(request.kind)");
    expect(ipc).toContain('material-kind-missing');
    // The four, in her words. «Una rúbrica» gets this rather than silently becoming a
    // worksheet — `findKind` returns `null` and never a fallback (`012` FR-1003).
    expect(ipc).toContain('una ficha, un examen, apuntes o problemas');
  });
});

/**
 * The judgement is corpus, and the wire is code (027 T022, Principle I).
 *
 * The split this asserts is the one the constitution draws and the one this feature
 * could most easily have got wrong: **what makes a good problem statement** is a
 * pedagogical judgement a PT must be able to correct in a Markdown file, and **what a
 * parseable block looks like** is mechanics. Putting the first in a TypeScript prompt
 * constant would make it uncorrectable; putting the second in the corpus would let a
 * reworded file break the parser.
 */
describe('what makes a good problem is corpus, not a prompt constant', () => {
  const compose = readFileSync(join(repoRoot, 'instructions', 'compose.md'), 'utf8');

  it('the corpus says what a problem statement has to be', () => {
    expect(compose).toContain('El enunciado no es el obstáculo');
    // The one that matters most for this application's users: a problem whose statement
    // is hard turns a subtraction exercise into a reading-comprehension exercise.
    expect(compose).toContain('mide lectura y no matemáticas');
    expect(compose).toContain('El contexto es el suyo');
    expect(compose).toContain('La pregunta se pregunta de verdad');
  });

  it('and what makes an exam question worth asking', () => {
    expect(compose).toContain('Pregunta por lo que se ha dado');
    expect(compose).toContain('Una cosa por pregunta');
    expect(compose).toContain('Sin pistas dentro del enunciado');
  });

  it('and `021`\'s prohibitions on grading are untouched beside it', () => {
    // Referenced, not restated: two copies of «nada de baremo» is one copy that softens.
    expect(compose).toContain('Nada de baremo');
    expect(compose).toContain('No** puedes decidir lo que valen');
  });

  it('the pedagogical judgement is nowhere in the code', () => {
    // The prompt constants carry the wire format and the three checkable rules. If a
    // sentence about what makes a *good* statement appears here, it has stopped being
    // correctable by the person who knows.
    expect(code).not.toContain('obstáculo');
    expect(code).not.toContain('mide lectura');
    expect(code).not.toContain('El contexto es el suyo');
  });

  it('and the wire format is nowhere in the corpus', () => {
    // The mirror of the rule above: a reworded corpus file must not be able to break
    // `parseProblemProposals`.
    expect(compose).not.toContain('ENUNCIADO:');
    expect(compose).not.toContain('PREGUNTA\nTEXTO');
  });
});

/**
 * And the quantity block reaches the screen (027 T018, FR-2505, `021` FR-1925).
 *
 * ## The defect this pins
 *
 * `corpus:materialKinds` mapped the four kinds to `{ id, label, before, composing }` and
 * **left `quantity` behind**. `material-kinds.md` declares it, `parseMaterialKinds`
 * reads it, `MaterialKind.quantity` types it, and `ComposeScreen` reads
 * `chosen?.quantity` — which arrived `undefined` every time.
 *
 * So `countsSomething` was always false: **the quantity question was never shown, for
 * any kind.** `request.perObjective` was always absent and every composition silently
 * used the corpus default, which means «examen, 10 preguntas» was not a thing she could
 * ask for. The twelfth instance of a field written, parsed, typed and read by nobody
 * (BACKLOG G36), and the one this feature's FR-2505 rests on.
 *
 * Found by an e2e that asserted the label changes with the kind and could not find the
 * field at all — which is why that walk exists rather than a unit test of the mapping.
 */
describe('the quantity question can reach her at all', () => {
  const ipc = readFileSync(
    join(repoRoot, 'app', 'packages', 'shell', 'src', 'corpus', 'recipes.ts'), 'utf8');

  it('the handler sends the block, not only the label', () => {
    expect(ipc).toContain('quantity: k.quantity');
  });

  it('and the screen has a reader for it', () => {
    // Both halves asserted, because either one alone is the defect: a value written with
    // no reader, or a reader with nothing written.
    const screen = readFileSync(
      join(repoRoot, 'app', 'ui', 'src', 'compose', 'ComposeScreen.tsx'), 'utf8');
    expect(screen).toContain('chosen?.quantity');
    expect(screen).toContain("quantity.of !== 'none'");
  });

  it('every kind either counts something or says it counts nothing', () => {
    // `of: 'none'` is explicit in the corpus rather than the block being absent, because
    // absence would read as «nobody decided» (`021` FR-1927). Asserted over the shipped
    // file so a new kind cannot arrive silently uncounted.
    const kinds = readFileSync(join(repoRoot, 'instructions', 'material-kinds.md'), 'utf8');
    expect((kinds.match(/^\s*quantity:/gm) ?? []).length).toBe(4);
  });
});
