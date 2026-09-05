import {
  resolveDocument, whyNoDocument, parseIR, buildTurnPrompt, revisionDiff,
  checkStructurallyComplete, findUnaccountedBlocks, readingFingerprint, stampReading,
  archivePrevious, listRevisions, jobDir, jobLearnerDir, jobAnswers, logger, RampaError,
  addCost, renderAnswerKey, ANSWER_KEY_HEADING, isComputed, type KeyEntry,
  annotateInjection, checkBounds, verifierFor, arithmetic, verify,
  type RevisionSite, type Notice, type Block, type IRDocument,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { assertCorpus, loadInstruction, materialKind } from '../corpus/index.js';
import { recordCost } from '../ipc/cost.js';
import { staleSheets, notFromCurrentReading } from './stale.js';
import { appendTurn, type TurnOutcome } from './conversation.js';

/**
 * One turn of the conversation (026 T007-T011, T017, T020).
 *
 * ## Verify before write, and that is the whole design
 *
 * The gates run on a **candidate in memory**. Only when every one of them has passed is
 * the previous working file archived and the new one written. So a provider failure, a
 * refusal, a rejected output or a crash mid-turn leaves the vault byte-identical to what
 * it was — the revision is complete or absent (FR-2409), and «complete or absent» is a
 * property of the order of operations rather than of a cleanup path that has to run.
 *
 * ## What a turn is allowed to be
 *
 * A turn changes the HOW and never the WHAT. That judgement is corpus
 * (`instructions/iterate.md`), because deciding whether «ponlo más fácil» touches the
 * WHAT is exactly the kind of thing a PT must be able to read and correct. What is code
 * is the part that must not depend on the model: **a turn that refuses writes nothing**,
 * and the verifiers re-check every quantity regardless of what the model decided.
 */

export interface TurnResult {
  outcome: TurnOutcome;
  /** Derived by `revisionDiff` — never the model's account (FR-2404). */
  changed: string[];
  /** Everything she must be shown, quoted and located (`007` FR-503). */
  notices: Array<{ block: string | null; notice: Notice }>;
  costCents: number | null;
}

/** Where this document's revisions live, from the document the resolver found. */
function siteFor(found: { of: string; job: string; learner?: string }): RevisionSite {
  return found.of === 'adapted'
    ? { dir: jobLearnerDir(found.job, found.learner!), stem: 'adapted' }
    : { dir: jobDir(found.job), stem: 'ir' };
}

/**
 * Did the model declare a refusal? (research R5, FR-2406/FR-2407.)
 *
 * A `report-notes` block with the corpus's marker attribute — the channel `007` T087
 * created for exactly this kind of model-to-teacher speech. Read from the corpus rather
 * than hardcoded, so the marker and the instruction that teaches it cannot drift apart.
 *
 * The **guarantee** is not this function: it is that `runTurn` returns before writing.
 * A model that refuses in prose without the marker simply produces a document, which the
 * gates and the diff then judge on its merits — which is the honest fallback, because an
 * instructional defence that fails silently is worse than one that fails loudly.
 */
function declaredRefusal(doc: IRDocument, marker: string): string | null {
  const block = doc.blocks.find(
    (b) => b.classes.includes('report-notes') && b.attrs[marker] !== undefined);
  return block ? block.content.trim() : null;
}

/**
 * Every quantity, re-checked from the exercise itself (T017, FR-2405).
 *
 * `002`'s rule applied per turn, and the reason it cannot be skipped: a turn that
 * rewords an exercise can move a number while doing it, and the answer key beside the
 * sheet was computed from the number that used to be there. She marks against that key
 * in class.
 *
 * What this does **not** do is repair. An exercise whose stated answer no longer matches
 * its own arithmetic is reported as a notice on the block; the numbers on the page are
 * hers to look at. Silently rewriting a child's exercise to fit a key is the falsification
 * Principle III forbids.
 */
function recheckQuantities(doc: IRDocument): Array<{ block: string | null; notice: Notice }> {
  const out: Array<{ block: string | null; notice: Notice }> = [];
  for (const b of doc.blocks) {
    if (!b.classes.includes('exercise') && !b.classes.includes('assessment')) continue;
    const expression = bareExpression(b);
    if (!expression) continue;
    const skill = { id: skillOf(expression), constraints: [] as string[] };
    if (!verifierFor(skill, [arithmetic])) continue;
    const verdict = verify(arithmetic, skill, { expression });
    if (verdict.ok) continue;
    if (verdict.reason === 'unknown') continue;
    out.push({
      block: b.id,
      notice: {
        kind: 'incomplete',
        quote: expression,
        message: `He vuelto a comprobar «${expression}» y no me sale: ${verdict.because} `
          + 'No lo he cambiado yo — míralo antes de dárselo.',
      },
    });
  }
  return out;
}

/** `3. 47 × 8 =` → `47 × 8`. The sheet's numbering and trailing `=` are not the exercise. */
const bareExpression = (b: Block): string | null => {
  const bare = b.content.replace(/^\s*\d+\.\s*/, '').replace(/=\s*$/, '').trim();
  return /^-?\d+(?:[.,]\d+)?\s*[+\-−×x*÷/:]\s*-?\d+(?:[.,]\d+)?$/.test(bare) ? bare : null;
};

const skillOf = (expression: string): string =>
  /[×x*]/.test(expression) ? 'arith.multiply'
    : /[÷/:]/.test(expression) ? 'arith.divide'
      : /\+/.test(expression) ? 'arith.add' : 'arith.subtract';

export async function runTurn(args: {
  job: string;
  learner?: string;
  text: string;
  onProgress?: (detail: string) => void;
}): Promise<TurnResult> {
  await assertCorpus();
  const vault = currentVault();
  const say = args.onProgress ?? (() => {});

  const text = args.text.trim();
  if (!text) {
    throw new RampaError('compose-no-objective', 'Dime qué quieres que cambie.');
  }

  /*
   * Her turn text goes through the name check like every channel she writes into
   * (T014, `006` FR-419) — **before** anything is sent. «Ponle a Juan más espacio» is
   * the ordinary way to write this down.
   */
  const unknown = await unknownNamesIn([text]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en lo que has escrito: ${unknown.join(', ')}. `
      + 'No he enviado nada. Dime si es un alumno y lo sustituyo por su código, o '
      + 'márcalo como que no es un nombre.',
      unknown);
  }

  const found = await resolveDocument(vault, args.job, args.learner);
  if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));

  const before = (await vault.readRaw(found.path))!;
  const previous = parseIR(before);
  const site = siteFor(found);

  /*
   * A stale sheet is warned about **before** the provider is called (T013, `005` FR-520).
   *
   * If the reading `ir.md` holds has changed since this sheet was made, iterating it
   * bakes the stale reading in deeper: the next revision inherits the fingerprint, so
   * every turn moves her further from the material she actually photographed. Cheaper to
   * say so now than to hand her a third version of the wrong page.
   *
   * A refusal rather than a notice, because a notice arrives with the bill. She unblocks
   * it by re-adapting from the current reading, which is the fix `005` already built.
   */
  if (found.of === 'adapted') {
    const stale = notFromCurrentReading(await staleSheets(vault, args.job))
      .find((r) => r.learner === found.learner);
    if (stale) {
      throw new RampaError('stale-reading',
        'Esta hoja se hizo con una lectura del material que después ha cambiado. Si la '
        + 'sigo cambiando, me alejo más de lo que fotografiaste. Vuelve a adaptarla desde '
        + 'la lectura de ahora y seguimos desde ahí.');
    }
  }

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }

  const kind = typeof previous.frontMatter['kind'] === 'string'
    ? await materialKind(previous.frontMatter['kind'])
    : null;

  const iterate = await loadInstruction('iterate');
  const prompt = buildTurnPrompt({
    iterate,
    document: before,
    text,
    ...(kind?.label ? { kindLabel: kind.label } : {}),
    ...(kind?.rule ? { kindRule: kind.rule } : {}),
  });

  say('Pensando el cambio');
  const { stream } = sendRedacted(
    active.provider,
    { system: iterate, messages: [{ role: 'user', content: prompt }], maxTokens: 8000 },
    active.key, await knownNames(), { maxAttempts: 1 },
  );

  let out = '';
  let cents: number | null = 0;
  let truncated = false;
  for await (const chunk of stream) {
    if (chunk.text) { out += chunk.text; say(`${out.length} caracteres`); }
    if (chunk.usage) cents = addCost(cents, active.provider.price(chunk.usage));
    if (chunk.truncated) truncated = true;
  }

  /*
   * The cost is recorded whatever happens next.
   *
   * Money spent is a fact about her month regardless of the outcome — the same rule
   * `runAdaptation` applies when a retry is rejected. Recorded here, before the gates,
   * so no early return can skip it.
   */
  await recordCost(args.job, cents);

  const fail = async (outcome: TurnOutcome, notices: TurnResult['notices'] = []):
  Promise<TurnResult> => {
    await appendTurn(vault, site, { at: stamp(), text, outcome, changed: [], costCents: cents });
    return { outcome, changed: [], notices, costCents: cents };
  };

  const marker = refusalMarker(iterate);
  const candidate = parseIR(stripFence(out));

  const refusal = declaredRefusal(candidate, marker);
  if (refusal !== null) {
    /*
     * **A refusal writes nothing.** The guarantee is this early return, not the prompt:
     * the previous revision remains the working document without anyone restoring it.
     */
    logger.info('turn.refused', { job: args.job });
    return fail({ kind: 'refusal', because: refusal });
  }

  if (truncated) {
    throw new RampaError('output-incomplete',
      'El cambio se ha cortado por longitud, así que no lo he guardado: te habría dejado '
      + 'media hoja. Pídemelo otra vez, o divídelo en dos cambios.');
  }

  const structural = checkStructurallyComplete(stripFence(out));
  if (structural.length) {
    throw new RampaError('output-incomplete',
      'Lo que ha vuelto no es un documento entero, así que no lo he guardado. Tu versión '
      + 'de antes sigue como estaba.', structural);
  }

  /*
   * Provenance against the **previous revision**, not against the original extraction
   * (research R3).
   *
   * `checkCompleteness` treats a dropped block as a defect, and a turn exists to drop
   * blocks when she asked. What must still hold is that nothing appears from nowhere —
   * so the baseline is the document she is changing, and every removal is *reported* by
   * the diff instead of blocked. The weakening is deliberate and recorded in the plan.
   */
  const unaccounted = findUnaccountedBlocks(previous, candidate);
  if (unaccounted.length) {
    throw new RampaError('ir-no-provenance',
      `Han aparecido ${unaccounted.length} bloque(s) que no vienen de nada de tu `
      + 'documento. No lo he guardado.', unaccounted.map((b) => b.id));
  }

  const diff = revisionDiff(before, stripFence(out));
  if (diff.empty) {
    /*
     * An identical document mints no revision (T011). A new number on identical content
     * would make the revision list lie about how many times the document changed — and
     * that list is what she uses to decide whether to walk back.
     */
    return fail({ kind: 'no-change' });
  }

  const annotated = annotateInjection(candidate);
  const bounded = checkBounds(annotated);
  const quantities = recheckQuantities(annotated);
  const notices = [
    ...annotated.blocks.flatMap((b) => b.notices.map((n) => ({ block: b.id, notice: n }))),
    ...bounded.map((n) => ({ block: null, notice: n })),
    ...quantities,
  ];

  say('Guardando');
  /*
   * **The draft mark, restored structurally** (T008, FR-2403).
   *
   * Any `review` block in the model's output is stripped: a turn produces a new, unsigned
   * revision, always. If a signature could travel here, the sheet she signed and the
   * sheet she gets would be two documents with one signature between them.
   *
   * And the reading fingerprint carries over, because the turn did not re-read the
   * source — which is what keeps `005` FR-520's stale detection honest across turns.
   */
  const withoutReview = stripReview(stripFence(out));
  const dated = withoutReview.replace(/^---\r?\n/, `---\nturned_on: "${stamp().slice(0, 10)}"\n`);
  const next = readingFingerprint(previous)
    ? stampReading(dated, readingFingerprint(previous))
    : dated;

  const archived = await archivePrevious(vault, site);
  await vault.writeRaw(`${site.dir}/${site.stem}.md`, next);
  const revision = (archived ?? 0) + 1;

  /*
   * The answer key, rebuilt from the revision she is about to get (T018, `021` FR-1919).
   *
   * A key describing exercises that no longer exist is worse than no key, because she
   * marks against it in class with thirty children waiting. So for a **composed**
   * document — the family that has a key — every computable exercise is re-solved from
   * the sheet as it now stands, and the file is rewritten in the same step as the
   * revision.
   *
   * Deterministic and offline: the answers come from the same arithmetic verifier that
   * computed them the first time, never from the turn's output. An exercise the verifier
   * cannot solve produces no entry rather than a guessed one.
   */
  if (found.of === 'composed') await rewriteKey(vault, args.job, parseIR(next));

  const outcome: TurnOutcome = { kind: 'revision', revision };
  await appendTurn(vault, site, {
    at: stamp(), text, outcome, changed: diff.sentences, costCents: cents,
  });
  logger.info('turn.done', { job: args.job, revision, changes: diff.changes.length });

  return { outcome, changed: diff.sentences, notices, costCents: cents };
}

/** The marker the corpus declares, so the instruction and the reader cannot drift. */
function refusalMarker(iterate: string): string {
  const m = /^refusal_marker:\s*(\S+)\s*$/m.exec(iterate);
  return m?.[1] ?? 'data-refusal';
}

/** A model that wraps its answer in a fence has not said anything different. */
const stripFence = (raw: string): string =>
  /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1]?.trim() ?? raw.trim();

/**
 * Every `review` block out of the front matter, whatever the model sent.
 *
 * Line-based rather than a YAML round trip, because a round trip would rewrite her front
 * matter — quoting, ordering, comments — and the vault is hers to read.
 */
function stripReview(raw: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return raw;
  const kept: string[] = [];
  let inReview = false;
  for (const line of m[1]!.split(/\r?\n/)) {
    if (/^review:\s*$/.test(line)) { inReview = true; continue; }
    if (inReview && /^\s+/.test(line)) continue;
    inReview = false;
    kept.push(line);
  }
  return raw.replace(m[0], `---\n${kept.join('\n')}\n---`);
}

/** From the process clock, never from the model (`014` FR-1203). */
const stamp = (): string => new Date().toISOString().slice(0, 16).replace('T', ' ');

export { listRevisions };

/**
 * The key for a composed document, recomputed from the sheet as it now stands.
 *
 * Only the exercises code can solve get an entry; an unsolvable one is **absent** rather
 * than carried over from the previous key, because a carried-over answer belongs to an
 * exercise that may no longer be there. `021`'s heading survives, because that string is
 * what stands between a page of answers and the photocopy pile.
 */
async function rewriteKey(
  vault: ReturnType<typeof currentVault>, job: string, doc: IRDocument,
): Promise<void> {
  const path = jobAnswers(job);
  if ((await vault.readRaw(path)) === null) return;   // no key to keep true

  const entries: KeyEntry[] = [];
  let n = 0;
  for (const b of doc.blocks) {
    if (!b.classes.includes('exercise') && !b.classes.includes('assessment')) continue;
    n += 1;
    const expression = bareExpression(b);
    if (!expression) continue;
    const answer = arithmetic.solve({ expression });
    if (answer === 'unknown') continue;
    entries.push({
      objective: b.attrs['data-objective'] ?? 'Lo que pediste',
      number: n, expression, answer,
    });
  }

  const title = typeof doc.frontMatter['title'] === 'string'
    ? doc.frontMatter['title'] : 'Material generado';
  await vault.writeRaw(path, renderAnswerKey({
    title, composedOn: stamp().slice(0, 10), answers: entries,
  }));
  logger.info('turn.key-rebuilt', { job, entries: entries.filter(isComputed).length });
}

/** Referenced so the shared heading cannot be dropped from this path by accident. */
export const KEY_HEADING = ANSWER_KEY_HEADING;
