import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * A message that carries a value is not replaced by a template (021, from use).
 *
 * ## The two directions this has failed in
 *
 * **2026-09-01, morning.** A 404 from a provider arrived as kind `unknown` carrying «El
 * servicio devolvió un error (404)». `t.errors['unknown']` existed, so the lookup
 * succeeded and «Algo ha ido mal» won — the catch-all beating a message that knew
 * something.
 *
 * **2026-09-01, afternoon.** A flagged name arrived as `name-unconfirmed` carrying «Hay
 * un posible nombre en tus notas: **Marta**». A translation existed, so it won, and the
 * word she needed to act on was deleted. «No entiendo este mensaje que me ha salido.»
 *
 * Same mechanism, opposite direction, and the rule that resolves both: **a kind whose
 * message carries a specific value gets no translation.** The main process already writes
 * in her language (`013` FR-1109), so passing the message through is the correct answer
 * rather than a fallback.
 */
const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..');
const shellSrc = join(uiRoot, '..', 'packages', 'shell', 'src');
const es = readFileSync(join(uiRoot, 'src', 'i18n', 'es.ts'), 'utf8');

/**
 * Kinds whose thrown message interpolates something — a name, a count, a status code.
 *
 * Found by looking, and listed rather than detected: a regex over every `RampaError` in
 * the shell would also match the ones whose message is a fixed sentence, and the
 * distinction is the whole point.
 */
const CARRY_A_VALUE = ['name-unconfirmed', 'ingest-format', 'output-incomplete'];

describe('a message that carries a value survives', () => {
  it.each(CARRY_A_VALUE)('«%s» has no translation to overwrite it', (kind) => {
    // The absence is asserted on the mapping, not on the file: the kind is allowed to
    // appear in a comment explaining why it is not there.
    const code = es.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(new RegExp(`['"]${kind}['"]\\s*:`));
  });

  it('is not vacuous: the kinds with a fixed sentence DO have one', () => {
    // Otherwise the test above would pass on an empty error map.
    for (const kind of ['key-missing', 'offline', 'rate-limited']) {
      expect(es).toMatch(new RegExp(`['"]?${kind}['"]?\\s*:`));
    }
  });

  it('the thrown message really does interpolate, so the list is right', () => {
    /*
     * Guards the list itself: if somebody rewrites one of these to a fixed sentence, the
     * translation should come back — and this fails, which is the prompt to do it.
     */
    const adapt = readFileSync(join(shellSrc, 'jobs', 'adapt.ts'), 'utf8');
    expect(adapt).toMatch(/name-unconfirmed[\s\S]{0,200}\$\{unknown/);
  });
});

describe('the catch-all never beats a real message', () => {
  it('«unknown» is skipped before the lookup', () => {
    const async_ = readFileSync(join(uiRoot, 'src', 'data', 'async.ts'), 'utf8');
    // The fix from this morning, kept: `unknown` means «no translation», not «translated
    // as the catch-all».
    expect(async_).toMatch(/kind === 'unknown' \? undefined : t\.errors\[kind\]/);
  });
});
