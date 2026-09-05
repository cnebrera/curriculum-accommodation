import {
  buildStructure, loadLearner, jobDir, jobIR, jobReport, parseIR, annotateInjection,
  materialFence, addCost, RampaError, type Vault,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { activeProvider } from '../ipc/keys.js';
import { knownNames, nameWordSet } from '../ipc/names.js';
import { recordCost } from '../ipc/cost.js';
import { loadInstruction } from '../corpus/index.js';
import { currentPictogramSet } from '../pictograms/access.js';
import { chosenWords } from '../pictograms/bring.js';

/**
 * The social story — **the one structure kind that spends money** (028 T023-T025).
 *
 * ## Why it is not in `jobs/structure.ts`
 *
 * It was, for about ten minutes, because that is where the tasks put it. Then
 * `structure-costs-nothing.test.ts` failed — the test written for T010, which asserts
 * that the agenda path imports nothing from `@rampa/providers` and calls nothing that can
 * spend. One `import { sendRedacted }` at the top of the shared file made that false for
 * both kinds at once.
 *
 * That is the guard doing exactly what it was written for. Its own comment predicted this
 * move and said what it would mean: «if the story ever moves into `jobs/structure.ts`, the
 * assertions start failing and whoever moved it has to decide where the line is instead of
 * discovering later that an agenda now needs a key». The line is here.
 *
 * The promise being protected is not abstract. A PT sits down at four with no connection,
 * and the day's strip has to print. A file that imports a provider for one of its three
 * exports is a file one refactor away from the agenda needing one too.
 */
/**
 * A social story, drafted (028 T023/T024/T025, FR-2609/2610/2611).
 *
 * ## The only kind here that touches a provider, and it goes the ordinary way
 *
 * Nothing new sits between her and the model: `hard-rules` plus the corpus's own
 * `social-story` as the system prompt, her situation text as the instruction, anything
 * she attached delimited as content, egress through `sendRedacted`, cost through the
 * existing recording. A second path to a provider is a second place for the name gate to
 * be forgotten, which is the failure `007` and `P17` were both written for.
 *
 * ## Her words are an instruction; what she pasted is content
 *
 * «Empieza comedor el lunes» is her telling Rampa what to write. A note from the family
 * pasted underneath is a document somebody else wrote, and it gets `annotateInjection`'s
 * delimiters like every other piece of content (Principle IX). The difference matters
 * most here because a social story is *about* a situation somebody described.
 *
 * ## It comes out unsigned, and the mark is derived
 *
 * `structure: historia` with no signature. The draft banner comes from the document, and
 * the one existing sign-off removes it — there is no born-signed shortcut, because the
 * details in a social story are exactly the thing a person has to read line by line.
 */
export interface StoryArgs {
  jobId: string;
  learnerCode: string;
  /** Her instruction: what the story is about. */
  situation: string;
  /** Something she pasted. Content, never instruction. */
  attached?: string;
  language?: string;
  created: string;
}

export async function runStory(
  args: StoryArgs,
  onProgress: (p: { stage: string; detail?: string }) => void = () => {},
  vault: Vault = currentVault(),
): Promise<{ jobId: string; path: string; cents: number | null }> {
  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing',
      'Para escribir una historia social necesito un servicio de IA conectado. La agenda '
      + 'y las secuencias las hago yo sola; una historia hay que redactarla.');
  }

  const learner = await loadLearner(vault, args.learnerCode);
  const language = args.language ?? 'es';

  /*
   * The judgement, from the corpus (Principle I). Not one sentence of it lives here: what
   * a social story is, how it is written and what it must not claim is a teacher's
   * territory, and `instructions/social-story.md` is where she can argue with it.
   */
  const system = `${await loadInstruction('hard-rules')}\n\n${await loadInstruction('social-story')}`;

  const attached = args.attached?.trim()
    ? `\n\n${materialFence(annotateInjection(parseIR(args.attached)).blocks
        .map((b) => b.content).join('\n\n'))}`
    : '';
  const prompt = `Escribe una historia social sobre esto:\n\n${args.situation.trim()}${attached}`;

  onProgress({ stage: 'Escribiendo la historia' });
  const { stream } = sendRedacted(
    active.provider, { system, messages: [{ role: 'user', content: prompt }] },
    active.key, await knownNames());

  let out = '';
  let cents: number | null = 0;
  for await (const chunk of stream) {
    if (chunk.text) {
      out += chunk.text;
      onProgress({ stage: 'Escribiendo la historia', detail: `${out.length} caracteres` });
    }
    if (chunk.usage) cents = addCost(cents, active.provider.price(chunk.usage));
  }

  /*
   * The drafted text as paragraphs, with pictograms over it through the **same** ladder
   * everything else uses (FR-2605). Not a second application of them: `applyPictograms`
   * with her vocabulary, her overrides and the name list, exactly as an adapted sheet.
   */
  const paragraphs = out.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  const built = buildStructure({
    kind: 'historia',
    ...(args.situation.trim() ? { title: firstLine(args.situation) } : {}),
    items: paragraphs.map((text) => ({ word: text })),
    language,
    set: await currentPictogramSet()
      ?? { root: '', byLanguage: new Map(), images: new Set(), from: new Map(), popularity: new Map() },
    forLearner: args.learnerCode,
    created: args.created,
    overrides: learner.profile.pictograms?.overrides ?? {},
    chosen: await chosenWords(language, vault),
    names: await nameWordSet(vault),
  });

  await vault.ensureDir(jobDir(args.jobId));
  await vault.writeRaw(jobIR(args.jobId), built.markdown);

  /*
   * The anti-anchoring line, **from the corpus** (FR-2611).
   *
   * Read out of `social-story.md` rather than written here, so a PT who disagrees with
   * the wording changes the wording rather than filing a bug. It is the sentence that
   * stops a plausible text being read as a description of a real morning.
   */
  await vault.writeRaw(jobReport(args.jobId, args.learnerCode),
    `# Informe\n\n${await inventedDetailsLine()}\n`);

  await recordCost(args.jobId, cents);
  return { jobId: args.jobId, path: jobIR(args.jobId), cents };
}

/** Her own first line, as the story's title. Never a name — she writes what she writes. */
const firstLine = (s: string): string => s.trim().split('\n')[0]!.slice(0, 80);

/**
 * The invented-details sentence, lifted from `instructions/social-story.md`.
 *
 * Parsed out of the corpus's blockquote rather than duplicated, because a copy here is a
 * second version of a sentence whose whole job is to be the one a teacher reads — and the
 * two would differ the first time somebody improved one of them.
 */
async function inventedDetailsLine(): Promise<string> {
  const md = await loadInstruction('social-story');
  const quoted = md.split('\n')
    .filter((l) => l.startsWith('> '))
    .map((l) => l.slice(2).trim());
  const start = quoted.findIndex((l) => l.startsWith('Los detalles concretos'));
  if (start < 0) {
    // The corpus is the source and it has moved. Said, never papered over with a copy.
    return 'No he podido leer la advertencia sobre los detalles inventados en '
      + '`instructions/social-story.md`. Léela allí antes de usar esta historia.';
  }
  const out: string[] = [];
  for (let i = start; i < quoted.length && quoted[i]; i += 1) out.push(quoted[i]!);
  return out.join(' ');
}
