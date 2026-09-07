import { basename, join } from 'node:path';
import {
  jobDir, jobIR, jobSourceDir, parseIngestBudget, tooSmallToRead,
  validatePage, pagesToIR, irToMarkdown, EXTRACTION_JSON_SCHEMA,
  annotateInjection, redact, logger, RampaError, parseIR, formatCost, isUnusuallyExpensive,
  VAULT,
  type ExtractedPage, type Flag, type IngestBudget, type Vault, addCost,
  parseFrontMatter, startedFor,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { loadInstruction, assertCorpus } from '../corpus/index.js';
import { recordCost, estimateCents, currentLedger } from '../ipc/cost.js';
import { readSources, type SourcePage } from '../ingest/read.js';

/**
 * Ingest (008 T013-T017, ADR 0007).
 *
 * **Code owns the loop.** The model extracts one page; this file validates the
 * answer, decides whether to try again, and decides when to stop. That is the
 * whole of ADR 0007's argument applied to the one stage the ADR names as
 * genuinely open-ended — and it is why the retry bound, the page bound and the
 * image size are read from the corpus rather than negotiated with the model.
 *
 * Three outcomes per page, kept distinct because collapsing them costs her money:
 * accept (possibly with flags), retry, or stop. A dark photograph is a stop —
 * retrying it produces a second dark extraction and a second charge, and the fix
 * is physical and hers.
 */
export interface IngestProgress {
  stage: string;
  detail?: string;
  page?: number;
  of?: number;
}

export interface PageRecord {
  page: number;
  /** Vault-relative path to the source image, when there is one. */
  image?: string;
  verified: boolean;
  problems: string[];
  attempts: number;
  flags: Flag[];
}

export interface IngestResult {
  jobId: string;
  source: string;
  pages: PageRecord[];
  /** True when FR-612's bound cut the job. Never silent. */
  boundReached: boolean;
  cutPages: number[];
  costCents: number | null;
  /** Probable names we do not know, found in extracted text (FR-610). */
  flaggedNames: string[];
}

const OUTPUT_FORMAT =
  '\n\n---\n\nDevuelve únicamente un objeto JSON con este esquema, sin texto alrededor:\n'
  + JSON.stringify(EXTRACTION_JSON_SCHEMA, null, 2);

async function systemPrompt(): Promise<string> {
  const [rules, ingest] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('ingest'),
  ]);
  // The whole judgement layer for this stage is those two files (Principle I).
  // Only the output format is added, which is mechanics.
  return `${rules}\n\n---\n\n${ingest}${OUTPUT_FORMAT}`;
}

export async function budget(): Promise<IngestBudget> {
  return parseIngestBudget(await loadInstruction('ingest'));
}

