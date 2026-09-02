import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * The half of `018` FR-1601 that survives `023` (T021, FR-2101).
 *
 * `023` narrowed FR-1601: Rampa may **fetch** pictograms at her request, and may still
 * never **bundle or redistribute** them. That second half was a promise in a comment;
 * now it is a test, because a promise is what the first half turned out to be worth.
 *
 * The failure it prevents is concrete and easy to commit by accident: a fixture folder
 * of PNGs added for a test, `corpus/` gaining a starter set «so it works out of the
 * box», or somebody's downloaded `pictogramas/` folder landing inside the repository.
 * Any of those puts CC BY-NC-SA files inside an Apache-2.0 release, which hands every
 * downstream user a restriction our licence says they do not have — and unlike a
 * licence misstatement on a screen, it cannot be corrected after the fact.
 */

const root = new URL('../../../', import.meta.url).pathname;

describe('no release artefact carries a pictogram (023 FR-2101)', () => {
  it('ships only out/ and the corpus', async () => {
    const config = yaml.load(
      await readFile(join(root, 'electron-builder.yml'), 'utf8')) as {
        files: unknown; extraResources: unknown;
      };
    /*
     * Asserted rather than trusted: the check below walks what these two lists name,
     * so a third entry added here without a thought would be shipped unexamined.
     */
    expect(config.files).toEqual(['out/**/*', 'package.json']);
    expect(config.extraResources).toEqual([{ from: 'corpus', to: 'corpus' }]);
  });

  it('has no image files anywhere in the corpus', async () => {
    const images: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) { await walk(path); continue; }
        if (/\.(png|jpe?g|svg|webp|gif)$/i.test(entry.name)) images.push(path);
      }
    };
    await walk(join(root, 'corpus'));
    expect(images, 'the corpus is text she can read and correct').toEqual([]);
  });

  it('has no pictogram metadata anywhere in the repository', async () => {
    /*
     * `pictograms.<lang>.json` is the format `018`'s reader consumes and `023`'s
     * downloader writes. One inside the repository is either a fixture that should be
     * built in the test that needs it, or a real set somebody committed.
     */
    const found: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'out', 'release', 'dist'].includes(entry.name)) continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) { await walk(path); continue; }
        if (/^pictograms\.[a-z]{2,3}\.json$/.test(entry.name)) found.push(path);
      }
    };
    await walk(root);
    expect(found).toEqual([]);
  });
});
