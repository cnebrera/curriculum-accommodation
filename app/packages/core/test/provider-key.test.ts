import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadCatalogue } from '../src/providers/catalogue.js';
import { normaliseKey, looksLikeAPage, identifyKey, checkKeyShape } from '../src/providers/key.js';

/**
 * What actually arrives in the paste box (009 T010, quickstart §3).
 *
 * Every case here is something a teacher really does: selecting the whole page
 * because ⌘A is faster than aiming, copying from a documentation snippet that
 * wrapped the key in quotes or an `export KEY=` line, or pasting a key from the
 * service she set up last month rather than the one on screen.
 *
 * Answering all of those with "clave no válida" would be correct and useless.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const dir = join(repoRoot, 'instructions', 'providers');
const catalogue = loadCatalogue(
  readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ path: f, raw: readFileSync(join(dir, f), 'utf8') })),
  { available: ['google', 'anthropic', 'openai', 'compatible'], today: new Date('2026-09-15T00:00:00Z') },
);
const svc = (id: string) => catalogue.find((s) => s.id === id)!;

const ANTHROPIC = 'sk-ant-api03-' + 'x'.repeat(40);
const GOOGLE = 'AIza' + 'y'.repeat(35);
const OPENAI = 'sk-proj-' + 'z'.repeat(40);
const DEEPSEEK = 'sk-' + 'q'.repeat(32);

describe('normalisation', () => {
  it('strips the whitespace a copy brings with it', () => {
    expect(normaliseKey(`  ${ANTHROPIC}\n`)).toBe(ANTHROPIC);
    expect(normaliseKey(`\t${ANTHROPIC}  \r\n`)).toBe(ANTHROPIC);
  });

  it('strips the quotes a word processor substituted', () => {
    // A teacher pasting from a Word document or a PDF gets these, and they are
    // invisible: the key looks right on screen and fails every check.
    expect(normaliseKey(`“${ANTHROPIC}”`)).toBe(ANTHROPIC);
    expect(normaliseKey(`‘${ANTHROPIC}’`)).toBe(ANTHROPIC);
    expect(normaliseKey(`"${ANTHROPIC}"`)).toBe(ANTHROPIC);
  });

  it('strips a KEY= prefix from a code sample', () => {
    expect(normaliseKey(`ANTHROPIC_API_KEY=${ANTHROPIC}`)).toBe(ANTHROPIC);
    expect(normaliseKey(`API_KEY: ${ANTHROPIC}`)).toBe(ANTHROPIC);
    expect(normaliseKey(`GOOGLE_API_KEY="${GOOGLE}"`)).toBe(GOOGLE);
  });

  it('strips the invisible characters a PDF inserts', () => {
    expect(normaliseKey(` ${ANTHROPIC}​`)).toBe(ANTHROPIC);
    expect(normaliseKey(`${ANTHROPIC}﻿`)).toBe(ANTHROPIC);
  });

  it('joins a key a terminal wrapped across lines', () => {
    expect(normaliseKey('sk-ant-api03-aaaa\nbbbb')).toBe('sk-ant-api03-aaaabbbb');
  });

  it('leaves an unmatched quote alone rather than hiding the real problem', () => {
    // Removing it would turn a wrong key into a differently wrong key, and the
    // error message would then be about something she never typed.
    expect(normaliseKey(`"${ANTHROPIC}`)).toBe(`"${ANTHROPIC}`);
  });

  it('does not touch the middle of what she pasted', () => {
    expect(normaliseKey('sk-ant-AAA_BBB.CCC-DDD')).toBe('sk-ant-AAA_BBB.CCC-DDD');
  });

  it('survives an empty paste without throwing', () => {
    expect(normaliseKey('')).toBe('');
    expect(normaliseKey('   \n  ')).toBe('');
  });
});

describe('she pasted the page, not the key', () => {
  it('recognises markup', () => {
    expect(looksLikeAPage('<div>Your API key</div>')).toBe(true);
  });

  it('recognises prose', () => {
    const page = 'Create an API key to get started with the platform. '.repeat(6);
    expect(looksLikeAPage(page)).toBe(true);
  });

  it('recognises a multi-line block', () => {
    expect(looksLikeAPage('API keys\n\nYour keys\n'.repeat(12))).toBe(true);
  });

  it('does not mistake a long key for a page', () => {
    // The distinction is shape, not length: a very long single token is a key.
    expect(looksLikeAPage('sk-ant-' + 'a'.repeat(400))).toBe(false);
    expect(looksLikeAPage(ANTHROPIC)).toBe(false);
  });

  it('does not mistake an empty box for a page', () => {
    expect(looksLikeAPage('')).toBe(false);
    expect(looksLikeAPage('  ')).toBe(false);
  });
});

describe('which service a key belongs to', () => {
  /**
   * The defect this exists to prevent.
   *
   * `sk-ant-`, `sk-proj-` and `sk-` are all prefixes of each other's keys. A
   * first-match or shortest-match search reads every Anthropic key as a DeepSeek
   * one and sends her, confidently, to the wrong provider's page.
   */
  it('matches the longest prefix, so sk-ant- is never read as sk-', () => {
    expect(identifyKey(ANTHROPIC, catalogue).serviceId).toBe('anthropic');
    expect(identifyKey(OPENAI, catalogue).serviceId).toBe('openai');
    expect(identifyKey(DEEPSEEK, catalogue).serviceId).toBe('deepseek');
    expect(identifyKey(GOOGLE, catalogue).serviceId).toBe('google');
  });

  it('names the other service when she pasted the wrong one', () => {
    const r = identifyKey(ANTHROPIC, catalogue, 'google');
    expect(r.belongsToAnother).toBe(true);
    expect(r.serviceId).toBe('anthropic');
  });

  it('does not cry wrong-service when it is the right one', () => {
    expect(identifyKey(ANTHROPIC, catalogue, 'anthropic').belongsToAnother).toBe(false);
  });

  it('recognises nothing when the key matches no prefix', () => {
    expect(identifyKey('total-nonsense-' + 'x'.repeat(30), catalogue).serviceId).toBeUndefined();
  });

  it('normalises before matching, so a quoted key is still identified', () => {
    expect(identifyKey(`"${ANTHROPIC}"`, catalogue).serviceId).toBe('anthropic');
    expect(identifyKey(`ANTHROPIC_API_KEY=${ANTHROPIC}\n`, catalogue).serviceId).toBe('anthropic');
  });
});

