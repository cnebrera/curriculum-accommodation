import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import {
  verifyManifest, canonicalManifest, fileMatches, sha256Of, SUPPORTED_FORMAT,
  type UpdateManifest,
} from '../src/index.js';

/**
 * A tampered update changes zero files (034 T002, FR-3210/FR-3211, SC-3204).
 *
 * ## Written before the machinery it constrains
 *
 * An invariant test written after the feature works is a test written to fit what
 * already happens — and both of these failures are silent. «Nothing changed» is not
 * something a user notices; it is something a hash notices.
 *
 * ## The fixture keypair, and why the real one is not here
 *
 * These sign with a keypair minted in the test. The project's private key never touches
 * this repository, and the public key that ships in the application is not the one used
 * here — which is the point: verification is a property of the code, and the code must
 * refuse anything not signed by whichever key it was given.
 */
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

/** A second, unrelated keypair: somebody else's signature is still a signature. */
const other = generateKeyPairSync('ed25519');

const bytesOf = (s: string) => new TextEncoder().encode(s);

const fileEntry = (path: string, content: string) => ({
  path, bytes: bytesOf(content).byteLength,
  sha256: createHash('sha256').update(bytesOf(content)).digest('hex'),
});

const MANIFEST: UpdateManifest = {
  version: 4,
  formatVersion: SUPPORTED_FORMAT,
  summary: 'Corregida la tilde de «exámenes» en la receta de exámenes.',
  publishedAt: '2026-09-20',
  files: [
    fileEntry('recipes/core/exam-access-not-difficulty.md', '# Examen\n'),
    fileEntry('instructions/adapt.md', '# Adaptar\n'),
  ],
};

const signWith = (key: typeof privateKey, m: UpdateManifest = MANIFEST): Uint8Array =>
  new Uint8Array(sign(null, Buffer.from(canonicalManifest(m), 'utf8'), key));

const raw = (m: UpdateManifest = MANIFEST) => JSON.stringify(m, null, 2);

describe('a manifest the project signed', () => {
  it('verifies, and only then is anything about it usable', () => {
    const said = verifyManifest({ raw: raw(), signature: signWith(privateKey), publicKeyPem });
    expect(said.of).toBe('ok');
    if (said.of === 'ok') {
      expect(said.manifest.version).toBe(4);
      expect(said.manifest.summary).toContain('tilde');
    }
  });

  it('and the signature is over what the parser understood, not over the file', () => {
    /*
     * Re-serialised with different whitespace and key order — the same manifest, a
     * different file. It must still verify, because what was signed is the **meaning**.
     *
     * A signature over the received bytes would be stricter in a way that helps nobody:
     * it would verify a file and say nothing about whether what the parser understood is
     * what the publisher signed.
     */
    const reordered = JSON.stringify({
      publishedAt: MANIFEST.publishedAt,
      files: [...MANIFEST.files].reverse(),
      summary: MANIFEST.summary,
      version: MANIFEST.version,
      formatVersion: MANIFEST.formatVersion,
    });
    const said = verifyManifest({
      raw: reordered, signature: signWith(privateKey), publicKeyPem,
    });
    expect(said.of).toBe('ok');
  });
});

