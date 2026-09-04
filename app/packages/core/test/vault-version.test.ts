import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Vault, VAULT, vaultSchema, bumpVaultSchema, vaultIsNewer,
  VAULT_SCHEMA_V1, VAULT_SCHEMA_CUR_AREAS, VAULT_SCHEMA_CURRENT,
} from '../src/index.js';

/**
 * The vault says what shapes it holds (P50 / COLA 1.17, `032` T003, research R5).
 *
 * ## What this is for, before anything needs it
 *
 * The review approved three stored-format changes — CUR per area, a second
 * freshness axis, pictogram popularity — and nobody had checked whether a vault
 * can be migrated. It could not even be *asked*: no marker anywhere in the vault
 * or in a profile, and the one migration in the whole repository is the credential
 * store's, outside the vault.
 *
 * What existed instead was tolerance by repair, which covers a malformed field and
 * **hides** a change of shape: a reader that does not know `cur_areas` repairs it
 * away and writes the profile back without it. On a vault shared over OneDrive
 * between a PT and a tutor with different builds installed, the older one
 * overwrites the newer one's work and nothing can detect it.
 *
 * So the tests here are about the three properties that make the marker worth
 * having: absence means 1, bumping is monotonic and write-time only, and reading
 * never writes.
 */
let vault: Vault;

beforeEach(async () => {
  vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-ver-')), 'Rampa'));
});

describe('a vault with no marker', () => {
  it('is version 1, which is how every existing vault is already versioned', async () => {
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_V1);
  });

  it('is not written to by being asked', async () => {
    /*
     * The reason the bump is write-time. A version written on read would rewrite
     * vaults that gained nothing — and on a synced OneDrive or Drive folder that is
     * a conflict generator, from the act of opening the application.
     */
    await vaultSchema(vault);
    expect(await vault.exists(VAULT.version)).toBe(false);
  });
});

describe('bumping', () => {
  it('writes the integer where a person can read it', async () => {
    expect(await bumpVaultSchema(vault, VAULT_SCHEMA_CUR_AREAS)).toBe(VAULT_SCHEMA_CUR_AREAS);
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_CUR_AREAS);

    // Plain YAML in the app's own metadata directory: the vault stays readable
    // without tooling, and the marker does not clutter her files.
    const raw = await readFile(join(vault.root, '.rampa', 'vault.yaml'), 'utf8');
    expect(raw).toMatch(/schema:\s*2/);
  });

  it('never goes backwards', async () => {
    /*
     * The OneDrive case, and the one that would corrupt the marker itself: the
     * older application writes a version-1 profile into a vault that is at 2. If
     * this lowered the number, the newer build would stop looking for areas that
     * are still sitting in the other files.
     */
    await bumpVaultSchema(vault, 3);
    expect(await bumpVaultSchema(vault, VAULT_SCHEMA_CUR_AREAS)).toBe(3);
    expect(await vaultSchema(vault)).toBe(3);
  });

  it('does not rewrite the file when the vault is already there', async () => {
    await bumpVaultSchema(vault, VAULT_SCHEMA_CUR_AREAS);
    const before = await readFile(join(vault.root, '.rampa', 'vault.yaml'), 'utf8');
    await bumpVaultSchema(vault, VAULT_SCHEMA_CUR_AREAS);
    // Byte-identical rather than merely equal in value: a no-op write on a synced
    // folder is a sync event, and a sync event is a chance at a conflict.
    expect(await readFile(join(vault.root, '.rampa', 'vault.yaml'), 'utf8')).toBe(before);
  });
});

describe('a marker this build does not understand', () => {
  it('is reported, never refused', async () => {
    // Her work is in there. `014` already survives files it cannot fully parse, and
    // refusing to open a folder because of one integer would be the same mistake
    // with worse consequences.
    await bumpVaultSchema(vault, VAULT_SCHEMA_CURRENT + 1);
    expect(vaultIsNewer(await vaultSchema(vault))).toBe(true);
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_CURRENT + 1);
  });

  it('is version 1 when it is not an integer at all', async () => {
    // The marker is the application's own metadata. A file this module wrote being
    // unreadable is a fault to report to us, not a reason to stop her working.
    await vault.writeRaw(VAULT.version, '---\nschema: "dos"\n---\n');
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_V1);

    await vault.writeRaw(VAULT.version, 'no soy yaml del todo\n');
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_V1);
  });

  it('is version 1 for a number below 1, so the comparison is always safe', async () => {
    await vault.writeRaw(VAULT.version, '---\nschema: 0\n---\n');
    expect(await vaultSchema(vault)).toBe(VAULT_SCHEMA_V1);
  });
});

describe('what the version means is written down, not remembered', () => {
  it('names the shape each number stands for', () => {
    /*
     * One integer per shape change, named. A number with no name beside it is a
     * number the next person guesses at — and this one governs whether a profile
     * keeps a field or loses it.
     */
    expect(VAULT_SCHEMA_V1).toBe(1);
    expect(VAULT_SCHEMA_CUR_AREAS).toBe(2);
    expect(VAULT_SCHEMA_CURRENT).toBeGreaterThanOrEqual(VAULT_SCHEMA_CUR_AREAS);
    expect(vaultIsNewer(VAULT_SCHEMA_CURRENT)).toBe(false);
  });
});
