import { readFile, writeFile, mkdir, readdir, stat, rename, unlink } from 'node:fs/promises';
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

  /**
   * Writes only on an explicit action. Never called from a read path.
   *
   * **Whole file or no file** (005 FR-509). Written to a sibling temporary and
   * renamed into place, because a plain `writeFile` interrupted halfway leaves a
   * truncated document — and the document this most matters for is an adapted
   * worksheet, where "truncated" means content silently missing, which is this
   * project's stated number-one failure mode.
   *
   * It became urgent with `005`: a batch of three adaptations is three times the
   * window in which a crash or a cancellation can land mid-write.
   *
   * The rename is atomic on POSIX and replaces on Windows. Where it cannot be —
   * a vault on OneDrive or Drive with the destination held open by the sync
   * client is the realistic case, and this project assumes exactly that — the
   * fallback is the direct write we did before. Worse, and no worse than
   * yesterday, rather than a failure she cannot act on.
   */
  async writeRaw(relPath: string, content: string): Promise<void> {
    const abs = resolveInVault(this.root, relPath);
    await mkdir(dirname(abs), { recursive: true });
    // A sibling, so the rename never crosses a filesystem boundary — which is
    // the one thing that would silently turn it into a non-atomic copy.
    const tmp = `${abs}.rampa-tmp`;
    try {
      await writeFile(tmp, content, 'utf8');
      await rename(tmp, abs);
    } catch {
      await unlink(tmp).catch(() => {});
      await writeFile(abs, content, 'utf8');
    }
  }

  /**
   * Bytes rather than text (008 T013). Her photographs live in the vault with
   * the material they became, so this goes through the same path resolution as
   * everything else — a binary write is not an excuse to bypass
   * `resolveInVault`, which is the only thing keeping a path from content out.
   */
  async writeBinary(relPath: string, bytes: Uint8Array): Promise<void> {
    const abs = resolveInVault(this.root, relPath);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
  }

  async readBinary(relPath: string): Promise<Uint8Array | null> {
    try { return new Uint8Array(await readFile(resolveInVault(this.root, relPath))); }
    catch { return null; }
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
