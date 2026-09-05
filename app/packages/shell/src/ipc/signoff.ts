import { resolveDocument, RampaError, whyNoDocument, stampSignedOff, type Vault } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { refreshRecord } from './record.js';

/*
 * Moved from `jobs/` on 2026-08-30 (013 T019, FR-1111) — and it turned out there
 * was nothing to separate. The whole file was one IPC handler; it had never been
 * a job, it was wiring filed in the wrong drawer. The rule found that by being
 * applied rather than by anyone reading the file.
 */

/**
 * The ONLY way the draft mark comes off (007 FR-509).
 *
 * Not a rule the model is asked to follow — an operation it cannot reach. No
 * other IPC call clears it, and no model output can produce a document without
 * it.
 *
 * That last clause used to read "because the renderer only omits the banner when
 * this has run", and it was **false**: `job:render` accepted `signedOff` as a
 * parameter, so the banner could be omitted with no sign-off at all. The print
 * path now derives it from the document via `isSignedOff()`, which is what makes
 * the sentence above true. Found by `007`'s audit — the comment had been there,
 * unchallenged, since the handler was written.
 *
 * Sign-off is per (job × learner): approving Hugo's sheet says nothing about
 * Vega's, even when both came from the same worksheet (T092b).
 */
/**
 * `whichVault` is a parameter since `035` T003.
 *
 * **Only the IPC layer decides which vault** (research R2). Sign-off, printing and the
 * record all take one now, so the rehearsal runs the real code over its own root instead
 * of a parallel implementation — and the real handlers pass `currentVault()`, which is
 * why nothing about this changes behaviour.
 *
 * The alternative was an `ensayo` flag threaded through every job, and the difference is
 * not style: a flag that is `false` almost everywhere is a flag somebody forgets in one
 * place, and the one place would put a fictional child in a real caseload.
 */
export function registerSignoffIpc(whichVault: () => Vault = currentVault): void {
  handle('job:signOff', async (jobId: string, learnerCode: string, role: string) => {
    const vault = whichVault();
    /*
     * A signature is about **a document** (Principle VII), so she can sign a composition
     * without adapting it first (`021` T010, FR-1904). What she must not get is a
     * signature that travels: adapting a signed composition for three learners produces
     * three **unsigned** sheets, because nobody has read those.
     */
    const found = await resolveDocument(vault, jobId, learnerCode);
    if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));
    const path = found.path;
    const raw = (await vault.readRaw(path)) ?? '';
    const stamp = new Date().toISOString().slice(0, 10);
    // One writer of the block, in core (`stampSignedOff`). It was inline here until the
    // ACNS became signable too (P46) — and two spellings of `review.signed_off` is one
    // spelling that drifts, with `isSignedOff` the single reader that decides whether a
    // document announces itself as unreviewed. That drift fails open.
    await vault.writeRaw(path, stampSignedOff(raw, role, stamp));
    // A sign-off is one of FR-1215's three events: the record says «sin firmar»
    // beside this sheet and must stop.
    await refreshRecord(learnerCode);
    return { signedOff: true, date: stamp };
  });

  handle('job:isSignedOff', async (jobId: string, learnerCode: string) => {
    const vault = whichVault();
    const found = await resolveDocument(vault, jobId, learnerCode);
    if (found.of === 'none') return false;
    const raw = (await vault.readRaw(found.path)) ?? '';
    return /signed_off:\s*true/.test(raw);
  });
}
