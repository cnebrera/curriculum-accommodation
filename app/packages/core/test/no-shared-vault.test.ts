import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * There is no shared-vault mode, and that is a decision (030 T027, FR-2812).
 *
 * ## Why an absence gets a test
 *
 * Because FR-2812 is the only requirement in this feature that is satisfied by **nothing
 * existing**, and a requirement satisfied by nothing existing is the one that quietly
 * stops being true. Somebody adds a «carpeta compartida» option to help two teachers who
 * asked for it, and the thing this whole feature was built instead of is back.
 *
 * ## What is actually wrong with it
 *
 * No lock, no merge, no history: two sync clients deciding which of two files wins, and
 * the loser is called `notes (copia en conflicto de Ana).md`. The vault is meant to be
 * edited in Obsidian, so the conflict is not a rare case — it is Tuesday. And the
 * question a shared mode would have to answer first has no technical answer: what happens
 * when two people sign the same sheet? A signature is one person's (`005` FR-512).
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

const walk = (dir: string, keep: (f: string) => boolean): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'out' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
};

describe('nothing offers two teachers one folder', () => {
  it('no channel, no setting and no screen names a shared vault', () => {
    /*
     * Over the **source**, because the claim is about every file rather than about one
     * path — the same shape as `007`'s «one writer of signed output». A setting called
     * `sharedVault`, a channel called `vault:share`, a mode called `multiTeacher`: none
     * of them exists, and this fails the moment one does.
     */
    const files = [
      join(repoRoot, 'app', 'packages'), join(repoRoot, 'app', 'ui', 'src'),
    ].flatMap((d) => walk(d, (f) => /\.tsx?$/.test(f) && !/test/.test(f)));
    expect(files.length).toBeGreaterThan(50);

    const offenders: string[] = [];
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
      if (/shared[_ ]?vault|vaultShared|multiTeacher|vault:share|sharedFolder/i.test(code)) {
        offenders.push(f.replace(`${repoRoot}/`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and the interface says so where somebody would otherwise pick one', () => {
    /*
     * Not in a manual. The moment a shared OneDrive folder gets chosen is the vault step
     * of onboarding, so that is where the sentence is — and it names the alternative
     * rather than only forbidding the thing, because «no hagas eso» without «haz esto»
     * is advice she has to work around.
     */
    const es = readFileSync(join(repoRoot, 'app', 'ui', 'src', 'i18n', 'es.ts'), 'utf8');
    expect(es).toContain('vaultAlone');
    expect(es).toContain('se pierde trabajo');
    expect(es).toContain('paquete de coordinación');

    const step = readFileSync(
      join(repoRoot, 'app', 'ui', 'src', 'onboarding', 'VaultStep.tsx'), 'utf8');
    expect(step).toContain('vaultAlone');
  });

  it('and the documentation says why, and what the channel is instead', () => {
    const doc = readFileSync(join(repoRoot, 'docs', 'memory.md'), 'utf8');
    expect(doc).toContain('Un vault = una docente');
    expect(doc).toContain('copia en conflicto');
    // The question a shared mode would have to answer first, which has no technical
    // answer: a signature is one person's.
    expect(doc).toContain('dos personas firman la misma hoja');
  });
});