describe('the offline shape check', () => {
  it('accepts a well-formed key and hands back the normalised one', () => {
    const v = checkKeyShape(`  "${ANTHROPIC}" `, svc('anthropic'), catalogue);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.key).toBe(ANTHROPIC);
  });

  it('distinguishes each failure rather than answering "no válida" every time', () => {
    const kinds = [
      checkKeyShape('', svc('anthropic'), catalogue),
      checkKeyShape('<html>Your API keys page</html>', svc('anthropic'), catalogue),
      checkKeyShape(GOOGLE, svc('anthropic'), catalogue),
      checkKeyShape('sk-ant-x', svc('anthropic'), catalogue),
    ].map((v) => (v.ok ? 'ok' : v.kind));
    expect(kinds).toEqual(['empty', 'page', 'wrong-service', 'too-short']);
  });

  /**
   * The defect the first real user hit, on the first real run.
   *
   * Carlos pasted a Google key that starts `AQ.` — Google's newer format, which
   * they shipped without telling anyone — and the application answered «las
   * claves de Google empiezan por "AIza", comprueba que la has copiado entera».
   * A perfectly good key, and a sentence blaming his copy-paste for it.
   *
   * The lesson is bigger than the prefix: **the provider is the authority on
   * whether its own key is valid.** Checking a shape we invented saves one round
   * trip and costs the entire setup when a provider changes format, which they do
   * without announcement. So an unrecognised prefix passes through to validation.
   */
  it('accepts a key whose shape we do not recognise, and lets the provider decide', () => {
    for (const unknownShape of [
      'AQ.Ab8RN6K7xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxIZRA',  // Google's newer format
      'gsk-something-entirely-new-from-a-provider-2027',
      'a'.repeat(40),
    ]) {
      const v = checkKeyShape(unknownShape, svc('google'), catalogue);
      expect(v.ok, `${unknownShape.slice(0, 12)}… was rejected on its shape`).toBe(true);
    }
  });

  it('still names the other service when the key is unmistakably theirs', () => {
    // The one prefix check worth keeping: it is high-confidence and useful.
    const v = checkKeyShape(ANTHROPIC, svc('google'), catalogue);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.kind).toBe('wrong-service');
      expect(v.ownerId).toBe('anthropic');
    }
  });

  it('names the owning service on a wrong-service paste, so the offer to switch is real', () => {
    const v = checkKeyShape(GOOGLE, svc('anthropic'), catalogue);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.kind).toBe('wrong-service');
      expect(v.ownerId).toBe('google');
    }
  });

  it('accepts any shape for a service that declares no prefix', () => {
    // Mistral issues keys with no fixed prefix, so a prefix rule would reject
    // every valid key it hands out. The length floor still applies.
    const mistral = svc('mistral');
    expect(mistral.keyPrefixes).toEqual([]);
    expect(checkKeyShape('a'.repeat(32), mistral, catalogue).ok).toBe(true);
    expect(checkKeyShape('short', mistral, catalogue).ok).toBe(false);
  });

  it('decides everything it can before touching the network', () => {
    // Not an aesthetic point: it costs nothing, it works when the school
    // connection is down, and it is why the five sentences are five sentences.
    for (const bad of ['', '   ', 'x', GOOGLE, '<p>page</p>']) {
      expect(checkKeyShape(bad, svc('anthropic'), catalogue).ok).toBe(false);
    }
  });
});