export async function runIngest(
  jobId: string,
  paths: readonly string[],
  onProgress: (p: IngestProgress) => void,
  /**
   * Who this material is being brought for (`020` T006, FR-1828).
   *
   * Stamped at creation, because that is the only moment it is known for free: she
   * entered through a learner and pressed «Tráelo» inside his flow. Derived later it
   * cannot be recovered at all — an extraction abandoned before step 4 has no folder
   * under any learner, which is exactly the half-finished work `020` FR-1827 is about.
   *
   * Optional, and it must stay optional: every job in every vault today has no such
   * field, and treating its absence as an error would break the first vault it met.
   * `startedFor` already reads it, and read the older `composed_for` spelling before
   * this existed.
   */
  forLearner?: string,
): Promise<IngestResult> {
  await assertCorpus();
  const vault = currentVault();
  const limits = await budget();

  onProgress({ stage: 'Leyendo los ficheros' });
  /*
   * The corpus bound travels **into** the reading (008 FR-616, review COD-05).
   *
   * `image_long_edge` was parsed here, typed onto `IngestBudget`, and applied by
   * nobody: `planDownscale` was imported by this file and never called, so every
   * photograph went at full resolution. The bound belongs where the pixels are,
   * and the pixels are in `read.ts`.
   */
  const read = await readSources(paths, limits.imageLongEdge);

  /*
   * FR-617/FR-612: the page bound is reported, never silently applied. A teacher
   * who drops a 60-page PDF and gets 20 pages back with no explanation has been
   * lied to by omission, and she will only find out when the worksheet stops
   * mid-exercise.
   */
  const boundReached = read.pages.length > limits.pagesPerJob;
  const cutPages = boundReached
    ? read.pages.slice(limits.pagesPerJob).map((p) => p.page)
    : [];
  const pages = read.pages.slice(0, limits.pagesPerJob);

  if (boundReached) {
    logger.warn('ingest.bound', { asked: read.pages.length, used: pages.length });
  }

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }

  /*
   * FR-617 · a service that cannot read photographs.
   *
   * Caught before anything is sent, and named: "Groq no lee fotos" is actionable,
   * where a failed extraction is not. The catalogue carries `vision` per service
   * (009), so this is a fact rather than a probe.
   */
  /*
   * A page with neither text nor pixels is nothing to extract (review COD-04).
   *
   * This used to be unreachable-looking and was the normal case for a scanned
   * PDF: `readPdf` produced pages with no `text` and no `image`, `needsVision`
   * was therefore false, and `extractPage` sent «Página N. Lee esta imagen.» with
   * `images: undefined` — so the model invented a page or failed, and she paid.
   *
   * `read.ts` gives a scanned page its pixels now, so this is the honest
   * remainder: a page whose bitmap could not be reached at all. It stops the run
   * **before the provider** rather than charging for a prompt about an image that
   * is not attached.
   */
  const blind = pages.filter((p) => !p.text && !p.image).map((p) => p.page);
  if (blind.length === pages.length) {
    throw new RampaError('ingest-unusable',
      'No he podido sacar ni el texto ni la imagen de ese fichero, así que no he enviado '
      + 'nada ni te he cobrado. Si es un PDF escaneado raro, prueba a hacerle una foto a '
      + 'cada página.');
  }
  if (blind.length) {
    logger.warn('ingest.blind-pages', { pages: blind });
  }

  const needsVision = pages.some((p) => p.image && !p.text);
  const caps = await active.provider.capabilities();
  if (needsVision && !caps.vision) {
    throw new RampaError('ingest-no-vision',
      `${active.provider.label} no puede leer fotos. Cambia de servicio en «Mi servicio de IA» `
      + 'para este material, o pega el texto de la ficha.');
  }

  await vault.ensureDir(jobDir(jobId));
  await vault.ensureDir(jobSourceDir(jobId));

  const system = await systemPrompt();
  const known = await knownNames();
  const records: PageRecord[] = [];
  const extracted: ExtractedPage[] = [];
  let costCents: number | null = 0;

  for (const [i, page] of pages.entries()) {
    onProgress({ stage: 'Leyendo la página', page: page.page, of: pages.length, detail: `${i + 1} de ${pages.length}` });

    const stored = await storeSource(jobId, page, paths[i]);

    if (page.image && tooSmallToRead({ width: page.image.width, height: page.image.height })
        && page.image.width > 0) {
      // Refused before the call: a photograph this small will have everything
      // flagged or guessed, either of which costs a call for nothing.
      records.push({
        page: page.page, image: stored, verified: false, attempts: 0, flags: [],
        problems: ['La foto es demasiado pequeña para leerla.'],
      });
      continue;
    }

    if (!page.text && !page.image) {
      // Reported, not sent: she sees which page produced nothing and why, and the
      // other pages of the same document still run (FR-603).
      records.push({
        page: page.page, image: stored, verified: false, attempts: 0, flags: [],
        problems: ['No he podido sacar ni el texto ni la imagen de esta página.'],
      });
      continue;
    }

    const outcome = await extractPage({
      page, system, limits, provider: active, known, jobId,
      onProgress: (d) => onProgress({ stage: 'Leyendo la página', page: page.page, of: pages.length, detail: d }),
    });
    costCents = addCost(costCents, outcome.costCents);

    if (outcome.kind === 'accept') {
      extracted.push(outcome.page);
      records.push({
        page: page.page, image: stored, verified: false,
        attempts: outcome.attempts, flags: outcome.flags, problems: [],
      });
    } else {
      // FR-603: the page's problems are surfaced, never accepted and never
      // discarded. She sees which page failed and why, in her language.
      records.push({
        page: page.page, image: stored, verified: false,
        attempts: outcome.attempts, flags: [],
        problems: outcome.advice ? [...outcome.problems, outcome.advice] : outcome.problems,
      });
    }
  }

  if (extracted.length === 0) {
    throw new RampaError('ingest-failed',
      'No he podido leer ninguna página. Mira los avisos de cada una: casi siempre es la luz o el encuadre.');
  }

  /*
   * FR-610 · names in extracted text.
   *
   * The vault stays name-free even when the photograph was not. Known names
   * become codes here, before the IR is written; probable unknown names are
   * flagged for her, exactly as with typed text — never rewritten silently.
   */
  const flaggedNames = new Set<string>();
  for (const page of extracted) {
    for (const b of page.blocks) {
      for (const field of ['text', 'short', 'long'] as const) {
        const value = b[field];
        if (!value) continue;
        const r = redact(value, known);
        b[field] = r.text;
        for (const f of r.flagged) flaggedNames.add(f);
      }
    }
  }

  let doc = pagesToIR(extracted, {
    source: read.source,
    ...(forLearner ? { frontMatter: { for_learner: forLearner } } : {}),
  });

  /*
   * T022 · Principle IX, and the reason it is not optional.
   *
   * These detectors have only ever seen pasted text. A photographed worksheet is
   * a new input path into the same pipeline, and a page that says «ignora las
   * instrucciones anteriores» must appear in the IR as text with a notice on it —
   * not be obeyed by the adaptation call that reads this document next.
   */
  doc = annotateInjection(doc);

  // Invisible text from a digital PDF (FR-607). The only input where this
  // defence, specified in 007, is implementable at all.
  for (const page of pages) {
    for (const quote of page.invisibleText ?? []) {
      doc.notices.push({
        kind: 'hidden-text',
        quote,
        message: `En la página ${page.page} hay texto que no se ve al mirarla. `
          + 'Está en el fichero pero no impreso, así que no lo habrías encontrado tú.',
      });
    }
  }

  await vault.writeRaw(jobIR(jobId), irToMarkdown(doc));
  await writeExtraction(jobId, {
    source: read.source, pages: records, boundReached, cutPages, costCents,
  });

  await recordCost(jobId, costCents);
  onProgress({ stage: 'Listo', detail: `${extracted.length} página(s) leídas` });

  return {
    jobId, source: read.source, pages: records,
    boundReached, cutPages, costCents,
    flaggedNames: [...flaggedNames],
  };
}

