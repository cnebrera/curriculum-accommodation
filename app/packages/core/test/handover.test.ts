import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { buildPacket, packetToMarkdown, toShareable, isStale, type Packet } from '../src/memory/handover.js';
import type { LoadedLearner } from '../src/vault/profile.js';

/**
 * The audit of handover (004 T001-T005).
 *
 * **Fourteen requirements, zero citations anywhere in `app/`** — and
 * `handover.ts` implements a good deal of them. That is the worst of the three
 * states these audits keep finding: code with no trace to the requirement it
 * serves, so nobody can say which requirements it meets and nobody notices when
 * it stops.
 *
 * Principle V is why this is delicate. A packet is where a description of one
 * child crosses to a teacher who has never met them, and the failure mode is not
 * a leak — it is a **label**. Every mechanism below exists to *weaken* the
 * packet's authority, not to strengthen it: some children change precisely
 * because last year's adaptation worked.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

const learner = (over: Record<string, unknown> = {}): LoadedLearner => ({
  profile: {
    code: 'PER-abc',
    axes: { COG: 3, EJE: 2 },
    axes_confirmed: { COG: '2026-02-14' },
    works: ['Le funciona hacer el primer ejercicio conmigo, en voz alta'],
    avoid: ['Nada con cuenta atrás'],
    interests: ['dinosaurios'],
    response: { default: 'short' },
    language: { instruction: 'es' },
    ...over,
  },
  notes: '## 2026-03-01\n\nLas casillas no le funcionan.\n',
} as unknown as LoadedLearner);

describe('FR-301/FR-306 · the packet is prose first', () => {
  it('reads as a document, with no tooling of ours needed', () => {
    /*
     * The markdown is the product; the JSON is an implementation detail. Most
     * receiving teachers will not have this application — a packet that needs it
     * to be read is a packet that does not arrive.
     */
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Empieza mejor si el primer paso ya está hecho.'));
    expect(md.startsWith('# Traspaso')).toBe(true);
    expect(md).toContain('Empieza mejor si el primer paso ya está hecho');
    // A table a person can read, not a serialisation.
    expect(md).toMatch(/\| Qué \| Cómo lo sé \| Desde \| Estado \|/);
  });

  it('leads with the sentence that limits it, before any claim', () => {
    /*
     * The most important line in the document, and its position is the point.
     * A packet believed wholesale means the new teacher stops observing, and a
     * child is held inside last year's description of them.
     */
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    const warning = md.indexOf('no un diagnóstico');
    const firstClaim = md.indexOf('| COG');
    expect(warning).toBeGreaterThan(-1);
    expect(warning, 'the limit must come before the claims').toBeLessThan(firstClaim);
    expect(md).toMatch(/hipótesis/i);
    // And it says the uncomfortable thing: a claim that no longer fits may mean
    // the child changed, not that the previous teacher was wrong.
    expect(md).toMatch(/el niño ha cambiado/i);
  });

  it('carries every claim from the profile', () => {
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    const texts = p.claims.map((c) => c.text).join(' | ');
    expect(texts).toContain('COG = 3');
    expect(texts).toContain('primer ejercicio conmigo');
    expect(texts).toContain('cuenta atrás');
  });

  it('does NOT carry the dated notes, which FR-301 asks for', () => {
    /*
     * A finding, recorded as a failing expectation would be dishonest — so it is
     * recorded as a passing one that documents the gap.
     *
     * FR-301 asks for "profile, notes, a plain-language summary and a reference to
     * the official adaptation document". `buildPacket` takes the notes in its
     * argument and uses only the profile. The summary is where she would write
     * the narrative by hand, which is *arguably* the better design — a raw dump
     * of a year of notes is exactly the label this spec is trying to avoid — but
     * it is not what the requirement says, and the difference should be decided
     * rather than inherited.
     */
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    expect(p.claims.map((c) => c.text).join(' ')).not.toContain('casillas');
  });
});

