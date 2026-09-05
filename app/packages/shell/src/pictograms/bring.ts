import { join } from 'node:path';
import {
  readSet, pictogramVaultNote, parsePictogramFetchCorpus, RampaError, fetchGate,
  updateStatus, readIndex, urlFor, logger, normalise, PICTOGRAM_PROGRESS_STAGE,
  parseVocabulary, renderVocabulary, emptyVocabulary, choose, unchoose, chosenFor,
  forLanguage, mostUsedFirst,
  type SetReading, type SetInventory, type UpdateStatus, type Vocabulary,
} from '@rampa/core';
import { basename } from 'node:path';
import { loadInstruction } from '../corpus/index.js';
import { loadSettings, saveSettings } from '../ipc/vault-settings.js';
import { currentVault } from '../ipc/vault.js';
import type { Vault } from '@rampa/core';
import {
  pictogramSettingsDir, configuredRoot, fsReader, currentPictogramSet,
  pictogramImagesFor,
} from './access.js';
import { nameWordSet } from '../ipc/names.js';
import {
  fetchWholeSet, roomFor, transportFor, type Transport,
} from './download.js';

/**
 * Bringing pictograms, with **no knowledge of Electron** (023 T009/T010/T014).
 *
 * ## Why this is not in `ipc/pictograms.ts`
 *
 * Because the boundary test refused it. `023`'s four handlers took the Electron
 * surface from 940 code lines to 960 against a 950 bound — the **third** time that
 * test has caught this file growing, and it was right the first two times as well
 * (a vault note and the id→data-URI logic went to `core`; set access went to
 * `access.ts`).
 *
 * Nothing here needs a window. It needs a settings directory, a vault, a corpus and
 * a transport, and the one thing that genuinely does need a window — sending progress
 * to the renderer — arrives as a callback. So `ipc/pictograms.ts` keeps a folder
 * dialog and thin handlers, which is what an `ipc/` file is for.
 *
 * ADR 0008 wants a migration cost that can be quoted. This file is not part of it.
 */

export interface PublisherState {
  publishers: Array<{
    id: string; label: string; site: string; licence: string; licenceUrl: string;
    languages: string[];
    attribution: { author: string; owner: string; source: string };
  }>;
  accepted: { publisher: string; licence: string; acceptedOn: string } | null;
  /** For «unos 13.802 dibujos» before the real index arrives. */
  expectedTotal: number;
  /** For «ocupan unos 180 MB», measured rather than sampled. */
  expectedMegabytes: number;
}

const corpus = async () =>
  parsePictogramFetchCorpus(await loadInstruction('pictograms'));

/** Who they can come from, and whether she has accepted (FR-2104/2105). */
export async function publisherState(): Promise<PublisherState> {
  const { publishers, expectedTotal, expectedMegabytes } = await corpus();
  const settings = await loadSettings(pictogramSettingsDir());
  return {
    publishers: publishers.map((p) => ({
      id: p.id, label: p.label, site: p.site,
      licence: p.licence, licenceUrl: p.licenceUrl,
      languages: p.languages, attribution: p.attribution,
    })),
    accepted: settings.pictogramLicence ?? null,
    expectedTotal, expectedMegabytes,
  };
}

/**
 * She accepts (FR-2104). **This is the gate**, recorded before anything is fetched.
 *
 * What she agreed to is stored as accepted rather than looked up later: the text at
 * a publisher can change and Rampa cannot detect that.
 */
export async function acceptLicence(publisherId: string): Promise<boolean> {
  const { publishers } = await corpus();
  const publisher = publishers.find((p) => p.id === publisherId);
  if (!publisher) {
    throw new RampaError('pictogram-no-publisher', 'No tengo de dónde traer pictogramas.');
  }
  const dir = pictogramSettingsDir();
  const settings = await loadSettings(dir);
  await saveSettings(dir, {
    ...settings,
    pictogramLicence: {
      publisher: publisher.id, licence: publisher.licence,
      acceptedOn: new Date().toISOString().slice(0, 10),
    },
  });
  return true;
}

/**
 * She withdraws it (FR-2106).
 *
 * Stops further fetching and **deletes nothing**. What is on her disk she obtained
 * under a licence she accepted at the time; removing it would be Rampa taking back
 * something that was never ours, and it would break every sheet already made.
 */
