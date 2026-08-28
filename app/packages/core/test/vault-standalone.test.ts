import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault } from '../src/vault/io.js';
import { saveProfile, appendNote, saveRoster } from '../src/vault/profile.js';

/**
 * 006 FR-408: the vault must stay complete and usable with no application
 * present. It is what makes the tool safe to adopt - a teacher who believes her
 * records are trapped inside a program will not put real work into them.
 *
 * This requirement had no test at all until the coverage analysis found it (T079).
 */
let root: string; let vault: Vault;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'rampa-standalone-')); vault = new Vault(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('the vault outlives the application', () => {
  it('is plain text a person can read, with no binary format anywhere', async () => {
    await saveRoster(vault, { academic_year: '2026-27', setting: 'centro-1',
      learners: [{ code: 'A3', stage: 'primaria', year_group: '5', group: 'B', subjects: [], status: 'active' }] });
    await saveProfile(vault, {
      code: 'A3', axes: { COG: 3, DEC: 2 }, works: ['Un ejercicio por pagina'],
      avoid: ['Tareas con reloj'], interests: [], response: {}, language: { instruction: 'es' },
    });
    await appendNote(vault, 'A3', 'Casillas', 'Las cuenta como tareas.');

    const files: string[] = [];
    const walk = async (d: string): Promise<void> => {
      for (const e of await readdir(join(root, d), { withFileTypes: true })) {
        const p = d ? `${d}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(p); else files.push(p);
      }
    };
    await walk('');

    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f, 'every vault file is markdown or YAML').toMatch(/\.(md|yaml|yml|json)$/);
      const content = await readFile(join(root, f), 'utf8');
      expect(content.includes('\u0000'), `${f} is text, not binary`).toBe(false);
    }
  });

  it('keeps the profile readable as YAML without any Rampa code', async () => {
    await saveProfile(vault, {
      code: 'A3', axes: { COG: 3 }, works: [], avoid: [], interests: [], response: {}, language: {},
    });
    const raw = await readFile(join(root, 'profiles/A3/profile.yaml'), 'utf8');
    expect(raw).toContain('code: A3');
    expect(raw).toContain('COG: 3');
  });

  it('keeps notes readable as prose', async () => {
    await appendNote(vault, 'A3', 'Primer item', 'Con el primero hecho arranca sola.');
    const raw = await readFile(join(root, 'profiles/A3/notes.md'), 'utf8');
    expect(raw).toMatch(/## \d{4}-\d{2}-\d{2} . Primer item/);
    expect(raw).toContain('Con el primero hecho arranca sola.');
  });
});