describe('FR-302 · every claim says how it is known', () => {
  it('carries an evidence marker on every claim, and a date or an honest blank', () => {
    /*
     * FR-302 says "a date", and an axis that was never confirmed has none. The
     * requirement's intent is that she can tell *how old* the claim is — and "no
     * date" answers that better than a date nobody set, which is the fabrication
     * FR-303's fix removed.
     *
     * So: a real date, or empty. Never a plausible-looking invention.
     */
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    for (const c of p.claims) {
      expect(['observed', 'inferred', 'reported']).toContain(c.evidence);
      expect(c.date, `${c.text} has a date that is not a date`)
        .toMatch(/^(\d{4}-\d{2}-\d{2})?$/);
    }
    // And what does have a date has a real one.
    expect(p.claims.find((c) => c.text === 'COG = 3')!.date).toBe('2026-02-14');
  });

  it('renders the marker in her words, not as an enum', () => {
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(md).toMatch(/observado|deducido|me lo contaron/);
    expect(md).not.toMatch(/\bobserved\b|\binferred\b|\breported\b/);
  });

  it('marks everything unconfirmed, because it is', () => {
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    expect(p.claims.every((c) => c.confirmation === 'unconfirmed')).toBe(true);
    expect(packetToMarkdown(p)).toContain('sin confirmar');
  });

  /**
   * Named rather than asserted, because it cannot be asserted.
   *
   * `buildPacket` marks every claim `observed`, including axis levels — a claim
   * about *how the sending teacher knew*, which the application cannot know. A
   * level she inferred from one lesson and one she watched for a term both come
   * out as "observado".
   *
   * A test can check the marker exists. Only a human can check it is true, and
   * FR-302's value depends on the human doing so.
   */
  it('marks everything observed, which is a claim the application cannot verify', () => {
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    expect(p.claims.every((c) => c.evidence === 'observed')).toBe(true);
  });
});

describe('FR-303 · an axis says when it was last confirmed', () => {
  it('uses the recorded date where there is one', () => {
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    expect(p.claims.find((c) => c.text === 'COG = 3')!.date).toBe('2026-02-14');
  });

  /**
   * The defect this audit found.
   *
   * The fallback was `?? today()`. An axis nobody ever confirmed came out stamped
   * with **today's date** — so the receiving teacher read "confirmed today" for a
   * claim that had never been confirmed at all, on the one field whose entire job
   * is to say how old the claim is.
   *
   * It is the same class of mistake the credential store deliberately avoided:
   * *"Empty rather than today's date: claiming we checked it this morning would be
   * a fabrication on the one screen whose job is to report that fact."* Written
   * there, missed here.
   */
  it('says nothing rather than inventing a date for an unconfirmed axis', () => {
    const p = buildPacket(learner(), '2026-2027', 'Resumen.');
    const eje = p.claims.find((c) => c.text === 'EJE = 2')!;
    expect(eje.date, 'an unconfirmed axis was stamped with a date').toBe('');
  });

  it('shows the absence on the page, rather than a blank cell', () => {
    // A blank in a table reads as a rendering fault. "sin fecha" reads as a fact,
    // and it is the fact she needs: nobody has confirmed this.
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(md).toMatch(/sin fecha/);
  });
});

