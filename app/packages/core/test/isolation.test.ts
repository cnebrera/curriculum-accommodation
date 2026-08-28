import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Constitution, Principle II — NON-NEGOTIABLE:
 *
 *   "Scripts extract, chunk, render, convert, synthesise speech and validate.
 *    They MUST NOT call a language model, require an API key, or embed
 *    provider-specific behaviour. Every script MUST be runnable and testable
 *    offline."
 *
 * Conventions decay and reviews miss things, so this is a test rather than a
 * rule. If it fails, the principle has been violated — do not weaken the test.
 */
const SRC = join(import.meta.dirname, '..', 'src');

const FORBIDDEN: Array<{ pattern: RegExp; what: string }> = [
  { pattern: /from\s+['"]@rampa\/providers/, what: 'imports the provider layer' },
  { pattern: /require\(\s*['"]@rampa\/providers/, what: 'requires the provider layer' },
  { pattern: /from\s+['"]node:(http|https|net|tls|dgram)['"]/, what: 'imports a network module' },
  { pattern: /from\s+['"](undici|axios|node-fetch|got)['"]/, what: 'imports an HTTP client' },
  { pattern: /(?<![\w.])fetch\s*\(/, what: 'calls fetch' },
  { pattern: /new\s+(WebSocket|XMLHttpRequest)\b/, what: 'opens a socket' },
  { pattern: /(?<![\w.])(ANTHROPIC|OPENAI|GOOGLE)_API_KEY/, what: 'reads an API key' },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('Principle II · the deterministic core is model-free', () => {
  const files = walk(SRC);

  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))(
    'src/%s reaches no network and no provider',
    (rel, abs) => {
      const src = readFileSync(abs as string, 'utf8');
      // Strip comments so the principle can be quoted in prose without failing.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const violations = FORBIDDEN
        .filter(({ pattern }) => pattern.test(code))
        .map(({ what }) => what);

      expect(
        violations,
        `packages/core/src/${rel} ${violations.join(' and ')}.\n\n` +
        `Constitution, Principle II (NON-NEGOTIABLE): the deterministic layer never calls a model.\n` +
        `Move this into packages/providers, which is the only network-capable code.`,
      ).toEqual([]);
    },
  );

  it('runs with no API key present', () => {
    expect(process.env['ANTHROPIC_API_KEY'] || '').toBe('');
    expect(process.env['GOOGLE_API_KEY'] || '').toBe('');
  });
});