export async function withdrawLicence(): Promise<boolean> {
  const dir = pictogramSettingsDir();
  const { pictogramLicence: _dropped, ...rest } = await loadSettings(dir);
  await saveSettings(dir, rest);
  return true;
}

/**
 * Record that this folder is the set in use.
 *
 * One function for the folder picker and the download, so they cannot land in
 * different states — the second copy would have been the one that forgets
 * `pictogramas.md`, leaving a colleague who opens the vault with no idea what licence
 * the pictograms carry.
 */
export async function configureSet(root: string, reading: SetReading): Promise<void> {
  if (!reading.set) return;
  const dir = pictogramSettingsDir();
  const settings = await loadSettings(dir);
  const configuredOn = new Date().toISOString().slice(0, 10);
  await saveSettings(dir, {
    ...settings,
    pictogramSet: {
      root,
      ...(reading.set.licence ? { licence: reading.set.licence } : {}),
      summary: reading.summary,
      configuredOn,
    },
  });
  await currentVault().writeRaw('pictogramas.md', pictogramVaultNote({
    folder: basename(root),
    summary: reading.summary,
    licence: reading.set.licence,
    configuredOn,
  }));
}

export interface BringArgs {
  language?: string;
  publisherId?: string;
  onProgress?: (p: { stage: string; detail: string; done: number; total: number }) => void;
  transport?: Transport;
  signal?: AbortSignal;
}

/**
 * The download in flight, so she can stop it (FR-2118).
 *
 * ## Why this module-level variable exists
 *
 * `fetchWholeSet` has taken an `AbortSignal` since it was written, and **nothing ever
 * passed one**: the requirement «a fetch MUST be interruptible» was satisfied in the
 * core and unreachable from the window. That is the same defect as the thirteen unread
 * fields, in its other form — a capability implemented and wired to nothing.
 *
 * One at a time, because two concurrent whole-set downloads into the same folder would
 * fetch everything twice; a second press while one is running stops nothing and starts
 * nothing, and the screen shows the one already going.
 */
let inFlight: AbortController | null = null;

/**
 * What the screen needs to pick up a download in progress (FR-2309).
 *
 * `isBringing()` used to be a bare boolean here, exported, documented «so the screen
 * knows to offer Parar» — and **imported by nothing**. The fifteenth value in this
 * project written by one place and read by nobody, in the same commit whose comments
 * count to fourteen.
 *
 * It is a real requirement, not a nicety: the progress bar and «Parar» live in
 * `PictogramSetSection`'s own state, so navigating out of Configuración and back during
 * a 157 MB download loses both while the fetch continues — and re-enables the button,
 * which is how a second concurrent run became reachable without malice.
 *
 * So the last progress is kept beside the controller, where it survives a screen.
 */
let lastProgress: { done: number; total: number } | null = null;

export interface Bringing {
  running: boolean;
  done: number;
  total: number;
}

export const bringing = (): Bringing => ({
  running: inFlight !== null,
  done: lastProgress?.done ?? 0,
  total: lastProgress?.total ?? 0,
});

/**
 * She pressed «Parar» (FR-2118).
 *
 * Aborting is not a failure: `fetchWholeSet` returns `stopped: true`, what arrived is
 * already a readable set, and pressing again resumes at the cost of what is missing.
 */
export function stopBringing(): boolean {
  if (!inFlight) return false;
  inFlight.abort();
  return true;
}

/**
 * Where the set lives: inside her Rampa folder (FR-2205).
 *
 * Not `userData`, because a set is worth a great deal of her time and the vault is the
 * thing she backs up and copies to a new laptop. And because `018`'s reader takes a
 * path, so this is a path like any other.
 */
const defaultRoot = (): string => join(currentVault().root, 'pictogramas');

const inventoryPath = 'pictogramas.inventario.json';

/** What is on disk and how current it is (FR-2213). */
export async function readInventory(): Promise<SetInventory | null> {
  const raw = await currentVault().readRaw(inventoryPath);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SetInventory;
    return typeof parsed?.publisher === 'string' ? parsed : null;
  } catch { return null; }
}