describe('FR-311/FR-312/FR-313 · what the packet is and is not', () => {
  const packet = (year: string): Packet => buildPacket(learner(), year, 'Resumen.');

  it('is stale a year on, because a year-old description is history', () => {
    expect(isStale(packet('2025-2026'), '2026-2027')).toBe(true);
    expect(isStale(packet('2026-2027'), '2026-2027')).toBe(false);
  });

  it('does not guess at a malformed year rather than calling it fresh or stale', () => {
    expect(isStale(packet('el curso pasado'), '2026-2027')).toBe(false);
  });

  it('carries no way to turn the code back into a child', () => {
    /*
     * FR-312. Re-identification is a human act at the school: the receiving
     * teacher is told by a person which child `PER-abc` is. Putting the mapping
     * in the packet would make the packet the thing that must not be lost, and it
     * would travel by email.
     */
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(md).toContain('PER-abc');
    expect(md).not.toMatch(/nombre|name|apellido/i);
    const json = JSON.stringify(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(json).not.toMatch(/nombre|apellido/i);
  });

  it('says it supplements the official file and does not replace it', () => {
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(md).toMatch(/acompaña/);
    expect(md).toMatch(/no lo sustituye/);
  });
});

describe('FR-304 · the shareable variant, and what it turned out to be', () => {
  /**
   * `toShareable` strips **every** claim and the summary, so it can only ever
   * return an empty packet.
   *
   * That is not a bug in the function; it is what the concept means here. A
   * handover packet is *entirely* about one learner, so a variant "containing no
   * learner-scope material" is empty by definition. The requirement belongs to
   * `003`'s corpus export, where there is genuinely non-learner material to
   * share, and not to a document whose whole subject is a child.
   *
   * Kept and asserted rather than deleted, because it is the honest boundary: a
   * caller reaching for it should get nothing, loudly.
   */
  it('returns an empty packet, which is the only correct answer here', () => {
    const shareable = toShareable(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(shareable.claims).toEqual([]);
    expect(shareable.summary).toBe('');
    expect(shareable.containsLearnerScope).toBe(false);
  });

  it('keeps the code, which is the one thing left, and nothing else', () => {
    const shareable = toShareable(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(JSON.stringify(shareable)).not.toContain('cuenta atrás');
    expect(JSON.stringify(shareable)).not.toContain('primer ejercicio');
  });
});

describe('the receiving half does not exist, and the packet says so', () => {
  /**
   * FR-307 to FR-310 and FR-314 — import, confirmation state, disconfirmation
   * with history, surfacing what stayed unconfirmed, and declining the
   * inheritance — are **absent**. All five are about *receiving*, which the spec
   * calls the hard half and which is the half that protects a child from being
   * held inside last year's description.
   *
   * Deferred with a reason in `contracts/coverage.md`. What must not happen is a
   * packet that reads as though importing it is supported, because then a
   * receiving teacher believes a document that nothing has weakened.
   */
  it('has no import path anywhere', () => {
    const core = readFileSync(join(repoRoot, 'app/packages/core/src/memory/handover.ts'), 'utf8');
    expect(core).not.toMatch(/importPacket|parsePacket|confirmClaim|declineInheritance/);
  });

  it('tells the receiving teacher what to do without this application', () => {
    /*
     * The mitigation for the missing half, and it has to be *in* the document:
     * she is reading prose in an email, and nothing else will reach her.
     */
    const md = packetToMarkdown(buildPacket(learner(), '2026-2027', 'Resumen.'));
    expect(md).toMatch(/primeras semanas/i);
    expect(md).toMatch(/confirmar/i);
  });
});

/* ── FR-304/305 · review before sending ─────────────────────────────────── */

describe('FR-305 · nothing leaves without her review', () => {
  const ui = join(repoRoot, 'app/ui/src/learners/HandoverReview.tsx');
  const src = readFileSync(ui, 'utf8');

  it('has a screen at all', () => {
    /*
     * `buildPacket` and `packetToMarkdown` existed and were good. What did not
     * exist was any way for her to review the packet — so a handover either did
     * not happen, or happened unreviewed. The second is worse: a document about a
     * child, sent to a colleague, that nobody checked.
     */
    expect(src).toMatch(/handoverDraft/);
    expect(src).toMatch(/handoverWrite/);
  });

  it('drops what she removed rather than marking it', () => {
    /*
     * FR-304's second half. A claim carried along with a "removed" flag is a
     * claim in a document she is about to email — the flag protects nothing once
     * the file leaves.
     */
    const handler = readFileSync(join(repoRoot, 'app/packages/shell/src/ipc/memory.ts'), 'utf8');
    expect(handler).toMatch(/claims: full\.claims\.filter\(\(c\) => kept\.has\(c\.text\)\)/);
  });

  it('puts the limiting sentence above the claims she is reviewing', () => {
    // It is also the frame she should be reviewing *within*, so its position is
    // not decoration.
    const warning = src.indexOf('Esto no es un diagnóstico');
    const claims = src.indexOf('Lo que iría en el documento');
    expect(warning).toBeGreaterThan(-1);
    expect(warning).toBeLessThan(claims);
  });

  it('refuses to prepare a packet with no summary', () => {
    /*
     * Without it the document is a table of axis codes, which helps nobody and
     * reads as exactly the label this spec exists to prevent. The button is
     * disabled and the reason is on screen rather than left as a mystery.
     */
    expect(src).toMatch(/disabled=\{!summary\.trim\(\)/);
    expect(src).toMatch(/tabla de códigos/);
  });

  it('does not offer the shareable variant, which could only ever be empty', () => {
    const handler = readFileSync(join(repoRoot, 'app/packages/shell/src/ipc/memory.ts'), 'utf8');
    // The flag is gone from the IPC surface: offering her a button whose only
    // possible output is nothing is worse than not having it.
    expect(handler).not.toMatch(/shareable: boolean/);
    expect(src).not.toMatch(/shareable/);
  });

  it('writes it where she can attach it, as a file that needs no tooling', () => {
    const handler = readFileSync(join(repoRoot, 'app/packages/shell/src/ipc/memory.ts'), 'utf8');
    expect(handler).toMatch(/VAULT\.handover/);
    expect(handler).toMatch(/writeRaw\(path, markdown\)/);
  });
});

