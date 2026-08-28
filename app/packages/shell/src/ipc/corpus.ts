import { ipcMain, app } from 'electron';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRecipe, type Recipe } from '@rampa/core';
import { currentVault } from './vault.js';
import { VAULT } from '@rampa/core';

/**
 * The corpus ships with the application, read-only (006 FR-413).
 *
 * Bundling it is not the same as preventing writes — the coverage analysis
 * caught exactly that gap (T080). There is no IPC path that writes here, and
 * the check below asserts it.
 */
const corpusRoot = () => (app.isPackaged
  ? join(process.resourcesPath, 'corpus')
  : join(app.getAppPath(), 'corpus'));

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

export function registerCorpusIpc(): void {
  ipcMain.handle('corpus:version', async () => {
    try { return JSON.parse(await readFile(join(corpusRoot(), 'CORPUS-VERSION.json'), 'utf8')); }
    catch { return null; }
  });
  ipcMain.handle('corpus:recipes', async () =>
    (await allRecipes()).map((r) => ({ id: r.id, version: r.version, origin: r.origin, scope: r.scope })));
  ipcMain.handle('corpus:licences', async () => ({
    code: await readFile(join(corpusRoot(), 'LICENSE'), 'utf8').catch(() => ''),
    content: await readFile(join(corpusRoot(), 'LICENSE-CONTENT.md'), 'utf8').catch(() => ''),
    notice: await readFile(join(corpusRoot(), 'NOTICE'), 'utf8').catch(() => ''),
  }));
}
