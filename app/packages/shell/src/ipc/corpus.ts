import { app, shell } from 'electron';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseRecipe, parseAxisDefs, coversAllAxes, logger, RampaError, type Recipe,
  loadCatalogue, freshness, monthsSince, recommend, type ServiceEntry,
  loadEducationSystems, findYear, type FoundYear,
  type Answers, type Jurisdiction,
} from '@rampa/core';
import { ADAPTER_IDS, checkForUpdate } from '@rampa/providers';
import { currentVault } from './vault.js';
import { VAULT } from '@rampa/core';
import { handle } from './wrap.js';

/**
 * The corpus ships with the application, read-only (006 FR-413).
 *
 * Bundling it is not the same as preventing writes — the coverage analysis
 * caught exactly that gap (T080). There is no IPC path that writes here, and
 * `packages/shell/test/corpus-guarantees.test.ts` asserts it.
 *
 * ## Where the bundle actually is
 *
 * `app.getAppPath()` is the directory of the entry script — `out/main` when the
 * app is started from its built main process — so joining 'corpus' onto it
 * pointed at a directory that has never existed. The failure was silent and
 * total: **zero recipes loaded**, so an adaptation would run with no judgement
 * layer at all and produce plausible output with none of the guards. Found by
 * launching the app; no typecheck or unit test could see it.
 *
 * So: look in the packaged location, then walk up from the entry point. Failing
 * loudly would be better than failing silently, which is what `assertCorpus`
 * below is for.
 */
function corpusRoot(): string {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'corpus')]
    : [
        join(app.getAppPath(), 'corpus'),
        join(app.getAppPath(), '..', 'corpus'),        // out/main -> out
        join(app.getAppPath(), '..', '..', 'corpus'),  // out/main -> app
        join(process.cwd(), 'corpus'),
      ];
  for (const c of candidates) {
    if (existsSync(join(c, 'recipes'))) return c;
  }
  // Nothing found: return the first candidate so the error names a real path.
  return candidates[0]!;
}

/**
 * A missing corpus is not a degraded mode, it is a broken installation.
 *
 * Adapting with no recipes would still produce a document — a plausible one,
 * with every guard absent. That is the exact failure this project exists to
 * prevent, so it must stop the job rather than quietly proceed.
 */
