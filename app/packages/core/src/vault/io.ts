import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveInVault } from './paths.js';
import { parseFrontMatter, stringifyFrontMatter, type Parsed, type Repair } from './parse.js';

/**
 * All vault access goes through here, and here alone resolves paths. That is
 * what makes "writes confined to the vault" a property of one module rather
 * than a rule everybody has to remember (007 FR-508).
 */
export class Vault {
  constructor(readonly root: string) {}

  async readRaw(relPath: string): Promise<string | null> {
    const abs = resolveInVault(this.root, relPath);
    try { return await readFile(abs, 'utf8'); }
    catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async readDoc(relPath: string): Promise<(Parsed & { exists: boolean }) | null> {
    const raw = await this.readRaw(relPath);
    if (raw === null) return { data: {}, body: '', repairs: [], exists: false };
    return { ...parseFrontMatter(raw, relPath), exists: true };
  }

  /** Writes only on an explicit action. Never called from a read path. */
  async writeRaw(relPath: string, content: string): Promise<void> {
    const abs = resolveInVault(this.root, relPath);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf8');
  }

  async writeDoc(relPath: string, data: Record<string, unknown>, body: string): Promise<void> {
    await this.writeRaw(relPath, stringifyFrontMatter(data, body));
  }

  async list(relDir: string): Promise<string[]> {
    const abs = resolveInVault(this.root, relDir);
    try { return (await readdir(abs)).sort(); } catch { return []; }
  }

  async exists(relPath: string): Promise<boolean> {
    try { await stat(resolveInVault(this.root, relPath)); return true; } catch { return false; }
  }

  async ensureDir(relDir: string): Promise<void> {
    await mkdir(resolveInVault(this.root, relDir), { recursive: true });
  }

  join(...parts: string[]): string { return join(...parts); }
}

export type { Repair };
