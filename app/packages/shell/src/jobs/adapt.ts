
import {
  archivePrevious, stampPicto, bumpVaultSchema, VAULT_SCHEMA_DRAWINGS,
  Vault, VAULT, jobDir, jobIR, jobLearnerDir, jobAdapted, jobAdaptedRevision,
  jobRejected, jobReport, parseIR, annotateInjection, checkBounds, isVerified,
  selectRecipes, loadLearner, buildReport, loadForRun, parseGuideCorpus, RampaError, isGenerated,
  stringifyFrontMatter, injectionNotices, logger, buildAdaptPrompt, schoolYearOf, blockClassesIn,
  checkStructurallyComplete, checkCompleteness, completenessNotice,
  assertProvenance, findUnaccountedBlocks, divergence, studiesFor, applyPictograms,
  readingFingerprint, stampReading, AXES, axisLevelOf,
  type Notice, type CompletenessIssue, addCost,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { nameWordSet, knownNames, unknownNamesIn } from '../ipc/names.js';
import { chosenWords } from '../pictograms/bring.js';
import { activeProvider } from '../ipc/keys.js';
import {
  allRecipes, assertCorpus, loadInstruction, findYearInCorpus, materialKind, normativeFor,
  governingCorpus,
} from '../corpus/index.js';
import { currentPictogramSet } from '../pictograms/access.js';
import { recordCost } from '../ipc/cost.js';

/**
 * Orchestration. The judgement lives in the corpus, not here: this assembles
 * what the model reads and enforces the gates around it.
 *
 * The system prompt is `instructions/hard-rules.md` and `instructions/adapt.md`,
 * read from the bundle at run time. It was once a string in this file, which was
 * a live violation of Principle I — the policy governing an adaptation has to be
 * something a teacher can read and correct without touching code. The only thing
 * added here is the output format, which is mechanics rather than judgement.
 *
 * The shape is the staged pipeline of ADR 0007: code owns the control flow, the
 * model owns the content, the verifiers in the loop are code, and iteration is
 * bounded — one retry, decided here, never by the model.
 */
const OUTPUT_FORMAT =
  '\n\n---\n\nDevuelve únicamente el documento adaptado, en el mismo formato que recibes.';

async function systemPrompt(): Promise<string> {
  const [rules, adapt] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('adapt'),
  ]);
  return `${rules}\n\n---\n\n${adapt}${OUTPUT_FORMAT}`;
}

export interface AdaptProgress { stage: string; detail?: string; }

/**
 * A correction the teacher made in review, fed straight back into a re-run.
 *
 * This is the loop the whole project rests on. Without it she corrects the same
 * thing every week and the cost per worksheet never falls — the time saving is a
 * curve, not a constant, and this is what bends it. Between sessions the same
 * corrections arrive through memory; within a session she wants to see the fix
 * now, on this worksheet.
 */
export interface Correction { text: string; scope: 'learner' | 'practice' | 'corpus'; }

export interface AdaptResult {
  report: string;
  /** The structures the review screen renders (spec 010 FR-826). The markdown
   *  stays for report.md, which she must be able to read without the app. */
  reportData: {
    decisions: Array<{ title: string; recipe: string; axis: string; blocks: string[] }>;
    notDone: string[];
    memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  };
  /** Everything the teacher must be shown, quoted and located (007 FR-503). */
  notices: Array<{ block: string | null; notice: Notice }>;
  costCents: number | null;
  revision: number;
  /** Recipe ids used, so a corpus-scope correction can be tagged (T086). */
  recipes: string[];
  /** True when the first attempt failed the checks and the retry saved it. */
  retried: boolean;
}

/** How the detected problems are handed back to the model on the one retry. */
function retryCorrections(issues: CompletenessIssue[]): Correction[] {
  const missing = issues.filter((i) => i.kind === 'missing').map((i) => i.blockId).filter(Boolean);
  const notes: string[] = [];
  if (issues.some((i) => i.kind === 'truncated')) {
    notes.push('El intento anterior se cortó. Devuelve el documento completo, con todos los bloques cerrados.');
  }
  if (missing.length) {
    notes.push(
      `Faltaban estos bloques del original: ${missing.join(', ')}. ` +
      'Inclúyelos adaptados, o decláralos con [dropped:ID] y el motivo en el bloque .report-notes.');
  }
  return notes.map((text) => ({ text, scope: 'corpus' as const }));
}

