import { dialog, type BrowserWindow } from 'electron';
import { basename, join } from 'node:path';
import {
  jobDir, jobIR, jobSourceDir, parseIngestBudget, planDownscale, tooSmallToRead,
  validatePage, pagesToIR, irToMarkdown, EXTRACTION_JSON_SCHEMA,
  annotateInjection, redact, logger, RampaError, parseIR, formatCost, isUnusuallyExpensive,
  VAULT,
  type ExtractedPage, type Flag, type IngestBudget,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { loadInstruction, assertCorpus } from '../ipc/corpus.js';
import { recordCost, estimateCents, currentLedger } from '../ipc/cost.js';
import { handle } from '../ipc/wrap.js';
import { readSources, type SourcePage } from '../ingest/read.js';
import { photoWarningSeen, acknowledgePhotoWarning } from '../ipc/vault-settings.js';
import { app } from 'electron';

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
  costCents: number;
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

async function budget(): Promise<IngestBudget> {
  return parseIngestBudget(await loadInstruction('ingest'));
}

export async function runIngest(
  jobId: string,
  paths: readonly string[],
  onProgress: (p: IngestProgress) => void,
): Promise<IngestResult> {
  await assertCorpus();
  const vault = currentVault();
  const limits = await budget();

  onProgress({ stage: 'Leyendo los ficheros' });
  const read = await readSources(paths);

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
  let costCents = 0;

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

    const outcome = await extractPage({
      page, system, limits, provider: active, known, jobId,
      onProgress: (d) => onProgress({ stage: 'Leyendo la página', page: page.page, of: pages.length, detail: d }),
    });
    costCents += outcome.costCents;

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

  let doc = pagesToIR(extracted, { source: read.source });

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
  | { kind: 'accept'; page: ExtractedPage; flags: Flag[]; attempts: number; costCents: number }
  | { kind: 'fail'; problems: string[]; advice?: string; attempts: number; costCents: number };

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
  let costCents = 0;

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
        if (chunk.usage) costCents += provider.provider.price(chunk.usage);
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
  if (!page.image || !path) return undefined;
  // Her photographs live with the material they became (research R5), so she can
  // open the folder and see the two side by side — and so the verification screen
  // survives a restart, which 006's whole premise requires.
  const name = `page-${String(page.page).padStart(2, '0')}-${basename(path)}`;
  const target = join(jobSourceDir(jobId), name);
  await currentVault().writeBinary(target, page.image.data);
  return target;
}

async function writeExtraction(jobId: string, data: {
  source: string; pages: PageRecord[]; boundReached: boolean; cutPages: number[]; costCents: number;
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
  costCents: number;
  verified: boolean;
}

async function readExtraction(jobId: string): Promise<ExtractionRecord | null> {
  const raw = await currentVault().readRaw(join(jobDir(jobId), 'extraction.json'));
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
async function setPageVerified(jobId: string, page: number, verified: boolean): Promise<ExtractionRecord | null> {
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

export function registerIngestIpc(getWindow: () => BrowserWindow | null): void {
  handle('ingest:accepted', async () => {
    const { ACCEPTED_EXTENSIONS, ACCEPTED_DESCRIPTION } = await import('../ingest/read.js');
    return { extensions: ACCEPTED_EXTENSIONS, description: ACCEPTED_DESCRIPTION };
  });

  /**
   * Choose the files, in the main process.
   *
   * The renderer never sees or composes a path: it asks for a dialog and gets
   * back what the operating system says she picked. That keeps the vault's rule —
   * a path from content is rejected, not sanitised — true for this input too,
   * and it is why `ingest:run` takes paths this handler produced rather than
   * strings the renderer assembled.
   */
  handle('ingest:choose', async () => {
    const win = getWindow();
    if (!win) return [];
    const { ACCEPTED_EXTENSIONS } = await import('../ingest/read.js');
    const result = await dialog.showOpenDialog(win, {
      title: 'Elige la ficha',
      properties: ['openFile', 'multiSelections'],
      filters: [{
        name: 'Fichas',
        extensions: ACCEPTED_EXTENSIONS.map((e) => e.replace('.', '')),
      }],
    });
    return result.canceled ? [] : result.filePaths;
  });

  handle('ingest:run', async (jobId: string, paths: string[]) =>
    runIngest(jobId, paths, (p) => getWindow()?.webContents.send('ingest:progress', p)));

  handle('ingest:extraction', async (jobId: string) => readExtraction(jobId));

  /**
   * Extractions she started and has not finished confirming.
   *
   * `006`'s premise is that she will be interrupted — that is why onboarding is
   * resumable — and an extraction is the longest thing in the application that
   * needs her attention. Without this, a job she read on Tuesday and did not
   * finish confirming was unreachable: the verification screen could only be
   * opened by the ingest that produced it, so closing the window lost the work
   * and the money it cost.
   *
   * Found by writing the accessibility test for that screen and discovering
   * there was no way to reach it.
   */
  handle('ingest:pending', async () => {
    const vault = currentVault();
    const jobs = await vault.list(VAULT.material);
    const pending: Array<{ jobId: string; pages: number; confirmed: number; source: string }> = [];
    for (const jobId of jobs) {
      const record = await readExtraction(jobId);
      if (!record || record.verified) continue;
      pending.push({
        jobId,
        pages: record.pages.length,
        confirmed: record.pages.filter((p) => p.verified).length,
        source: record.source,
      });
    }
    // Most recent first: job ids carry their timestamp.
    return pending.sort((a, b) => b.jobId.localeCompare(a.jobId));
  });

  /** One page, confirmed by her. The only thing that can move the gate. */
  handle('ingest:confirmPage', async (jobId: string, page: number) =>
    setPageVerified(jobId, page, true));

  handle('ingest:unconfirmPage', async (jobId: string, page: number) =>
    setPageVerified(jobId, page, false));

  handle('ingest:budget', async () => budget());

  /**
   * What this ingest will probably cost, before it runs (T016, 006 US4).
   *
   * An image is priced by tile count, so cost here scales with page count rather
   * than with prompt length — which is why this cannot reuse `estimateCents`,
   * whose whole model is characters. The figure is deliberately crude: it exists
   * to decide whether to *ask her*, not to bill anyone.
   *
   * A teacher who drops a 20-page PDF and is charged twenty times her usual
   * worksheet without being asked has been ambushed by her own tool.
   */
  handle('ingest:estimate', async (pageCount: number) => {
    const limits = await budget();
    const pages = Math.min(Math.max(0, Math.round(pageCount)), limits.pagesPerJob);
    // ~1.1k tokens for a downscaled A4 page at the corpus bound, plus the corpus
    // prompt, plus a page of structured output.
    const perPage = estimateCents(4400) + 1;
    const cents = pages * perPage;
    return {
      pages,
      cents,
      formatted: formatCost(cents),
      unusual: isUnusuallyExpensive(cents, await currentLedger()),
    };
  });

  /**
   * The page image, as a data URI.
   *
   * Read through the vault so `resolveInVault` applies: the renderer sends a job
   * id and a page number, never a path, so this cannot be turned into a
   * read-any-file handler.
   */
  handle('ingest:pageImage', async (jobId: string, page: number) => {
    const record = await readExtraction(jobId);
    const entry = record?.pages.find((p) => p.page === page);
    if (!entry?.image) return null;
    const bytes = await currentVault().readBinary(entry.image);
    if (!bytes) return null;
    const ext = entry.image.split('.').pop()?.toLowerCase() ?? '';
    const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;
  });

  /** The extracted blocks, for the side-by-side comparison. */
  handle('ingest:blocks', async (jobId: string) => {
    const raw = await currentVault().readRaw(jobIR(jobId));
    if (!raw) return [];
    return parseIR(raw).blocks.map((b) => ({
      id: b.id,
      page: Number(b.attrs['data-page'] ?? 1),
      content: b.content,
      number: b.attrs['data-number'],
      notices: b.notices,
    }));
  });

  /**
   * Her corrections, then the confirmation — in that order and in one call
   * (T020).
   *
   * One call because two would let a confirmation land without the correction it
   * was based on: she edits, clicks confirm, the edit request fails, and the page
   * is marked verified with the model's text. The correction is hers
   * (Principle VIII), so it is written as the block content and the block records
   * that a human wrote it.
   */
  handle('ingest:correctAndConfirm', async (
    jobId: string, page: number, corrections: Array<{ id: string; content: string }>,
  ) => {
    const vault = currentVault();
    if (corrections.length) {
      const raw = await vault.readRaw(jobIR(jobId));
      if (raw) {
        const doc = parseIR(raw);
        for (const c of corrections) {
          const block = doc.blocks.find((b) => b.id === c.id);
          if (!block) continue;
          block.content = c.content;
          // Traceability: this text is hers, and a later stage must not attribute
          // it to the extraction.
          block.attrs['data-corrected-by'] = 'teacher';
          // The unreadable notice is resolved by her writing the words in.
          block.notices = block.notices.filter((n) => n.kind !== 'unreadable');
        }
        await vault.writeRaw(jobIR(jobId), irToMarkdown(doc));
      }
    }
    return setPageVerified(jobId, page, true);
  });

  /** FR-609. Once per machine, outside the vault. */
  handle('ingest:photoWarningSeen', async () => photoWarningSeen(app.getPath('userData')));
  handle('ingest:acknowledgePhotoWarning', async () => {
    await acknowledgePhotoWarning(app.getPath('userData'));
    return true;
  });
}
