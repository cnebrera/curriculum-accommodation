import { load as loadYaml } from 'js-yaml';
import { resolveDocument, whyNoDocument, RampaError, parseIR, findProbableNames } from '@rampa/core';
import { renderJob } from '../jobs/print.js';
import { signDocument } from '../ipc/signoff.js';
import { handle } from '../ipc/wrap.js';
import { ensayoVault, ensayoState, advance, discard, type EnsayoState } from './store.js';
import { sampleManifest } from './sample.js';

/**
 * The rehearsal's channels (035 T008, FR-3301/3302/3303).
 *
 * ## Served, not faked
 *
 * The two steps that would cost money — reading the photo and adapting the sheet — are
 * **served from the authored sample**, behind a progress display that says «simulado».
 * There is no fake `Provider`, no entry in the credential store and no adapter that
 * returns canned text.
 *
 * The difference matters. A fake provider is a real provider-shaped object one refactor
 * away from being registered for real work, and it would put «pretend» inside the layer
 * whose entire job is to be the one place a request can leave from. Serving a document
 * instead keeps the fiction outside the machinery: everything downstream — the render,
 * the sign-off, the record — is the real code, running over a different vault.
 *
 * ## What this module may not import
 *
 * `@rampa/providers`, `ipc/keys.js`, `ipc/vault.js`, `ipc/cost.js`. Asserted by
 * `ensayo-boundary.test.ts`, because «the rehearsal is offline» is a claim about every
 * future edit and not about today's code. The one somebody would add in good faith is
 * «and let the model suggest a second version» — genuinely useful, and it would hand a
 * teacher on her first night, who by definition has no key, an error she cannot read.
 */
export function registerEnsayoIpc(): void {
  /** Is there a rehearsal in progress, and how far did she get? Costs nothing. */
  handle('ensayo:state', async (): Promise<EnsayoState | null> => ensayoState());

  /**
   * Start, or come back to one already open.
   *
   * `startedAt` from the caller: this module reads no clock, for the same reason nothing
   * else in this repository does — a value the process invents is a value no test can
   * assert.
   */
  handle('ensayo:start', async (startedAt: string) => {
    await ensayoVault(startedAt);
    return ensayoState();
  });

  /** She finished, or she connected a real service. The root goes, entirely (FR-3308). */
  handle('ensayo:discard', async () => { await discard(); return true; });

  handle('ensayo:advance', async (step: EnsayoState['step']) => { await advance(step); return true; });

  /**
   * The reading, as it came out of the photo — **with its one authored flaw** (FR-3310).
   *
   * Served rather than produced, and the progress the screen shows says so. What she does
   * with it is the real verification screen over the rehearsal vault: the flaw is there
   * to be found, which is the only way that screen teaches anything.
   */
  handle('ensayo:reading', async (startedAt: string) => {
    const vault = await ensayoVault(startedAt);
    const raw = await vault.readRaw('material/ensayo-1/ir.md');
    if (raw === null) {
      throw new RampaError('vault-unreadable',
        'No encuentro el material de ejemplo. Vuelve a empezar el ensayo.');
    }
    return { markdown: raw, blocks: parseIR(raw).blocks.length };
  });

  /**
   * The adaptation, pre-computed, with its genuine report.
   *
   * Resolved through `resolveDocument` over the rehearsal vault — the same function the
   * real path uses, so the draft mark, the sign-off and «this document belongs to this
   * learner» all behave exactly as they will when she connects a service.
   */
  handle('ensayo:adaptation', async (startedAt: string) => {
    const vault = await ensayoVault(startedAt);
    const found = await resolveDocument(vault, 'ensayo-1', 'E00');
    if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));
    return {
      path: found.path,
      markdown: (await vault.readRaw(found.path)) ?? '',
      report: (await vault.readRaw('material/ensayo-1/E00/report.md')) ?? '',
    };
  });

  /**
   * What a real run would have cost (FR-3303).
   *
   * From the sample's manifest, in `006` FR-403's register, and **written to no ledger**:
   * her real month badge does not move, and the rehearsal root has no ledger file at all.
   * A would-be cost is an estimate, and an estimate recorded as a charge is a lie about
   * money — which is the one kind of lie a teacher checks.
   */
  handle('ensayo:wouldCost', async () => {
    const manifest = loadYaml(await sampleManifest()) as
      { wouldCost: { readCents: number; adaptCents: number } };
    return manifest.wouldCost;
  });

  /**
   * Signing and printing, for real, over the rehearsal vault (T014, FR-3305/3311).
   *
   * The **existing** sign-off and the existing renderer, pointed at the other root — which
   * is what T003's vault parameter is for. So the draft mark is derived from the document
   * and removed only by a signature, the printed PDF says «material de ejemplo» because
   * the document does, and none of that needed a rehearsal branch anywhere in the render
   * path.
   *
   * That is also the honest lesson: what she rehearses is the real gesture. A signature in
   * this application means somebody read the sheet, and a rehearsal that skipped it would
   * teach her that the signature is a formality.
   */
  handle('ensayo:sign', async (startedAt: string, role: string) => {
    const vault = await ensayoVault(startedAt);
    /*
     * `signDocument`, not a second write. `untrusted.test.ts` enumerates every file that
     * may mention signing and caught this the moment it duplicated `stampSignedOff` — a
     * second way to unmark a document is a signature that stops meaning anything, and a
     * rehearsal is exactly where somebody would think a copy was harmless.
     */
    const result = await signDocument(vault, 'ensayo-1', 'E00', role, startedAt.slice(0, 10));
    await advance('signed');
    return result;
  });

  handle('ensayo:render', async (startedAt: string) => {
    const vault = await ensayoVault(startedAt);
    const { html } = await renderJob('ensayo-1', 'E00', vault);
    await advance('printed');
    return html;
  });

  /**
   * The name question, offline (FR-3308, FR-3311).
   *
   * The **real** deterministic detector from `core`, over whatever she typed. It is the
   * gate she will meet on her first real note, so meeting it here is the point — and the
   * rehearsal can say the other half out loud: nothing was sent anywhere, because there
   * is nowhere to send it.
   */
  handle('ensayo:checkNames', async (text: string) => ({
    found: findProbableNames(text),
  }));
}
