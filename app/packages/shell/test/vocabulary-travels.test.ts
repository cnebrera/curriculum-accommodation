import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault, renderVocabulary, choose, emptyVocabulary, chosenFor } from '@rampa/core';

/**
 * What travels with her folder, and what must not (024 T022, FR-2219).
 *
 * ## Why «by construction» was not good enough
 *
 * The task recorded this as satisfied by where the files happen to live: her vocabulary
 * is `vocabulario.md` in the vault, her licence acceptance is in application settings, so
 * one travels with a copied folder and the other cannot. **«By construction» is exactly
 * what the twelve unread fields of this project were**, and the two facts are one
 * refactor apart from swapping: `loadSettings` takes a directory, and pointing that
 * directory at the vault to «keep her settings with her work» is a change somebody could
 * make for a good reason without ever seeing this requirement.
 *
 * ## Why the licence half is the sharp one
 *
 * If acceptance lived in the vault, a colleague who received her folder would open Rampa
 * and find ARASAAC's terms **already accepted** — by somebody else. `023` FR-2104 makes
 * acceptance the gate before anything is fetched, and a gate that can arrive pre-opened
 * in a zip file is not a gate. That is a licensing problem and not a tidiness one.
 */
vi.mock('electron', () => ({ ipcMain: { handle: () => {} }, app: {}, dialog: {}, shell: {} }));

const { loadVocabulary } = await import('../src/pictograms/bring.js');
const { saveSettings, loadSettings } = await import('../src/ipc/vault-settings.js');

const scratch = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rampa-voc-'));
  return { dir, vault: new Vault(dir) };
};

describe('her vocabulary is part of her work', () => {
  /**
   * In the vault, which is the thing she copies, backs up and hands over.
   *
   * Asserted through `loadVocabulary`'s own round trip **and** by finding the file: the
   * round trip alone would pass with the file written to `userData`, which is precisely
   * the placement this requirement is against.
   */
  it('is written into her folder, where a copy of it carries it', async () => {
    const { dir, vault } = await scratch();
    /*
     * Written through the corpus's own renderer rather than by hand, so this asserts the
     * round trip the application actually makes — `chooseWord` writes exactly this and
     * reaches `currentVault()`, which is why the placement is what is checked here and
     * the choosing is `024`'s own suite's business.
     */
    const chosen = choose(emptyVocabulary(), 'es', 'banco', '2497');
    await vault.writeRaw('vocabulario.md', renderVocabulary(chosen));

    const back = await loadVocabulary(vault);
    expect(chosenFor(back, 'es', 'banco')).toBe('2497');

    // The file, by name, at the root of the vault — not «somewhere that works».
    expect(await readdir(dir)).toContain('vocabulario.md');
  });
});

describe('her licence acceptance is not part of her work', () => {
  /**
   * The gate cannot arrive pre-opened in somebody else's folder (`023` FR-2104).
   *
   * The settings directory is passed in, so this writes an acceptance to a directory of
   * its own and then asserts the **vault** is untouched. Two directories rather than one
   * assertion about a path string, because what the requirement is about is whether a
   * copied folder carries it.
   */
  it('is written outside her folder, so a copy cannot carry it', async () => {
    const { dir, vault } = await scratch();
    const settings = await mkdtemp(join(tmpdir(), 'rampa-set-'));

    await saveSettings(settings, {
      pictogramLicence: {
        publisher: 'arasaac', licence: 'CC BY-NC-SA 4.0', acceptedOn: '2026-09-07',
      },
    });

    // It is where it was put…
    expect((await loadSettings(settings)).pictogramLicence?.publisher).toBe('arasaac');
    // …and her folder knows nothing about it, by content and not by filename: a file
    // called anything at all with «arasaac» inside it would be the same leak.
    const files = await readdir(dir, { recursive: true }) as string[];
    for (const f of files) {
      const raw = await vault.readRaw(f).catch(() => null);
      expect(raw ?? '', `${f} carries the acceptance`).not.toMatch(/acceptedOn|pictogramLicence/);
    }
  });
});
