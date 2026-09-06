import { createHash } from 'node:crypto';

/**
 * What a corpus release says it contains (034 T005, FR-3210, FR-3211).
 *
 * ## No signature, and the reason is worth keeping
 *
 * This was an Ed25519 detached signature verified against a key compiled into the
 * application. Carlos removed it on 2026-09-06 and the argument is the one that matters:
 *
 * The private half would live in a CI secret. **Anybody who can write to the repository
 * can change `/recipes` and have CI sign it** — so the signature defends only against an
 * attacker who can alter what GitHub serves *without* having repository or CI access: a
 * compromised CA, a man in the middle. For a small tool used by PTs in Spanish schools
 * that is an invented threat model, and the cost was real — a key nobody had decided how
 * to manage, a release process that can break, and a failure mode where the key is lost
 * and the whole channel dies.
 *
 * It also sat badly with the rest of the architecture. This project already treats the
 * corpus as **text people edit**: `recipes-local/` wins by id, `instructions/` is
 * judgement a PT is invited to correct, and `029` lets her import a normative corpus
 * nobody signs at all, defended by a scan. Signing the project's copy while she edits her
 * own freely was coherent and heavy.
 *
 * ## What is left, and what it is for
 *
 * The hashes stay. They are **integrity, not authority**: they catch a truncated or
 * corrupted download, which is a real and cheap failure to catch. They do not claim
 * anything about who wrote the bytes — the repository is public and what it says is what
 * it says.
 *
 * What actually defends this channel is the same thing that defends `029`'s imports:
 * every file is scanned for instruction-shaped text before it can govern, and nothing
 * governs until she has read it and said yes. That was defence in depth; it is now the
 * defence, which is a reason to keep it sharp rather than a reason to be uneasy.
 */

export interface ManifestFile {
  /** Corpus-relative: `recipes/core/…`, `instructions/…`, `checklists/…`. */
  path: string;
  sha256: string;
  bytes: number;
}

export interface UpdateManifest {
  version: number;
  formatVersion: number;
  /** Plain language, Spanish. She reads this before anything else (FR-3206). */
  summary: string;
  publishedAt: string;
  /** **The complete corpus at that version, not a delta.** */
  files: ManifestFile[];
}

/**
 * The format this build's parsers understand (FR-3210).
 *
 * Beside the parsing rather than in a config file, because the number means «what the
 * code in this repository can read» and it should move when that changes — in the same
 * commit, where a reviewer sees both.
 */
export const SUPPORTED_FORMAT = 1;

export type ManifestVerdict =
  | { of: 'ok'; manifest: UpdateManifest }
  /** Refused whole. `say` is what she reads; nothing partial is ever returned. */
  | { of: 'refused'; say: string; because: RefusalKind };

export type RefusalKind = 'unparseable' | 'malformed' | 'unsupported-format';

/**
 * Read it, or refuse it whole.
 *
 * One function rather than parse-then-check as two steps a caller sequences: two steps is
 * one caller away from a screen that shows a manifest whose format it never checked.
 */
export function readManifest(raw: string): ManifestVerdict {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    return {
      of: 'refused', because: 'unparseable',
      say: 'No he podido leer lo que dice esa actualización, así que no la he traído. '
        + 'No ha cambiado nada de lo que tienes.',
    };
  }

  const manifest = shapeOf(parsed);
  if (!manifest) {
    return {
      of: 'refused', because: 'malformed',
      say: 'Esa actualización no dice bien qué trae, así que no la he traído. No ha '
        + 'cambiado nada de lo que tienes.',
    };
  }

  /*
   * The format gate, **before anything is fetched**.
   *
   * A corpus written for a newer Rampa is refused whole rather than half-read, and
   * «half-read» here means a recipe whose new required field this build ignores —
   * adapting worse, silently, with a version number saying it is current.
   */
  if (manifest.formatVersion > SUPPORTED_FORMAT) {
    return {
      of: 'refused', because: 'unsupported-format',
      say: `Esa actualización está hecha para una versión de Rampa más nueva que la `
        + `tuya (formato ${manifest.formatVersion}; yo entiendo el ${SUPPORTED_FORMAT}). `
        + 'No la he traído: leerla a medias sería peor que no traerla. No ha cambiado nada '
        + 'de lo que tienes. Actualiza Rampa y vuelve a mirar.',
    };
  }

  return { of: 'ok', manifest };
}

/**
 * One file's bytes against what the manifest says they are.
 *
 * Length **and** hash, because they fail differently: a truncated download can have been
 * cut anywhere, and checking only the length would be no check at all.
 */
export function fileMatches(bytes: Uint8Array, expected: ManifestFile): boolean {
  if (bytes.byteLength !== expected.bytes) return false;
  return createHash('sha256').update(bytes).digest('hex') === expected.sha256;
}

export const sha256Of = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

function shapeOf(v: unknown): UpdateManifest | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Record<string, unknown>;
  if (!Number.isInteger(m['version']) || (m['version'] as number) <= 0) return null;
  if (!Number.isInteger(m['formatVersion']) || (m['formatVersion'] as number) <= 0) return null;
  if (typeof m['summary'] !== 'string' || m['summary'].trim() === '') return null;
  if (typeof m['publishedAt'] !== 'string') return null;
  if (!Array.isArray(m['files']) || m['files'].length === 0) return null;

  const files: ManifestFile[] = [];
  for (const f of m['files']) {
    if (!f || typeof f !== 'object') return null;
    const e = f as Record<string, unknown>;
    const path = typeof e['path'] === 'string' ? e['path'] : '';
    const sha256 = typeof e['sha256'] === 'string' ? e['sha256'] : '';
    const bytes = e['bytes'];
    /*
     * A path that could leave the corpus root is a malformed manifest, not a path to
     * sanitise. Refusal is the vault boundary's house rule, and it matters more here
     * because this one arrives from the network — and, now that nothing is signed, this
     * is one of the two things standing between a hostile file list and her disk.
     */
    if (!path || path.startsWith('/') || path.includes('..') || path.includes('\\')) return null;
    if (!/^[0-9a-f]{64}$/.test(sha256)) return null;
    if (!Number.isInteger(bytes) || (bytes as number) < 0) return null;
    files.push({ path, sha256, bytes: bytes as number });
  }
  return {
    version: m['version'] as number,
    formatVersion: m['formatVersion'] as number,
    summary: (m['summary'] as string).trim(),
    publishedAt: m['publishedAt'] as string,
    files,
  };
}
