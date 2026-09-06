import { createHash, verify, createPublicKey } from 'node:crypto';
import { logger } from '../log.js';

/**
 * What an update says about itself, and whether to believe it (034 T005, FR-3211).
 *
 * ## Why a signature and not just HTTPS
 *
 * HTTPS authenticates the **host**, not the project. The threat this feature names is «a
 * malicious corpus update», which is `029`'s import threat with a distribution channel
 * attached — and a distribution channel is worse in one specific way: an import happens
 * because she went looking for a file, and an update arrives because she opened the
 * application.
 *
 * So the truth is an **Ed25519 detached signature over canonical manifest bytes**,
 * verified against a public key **compiled into the application**. The corpus cannot
 * vouch for itself: a key delivered by the channel it protects verifies nothing.
 *
 * ## The order of operations is the contract
 *
 * 1. Verify the signature. **Unverified bytes are shown to nobody and written nowhere
 *    permanent** — not even to a temp file she could be shown.
 * 2. Show her the offer, from the verified manifest.
 * 3. On acceptance, fetch every listed file, checking each against its manifest hash.
 * 4. Only when the snapshot is complete and every hash matches: one atomic rename.
 *
 * Any failure at any step leaves **zero files changed**, which is what SC-3204 checks by
 * hashing the store rather than by the absence of an error message.
 *
 * ## Canonical bytes, because a signature over «the JSON» signs nothing
 *
 * Two encoders disagree about key order and whitespace, so «the bytes I signed» and «the
 * bytes you parsed» must be derivable from the same structure by both sides. Sorted keys,
 * no whitespace, UTF-8 — and the signature is over **that**, never over the file as
 * received. A signature over the received bytes would verify a file and say nothing about
 * what the file means once parsed.
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
  /** **The complete corpus at that version, not a delta** — see below. */
  files: ManifestFile[];
}

/**
 * The format this build's parsers understand (FR-3210).
 *
 * Beside the verification rather than in a config file, because the number means «what
 * the code in this repository can read» and it should move when that changes — in the
 * same commit, where a reviewer sees both.
 */
export const SUPPORTED_FORMAT = 1;

/**
 * The bytes that are signed, derivable identically on both sides.
 *
 * `files` is sorted by path and the keys are emitted in a fixed order, so a publisher
 * that re-serialises the manifest and a client that parses it arrive at the same string.
 */
export function canonicalManifest(m: UpdateManifest): string {
  return JSON.stringify({
    files: [...m.files]
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .map((f) => ({ bytes: f.bytes, path: f.path, sha256: f.sha256 })),
    formatVersion: m.formatVersion,
    publishedAt: m.publishedAt,
    summary: m.summary,
    version: m.version,
  });
}

export type ManifestVerdict =
  | { of: 'ok'; manifest: UpdateManifest }
  /** Refused whole. `say` is what she reads; nothing partial is ever returned. */
  | { of: 'refused'; say: string; because: RefusalKind };

export type RefusalKind =
  | 'unparseable' | 'malformed' | 'bad-signature' | 'unsupported-format';

/**
 * Parse and verify, in that order, returning nothing usable unless both succeed.
 *
 * A single function rather than parse-then-verify as two steps a caller sequences: two
 * steps is one caller away from a screen that shows a parsed manifest it never checked,
 * and «unverified bytes are shown to nobody» has to be true of every caller rather than
 * remembered by each.
 */
export function verifyManifest(args: {
  raw: string;
  signature: Uint8Array;
  /** The project's public key, compiled into the application. */
  publicKeyPem: string;
}): ManifestVerdict {
  let parsed: unknown;
  try { parsed = JSON.parse(args.raw); } catch {
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
   * The signature, over the **canonical** bytes and not over `args.raw`.
   *
   * Over the raw file it would verify a file: change a space and it fails, which sounds
   * stricter and is in fact weaker in the way that matters — it would say nothing about
   * whether what the parser *understood* is what the publisher signed.
   */
  let ok = false;
  try {
    ok = verify(null, Buffer.from(canonicalManifest(manifest), 'utf8'),
      createPublicKey(args.publicKeyPem), Buffer.from(args.signature));
  } catch (e: unknown) {
    logger.warn('corpus-update.verify-threw', {
      message: e instanceof Error ? e.message.slice(0, 80) : 'unknown',
    });
    ok = false;
  }
  if (!ok) {
    return {
      of: 'refused', because: 'bad-signature',
      say: 'Esa actualización no viene firmada por el proyecto, así que no me la creo y '
        + 'no la he traído. No ha cambiado nada de lo que tienes. Si te ha llegado por '
        + 'otro sitio, no la uses.',
    };
  }

  /*
   * The format gate, **after** the signature and **before** anything is fetched.
   *
   * After, because an unsigned manifest's `formatVersion` is a claim by whoever wrote
   * it. Before the fetch, because a corpus written for a newer Rampa must be refused
   * whole rather than half-read — FR-3210, and «half-read» here means a recipe whose
   * new required field this build ignores, silently adapting worse.
   */
  if (manifest.formatVersion > SUPPORTED_FORMAT) {
    return {
      of: 'refused', because: 'unsupported-format',
      say: `Esa actualización está hecha para una versión de Rampa más nueva que la `
        + `tuya (formato ${manifest.formatVersion}; yo entiendo el ${SUPPORTED_FORMAT}). `
        + 'No la he traído: leerla a medias sería peor que no traerla. Actualiza Rampa y '
        + 'vuelve a mirar.',
    };
  }

  return { of: 'ok', manifest };
}

/** One file's bytes against what the signed manifest says they are. */
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
     * sanitise. Refusal is the vault boundary's house rule and it applies here for a
     * stronger reason: this one arrives from the network.
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
