import { join } from 'node:path';
import {
  readSet, pictogramVaultNote, parsePictogramFetchCorpus, RampaError,
  wordListOf, describeOutcome, fetchGate, type SetReading, type FetchOutcome,
} from '@rampa/core';
import { basename } from 'node:path';
import { loadInstruction } from '../corpus/index.js';
import { loadSettings, saveSettings } from '../ipc/vault-settings.js';
import { currentVault } from '../ipc/vault.js';
import { nameWordSet } from '../ipc/names.js';
import { pictogramSettingsDir, configuredRoot, fsReader } from './access.js';
import { fetchPictograms, type Transport } from './download.js';

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
  wordsPerFetch: number;
}

const corpus = async () =>
  parsePictogramFetchCorpus(await loadInstruction('pictograms'));

/** Who they can come from, and whether she has accepted (FR-2104/2105). */
export async function publisherState(): Promise<PublisherState> {
  const { publishers, wordsPerFetch } = await corpus();
  const settings = await loadSettings(pictogramSettingsDir());
  return {
    publishers: publishers.map((p) => ({
      id: p.id, label: p.label, site: p.site,
      licence: p.licence, licenceUrl: p.licenceUrl,
      languages: p.languages, attribution: p.attribution,
    })),
    accepted: settings.pictogramLicence ?? null,
    wordsPerFetch,
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
  words: string[];
  language?: string;
  publisherId?: string;
  root?: string;
  onProgress?: (stage: string, detail: string) => void;
  transport?: Transport;
  signal?: AbortSignal;
}

/**
 * **The button** (FR-2107/2111/2114/2117).
 *
 * Every guard that has to hold before a byte moves, and all three are here rather
 * than in the renderer — a gate in a caller is a gate the second caller walks past:
 *
 * 1. **She has accepted this publisher's licence.** Refused otherwise.
 * 2. **The word list is built here**, by `wordListOf`, which removes the names Rampa
 *    knows (FR-2109). The renderer sends raw words; what may leave is decided here.
 * 3. **Only what she asked for**, bounded by the corpus, and the bound reported.
 *
 * There is no timer, no launch hook and no call from `jobs/adapt.ts`: FR-2107 says
 * every fetch is the direct result of an action she took, and the way to keep that
 * true is for this to be the only way in.
 */
export async function bringPictograms(args: BringArgs): Promise<{
  outcome: FetchOutcome; lines: string[]; root: string;
}> {
  const { publishers, wordsPerFetch } = await corpus();
  const settings = await loadSettings(pictogramSettingsDir());
  const accepted = settings.pictogramLicence;

  /*
   * The gate is `fetchGate` in `core` and not an `if` here, so that «nothing is
   * fetched before she accepts» can be asserted in the offline suite against a
   * transport that fails when called. This function reaches the vault, the settings
   * and the encrypted name map, so it cannot run there — and a guarantee asserted
   * only through Electron is a guarantee asserted nowhere.
   */
  const gate = fetchGate(publishers.map((p) => p.id), accepted, args.publisherId);
  if (!gate.may && gate.because === 'no-publisher') {
    throw new RampaError('pictogram-no-publisher',
      'No tengo de dónde traer pictogramas. Puedes seguir usando una carpeta que ya '
      + 'tengas.');
  }
  const publisher = publishers.find((p) => p.id
    === (gate.may ? gate.publisherId : (gate as { publisher: string }).publisher))!;
  if (!gate.may) {
    throw new RampaError('pictogram-not-accepted',
      `Todavía no has aceptado la licencia de ${publisher.label}, así que no he `
      + 'pedido ningún pictograma.');
  }

  /*
   * Where they land: the folder she already configured, or one inside the vault.
   *
   * Inside the vault rather than in `userData`, because a set is worth a great deal
   * of her time and the vault is the thing she backs up — and because `018`'s reader
   * takes a path, so this is a path like any other.
   */
  const configured = await configuredRoot();
  const root = args.root ?? (configured && !configured.missing
    ? configured.root
    : join(currentVault().root, 'pictogramas'));

  const language = args.language ?? 'es';
  const before = await readSet(root, fsReader);

  const outcome = await fetchPictograms({
    root, publisher,
    list: wordListOf(args.words, { language, names: await nameWordSet() }),
    limits: { wordsPerFetch },
    present: before.set?.byLanguage.get(language),
    images: before.set?.images,
    ...(args.transport ? { transport: args.transport } : {}),
    ...(args.signal ? { signal: args.signal } : {}),
    onProgress: (done, total, word) =>
      args.onProgress?.('Trayendo pictogramas', `${done + 1} de ${total}: «${word}»`),
  });

  /*
   * Configured on success, so a fetch that landed something is usable without her
   * finding a second button. If it landed nothing, a folder she assembled by hand is
   * left exactly as it was (FR-2103).
   */
  if (outcome.found.length > 0 && !configured) {
    const after = await readSet(root, fsReader);
    if (after.set) await configureSet(root, after);
  }

  return { outcome, lines: describeOutcome(outcome, publisher.label), root };
}