/* ── One page, with the loop code owns ───────────────────────────────────── */

type PageOutcome =
  | { kind: 'accept'; page: ExtractedPage; flags: Flag[]; attempts: number; costCents: number | null }
  | { kind: 'fail'; problems: string[]; advice?: string; attempts: number; costCents: number | null };

async function extractPage(args: {
  page: SourcePage;
  system: string;
  limits: IngestBudget;
  provider: NonNullable<Awaited<ReturnType<typeof activeProvider>>>;
  known: ReadonlyMap<string, string>;
  jobId: string;
  onProgress: (detail: string) => void;
}): Promise<PageOutcome> {
  const { page, system, limits, provider, known } = args;
  let problems: string[] = ['No he podido leer la página.'];
  let costCents: number | null = 0;

  for (let attempt = 1; attempt <= limits.attemptsPerPage; attempt++) {
    if (attempt > 1) args.onProgress(`segundo intento`);

    const images = page.image && !page.text
      ? [{ mediaType: page.image.mediaType, base64: Buffer.from(page.image.data).toString('base64') }]
      : undefined;

    const userText = page.text
      // The digital path: the text is already text, so the model is asked only
      // for the judgement — which blocks these are, and what the figures are for.
      ? `Página ${page.page}. Este texto ya está extraído del fichero; clasifícalo en bloques `
        + `y describe las imágenes que se mencionen. No lo reescribas.\n\n${page.text}`
      : `Página ${page.page}. Lee esta imagen.`;

    let raw = '';
    try {
      // Through the chokepoint like every other provider call, so ingest cannot
      // become a second egress path (T014).
      const { stream } = sendRedacted(
        provider.provider,
        { system, messages: [{ role: 'user', content: userText }], images, maxTokens: 8000 },
        provider.key, known, { maxAttempts: 1 },
      );
      for await (const chunk of stream) {
        if (chunk.text) raw += chunk.text;
        if (chunk.usage) costCents = addCost(costCents, provider.provider.price(chunk.usage));
      }
    } catch (e) {
      // A provider failure is not a validation failure, and retrying it here
      // would double-retry on top of the resilience layer.
      throw e;
    }

    const verdict = validatePage(parseJsonish(raw), page.page);

    if (verdict.outcome === 'accept') {
      return { kind: 'accept', page: verdict.page, flags: verdict.flags, attempts: attempt, costCents };
    }
    if (verdict.outcome === 'stop') {
      // Another attempt cannot fix this, so spending one spends her money to
      // produce the same answer.
      return { kind: 'fail', problems: verdict.problems, advice: verdict.advice, attempts: attempt, costCents };
    }
    problems = verdict.problems;
    logger.warn('ingest.page.retry', { page: page.page, attempt, problems: problems.join('; ') });
  }

  return { kind: 'fail', problems, attempts: limits.attemptsPerPage, costCents };
}