export async function assertCorpus(): Promise<void> {
  const recipes = await allRecipes();
  if (recipes.length === 0) {
    throw new RampaError('corpus-missing',
      'No encuentro las reglas de adaptación. Es un problema de la instalación, no tuyo: ' +
      'vuelve a instalar Rampa.');
  }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try { entries = await readdir(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

export async function loadCorpus(): Promise<Recipe[]> {
  const root = join(corpusRoot(), 'recipes');
  const files = await walk(root);
  const recipes: Recipe[] = [];
  for (const f of files) {
    if (f.endsWith('README.md')) continue;
    const origin = f.includes('/conflicts/') ? 'conflict' : f.includes('/lang/') ? 'lang' : 'core';
    const r = parseRecipe(await readFile(f, 'utf8'), f.slice(root.length + 1), origin);
    if (r) recipes.push(r);
  }
  return recipes;
}

/** Local overrides live in the vault and are loaded AFTER the corpus (006 FR-415). */
export async function loadLocalOverrides(): Promise<Recipe[]> {
  const vault = currentVault();
  const files = await vault.list(VAULT.recipesLocal);
  const out: Recipe[] = [];
  for (const f of files) {
    if (!f.endsWith('.md') || f === 'README.md') continue;
    const raw = await vault.readRaw(`${VAULT.recipesLocal}/${f}`);
    if (!raw) continue;
    const r = parseRecipe(raw, f, 'local');
    if (r) out.push(r);
  }
  return out;
}

/** Local overrides win over a bundled recipe with the same id. */
export async function allRecipes(): Promise<Recipe[]> {
  const bundled = await loadCorpus();
  const local = await loadLocalOverrides();
  const byId = new Map(bundled.map((r) => [r.id, r]));
  for (const r of local) byId.set(r.id, r);
  return [...byId.values()];
}

/**
 * The judgement layer, read from the bundled corpus rather than hardcoded here.
 *
 * Principle I: a rule about *how to adapt* that lives in TypeScript is misplaced,
 * because a teacher cannot read or correct it. The application orchestrates; the
 * corpus judges. `instructions/README.md` states the boundary.
 */
export async function loadInstruction(name: string): Promise<string> {
  if (!/^[a-z-]+$/.test(name)) throw new Error(`Bad instruction name: ${name}`);
  return readFile(join(corpusRoot(), 'instructions', `${name}.md`), 'utf8');
}

/**
 * The service catalogue (009 T014).
 *
 * Read from the bundled corpus on every call rather than cached: `today` decides
 * whether a service is still offered, and a running application crosses
 * midnight. Caching the result would mean a build that has been open since
 * yesterday still offers a service whose facts turned a year old overnight.
 */
export async function loadServices(today = new Date()): Promise<ServiceEntry[]> {
  const dir = join(corpusRoot(), 'instructions', 'providers');
  const files = await walk(dir);
  const raw = await Promise.all(
    files.filter((f) => !f.endsWith('README.md')).map(async (f) => ({
      path: f.slice(corpusRoot().length + 1),
      raw: await readFile(f, 'utf8'),
    })),
  );
  const catalogue = loadCatalogue(raw, { available: ADAPTER_IDS, today });
  if (catalogue.length === 0) {
    // Not thrown: the connection screen must still render and say what is wrong.
    // But loud, because an empty catalogue means she cannot connect at all.
    logger.error('corpus.services-empty', { dir, filesFound: files.length });
  }
  return catalogue;
}

/**
 * One year, across every system the corpus ships (011).
 *
 * Ids are namespaced by system (`es:primaria-5`), so a scan across systems cannot
 * return the wrong country's year — and a profile keeps working when a second
 * system is added.
 */
export async function findYearInCorpus(yearId: string): Promise<FoundYear | null> {
  const dir = join(corpusRoot(), 'instructions', 'education');
  const files = await walk(dir);
  const raw = await Promise.all(
    files.filter((f) => !f.endsWith('README.md')).map(async (f) => ({
      path: f.slice(corpusRoot().length + 1),
      raw: await readFile(f, 'utf8'),
    })),
  );
  for (const system of loadEducationSystems(raw)) {
    const found = findYear(system, yearId);
    if (found) return found;
  }
  return null;
}

export const loadChecklist = async (name: string): Promise<string> =>
  readFile(join(corpusRoot(), 'checklists', `${name}.md`), 'utf8').catch(() => '');

export function registerCorpusIpc(): void {
  handle('corpus:instruction', async (name: string) => loadInstruction(name));

  /** The axis descriptors a teacher can correct (spec 010 T014). */
  handle('corpus:axes', async () => {
    const defs = parseAxisDefs(await loadInstruction('axes'), 'axes.md');
    if (!coversAllAxes(defs)) {
      logger.warn('corpus.axes-incomplete', { found: defs.length });
    }
    return defs;
  });
  handle('corpus:checklist', async (name: string) => loadChecklist(name));

  /**
   * The services she can choose from, with their facts dated (009 T014, FR-706).
   *
   * The staleness marker is computed here rather than in the renderer so that
   * "comprobado hace N meses" is derived from the same `today` that decided
   * whether to offer the service — two clocks would eventually disagree and the
   * disagreement would show as a service offered with no marker, or a marker on
   * a service that is no longer offered.
   */
  handle('corpus:services', async () => {
    const today = new Date();
    return (await loadServices(today)).map((s) => ({
      id: s.id, label: s.label, vendor: s.vendor,
      requiresCard: s.requiresCard, freeTier: s.freeTier, vision: s.vision,
      keyUrl: s.keyUrl, keyPrefixes: s.keyPrefixes,
      costCents: s.costCents, costMeasured: s.costMeasured,
      processedIn: s.processedIn, jurisdiction: s.jurisdiction,
      trainsOnInput: s.trainsOnInput,
      quality: s.quality, provisionalRank: s.provisionalRank,
      suits: s.suits, signupFirst: s.signupFirst,
      lastChecked: s.lastChecked,
      freshness: freshness(s.lastChecked, today),
      monthsSinceChecked: monthsSince(s.lastChecked, today),
      intro: s.intro, steps: s.steps, troubleshooting: s.troubleshooting,
      // `model`, `endpoint`, `adapter` and `quirks` are deliberately absent:
      // FR-702 says she never sees a model name, and the endpoint has no reason
      // to cross into the renderer at all.
    }));
  });

  handle('corpus:version', async () => {
    try { return JSON.parse(await readFile(join(corpusRoot(), 'CORPUS-VERSION.json'), 'utf8')); }
    catch { return null; }
  });
  handle('corpus:recipes', async () =>
    (await allRecipes()).map((r) => ({ id: r.id, version: r.version, origin: r.origin, scope: r.scope })));
  /**
   * The recommendation (009 T007/T015).
   *
   * Computed in the main process rather than in the renderer, because the rule
   * lives in `@rampa/core` where it is deterministic, offline and covered by 21
   * tests. Reimplementing it in the renderer to save an IPC hop would be a
   * second copy of the one piece of logic in this feature that is wrong in ways
   * nobody notices.
   *
   * Nothing is stored: a corpus update changes the answer with no state to
   * invalidate.
   */
  handle('corpus:recommend', async (answers: unknown) => {
    const a = (answers ?? {}) as { canUseCard?: unknown; locationConstraint?: unknown };
    const parsed: Answers = {
      canUseCard: a.canUseCard === true,
      locationConstraint: (['eu', 'us', 'other', 'varies'] as const)
        .includes(a.locationConstraint as Jurisdiction)
        ? (a.locationConstraint as Jurisdiction)
        : undefined,
    };
    const today = new Date();
    const outcome = recommend(await loadServices(today), parsed, today);
    return outcome.ok
      ? { ok: true, serviceId: outcome.service.id, reason: outcome.reason,
          alternativeIds: outcome.alternatives.map((s) => s.id) }
      : { ok: false, because: outcome.because, message: outcome.message, suggestion: outcome.suggestion };
  });

  /**
   * Open a provider's key page in her browser (009 T016).
   *
   * **The URL is not taken from the renderer.** It is looked up in the
   * catalogue by service id, and only a URL that a reviewed corpus file
   * declares can ever be opened. Passing a URL across this boundary and
   * opening it would make the renderer able to launch anything — the same
   * class of hole as letting a teacher type an endpoint, which the whole
   * catalogue format exists to close (007 FR-511).
   *
   * `window.open` was what the previous step used, and in a hardened renderer
   * that either does nothing or opens a second Electron window that looks like
   * the application has broken.
   */
  handle('corpus:openKeyPage', async (serviceId: unknown) => {
    const id = String(serviceId ?? '');
    const service = (await loadServices()).find((s) => s.id === id);
    if (!service) {
      logger.warn('corpus.openKeyPage.unknown', { id });
      return false;
    }
    const url = new URL(service.keyUrl);
    // Belt and braces: the parser already requires https, and a catalogue entry
    // is reviewed, but this is the one call that leaves the application.
    if (url.protocol !== 'https:') {
      logger.warn('corpus.openKeyPage.refused', { id, protocol: url.protocol });
      return false;
    }
    await shell.openExternal(url.toString());
    return true;
  });

  /**
   * The one action that updates the corpus (006 T073, FR-414).
   *
   * The corpus ships inside the release, so this is a release check. **Only ever
   * reached from a button she presses** — an automatic check on launch would be
   * a scheduled phone-home from a machine handling children's data, which is
   * exactly what a school's data protection officer objects to.
   *
   * It reads and reports. It downloads nothing, replaces nothing, and **does not
   * touch the vault** — which FR-414 requires and which is true here by
   * construction, because this handler has no vault reference at all.
   */
  handle('corpus:checkForUpdate', async () => checkForUpdate(app.getVersion()));

  /**
   * The education systems she can choose from (011 T010).
   *
   * Read from the bundle like the axis descriptors and the provider catalogue.
   * A malformed file is simply not in the list, having already logged.
   */
  handle('corpus:educationSystems', async () => {
    const dir = join(corpusRoot(), 'instructions', 'education');
    const files = await walk(dir);
    const raw = await Promise.all(
      files.filter((f) => !f.endsWith('README.md')).map(async (f) => ({
        path: f.slice(corpusRoot().length + 1),
        raw: await readFile(f, 'utf8'),
      })),
    );
    const systems = loadEducationSystems(raw);
    if (systems.length === 0) logger.error('corpus.education-empty', { dir, filesFound: files.length });
    return systems;
  });

  handle('corpus:licences', async () => ({
    code: await readFile(join(corpusRoot(), 'LICENSE'), 'utf8').catch(() => ''),
    content: await readFile(join(corpusRoot(), 'LICENSE-CONTENT.md'), 'utf8').catch(() => ''),
    notice: await readFile(join(corpusRoot(), 'NOTICE'), 'utf8').catch(() => ''),
  }));
}