const writeInventory = (i: SetInventory): Promise<void> =>
  currentVault().writeRaw(inventoryPath, `${JSON.stringify(i, null, 2)}\n`);

/**
 * What the screen shows when she opens it — **and it costs no request** (FR-2209/2210).
 *
 * «Que no me lo vuelva a preguntar salvo que haya una actualización» is a requirement
 * about silence, so the ordinary case has to be answerable from disk alone. Opening this
 * screen a hundred times reaches nobody.
 */
export async function setState(): Promise<{
  status: UpdateStatus; inventory: SetInventory | null; root: string;
}> {
  const inventory = await readInventory();
  return { status: updateStatus(inventory), inventory, root: defaultRoot() };
}

/**
 * **The button** (FR-2201, FR-2203, FR-2206, FR-2207, FR-2208).
 *
 * No word list. `023` asked her to type «casa, perro, comer», which is a task she
 * cannot do well — she does not know which words the next worksheet contains — and
 * Carlos said so twice. One press brings the whole catalogue.
 *
 * The guards are the same three `023` established, minus the one that stopped being
 * needed: nothing is requested until she has accepted the licence (`fetchGate`), the
 * fetch is only ever the result of an action of hers (this is a handler and there is no
 * other caller), and **no word leaves at all** now — a language and numeric ids, which
 * is a shorter privacy story than the machinery `023` needed to bound a word list.
 */
