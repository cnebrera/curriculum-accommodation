import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { load as loadYaml } from 'js-yaml';

/**
 * The rehearsal cannot reach a provider, a key, a cost or her vault
 * (035 T001 structural half, FR-3302/3306, SC-3302).
 *
 * ## Why this is a module-graph test
 *
 * «The rehearsal is offline» is a claim about every future edit, not about today's code.
 * The failure it prevents is nobody's mistake in particular: somebody adds «and let the
 * model suggest a second version» to a rehearsal screen, because that is a genuinely
 * useful thing, and a teacher on her first night — with no key, which is the whole
 * premise — hits a provider error she has no way to understand.
 *
 * The same shape as `npm run test:isolation`, applied to one directory. And the same
 * discipline: **the scan must not pass because it found nothing to scan**, which is the
 * way a directory-scoped test dies quietly when the directory is renamed.
 */
const shellSrc = join(dirname(new URL(import.meta.url).pathname), '..', 'src');
const ENSAYO = join(shellSrc, 'ensayo');

const FORBIDDEN: Array<{ pattern: RegExp; what: string }> = [
  {
    pattern: /from\s+['"]@rampa\/providers/,
    what: 'imports the provider layer — the rehearsal never sends anything',
  },
  {
    pattern: /from\s+['"][^'"]*ipc\/keys\.js/,
    what: 'reaches for a key — the rehearsal exists because she has none yet',
  },
  {
    pattern: /from\s+['"][^'"]*ipc\/vault\.js/,
    what: 'reaches for the REAL vault — SC-3303 says her folder does not change by a byte',
  },
  {
    pattern: /from\s+['"][^'"]*ipc\/cost\.js/,
    what: 'records a cost — a rehearsal that spends nothing must write no ledger entry',
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.ts') ? [p] : []);
  });
}

describe('the rehearsal module is sealed', () => {
  it('the directory exists and has something in it', () => {
    /*
     * The guard on the guard. A scan of a directory that is not there returns an empty
     * list and every assertion below passes — which is how a boundary test survives the
     * rename of the thing it was watching and reports safety for ever.
     */
    expect(existsSync(ENSAYO), 'packages/shell/src/ensayo/ must exist').toBe(true);
    expect(walk(ENSAYO).length).toBeGreaterThan(0);
  });

  for (const { pattern, what } of FORBIDDEN) {
    it(`no file ${what}`, () => {
      const offenders = walk(ENSAYO)
        .filter((f) => pattern.test(readFileSync(f, 'utf8')))
        .map((f) => f.replace(`${shellSrc}/`, ''));
      expect(offenders).toEqual([]);
    });
  }

  it('and the only vault it names is its own root', () => {
    /*
     * Stated positively as well, because the four absences above can all hold in a file
     * that takes a real `Vault` as a parameter from somewhere careless. The rehearsal
     * builds its vault from `app.getPath('userData')/ensayo` and from nowhere else.
     */
    const src = walk(ENSAYO).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(src).toContain("join(app.getPath('userData'), 'ensayo')");
    expect(src).not.toMatch(/currentVault\(/);
  });
});