/**
 * The learner's age, year and stage, resolved against the education corpus.
 *
 * Returns an empty object when nothing is known — no age, no year, or a system
 * that no longer ships. The prompt then emits no section at all, which is the
 * point: «edad: desconocida» invites a guess where silence prompts a question.
 */
async function whoIsThis(profile: { age?: number; year?: string; stage?: string }): Promise<{
  age?: number; year?: string; stage?: string;
  yearInfo?: { typicalAge: number | null; can?: string; studies?: string };
  divergence?: { years: number; notable: boolean } | null;
}> {
  if (profile.age === undefined && !profile.year) return {};

  const found = profile.year ? await findYearInCorpus(profile.year) : null;
  return {
    age: profile.age,
    // Her label, from the corpus where it is still there, and what the profile
    // recorded where it is not — a system withdrawn from the corpus must not
    // blank a learner's year.
    year: found?.year.label ?? profile.year,
    stage: found?.stage.label ?? profile.stage,
    yearInfo: found
      ? { typicalAge: found.year.typicalAge, can: found.year.can, studies: studiesFor(found) }
      : undefined,
    divergence: found ? divergence(profile.age, found.year) : null,
  };
}

export async function runAdaptation(
  jobId: string, learnerCode: string, onProgress: (p: AdaptProgress) => void,
  corrections: Correction[] = [],
): Promise<AdaptResult> {
  const vault: Vault = currentVault();

  onProgress({ stage: 'Leyendo el material' });
  const raw = await vault.readRaw(jobIR(jobId));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro el material de este trabajo.');

  const doc = annotateInjection(parseIR(raw));
  checkBounds(doc);

  // The verification gate: one reading error in step one contaminates every
  // output, and she will not catch it in the finished PDF because it will read
  // perfectly plausibly.
  /*
   * Composed material has no extraction to verify (002 T013).
   *
   * The gate exists because a reading error in step one contaminates every output
   * and she will not catch it in the finished PDF. A composed sheet was not read
   * from anything: there is no original it could be unfaithful to. Requiring the
   * flag would mean writing `extraction: { verified: true }` into a document that
   * never had an extraction — a true-looking field asserting something that did
   * not happen, which is the shape of defect this project keeps finding.
   *
   * What composed material needs instead is a **content** review, and that is not
   * this gate: it is the louder draft mark (T016) and the checklist that says the
   * effort is higher (T020). Nothing is waved through — the two checks are
   * different checks.
   */
  if (!isVerified(doc) && !isGenerated(doc)) {
    throw new RampaError('ir-unverified',
      'Todavía no has comprobado que la lectura del material sea fiel al original. Revísala antes de adaptar.');
  }

  onProgress({ stage: 'Leyendo el perfil y tus notas' });
  const learner = await loadLearner(vault, learnerCode);

  onProgress({ stage: 'Eligiendo las adaptaciones' });
  // No recipes means no guards. Adapting anyway would produce plausible output
  // with the curriculum unprotected, which is worse than not adapting.
  await assertCorpus();
  const lang = typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es';
  /*
   * Now filtered by what is actually in this document (012 T005, FR-1004).
   *
   * Before this, `recipe.scope` was parsed and read by nothing, so a recipe about
   * assessments was offered for a study text. The behaviour change is real and
   * `packages/core/test/selection-baseline.test.ts` records both sides of it.
   */
  const selection = selectRecipes(await allRecipes(), learner.profile, lang, blockClassesIn(doc));

  /*
   * Nothing applies, so nothing happens — **before the provider is called**
   * (PROD-01, decision P1).
   *
   * The run used to proceed with «Adaptando: 0 reglas» and a prompt whose «Reglas
   * seleccionadas» section was empty. Hard rule 6 forbids changing anything with
   * no recipe to cite, so the model either changed nothing — she paid for a copy
   * of her own worksheet — or invented recipe ids, and then the report cites rules
   * that do not exist, which is the traceability claim of this whole project
   * failing quietly.
   *
   * `assertCorpus()` above is a different check and does not cover this: it asks
   * whether the recipes are installed, not whether any of them apply. The comment
   * beside it («No recipes means no guards… worse than not adapting») was making
   * exactly this argument about a case it could not see.
   *
   * The axes are named because «no tengo nada que aplicar» with no reason is a
   * dead end, and `job:profileGap` is what the screen uses to say it *before* she
   * gets here.
   */
  if (selection.selected.length === 0) {
    const blind = AXES.filter((a) => axisLevelOf(learner.profile, a) === null);
    throw new RampaError('no-recipes-apply',
      'Con lo que sé de este alumno no tengo ninguna adaptación que aplicar, así que '
      + 'no he enviado nada ni te he cobrado.'
      + (blind.length
        ? ` Tiene ${blind.length === 1 ? 'un eje' : `${blind.length} ejes`} sin observar `
          + `(${blind.join(', ')}): si apuntas lo que ves en clase, se activan solas.`
        : ' Su perfil está completo y ninguna regla encaja con él: cuéntamelo, porque'
          + ' entonces es que faltan reglas.'),
      blind);
  }

  // Memory is never loaded wholesale: only entries for the recipes selected.
  const memory = await loadForRun(vault, selection.selected.map((r) => r.id));

  /**
   * The active service, resolved through the catalogue (009 T027).
   *
   * This used to be `providerById(providerId)`, which knows only the two
   * hand-written adapters. The moment `009` let her connect Groq, Mistral,
   * DeepSeek or OpenAI, adapting would have thrown "todavía no has conectado
   * Rampa con tu servicio de IA" — with the key sitting right there, connected,
   * a green tick on the connection screen. She would have had no way to tell
   * that the failure was ours.
   */
  /*
   * The mark, and the bridge words it makes possible (`033`).
   *
   * Read from the profile and from nowhere else: no country, no origin, no name. Resolved
   * before the prompt is built so that what reaches the model is data rather than a task.
   */
  const mark = learner.profile.vehicular;
  const vehicular = mark && mark.intensity > 0
    ? { intensity: mark.intensity, languages: mark.languages }
    : undefined;
  /*
   * The bridge is **built and not yet fed**, and that is a recorded gap rather than an
   * oversight (`033` T011, question for Carlos in `specs/INFORME-NOCHE.md`).
   *
   * `bridgeWords` resolves glosses from a list of key words. Which words are key is a
   * judgement about the unit, and `018` settled that it is passed in and never guessed —
   * «inferring it from frequency would put a picture beside whatever happened to repeat».
   * Today nothing fills that list: `ApplyOptions.vocabulary` exists for the same purpose
   * and no caller supplies it either.
   *
   * So the honest state is: the mark reaches the prompt, the three recipes fire, the
   * visual and transitional supports happen — and no gloss is claimed, because inventing
   * a word source here would be inventing the judgement this project refuses to invent.
   * The question is «where does the unit's key vocabulary come from», and it is hers.
   */

  const active = await activeProvider();
  if (!active) throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  const { provider, key } = active;

  onProgress({ stage: 'Adaptando', detail: `${selection.selected.length} reglas` });

  // Keep every previous attempt: a teacher comparing "before I told it" with
  // "after" is how she decides whether the correction landed, and losing the
  // earlier version to save a file would take that away.
  await vault.ensureDir(jobLearnerDir(jobId, learnerCode));
  /*
   * One revision mechanism, in `core/vault/revisions.ts` (`026` T003).
   *
   * This was `nextRevision`, a private copy of «archive the previous, number the next»;
   * `jobs/compose.ts` had a second one for `ir.rN.md`. Two copies is the drift `021`'s
   * research warned about, and writing `026`'s turn against either would have made a
   * third. Same behaviour, one place — asserted by a test that no other file builds an
   * `.rN.md` path.
   */
  const site = { dir: jobLearnerDir(jobId, learnerCode), stem: 'adapted' };
  const archived = await archivePrevious(vault, site);
  const revision = (archived ?? 0) + 1;

  const system = await systemPrompt();
  const known = await knownNames();

  /**
   * Ask before sending, on every channel she writes into (T090, 006 FR-419).
   *
   * The old check covered only the pasted worksheet, so a name typed into her
   * notes, her house style or a correction was flagged *after* the request had
   * already started streaming — the ask happened once the sending was done.
   * Only teacher-authored text is scanned: running this over the corpus or the
   * material produces a false positive on every mid-sentence capital.
   */
  const unknown = await unknownNamesIn([
    learner.notes,
    learner.overlay ?? '',
    memory.house,
    ...memory.journal.map((j) => j.body),
    ...corrections.map((c) => c.text),
  ]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en tus notas: ${unknown.join(', ')}. ` +
      'No he enviado nada. Dime si es un alumno y lo sustituyo por su código, o márcalo como que no es un nombre.',
      unknown);
  }

  const attempt = async (extra: Correction[]): Promise<{ out: string; cents: number | null; flagged: string[] }> => {
    const { prompt, notesOmitted } = buildAdaptPrompt({
      profile: learner.profile,
      // Who he is (011). Resolved here against the education corpus so the prompt
      // builder stays free of any knowledge about school systems.
      ...(await whoIsThis(learner.profile)),
      notes: learner.notes,
      overlay: learner.overlay,
      house: memory.house,
      journal: memory.journal.map((j) => ({ path: j.path, body: j.body })),
      recipes: selection.selected,
      corrections: [...corrections, ...extra],
      material: raw,
      /*
       * What she said this is (012 FR-1002). `null` for every document that
       * predates `012`, and the prompt says nothing rather than asserting the
       * loosest rule — because asserting the worksheet rule about an exam is the
       * silent failure this feature exists to prevent.
       */
      kind: await materialKind(
        typeof doc.frontMatter['kind'] === 'string' ? doc.frontMatter['kind'] : undefined),
      /*
       * What subject this is (`032` FR-3001), read from the document rather than asked
       * again: `subject` is written by the compose flow and by ingestion's front matter,
       * and re-deciding it here would let one sheet be prompted as two subjects.
       */
      ...(typeof doc.frontMatter['subject'] === 'string' && doc.frontMatter['subject']
        ? { subject: doc.frontMatter['subject'] } : {}),
      /*
       * The vehicular mark and the bridge words (`033` T011, FR-3101/3106).
       *
       * Nothing is sent when the mark is 0 — her statement that it is over. The glosses
       * are not sent at all yet; see the note above `vehicular` for why.
       */
      ...(vehicular ? { vehicular } : {}),
    });
    if (notesOmitted > 0) {
      logger.info('adapt.notes-bounded', { jobId, omittedSections: notesOmitted });
    }

    const { stream, flagged } = sendRedacted(provider,
      { system, messages: [{ role: 'user', content: prompt }] }, key, known);

    let out = '';
    let cents: number | null = 0;
    for await (const chunk of stream) {
      if (chunk.text) { out += chunk.text; onProgress({ stage: 'Adaptando', detail: `${out.length} caracteres` }); }
      if (chunk.usage) cents = addCost(cents, provider.price(chunk.usage));
    }
    return { out, cents, flagged };
  };

  // ── The deterministic gate (007 FR-512, FR-516, FR-517; ADR 0007) ─────────
  let result = await attempt([]);
  let totalCents: number | null = result.cents;
  let issues = [...checkStructurallyComplete(result.out), ...checkCompleteness(doc, parseIR(result.out))];
  let retried = false;

  if (issues.length) {
    logger.warn('adapt.output-rejected', { jobId, attempt: 1, issues: issues.length });
    onProgress({ stage: 'Revisando el resultado', detail: 'faltaba algo, lo vuelvo a pedir' });
    retried = true;
    const second = await attempt(retryCorrections(issues));
    totalCents = addCost(totalCents, second.cents);
    const secondIssues = [
      ...checkStructurallyComplete(second.out),
      ...checkCompleteness(doc, parseIR(second.out)),
    ];
    if (secondIssues.length) {
      // Keep the evidence, leave her last good sheet untouched, and say what
      // happened in her language. Cost of both attempts is still recorded: it
      // was spent.
      await vault.writeRaw(jobRejected(jobId, learnerCode), second.out);
      await recordCost(jobId, totalCents);
      logger.error('adapt.output-rejected-final', { jobId, issues: secondIssues.length });
      throw new RampaError('output-incomplete', completenessNotice(secondIssues).message, secondIssues);
    }
    result = { ...second, cents: totalCents };
    issues = [];
  }

  const adapted = parseIR(result.out);

  // Additions without provenance, and content that derives from nothing in the
  // original: the traceability rule doubling as the injection detector.
  assertProvenance(adapted);
  const unaccounted = findUnaccountedBlocks(doc, adapted);
  if (unaccounted.length) {
    throw new RampaError('ir-no-provenance',
      `Aparecieron ${unaccounted.length} bloque(s) que no vienen de nada del material original.`,
      unaccounted.map((b) => b.id));
  }

  /*
   * Pictograms (018), applied **after** the model and only if she said so.
   *
   * Here rather than in a recipe, and that is the whole design: a recipe is
   * selected by an axis and applied by a model, and both are wrong for this family.
   * No axis value may enable it (FR-1605) — it is the one family that *adds* to the
   * page and the most visible difference there is — and inserting a pictogram is a
   * deterministic lookup, not judgement (FR-1608).
   *
   * So `selectRecipes` never sees pictograms, and the only thing that turns them on
   * is `profile.pictograms.enabled`, written by her with a date.
   */
  const pictos = await applyPictogramsIfSheSaidSo(adapted, learner, doc);

  onProgress({ stage: 'Guardando' });
  /*
   * Stamp when this was made, and which school year it belonged to (014 FR-1203).
   *
   * From the process, never from the model. When something happened is a fact,
   * and a model asked for today's date will confidently produce one — Principle
   * II. Stored rather than computed at read time so a record opened next August
   * still says a sheet made in May belonged to 2025-2026.
   */
  const madeOn = new Date().toISOString().slice(0, 10);
  const stamped = result.out.replace(/^---\r?\n/,
    `---\nadapted_on: "${madeOn}"\nschool_year: "${schoolYearOf(madeOn)}"\n`);
  /*
   * And which reading it was made from (005 T024, FR-520).
   *
   * The same kind of fact as the date beside it: a property of the process at the
   * moment the sheet was written, stamped here because here is where it is known.
   * `doc` is the extraction as this run read it — `annotateInjection` adds notices
   * and never touches a block's text, and the fingerprint reads only ids and text.
   *
   * This is what lets a correction to `ir.md` mark the sheets already made from the
   * previous reading, by learner. Nothing has to be reset afterwards: a re-run
   * comes back through here and stamps the current reading, which is FR-520's «MUST
   * NOT re-run anything on its own» read from the other side — the fix is her
   * pressing adapt again, not a flag we maintain.
   */
  /*
   * And which drawing each word got (`031` T004, research R1).
   *
   * `applyPictograms` set `data-picto` on the **parsed** document above and this line
   * wrote `result.out` — the raw model output — so the pairs never reached the file.
   * `print.ts` has been reading them back from disk ever since, under a comment saying
   * «what is on the sheet was decided when it was adapted»: a read of a value nothing
   * persisted, with no test to catch it because none round-tripped adapt → disk → print.
   *
   * Stamped here, beside the date and the reading fingerprint, because all three are the
   * same kind of fact: a property of the process at the moment the sheet was written.
   * `031` then derives «is this drawing still the one she uses?» from them, and the
   * printing path starts finding what it was always looking for.
   */
  const withPicto = stampPicto(
    stampReading(/^---\r?\n/.test(result.out) ? stamped : result.out, readingFingerprint(doc)),
    pictoPerBlock(pictos));
  await vault.writeRaw(jobAdapted(jobId, learnerCode), withPicto);  // one writer (030 T018)
  /*
   * And the vault says it now records drawings (`031`, P50's marker).
   *
   * Raised **at the write of the shape that needs it**, which is the rule
   * `bumpVaultSchema` states: never at startup, never from a read. It is what lets the
   * freshness axis tell «this sheet used no pictograms» from «this sheet predates the
   * record» — without it every old sheet in her vault would have to answer «no lo sé»
   * for ever, including the ones written after this shipped.
   */
  await bumpVaultSchema(vault, VAULT_SCHEMA_DRAWINGS);

  /*
   * Which normativa names what this adaptation is (`029` T010/T012, FR-2705).
   *
   * The report's opening sentence used to name one community's document and one
   * community's platform, in a string literal, in the document a teacher reads before
   * she signs. The learner's own corpus wins over the vault's, like everywhere else.
   */
  const normative = await normativeFor(vault, learner.profile.normative_corpus);
  const genericPhrases = parseGuideCorpus(await loadInstruction('guide')).phrases;

  const report = buildReport({
    adapted, selection,
    wording: {
      generic: genericPhrases,
      ...(normative.of === 'corpus' ? { phrases: normative.corpus.phrases } : {}),
    },
    provenanceLine: normative.provenanceLine,
    /*
     * Which corpus produced this (`034` FR-3207). Read at the moment the report is
     * written rather than at startup: the governing corpus can change between launching
     * the application and finishing a job, and what the report has to cite is what
     * actually ran.
     */
    corpusVersion: (await governingCorpus()).version,
    /*
     * Only when they are on (FR-1607). Where she has left them off the report says
     * nothing at all — a tool that keeps proposing pictograms is a tool arguing with
     * her about how a child is seen.
     */
    ...(pictos ? { pictograms: pictos } : {}),
    // Under which rule this happened (012 FR-1006), and the disagreement check
    // that reports without acting (FR-1005).
    kind: await materialKind(
      typeof doc.frontMatter['kind'] === 'string' ? doc.frontMatter['kind'] : undefined),
    /*
     * What was **loaded**, not what to report (003 FR-210).
     *
     * This used to pass `effect: 'Apliqué lo aprendido antes'` for every entry
     * that intersected the run — so an entry that matched a recipe id and changed
     * nothing read exactly like a correction that did. `buildReport` now takes
     * what was available and keeps only what the model declared using, so a line
     * in that section means her correction had an effect.
     *
     * One entry per recipe it is tagged with: the recipe is what she recognises,
     * where a path like `memory/journal/2026-03-01-casillas.md` would make her
     * open a file to find out what the report meant.
     */
    memoryAvailable: memory.journal.flatMap((j) =>
      j.recipes.map((recipe) => ({ recipe, source: j.path }))),
  });
  await vault.writeRaw(jobReport(jobId, learnerCode), report.markdown);
  await recordCost(jobId, totalCents);

  logger.info('adapt.finished', {
    jobId, revision, recipes: selection.selected.length,
    corrections: corrections.length, costCents: totalCents, retried,
  });

  // Every notice reaches her: computed and discarded was the defect (T089).
  const notices: AdaptResult['notices'] = [
    ...doc.notices.map((n) => ({ block: null, notice: n })),
    ...injectionNotices(doc).map(({ block, notice }) => ({ block: block.id, notice })),
    ...result.flagged.map((name) => ({
      block: null,
      notice: {
        kind: 'unreadable' as const,
        quote: name,
        message: `He enviado "${name}" tal cual porque no sé si es el nombre de alguien. ` +
          'Si lo es, dímelo y lo sustituyo por su código a partir de ahora.',
      },
    })),
  ];

  return {
    report: report.markdown,
    reportData: {
      decisions: report.decisions,
      notDone: report.notDone,
      // What the model declared using AND the run actually loaded — verified in
      // `buildReport`, not trusted here.
      memoryApplied: report.memoryApplied,
    },
    notices,
    costCents: totalCents,
    revision,
    recipes: selection.selected.map((r) => r.id),
    retried,
  };
}

/**
 * Insert pictograms, if she decided this learner uses them (018 T012/T018).
 *
 * Returns `null` when she has not — and `null` is what keeps the report silent
 * about it. The three ways this returns nothing are all «she said no or said
 * nothing», never «it did not work»: no decision recorded, no set configured, or a
 * set whose language does not match the material.
 *
 * ## Exported for one reason: this is the seam nothing tested
 *
 * A review mutated `names: await nameWordSet()` to `names: new Set()` — deleting
 * FR-1610, «a learner's name never gets a pictogram» — and **all 1.458 offline tests
 * passed**. Same for `chosen: await chosenWords(lang)`, which disconnects `024`'s
 * headline feature.
 *
 * The tests were on both sides of this line and not on it: `nameWords` in isolation,
 * `matchWord` given a hand-built set, and nothing asserting the two are ever joined —
 * which is exactly where the accent defect lived. It was in this call.
 *
 * `packages/shell/test/adapt-pictograms.test.ts` now drives it with the vault and
 * keychain mocked, and both mutations fail it. A comment defending a line is not a test.
 */
export async function applyPictogramsIfSheSaidSo(
  adapted: ReturnType<typeof parseIR>,
  learner: Awaited<ReturnType<typeof loadLearner>>,
  original: ReturnType<typeof parseIR>,
): Promise<{ used: Array<{ blockId: string; word: string; id: string }>; skipped: string[] } | null> {
  const decision = (learner.profile as { pictograms?: { enabled?: boolean; scope?: string; overrides?: Record<string, string> } }).pictograms;
  if (decision?.enabled !== true) return null;

  const set = await currentPictogramSet();
  if (!set) {
    // She turned it on and there is no set. Said in the report rather than
    // silently producing a sheet without them.
    logger.warn('pictograms.no-set', {});
    return { used: [], skipped: ['No tengo ningún juego de pictogramas configurado, así que esta hoja no lleva ninguno.'] };
  }

  const lang = typeof adapted.frontMatter['lang'] === 'string' ? adapted.frontMatter['lang'] : 'es';
  const kind = typeof original.frontMatter['kind'] === 'string' ? original.frontMatter['kind'] : '';

  const applied = applyPictograms(adapted, set, {
    language: lang,
    scope: (decision.scope as 'all' | 'instructions' | 'vocabulary') ?? 'vocabulary',
    ...(decision.overrides ? { overrides: decision.overrides } : {}),
    /*
     * The names she knows, as normalised single words — so «María» never gets a
     * pictogram (FR-1610). `core` never learns a learner's name, so the set is
     * assembled here and passed in as words.
     *
     * `nameWordSet` and not `.map(n => n.toLowerCase())`, which is what this line
     * used to be and was wrong twice: it kept accents that `matchWord`'s lookup
     * folds away, and it kept «María Nebrera» whole where the lookup asks about one
     * word at a time. Both misses had the same effect — a child's name with a
     * pictogram beside it.
     */
    names: await nameWordSet(),
    /*
     * Her vocabulary (`024` FR-2214). Without this line the chooser writes a file that
     * nothing reads — the thirteenth unread field, in the very feature written to fix
     * the twelfth. `profile.pictograms.overrides` was exactly this defect: carried by
     * the profile editor, surfaced by no screen, consulted by nothing.
     */
    chosen: await chosenWords(lang),
    isExam: kind === 'exam',
  });

  return { used: applied.used, skipped: applied.skipped };
}

/** Block id → the `word=id` pairs that block got, in the format `024` already defined. */
function pictoPerBlock(
  pictos: { used: Array<{ blockId: string; word: string; id: string }> } | null,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const { blockId, word, id } of pictos?.used ?? []) {
    out.set(blockId, `${out.get(blockId) ? `${out.get(blockId)} ` : ''}${word}=${id}`);
  }
  return out;
}