export async function bringPictograms(args: BringArgs = {}): Promise<{
  brought: number; present: number; total: number; failed: number;
  stopped: boolean; lines: string[]; root: string;
}> {
  const corpusData = await corpus();
  const settings = await loadSettings(pictogramSettingsDir());
  const accepted = settings.pictogramLicence;

  const gate = fetchGate(
    corpusData.publishers.map((p) => p.id), accepted, args.publisherId);
  if (!gate.may && gate.because === 'no-publisher') {
    throw new RampaError('pictogram-no-publisher',
      'No tengo de dónde traer pictogramas. Puedes seguir usando una carpeta que ya '
      + 'tengas.');
  }
  const publisher = corpusData.publishers.find((p) => p.id
    === (gate.may ? gate.publisherId : (gate as { publisher: string }).publisher))!;
  if (!gate.may) {
    throw new RampaError('pictogram-not-accepted',
      `Todavía no has aceptado la licencia de ${publisher.label}, así que no he `
      + 'pedido ningún pictograma.');
  }

  /*
   * One at a time, and now actually enforced (from a review, 2026-09-02).
   *
   * The comment above has always said «a second press while one is running stops
   * nothing and starts nothing», and nothing read `inFlight`. Two runs planned the same
   * 13.802 missing ids, doubled the traffic to a public-sector CDN in the school's name,
   * shared one temp filename (so `rename` could publish truncated bytes), and the first
   * run's `finally` cleared the second's controller — which left «Parar» returning false
   * while a download was still going. FR-2118, broken in the case it exists for.
   *
   * Reachable without malice: `bring.busy` is component state, so navigating out of
   * Configuración and back re-enables the button while the fetch continues.
   */
  if (inFlight) {
    throw new RampaError('pictogram-in-progress',
      'Ya los estoy trayendo. Espera a que acabe, o dale a «Parar».');
  }

  const language = args.language ?? 'es';
  const configured = await configuredRoot();
  const root = configured && !configured.missing ? configured.root : defaultRoot();

  /*
   * The disk, before the first byte (FR-2208). The failure this prevents is a set half
   * written on a full disk and a teacher with no idea why her worksheets stopped having
   * pictograms.
   */
  const room = await roomFor(root, corpusData.expectedMegabytes);
  if (room.ok === false) {
    throw new RampaError('vault-unreadable',
      `No me cabe: necesito unos ${room.needMb} MB y te quedan ${room.freeMb} MB. `
      + 'Haz sitio y vuelve a darle — no he escrito nada.');
  }

  args.onProgress?.({
    stage: PICTOGRAM_PROGRESS_STAGE, detail: 'pidiendo la lista completa',
    done: 0, total: corpusData.expectedTotal,
  });

  /*
   * Her signal if she gave one, otherwise ours — so `stopBringing` has something to
   * abort. Cleared in `finally`, because a controller left behind would make the next
   * press look like a download already in progress.
   */
  const controller = new AbortController();
  inFlight = controller;
  lastProgress = { done: 0, total: corpusData.expectedTotal };
  if (args.signal) {
    args.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let result;
  try {
    result = await fetchWholeSet({
      root, publisher, language,
      limits: {
        imageSize: corpusData.imageSize,
        concurrency: corpusData.concurrency,
      },
        transport: args.transport ?? transportFor(gate),
      signal: controller.signal,
      onProgress: (done, total) => {
        // Beside the controller, so a remounted screen can pick it up (FR-2309).
        lastProgress = { done, total };
        args.onProgress?.({
          stage: PICTOGRAM_PROGRESS_STAGE,
          detail: `${done.toLocaleString('es-ES')} de ${total.toLocaleString('es-ES')}`,
          done, total,
        });
      },
    });
  } finally {
    inFlight = null;
    lastProgress = null;
  }

  await writeInventory({
    publisher: publisher.id, language,
    images: result.present + result.brought,
    /*
     * `absent` counts as accounted for (from a review, 2026-09-02).
     *
     * ARASAAC's index lists two ids its CDN does not serve, so a *complete* run left
     * `images` two short of `total` and `updateStatus` reported «te faltan 2» for ever —
     * on the screen whose requirement is to ask her for nothing once she is done.
     * Recorded separately so «no las tiene» stays visible without becoming a chore.
     */
    accountedFor: result.present + result.brought + result.absent,
    total: result.total, highWater: result.highWater,
    broughtOn: new Date().toISOString().slice(0, 10),
  });

  const after = await readSet(root, fsReader);
  if (after.set) await configureSet(root, after);

  return { ...result, lines: describeWholeSet(result, publisher.label), root };
}

/** «Ya tienes los 13.802 pictogramas de ARASAAC.» */
function describeWholeSet(r: {
  brought: number; present: number; total: number; failed: number; stopped: boolean;
}, publisher: string): string[] {
  const n = (x: number) => x.toLocaleString('es-ES');
  const lines: string[] = [];
  const have = r.present + r.brought;

  if (r.brought > 0) lines.push(`He traído ${n(r.brought)} dibujos nuevos.`);
  if (r.present > 0 && r.brought > 0) {
    lines.push(`${n(r.present)} ya los tenías, así que no los he vuelto a pedir.`);
  }
  if (r.stopped) {
    lines.push('Lo he dejado donde me has dicho. Lo que hay ya sirve, y si vuelves a '
      + 'darle sigo por donde iba.');
  } else if (have >= r.total) {
    lines.push(`Ya tienes los ${n(r.total)} pictogramas de ${publisher}. `
      + 'No hace falta volver a bajar nada.');
  } else {
    lines.push(`Tienes ${n(have)} de ${n(r.total)}. Dale otra vez para seguir.`);
  }
  if (r.failed > 0) {
    lines.push(`${n(r.failed)} no han llegado, por la conexión o porque ${publisher} `
      + 'ya no los tiene. Donde falte el dibujo verás la palabra y un hueco marcado.');
  }
  return lines;
}

/**
 * Has the publisher added any? (FR-2211, FR-2212.)
 *
 * **One request**, and only when she asks. Never on launch, never on a timer, never as
 * a side effect of adapting — `023` FR-2107, and the reason `setState` above answers
 * from disk instead of calling this.
 */
export async function checkUpdate(args: { transport?: Transport } = {}): Promise<UpdateStatus> {
  const inventory = await readInventory();
  if (!inventory) return { state: 'unknown' };

  const corpusData = await corpus();
  const publisher = corpusData.publishers.find((p) => p.id === inventory.publisher);
  if (!publisher) return updateStatus(inventory);

  /*
   * **The gate, which this function did not have** (security review, 2026-09-02).
   *
   * Two failures, from one missing line. It reached ARASAAC with no acceptance ever
   * recorded, and it kept reaching it after she withdrew — so `withdrawLicence`'s
   * «stops further fetching» was false.
   *
   * And the language: `fetchWholeSet` refuses one the publisher does not serve *before*
   * requesting, which is what makes «no sale ninguna palabra» true there. This
   * interpolated `inventory.language` straight into the URL — a string read from a vault
   * file the renderer can write. `encodeURIComponent` stopped it restructuring the URL;
   * it did not stop it **carrying a child's name to a third-party server's access log**,
   * which `007` calls the worst outcome in the system.
   *
   * Both are now checked here, and the transport comes from the gate so a future caller
   * cannot skip either.
   */
  if (!publisher.languages.includes(inventory.language)) {
    logger.warn('pictograms.inventory-language-rejected', { publisher: publisher.id });
    return updateStatus(inventory);
  }
  const settings = await loadSettings(pictogramSettingsDir());
  const gate = fetchGate(
    corpusData.publishers.map((p) => p.id), settings.pictogramLicence, inventory.publisher);
  if (!gate.may) return updateStatus(inventory);

  const transport = args.transport ?? transportFor(gate);
  const index = readIndex(await transport.json(
    urlFor(publisher.index, { lang: inventory.language })));
  if (index.length === 0) return updateStatus(inventory);

  let highWater = '';
  for (const e of index) if (e.updated > highWater) highWater = e.updated;
  return updateStatus(inventory, { total: index.length, highWater });
}

/** She said no. Not offered again until the index moves further (FR-2212). */
export async function declineUpdate(highWater: string): Promise<boolean> {
  const inventory = await readInventory();
  if (!inventory) return false;
  await writeInventory({ ...inventory, declined: highWater });
  return true;
}


/* ── Her vocabulary: the word with four pictures (024 US2) ────────────────── */

const vocabularyPath = 'vocabulario.md';

/**
 * Her vocabulary, read from the file she can read (FR-2214).
 *
 * A missing file is an empty vocabulary, not an error: she has chosen nothing yet, and
 * every ambiguous word is still correctly reported as ambiguous.
 */
export async function loadVocabulary(vault?: Vault): Promise<Vocabulary> {
  /*
   * The vault is a **parameter** since `031`, defaulting to the open one.
   *
   * `staleSheets(vault, jobId)` takes its vault so it can be tested offline against a
   * temporary folder, and the freshness ladder it now builds needs the vocabulary. Left
   * reaching for `currentVault()`, this made an offline-testable function depend on a
   * global somebody had to have opened — which is how a test suite quietly stops being
   * able to run the thing it tests.
   */
  const raw = await (vault ?? currentVault()).readRaw(vocabularyPath);
  return raw ? parseVocabulary(raw, vocabularyPath) : emptyVocabulary();
}

/**
 * Her vocabulary, as `matchWord` wants it. One place, so the four rungs cannot disagree.
 */
export const chosenWords = async (
  language: string, vault?: Vault,
): Promise<ReadonlyMap<string, string>> => forLanguage(await loadVocabulary(vault), language);

/**
 * The words a set cannot decide, with their candidates (FR-2217).
 *
 * Popularity-ordered, because that is the only ordering that is a fact rather than an
 * opinion — and it must not be mistaken for a recommendation. `018` FR-1609 still gives
 * an unchosen word **no** pictogram; this exists so she can answer the question, not so
 * something can answer it for her.
 *
 * `image` is a `data:` URI, because FR-2217 says she sees pictures. An id is not
 * something a person can choose between.
 */
export interface WordChoice {
  word: string;
  chosen?: string;
  candidates: Array<{ id: string; image: string | null }>;
}

export async function candidatesFor(args: {
  words: string[]; language?: string;
}): Promise<WordChoice[]> {
  const language = args.language ?? 'es';
  const set = await currentPictogramSet();
  if (!set) return [];

  const vocabulary = await loadVocabulary();
  const names = await nameWordSet();
  const out: WordChoice[] = [];

  for (const word of args.words) {
    const key = normalise(word);
    if (!key || names.has(key)) continue;   // a name is never offered a pictogram

    const found = set.byLanguage.get(language)?.get(key) ?? [];
    // Only the genuinely ambiguous: one candidate needs no decision, and none is the
    // ordinary case for most words in most sentences.
    if (found.length < 2) continue;

    /*
     * Most-used first (`024` FR-2217, decision P41).
     *
     * The requirement and US2 both say «largest-used first», and T017 was ticked as
     * «popularity-ordered» — but `mergeSet` discarded the number when it wrote the
     * metadata, so the data was not on disk, and this function returned the ids in
     * whatever order the file happened to hold (lexicographic by id). She saw the
     * four drawings of «casa» in an arbitrary order, under a comment claiming
     * otherwise.
     *
     * By id as the tie-break, so a set with no popularity at all still has a
     * **stable** order — an arbitrary order that changes between openings is worse
     * than an arbitrary order that does not.
     */
    const ids = mostUsedFirst(found, set.popularity);

    const images = await pictogramImagesFor(ids);
    out.push({
      word: key,
      ...(chosenFor(vocabulary, language, key)
        ? { chosen: chosenFor(vocabulary, language, key)! } : {}),
      candidates: ids.map((id) => ({ id, image: images.get(id) ?? null })),
    });
  }
  return out;
}

/**
 * She picks one (FR-2214). **FR-2218 is NOT implemented** — see below.
 *
 * Recorded **once, for every learner** — «lo bajo una vez y lo uso para todos los que
 * lo necesiten».
 *
 * ## What this does not do, and what used to be claimed here
 *
 * This comment said «every sheet made from the previous answer is marked stale rather
 * than rewritten: `005` FR-520's rule». That was false. Staleness (`jobs/stale.ts`)
 * compares `readingFingerprint(parseIR(ir.md))` against each sheet's recorded reading,
 * and a vocabulary change does not touch `ir.md` — so every sheet made with the old
 * pictogram still reports `fresh`.
 *
 * Worse, the same claim was on screen and **written into her own vault file**, where it
 * outlives Rampa. Found by an independent review, not by a test, and `previous` below
 * existed only to fill a log field — which is what a requirement satisfied by nobody
 * looks like from the inside.
 *
 * Reopened as backlog G35. It is computable: `data-picto` already records word→id per
 * block, so a sheet whose recorded id for a word differs from the current answer is
 * stale. Until it exists, the screen and the file say what actually happens.
 */
export async function chooseWord(args: {
  word: string; id: string; language?: string;
}): Promise<boolean> {
  const language = args.language ?? 'es';
  const before = await loadVocabulary();
  const previous = chosenFor(before, language, args.word);
  const after = choose(before, language, args.word, args.id);
  if (after === before) return false;   // not an id, or not a word

  await currentVault().writeRaw(vocabularyPath, renderVocabulary(after));
  logger.info('pictograms.word-chosen', {
    language, id: args.id, changed: previous !== undefined && previous !== args.id,
  });
  return true;
}

/** She unpicks it, and the word goes back to being reported as ambiguous. */
export async function unchooseWord(args: {
  word: string; language?: string;
}): Promise<boolean> {
  const language = args.language ?? 'es';
  const before = await loadVocabulary();
  const after = unchoose(before, language, args.word);
  if (after === before) return false;
  await currentVault().writeRaw(vocabularyPath, renderVocabulary(after));
  return true;
}

/**
 * Every choice she has made, for review (024 FR-2214 finished by 025 FR-2308).
 *
 * Until now her vocabulary could only be *answered* — the chooser appeared on a report
 * that had just skipped a word. There was no way to see what she had chosen or change
 * her mind, which made it a file she owned and could not read from inside Rampa. That
 * is the same half-built shape as `profile.pictograms.overrides`, which sat in the
 * schema for a month with no screen.
 */
export async function chosenSoFar(language = 'es'): Promise<WordChoice[]> {
  const vocabulary = await loadVocabulary();
  const chosen = forLanguage(vocabulary, language);
  if (chosen.size === 0) return [];

  const set = await currentPictogramSet();
  const out: WordChoice[] = [];
  for (const [word, id] of [...chosen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    /*
     * Every candidate, not only the one she picked — because the point of reviewing is
     * changing her mind, and that needs the alternatives beside it. Where the set is
     * gone, her choice is still shown: it is hers, and `018` FR-1616 already renders the
     * missing image as a named gap rather than pretending the decision never happened.
     */
    const ids = set?.byLanguage.get(language)?.get(word) ?? [id];
    const images = await pictogramImagesFor(ids.includes(id) ? ids : [...ids, id]);
    out.push({
      word, chosen: id,
      candidates: [...new Set([...ids, id])].map((c) => ({
        id: c, image: images.get(c) ?? null,
      })),
    });
  }
  return out;
}
