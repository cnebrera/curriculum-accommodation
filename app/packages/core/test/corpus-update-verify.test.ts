import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  readManifest, fileMatches, sha256Of, SUPPORTED_FORMAT, type UpdateManifest,
} from '../src/index.js';

/**
 * A broken or malformed update changes zero files (034 T002, FR-3210, SC-3204).
 *
 * ## Written before the machinery it constrains
 *
 * An invariant test written after the feature works is a test written to fit what already
 * happens — and this failure is silent. «Nothing changed» is not something a user
 * notices; it is something a hash notices.
 *
 * ## No signature cases, on purpose
 *
 * This file used to sign with a fixture keypair and check that a manifest signed by
 * somebody else was refused. That went with the signature itself on 2026-09-06: the
 * private half would have lived in a CI secret, so anybody who can write to the
 * repository could have had CI sign it — and the signature defended only against an
 * attacker able to alter what GitHub serves without repository or CI access.
 *
 * What is checked here now is **integrity, not authority**: does what arrived match what
 * the file list says arrived. Authority is HTTPS and a public repository; what stands
 * between a hostile file and her disk is the path check below, the scan before
 * activation, and her reading the offer.
 */
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

const raw = (m: UpdateManifest = MANIFEST) => JSON.stringify(m, null, 2);

describe('a manifest this build can read', () => {
  it('is read, and says what it brings', () => {
    const said = readManifest(raw());
    expect(said.of).toBe('ok');
    if (said.of === 'ok') {
      expect(said.manifest.version).toBe(4);
      expect(said.manifest.summary).toContain('tilde');
      expect(said.manifest.files).toHaveLength(2);
    }
  });

  it('and key order and whitespace do not matter, because it is parsed and not matched', () => {
    const reordered = JSON.stringify({
      publishedAt: MANIFEST.publishedAt,
      files: [...MANIFEST.files].reverse(),
      summary: MANIFEST.summary,
      version: MANIFEST.version,
      formatVersion: MANIFEST.formatVersion,
    });
    expect(readManifest(reordered).of).toBe('ok');
  });
});

describe('and everything else is refused whole', () => {
  it('truncation: half a manifest is not a manifest', () => {
    const said = readManifest(raw().slice(0, 40));
    expect(said.of === 'refused' && said.because).toBe('unparseable');
    if (said.of === 'refused') expect(said.say).toContain('No ha cambiado nada');
  });

  it('an empty file list, which would «apply» to nothing and publish a version', () => {
    /*
     * The subtle one. A well-formed manifest with no files would mint a version number
     * governing an empty corpus — every recipe gone, every instruction gone, and the
     * application still running. Refused at the shape.
     */
    expect(readManifest(raw({ ...MANIFEST, files: [] })).of).toBe('refused');
  });

  it('a path that would leave the corpus root — refused, never sanitised', () => {
    /*
     * One of the two things standing between a hostile file list and her disk, now that
     * nothing is signed. Refusal is the vault boundary's house rule, and it matters more
     * here because this one arrives from the network.
     */
    for (const path of ['../../etc/passwd', '/etc/passwd', 'recipes/../../out', 'a\\b']) {
      const escaping = { ...MANIFEST, files: [{ path, sha256: 'b'.repeat(64), bytes: 1 }] };
      const said = readManifest(raw(escaping));
      expect(said.of, path).toBe('refused');
      expect(said.of === 'refused' && said.because, path).toBe('malformed');
    }
  });

  it('a hash that is not a hash', () => {
    const odd = { ...MANIFEST, files: [{ path: 'recipes/a.md', sha256: 'no', bytes: 1 }] };
    expect(readManifest(raw(odd)).of === 'refused').toBe(true);
  });

  it('a format newer than this build understands — refused whole, with the reason', () => {
    /*
     * FR-3210. Half-reading is worse than not reading: a recipe whose new required field
     * this build ignores adapts worse, silently, with a version number saying it is
     * current.
     */
    const said = readManifest(raw({ ...MANIFEST, formatVersion: SUPPORTED_FORMAT + 1 }));
    expect(said.of === 'refused' && said.because).toBe('unsupported-format');
    if (said.of === 'refused') {
      expect(said.say).toContain('más nueva que la tuya');
      expect(said.say).toContain('leerla a medias sería peor');
      expect(said.say).toContain('Actualiza Rampa');
    }
  });
});

describe('and every file is checked against the list', () => {
  it('the right bytes match', () => {
    expect(fileMatches(bytesOf('# Examen\n'), MANIFEST.files[0]!)).toBe(true);
  });

  it('one changed character does not', () => {
    expect(fileMatches(bytesOf('# examen\n'), MANIFEST.files[0]!)).toBe(false);
  });

  it('and neither does the right hash at the wrong length', () => {
    /*
     * Length **and** hash, because they fail differently: a truncated download can have
     * been cut anywhere, and checking only the length would be no check at all.
     */
    const short = bytesOf('# Exame');
    expect(sha256Of(short)).not.toBe(MANIFEST.files[0]!.sha256);
    expect(fileMatches(short, { ...MANIFEST.files[0]!, sha256: sha256Of(short) })).toBe(false);
  });
});
