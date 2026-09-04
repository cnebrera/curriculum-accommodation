import { VAULT } from './paths.js';
import type { Vault } from './io.js';

/**
 * What shapes this vault contains (P50 / COLA 1.17, `032` T003, research R5).
 *
 * ## Why this exists before anything needs it
 *
 * The review proposed stored-format changes — CUR per area, a second freshness
 * axis, pictogram popularity — and nobody had checked whether a vault can be
 * migrated at all. It cannot, or rather it could not be *asked*: there was no
 * marker anywhere in the vault or in a profile, and the only migration written in
 * the whole repository is the credential store's, which is outside the vault.
 *
 * What existed instead was **tolerance by repair**: `schema.ts` keeps fields that
 * do not validate and `parse.ts` records `Repair`s. That covers a malformed field.
 * It does not cover a change of shape, and it hides one — a reader that does not
 * know `cur_areas` repairs it away and writes the profile back without it.
 *
 * The aggravating case is already accepted as real: a PT and a tutor sharing a
 * vault over OneDrive with different versions of the application installed. The
 * older one rewrites what the newer one wrote, and with no marker **nothing can
 * even detect it**. This module is what makes that detectable.
 *
 * ## The contract
 *
 * `.rampa/vault.yaml`, one integer, monotonic, compared with `>`. It answers
 * exactly one question: *does this vault contain shapes older readers do not
 * know?*
 *
 * - **Absent file means version 1.** Every existing vault is already versioned,
 *   without being touched, which is the only honest retrofit.
 * - **Bumped on the first write of a shape older readers do not know** — never on
 *   read, and never on install. A version bumped on read would rewrite vaults that
 *   gained nothing, and on a synced folder that is a conflict generator; a bump
 *   with no shape change behind it would make the marker cry wolf.
 * - Nothing here refuses to read anything. A vault from the future is reported,
 *   not rejected: her work is in there, and `014` already survives files it cannot
 *   fully parse.
 */

/** The version a vault with no marker is. */
export const VAULT_SCHEMA_V1 = 1;

/**
 * Profiles may carry `cur_areas` — a per-area curricular level beside the general
 * one (`032` FR-3005). An older reader keeps `axes` intact and simply does not see
 * the areas, which is why this is a version rather than a repair.
 */
export const VAULT_SCHEMA_CUR_AREAS = 2;

/** The newest shape this build knows how to write. */
export const VAULT_SCHEMA_CURRENT = VAULT_SCHEMA_CUR_AREAS;

/**
 * What this vault says it holds. `1` when it says nothing.
 *
 * A malformed or missing integer is version 1 rather than an error: the marker is
 * the application's own metadata, and refusing to open her folder because a file
 * this module wrote is unreadable would be a fault reported to the wrong person.
 */
export async function vaultSchema(vault: Vault): Promise<number> {
  const doc = await vault.readDoc(VAULT.version);
  const raw = doc?.data['schema'];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(n) && n >= VAULT_SCHEMA_V1 ? n : VAULT_SCHEMA_V1;
}

/**
 * Raise the marker to `atLeast`, and **only** if it is below it.
 *
 * Called from the write path of the shape that needs it, immediately before or
 * after writing it — never from a read, never at startup. Returns the version the
 * vault is at afterwards, so a caller can record what it wrote under.
 *
 * Monotonic by construction: a vault already at 3 stays at 3 when a version-2
 * shape is written into it. Going backwards is how the OneDrive case would corrupt
 * the marker itself — the older application writes a version-1 profile, and if
 * this function lowered the number, the newer one would stop looking for the
 * areas that are still in the other files.
 */
export async function bumpVaultSchema(vault: Vault, atLeast: number): Promise<number> {
  const current = await vaultSchema(vault);
  if (current >= atLeast) return current;
  await vault.writeDoc(VAULT.version, { schema: atLeast }, '');
  return atLeast;
}

/**
 * This vault holds shapes this build does not know about.
 *
 * The sentence belongs to whoever asks — a screen, or a handover packet's «esto se
 * escribió con una versión más nueva» line (`032` research R4). This only answers
 * the question, because a module in `packages/core` deciding what she reads is
 * Principle I's line, and because the same fact needs different words in a
 * profile screen and in an imported packet.
 */
export const vaultIsNewer = (schema: number): boolean => schema > VAULT_SCHEMA_CURRENT;
