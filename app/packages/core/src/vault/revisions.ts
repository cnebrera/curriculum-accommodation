import type { Vault } from './io.js';
import { isSignedOff } from '../ir/types.js';
import { parseFrontMatter } from './parse.js';

/**
 * Revisions, in one place (026 T003, FR-2402, research R4).
 *
 * ## The shape existed twice before this
 *
 * `jobs/adapt.ts` archived the previous sheet as `adapted.rN.md`; `021` gave
 * compositions the same shape as `ir.rN.md`. Two private copies of «archive the previous,
 * number the next», one per file stem — which is the drift `021`'s own research warned
 * about, arriving one feature later. Writing `runTurn` against either copy is how the
 * third one happens, so this module is where all three meet.
 *
 * ## What a revision is, and what it is not
 *
 * The **working file** is the stem (`adapted.md`, `ir.md`) and the archived ones are
 * `stem.rN.md`. There is deliberately no `current_revision` field anywhere: the working
 * file *is* the pointer, and a stored copy of what the filesystem says is the defect
 * `014` catalogued and `021`'s data model refused.
 *
 * ## Numbers only grow
 *
 * Nothing is ever deleted and nothing is renumbered — including on restore, which
 * archives the current file before writing the chosen one back. That is what lets the
 * record say which revision was signed **and** that later unsigned ones exist
 * (FR-2412), and it is why a signature never has to move: it lives in the document's own
 * front matter, so the file that was signed stays signed for ever (`005` FR-511).
 */

export interface Revision {
  /** From the filename; the working file is implicitly the highest. */
  n: number;
  path: string;
  /** Derived from the document, never stored beside it (`007` FR-509). */
  signed: boolean;
  /** True for the working file — the one every reader in the application opens. */
  current: boolean;
}

/** Where a document's revisions live: the directory and the file stem. */
export interface RevisionSite {
  /** Vault-relative directory holding the working file and its archive. */
  dir: string;
  /** `adapted` for a learner's sheet, `ir` for a composition. */
  stem: string;
}

const workingPath = (site: RevisionSite): string => `${site.dir}/${site.stem}.md`;
const revisionPath = (site: RevisionSite, n: number): string =>
  `${site.dir}/${site.stem}.r${n}.md`;

/** Every revision on disk, oldest first, with the working file last. */
export async function listRevisions(vault: Vault, site: RevisionSite): Promise<Revision[]> {
  const files = await vault.list(site.dir);
  const pattern = new RegExp(`^${site.stem}\\.r(\\d+)\\.md$`);

  const out: Revision[] = [];
  for (const f of files) {
    const m = pattern.exec(f);
    if (!m) continue;
    const path = `${site.dir}/${f}`;
    out.push({ n: Number(m[1]), path, signed: await signedAt(vault, path), current: false });
  }
  out.sort((a, b) => a.n - b.n);

  if (files.includes(`${site.stem}.md`)) {
    const path = workingPath(site);
    /*
     * The working file's number is one past the highest archived one.
     *
     * Derived rather than stored, and it is the same arithmetic `nextRevision` did: the
     * working file is what would be archived next, so it holds the next number. A first
     * version with nothing archived is revision 1.
     */
    out.push({
      n: (out[out.length - 1]?.n ?? 0) + 1,
      path,
      signed: await signedAt(vault, path),
      current: true,
    });
  }
  return out;
}

/** Was this file signed off? Read from the document, like every other reader. */
async function signedAt(vault: Vault, path: string): Promise<boolean> {
  const raw = await vault.readRaw(path);
  if (raw === null) return false;
  return isSignedOff({ frontMatter: parseFrontMatter(raw).data });
}

/**
 * Archive the working file, and answer with the number it took.
 *
 * Returns `null` when there is nothing to archive — a first version. The caller writes
 * the new working file afterwards, which is what makes «verify before write» possible:
 * a turn that fails before this point leaves the vault byte-identical (FR-2409).
 */
export async function archivePrevious(
  vault: Vault, site: RevisionSite,
): Promise<number | null> {
  const previous = await vault.readRaw(workingPath(site));
  if (previous === null) return null;
  const revisions = await listRevisions(vault, site);
  const n = (revisions.filter((r) => !r.current).at(-1)?.n ?? 0) + 1;
  await vault.writeRaw(revisionPath(site, n), previous);
  return n;
}

/**
 * Make an earlier revision the working one — **by archiving, never by deleting**.
 *
 * The current working file becomes its own revision first, so «volver a la dos» never
 * costs her the three. Numbers only grow, so the revision list keeps telling the truth
 * about how many times the document changed.
 *
 * A signed revision restored is a signed document, because the signature is in the
 * content being copied. That is not a special case here — it is what «the signature
 * belongs to the sheet» means (`005` FR-511).
 */
export async function restoreRevision(
  vault: Vault, site: RevisionSite, n: number,
): Promise<{ nowCurrent: number }> {
  const wanted = await vault.readRaw(revisionPath(site, n));
  if (wanted === null) {
    /*
     * `null`, not a throw. She may have tidied the folder by hand — the vault permits
     * that, so the channel has to be able to answer it rather than crash on it.
     */
    throw new Error(`revision-missing:${n}`);
  }
  await archivePrevious(vault, site);
  await vault.writeRaw(workingPath(site), wanted);
  const after = await listRevisions(vault, site);
  return { nowCurrent: after.find((r) => r.current)?.n ?? n };
}