/**
 * JSON out of an answer that may be wrapped in a fence or a sentence.
 *
 * Not leniency for its own sake: a model told to return only JSON will
 * occasionally wrap it in ```json anyway, and burning a retry on a fence is
 * spending her money on punctuation. Anything beyond that is a real malformation
 * and goes to the validator, which reports it precisely.
 */
export function parseJsonish(raw: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  const body = (fenced?.[1] ?? raw).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

async function storeSource(jobId: string, page: SourcePage, path?: string): Promise<string | undefined> {
  if (!page.image) return undefined;
  /*
   * Her photographs live with the material they became (research R5), so she can
   * open the folder and see the two side by side — and so the verification screen
   * survives a restart, which `006`'s whole premise requires.
   *
   * `path` is optional and used only for the **name**. It has to be: a scanned PDF
   * is one path and N pages, so `paths[i]` is `undefined` from page two onwards —
   * and the earlier `if (!path) return undefined` meant every page of a scanned PDF
   * but the first would have had no stored image and no picture on the verification
   * screen. She would be asked to check a reading against a blank panel.
   */
  const from = path ? basename(path) : `${page.page}.png`;
  const name = `page-${String(page.page).padStart(2, '0')}-${from}`;
  const target = join(jobSourceDir(jobId), name);
  await currentVault().writeBinary(target, page.image.data);
  return target;
}

async function writeExtraction(jobId: string, data: {
  source: string; pages: PageRecord[]; boundReached: boolean; cutPages: number[]; costCents: number | null;
}): Promise<void> {
  await currentVault().writeRaw(
    join(jobDir(jobId), 'extraction.json'),
    JSON.stringify({
      ...data,
      // Derived, never stored as a settable flag: FR-608 gates adaptation on it.
      verified: data.pages.length > 0 && data.pages.every((p) => p.verified),
    }, null, 2) + '\n',
  );
}

/* ── The per-page gate (T021, FR-608) ────────────────────────────────────── */

export interface ExtractionRecord {
  source: string;
  pages: PageRecord[];
  boundReached: boolean;
  cutPages: number[];
  costCents: number | null;
  verified: boolean;
}

export async function readExtraction(
  jobId: string,
  /**
   * Which folder to read it from, defaulting to the open one.
   *
   * Explicit so `pendingIngests` can be tested against a scratch directory: a function
   * that takes a vault and then reaches for `currentVault()` half way through is a
   * parameter that lies, and the walk it belongs to is the one FR-1828 is about.
   */
  vault: Vault = currentVault(),
): Promise<ExtractionRecord | null> {
  const raw = await vault.readRaw(join(jobDir(jobId), 'extraction.json'));
  if (!raw) return null;
  try { return JSON.parse(raw) as ExtractionRecord; } catch { return null; }
}

/**
 * Confirm one page, and recompute whether the whole extraction is verified.
 *
 * `verified` is **derived** and never written directly. The previous
 * implementation flipped `verified: false` to `true` with a regular expression
 * over the whole document, in one call, with no per-page confirmation at all —
 * so the gate the project describes as "its defence against contaminating every
 * output with one reading error" could be passed by clicking once, having read
 * nothing.
 *
 * Deriving it means there is no field for a future convenience to set.
 */
export async function setPageVerified(jobId: string, page: number, verified: boolean): Promise<ExtractionRecord | null> {
  const vault = currentVault();
  const record = await readExtraction(jobId);
  if (!record) return null;

  const pages = record.pages.map((p) => (p.page === page ? { ...p, verified } : p));
  const next: ExtractionRecord = {
    ...record,
    pages,
    // A page with unresolved problems can never count as verified: she cannot
    // confirm an extraction that does not exist.
    verified: pages.length > 0 && pages.every((p) => p.verified && p.problems.length === 0),
  };
  await vault.writeRaw(join(jobDir(jobId), 'extraction.json'), JSON.stringify(next, null, 2) + '\n');

  // The IR's own flag follows, because that is what `isVerified()` reads and
  // what the adaptation job refuses on. Two copies of one truth, so one of them
  // is computed from the other rather than maintained beside it.
  const irPath = jobIR(jobId);
  const raw = await vault.readRaw(irPath);
  if (raw) {
    await vault.writeRaw(irPath, raw.replace(
      /("verified":\s*)(true|false)/,
      `$1${next.verified ? 'true' : 'false'}`,
    ));
  }
  return next;
}

/**
 * Extractions she started and has not finished confirming, with whose they are.
 *
 * A function rather than a handler body, and the reason is a defect this project has
 * already paid for: five handlers written after a `return` inside another handler were
 * unreachable, `tsc` said nothing, and the channel test passed by static analysis. A
 * handler body is invisible to every unit test in the repository, so the walk lives
 * here and `ingest:pending` is one line.
 */
export async function pendingIngests(vault: Vault): Promise<Array<{
  jobId: string; pages: number; confirmed: number; source: string; learner?: string;
}>> {
  const jobs = await vault.list(VAULT.material);
  const pending: Array<{
    jobId: string; pages: number; confirmed: number; source: string; learner?: string;
  }> = [];
  for (const jobId of jobs) {
    const record = await readExtraction(jobId, vault);
    if (!record || record.verified) continue;
    /*
     * Who it was for, in **this** walk (`020` T007, FR-1828).
     *
     * A second pass over `material/` to answer «and whose is it?» would be two
     * traversals disagreeing the moment one of them gains a filter — and this is the
     * directory a teacher's vault grows without bound.
     *
     * `startedFor` and not `fm.for_learner`: `002` has been writing `composed_for` for
     * weeks, and a vault written last week is the normal case rather than the edge one.
     * Reading the field directly is precisely the defect `021` T004 found in
     * `record/scan.ts`, where a job stamped with the current spelling vanished from her
     * record.
     */
    const raw = await vault.readRaw(jobIR(jobId));
    const who = raw === null
      ? undefined
      : startedFor(parseFrontMatter(raw, jobIR(jobId)).data);
    pending.push({
      jobId,
      pages: record.pages.length,
      confirmed: record.pages.filter((p) => p.verified).length,
      source: record.source,
      ...(who ? { learner: who } : {}),
      // Absent rather than `null`: every job in every vault today has no such field, and
      // `learner: null` would make «nobody has claimed this» look like a value somebody
      // wrote.

    });
  }
  // Most recent first: job ids carry their timestamp.
  return pending.sort((a, b) => b.jobId.localeCompare(a.jobId));
}

/**
 * Whose this half-finished job is, said by her (`020` T027, FR-1827).
 *
 * Every job in every vault that exists today is unowned — `for_learner` started being
 * written in `020` T006 — so this is not a migration path for an edge case, it is how
 * her current work becomes reachable at all.
 *
 * It **only fills a blank**. A job already stamped for one child is not re-pointed at
 * another from here: that would be a way to move a reading between learners, which is
 * not a question that screen is asking, and the answer would silently strand whatever
 * had already been adapted under the first one.
 */
export async function claimIngest(
  vault: Vault, jobId: string, learner: string,
): Promise<boolean> {
  const path = jobIR(jobId);
  const raw = await vault.readRaw(path);
  if (raw === null) return false;
  if (startedFor(parseFrontMatter(raw, path).data)) return false;
  /*
   * Inserted into the front matter rather than rebuilt through `irToMarkdown`.
   *
   * The same reason `pictograms/apply.ts` gives for not round-tripping: a teacher may
   * have hand-edited this file, and rewriting the whole document to add one line would
   * quietly normalise everything she typed.
   */
  if (!/^---\n/.test(raw)) return false;
  await vault.writeRaw(path,
    raw.replace(/^---\n/, `---\nfor_learner: ${JSON.stringify(learner)}\n`));
  return true;
}