describe('and everything else is refused whole', () => {
  const refusal = (over: Partial<Parameters<typeof verifyManifest>[0]> = {}) =>
    verifyManifest({ raw: raw(), signature: signWith(privateKey), publicKeyPem, ...over });

  it('a signature by somebody else — a signature is not the same as the signature', () => {
    const said = refusal({ signature: signWith(other.privateKey) });
    expect(said.of).toBe('refused');
    if (said.of === 'refused') {
      expect(said.because).toBe('bad-signature');
      // And it says what she should do about a file that arrived some other way.
      expect(said.say).toContain('no la uses');
      expect(said.say).toContain('No ha cambiado nada');
    }
  });

  it('altered bytes: one changed hash and the whole thing goes', () => {
    /*
     * The realistic attack is not a forged signature; it is a genuine manifest with one
     * file's hash swapped for a hostile file's. The signature is over the file list, so
     * changing one entry invalidates the whole manifest — which is why the hashes live
     * **inside** what is signed and the file host needs no trust of its own.
     */
    const tampered = { ...MANIFEST, files: [
      { ...MANIFEST.files[0]!, sha256: 'a'.repeat(64) }, MANIFEST.files[1]!,
    ] };
    const said = verifyManifest({
      raw: raw(tampered), signature: signWith(privateKey), publicKeyPem,
    });
    expect(said.of === 'refused' && said.because).toBe('bad-signature');
  });

  it('and a changed summary too, because the summary is what she reads to decide', () => {
    // The one field a hostile publisher would most want to change without changing the
    // files: «una corrección menor» over a rewritten refusal rule.
    const lying = { ...MANIFEST, summary: 'Una corrección menor de ortografía.' };
    expect(verifyManifest({
      raw: raw(lying), signature: signWith(privateKey), publicKeyPem,
    }).of).toBe('refused');
  });

  it('truncation: half a manifest is not a manifest', () => {
    const said = refusal({ raw: raw().slice(0, 40) });
    expect(said.of === 'refused' && said.because).toBe('unparseable');
  });

  it('an empty file list, which would «apply» to nothing and publish a version', () => {
    /*
     * The subtle one. A well-formed, correctly signed manifest with no files would mint
     * a version number governing an empty corpus — every recipe gone, every instruction
     * gone, and the application still running. Refused at the shape.
     */
    const empty = { ...MANIFEST, files: [] };
    expect(verifyManifest({
      raw: raw(empty), signature: signWith(privateKey, empty), publicKeyPem,
    }).of === 'refused').toBe(true);
  });

  it('a path that would leave the corpus root — refused, never sanitised', () => {
    for (const path of ['../../etc/passwd', '/etc/passwd', 'recipes/../../out', 'a\\b']) {
      const escaping = { ...MANIFEST, files: [{ path, sha256: 'b'.repeat(64), bytes: 1 }] };
      const said = verifyManifest({
        raw: raw(escaping), signature: signWith(privateKey, escaping), publicKeyPem,
      });
      expect(said.of, path).toBe('refused');
      expect(said.of === 'refused' && said.because, path).toBe('malformed');
    }
  });

  it('a format newer than this build understands — refused whole, with the reason', () => {
    /*
     * FR-3210. Half-reading is worse than not reading: a recipe whose new required field
     * this build ignores adapts worse, silently, with a version number saying it is
     * current.
     */
    const future = { ...MANIFEST, formatVersion: SUPPORTED_FORMAT + 1 };
    const said = verifyManifest({
      raw: raw(future), signature: signWith(privateKey, future), publicKeyPem,
    });
    expect(said.of === 'refused' && said.because).toBe('unsupported-format');
    if (said.of === 'refused') {
      expect(said.say).toContain('más nueva que la tuya');
      expect(said.say).toContain('leerla a medias sería peor');
      // And what she can do about it.
      expect(said.say).toContain('Actualiza Rampa');
    }
  });

  it('and the format gate runs AFTER the signature, because an unsigned claim is a claim', () => {
    // A hostile file declaring `formatVersion: 99` must be refused for **not being
    // signed**, not for its own claim about itself.
    const future = { ...MANIFEST, formatVersion: 99 };
    const said = verifyManifest({
      raw: raw(future), signature: signWith(other.privateKey, future), publicKeyPem,
    });
    expect(said.of === 'refused' && said.because).toBe('bad-signature');
  });

  it('a garbage public key does not throw its way past the check', () => {
    const said = verifyManifest({
      raw: raw(), signature: signWith(privateKey), publicKeyPem: 'no soy una clave',
    });
    expect(said.of === 'refused' && said.because).toBe('bad-signature');
  });
});

describe('and every file is checked against the signed manifest', () => {
  it('the right bytes match', () => {
    expect(fileMatches(bytesOf('# Examen\n'), MANIFEST.files[0]!)).toBe(true);
  });

  it('one changed character does not', () => {
    expect(fileMatches(bytesOf('# examen\n'), MANIFEST.files[0]!)).toBe(false);
  });

  it('and neither does the right hash at the wrong length', () => {
    /*
     * Length **and** hash, because they fail differently: a truncated download can have
     * been cut anywhere, and checking only the hash means reading the whole thing before
     * finding out. Checking only the length would be no check at all.
     */
    const short = bytesOf('# Exame');
    expect(sha256Of(short)).not.toBe(MANIFEST.files[0]!.sha256);
    expect(fileMatches(short, { ...MANIFEST.files[0]!, sha256: sha256Of(short) })).toBe(false);
  });
});
