import { join } from 'node:path';
import {
  readSet, pictogramVaultNote, parsePictogramFetchCorpus, RampaError, fetchGate,
  updateStatus, readIndex, urlFor, logger, normalise,
  parseVocabulary, renderVocabulary, emptyVocabulary, choose, unchoose, chosenFor,
  forLanguage,
  type SetReading, type SetInventory, type UpdateStatus, type Vocabulary,
} from '@rampa/core';
import { basename } from 'node:path';
import { loadInstruction } from '../corpus/index.js';
import { loadSettings, saveSettings } from '../ipc/vault-settings.js';
import { currentVault } from '../ipc/vault.js';
import {
  pictogramSettingsDir, configuredRoot, fsReader, currentPictogramSet,
  pictogramImagesFor,
} from './access.js';
import { nameWordSet } from '../ipc/names.js';
import {
  fetchWholeSet, roomFor, httpTransport, type Transport,
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
  onProgress?: (stage: string, detail: string) => void;
  transport?: Transport;
  signal?: AbortSignal;
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

  args.onProgress?.('Trayendo pictogramas', 'pidiendo la lista completa');
  const result = await fetchWholeSet({
    root, publisher, language,
    limits: {
      imageSize: corpusData.imageSize,
      concurrency: corpusData.concurrency,
    },
    ...(args.transport ? { transport: args.transport } : {}),
    ...(args.signal ? { signal: args.signal } : {}),
    onProgress: (done, total) => args.onProgress?.('Trayendo pictogramas',
      `${done.toLocaleString('es-ES')} de ${total.toLocaleString('es-ES')}`),
  });

  await writeInventory({
    publisher: publisher.id, language,
    images: result.present + result.brought,
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

  const transport = args.transport ?? httpTransport;
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
export async function loadVocabulary(): Promise<Vocabulary> {
  const raw = await currentVault().readRaw(vocabularyPath);
  return raw ? parseVocabulary(raw, vocabularyPath) : emptyVocabulary();
}

/**
 * Her vocabulary, as `matchWord` wants it. One place, so the four rungs cannot disagree.
 */
export const chosenWords = async (
  language: string,
): Promise<ReadonlyMap<string, string>> => forLanguage(await loadVocabulary(), language);

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

    const ids = set.byLanguage.get(language)?.get(key) ?? [];
    // Only the genuinely ambiguous: one candidate needs no decision, and none is the
    // ordinary case for most words in most sentences.
    if (ids.length < 2) continue;

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
 * She picks one (FR-2214, FR-2218).
 *
 * Recorded **once, for every learner** — «lo bajo una vez y lo uso para todos los que
 * lo necesiten». And every sheet made from the previous answer is marked stale rather
 * than rewritten: `005` FR-520's rule, because a document that changed under her
 * without saying so is worse than one she has to remake.
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
