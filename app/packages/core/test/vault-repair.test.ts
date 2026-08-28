import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault } from '../src/vault/io.js';
import { loadLearner, appendNote, loadRoster } from '../src/vault/profile.js';
import { parseFrontMatter } from '../src/vault/parse.js';
import { resolveInVault } from '../src/vault/paths.js';
import { generateCode, validateCode, looksLikeInitials } from '../src/vault/codes.js';

/**
 * 006 FR-410: a hand-edit that breaks the structure is OUR defect, not the
 * teacher's mistake. Nothing here may reject a file or lose her words.
 */
let root: string;
let vault: Vault;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'rampa-vault-'));
  vault = new Vault(root);
  await mkdir(join(root, 'profiles', 'A3'), { recursive: true });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('the vault survives a teacher', () => {
  it('keeps every word when the YAML is broken', async () => {
    await writeFile(join(root, 'profiles/A3/profile.yaml'),
      '---\naxes:\n  COG: 3\n   DEC: [unclosed\n---\nLo que escribi a mano.\n');
    const loaded = await loadLearner(vault, 'A3');
    expect(loaded.repairs.length).toBeGreaterThan(0);
    expect(loaded.repairs[0]!.message).toContain('No he borrado nada');
    const raw = await readFile(join(root, 'profiles/A3/profile.yaml'), 'utf8');
    expect(raw).toContain('Lo que escribi a mano.');   // nothing rewritten on read
  });

  it('preserves unknown keys instead of dropping them', async () => {
    await writeFile(join(root, 'profiles/A3/profile.yaml'),
      '---\ncode: A3\naxes:\n  COG: 3\nmi_campo_propio: algo que me importa\n---\n');
    const { data } = parseFrontMatter(await readFile(join(root, 'profiles/A3/profile.yaml'), 'utf8'));
    expect(data['mi_campo_propio']).toBe('algo que me importa');
    const loaded = await loadLearner(vault, 'A3');
    expect(loaded.profile.axes['COG']).toBe(3);
  });

  it('sets an out-of-range axis aside rather than rejecting the file', async () => {
    await writeFile(join(root, 'profiles/A3/profile.yaml'), '---\ncode: A3\naxes:\n  COG: 9\n---\n');
    const loaded = await loadLearner(vault, 'A3');
    expect(loaded.repairs.some((r) => r.what.startsWith('field-set-aside'))).toBe(true);
    expect(loaded.profile._unparsed).toBeDefined();
  });

  it('NEVER turns a missing axis into 0', async () => {
    await writeFile(join(root, 'profiles/A3/profile.yaml'), '---\ncode: A3\naxes:\n  COG: 3\n---\n');
    const { profile } = await loadLearner(vault, 'A3');
    expect(profile.axes['DEC']).toBeUndefined();     // absent, not zero
    expect(profile.axes['COG']).toBe(3);
  });

  it('reads a learner with no profile at all without failing', async () => {
    const loaded = await loadLearner(vault, 'ZZ9');
    expect(loaded.profile.code).toBe('ZZ9');
    expect(loaded.notes).toBe('');
  });

  it('appends notes without touching what was already written', async () => {
    await appendNote(vault, 'A3', 'Casillas', 'Las cuenta como tareas.');
    await appendNote(vault, 'A3', 'Primer item', 'Con el primero hecho arranca sola.');
    const notes = await readFile(join(root, 'profiles/A3/notes.md'), 'utf8');
    expect(notes).toContain('Las cuenta como tareas.');
    expect(notes).toContain('Con el primero hecho arranca sola.');
  });

  it('reads a roster that is not there', async () => {
    const { roster } = await loadRoster(vault);
    expect(roster.learners).toEqual([]);
  });
});

describe('writes stay inside the vault', () => {
  it('refuses an escaping path rather than sanitising it', () => {
    expect(() => resolveInVault(root, '../../etc/passwd')).toThrow(/outside the vault/);
    expect(() => resolveInVault(root, '/etc/passwd')).toThrow(/outside the vault/);
  });
  it('allows ordinary paths', () => {
    expect(resolveInVault(root, 'profiles/A3/profile.yaml')).toContain('profiles');
  });
});

describe('learner codes are generated, never initials', () => {
  it('generates opaque codes', () => {
    const c = generateCode();
    expect(c).toMatch(/^[A-Z][2-9][2-9]$/);
    expect(looksLikeInitials(c)).toBe(false);
  });
  it('rejects initials, because initials identify a child', () => {
    expect(validateCode('LG').ok).toBe(false);
    expect(validateCode('LG').warning).toContain('iniciales');
    expect(validateCode('A33').ok).toBe(true);
  });
});
