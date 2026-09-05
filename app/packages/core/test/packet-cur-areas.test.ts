import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  buildPacket, packetToMarkdown, toShareable, validateWithRepair, vaultIsNewer,
  VAULT_SCHEMA_CUR_AREAS, VAULT_SCHEMA_CURRENT, VAULT_SCHEMA_V1,
  type Profile,
} from '../src/index.js';
import type { LoadedLearner } from '../src/vault/profile.js';

/**
 * Per-area CUR in a packet, both directions (032 T019, FR-3008, research R4, quickstart §5).
 *
 * ## No packet format change, and that is the design
 *
 * `004` already sends the profile as claims with evidence markers, and `030` sends
 * profile deltas with per-item acceptance. A pair is a profile fact, so it rides both as
 * one more claim. A packet-level `cur_areas` section of its own would be the two-copies
 * defect in transit: two places stating the same thing, drifting the first time one is
 * edited.
 *
 * ## What the older receiver sees, and why it is a sentence rather than luck
 *
 * A colleague whose build predates this feature imports a profile whose `cur_areas` is an
 * unknown key: carried verbatim, invisible in her screens, general value in effect. That
 * degrades to **less detail, never wrong detail** — which is R1's shape paying off. The
 * version marker is what stops it being silent: the packet states what it was written
 * under, so the receiving application can say what it is not showing.
 */
const learner = (cur_areas?: Record<string, 0 | 1 | 2 | 3>): LoadedLearner => ({
  profile: {
    code: 'M01', axes: { CUR: 2, COG: 1 }, works: ['Empezar el primero conmigo'],
    avoid: [], interests: [], response: {}, language: {},
    ...(cur_areas ? { cur_areas } : {}),
  } as unknown as Profile,
  notes: '', overlay: null, repairs: [],
});

const marco = learner({ 'Matemáticas': 2, 'Lengua': 0 });

describe('the pairs travel as the profile data they are', () => {
  const packet = buildPacket(marco, '2026-2027', 'Un curso bueno.', VAULT_SCHEMA_CUR_AREAS);

  it('one claim per pair, beside the axes', () => {
    const texts = packet.claims.map((c) => c.text);
    expect(texts).toContain('CUR en Matemáticas = 2');
    expect(texts).toContain('CUR en Lengua = 0');
    // The general is still its own claim: they are different facts, and the receiver
    // must be able to accept one and decline the other.
    expect(texts).toContain('CUR = 2');
  });

  it('and each is individually declinable, like every other claim', () => {
    /*
     * `004` FR-314 makes inheritance declinable item by item, and a pair is exactly the
     * size of thing she should be able to decline: «lo de Mates lo he visto yo, lo de
     * Lengua me lo contaron y prefiero mirarlo».
     */
    const kept = new Set(['CUR en Matemáticas = 2']);
    const reviewed = { ...packet, claims: packet.claims.filter((c) => kept.has(c.text)) };
    const md = packetToMarkdown(reviewed);
    expect(md).toContain('CUR en Matemáticas = 2');
    expect(md).not.toContain('CUR en Lengua = 0');
  });

  it('marked «apuntado en el perfil», never as something observed', () => {
    /*
     * The defect this project already had to remove once: `buildPacket` stamped
     * «observado» — the strongest of four — on 100% of claims, so the anti-anchoring the
     * whole of `004` exists for was inverted. A per-area value is a note she made, and
     * the packet says so.
     */
    const pairs = packet.claims.filter((c) => c.text.startsWith('CUR en '));
    expect(pairs.every((c) => c.evidence === 'from-profile')).toBe(true);
    expect(packetToMarkdown(packet)).toContain('apuntado en el perfil');
  });

  it('and undated, because nothing records when she wrote one', () => {
    // `axes_confirmed` has no per-area equivalent. Stamping today would be the exact
    // fabrication `noted_on` was fixed for: a claim made in October arriving dated now,
    // on the field whose whole job is to say how old it is.
    const pairs = packet.claims.filter((c) => c.text.startsWith('CUR en '));
    expect(pairs.every((c) => c.date === '')).toBe(true);
    expect(packetToMarkdown(packet)).toContain('sin fecha');
  });

  it('an área name is a subject, and the shareable packet still carries no claims', () => {
    // Nothing here exempts an área name from the packet's rules; `toShareable` empties
    // the claims wholesale, pairs included.
    const shared = toShareable(packet);
    expect(shared.claims).toEqual([]);
    expect(shared.containsLearnerScope).toBe(false);
  });

  it('a learner with no pairs produces exactly the claims she did before', () => {
    const plain = buildPacket(learner(), '2026-2027', '', VAULT_SCHEMA_V1);
    expect(plain.claims.some((c) => c.text.startsWith('CUR en '))).toBe(false);
    expect(plain.claims.map((c) => c.text)).toContain('CUR = 2');
  });
});

describe('the packet says which format it was written under', () => {
  it('states it, in the document she can read without this application', () => {
    expect(packetToMarkdown(buildPacket(marco, '2026-2027', '', VAULT_SCHEMA_CUR_AREAS)))
      .toContain('formato 2');
  });

  it('and a vault that never held a per-area value says 1', () => {
    expect(buildPacket(learner(), '2026-2027', '', VAULT_SCHEMA_V1).schema).toBe(1);
  });
});

describe('the receiver on an older build', () => {
  /** `profileSchema` as it was before this feature: no `cur_areas`, everything else same. */
  const oldSchema = z.object({
    code: z.string(),
    axes: z.record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
      .optional(),
    works: z.array(z.string()).optional(),
  });

  it('carries the pairs verbatim and has the general in effect', () => {
    const { value, unparsed } = validateWithRepair(oldSchema, {
      code: 'M01', axes: { CUR: 2 }, cur_areas: { 'Matemáticas': 2 }, works: [],
    }, 'profiles/M01/profile.yaml');

    // Less detail — the general value — and never wrong detail.
    expect(value.axes).toEqual({ CUR: 2 });
    // And not lost: an unknown key is preserved and written back on save.
    expect(unparsed['cur_areas']).toEqual({ 'Matemáticas': 2 });
  });

  it('and the mismatch is a sentence rather than a silence', () => {
    /*
     * `vaultIsNewer` is what turns «this build shows less» into something a person can
     * be told. It was exported from the day the marker was built and **called by
     * nothing** — a function written, typed and read by nobody, which is this
     * repository's most-found defect. Its readers are `vault:isNewer` and the caseload's
     * notice; this pins the answer they depend on.
     */
    expect(vaultIsNewer(VAULT_SCHEMA_CURRENT + 1)).toBe(true);
    expect(vaultIsNewer(VAULT_SCHEMA_CURRENT)).toBe(false);
    expect(vaultIsNewer(VAULT_SCHEMA_V1)).toBe(false);
  });

  it('and it is never a wall: the packet is still importable', () => {
    /*
     * `004` FR-314 makes inheritance declinable item by item. Refusing a whole packet
     * over a version number would take that choice from her — and the claims a newer
     * packet carries are ordinary text either way.
     */
    const packet = buildPacket(marco, '2026-2027', '', VAULT_SCHEMA_CURRENT + 1);
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packetToMarkdown(packet)).toContain('CUR en Matemáticas = 2');
  });
});
