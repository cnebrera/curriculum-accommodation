import { type BrowserWindow } from 'electron';
import {
  resolveDocument, whyNoDocument, jobDir, jobLearnerDir, listRevisions,
  restoreRevision, RampaError, type RevisionSite,
} from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { runTurn } from '../jobs/turn.js';
import { readTurns } from '../jobs/conversation.js';
import { refreshRecord } from './record.js';

/**
 * The conversation's three channels (026 T012/T015/T023,
 * `specs/026-la-conversacion/contracts/conversation.md`).
 *
 * Registered here and never by the job — `boundary.test.ts` holds that rule, and the
 * reason is that a job that registers its own channel is a job the UI can reach in ways
 * nobody enumerated.
 *
 * Every channel takes `{ job, learner? }`: the same pair `resolveDocument` answers for,
 * so «which document?» is decided in exactly one place.
 */

/**
 * One turn in flight per document (T012, the `023` single-download rule).
 *
 * Keyed **per document**, so a turn about Marco's sheet does not block a turn about
 * Lucía's — she works through a caseload, and a global lock would make the application
 * feel broken on the ordinary Tuesday it was built for.
 *
 * A second turn on the same document is refused rather than queued: the first one is
 * about to change the file the second would be sent, so queueing would send a document
 * that no longer exists.
 */
const inFlight = new Set<string>();

const keyOf = (job: string, learner?: string): string => `${job} ${learner ?? ''}`;

async function siteOf(job: string, learner?: string): Promise<RevisionSite> {
  const found = await resolveDocument(currentVault(), job, learner);
  if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));
  return found.of === 'adapted'
    ? { dir: jobLearnerDir(found.job, found.learner), stem: 'adapted' }
    : { dir: jobDir(found.job), stem: 'ir' };
}

export function registerConversationIpc(getWindow: () => BrowserWindow | null): void {
  handle('conversation:turn', async (job: string, learner: string | undefined, text: string) => {
    const key = keyOf(job, learner);
    if (inFlight.has(key)) {
      throw new RampaError('turn-in-flight',
        'Todavía estoy con el cambio anterior de este documento. Espera a que termine: '
        + 'si te dejo pedir otro ahora, el segundo se haría sobre una versión que ya no '
        + 'existe.');
    }
    inFlight.add(key);
    try {
      const result = await runTurn({
        job, ...(learner ? { learner } : {}), text,
        onProgress: (detail) =>
          getWindow()?.webContents.send('job:progress', { stage: 'Cambiando', detail }),
      });
      /*
       * The record follows the work (`014` FR-1215). A new revision is a thing that
       * happened to this learner's material, and «esto lo hice el año pasado» is the
       * question `014` exists to answer.
       */
      if (learner && result.outcome.kind === 'revision') await refreshRecord(learner);
      return result;
    } finally {
      // In a `finally`, so a throw does not leave the document locked for the session.
      inFlight.delete(key);
    }
  });

  /** Read-only and deterministic: it parses a file and lists files. Safe on every render. */
  handle('conversation:list', async (job: string, learner: string | undefined) => {
    const vault = currentVault();
    const site = await siteOf(job, learner);
    return {
      turns: await readTurns(vault, site),
      revisions: await listRevisions(vault, site),
      running: inFlight.has(keyOf(job, learner)),
    };
  });

  handle('conversation:restore', async (
    job: string, learner: string | undefined, revision: number,
  ) => {
    const vault = currentVault();
    const site = await siteOf(job, learner);
    try {
      const result = await restoreRevision(vault, site, revision);
      if (learner) await refreshRecord(learner);
      return result;
    } catch (e) {
      /*
       * She may have tidied the folder by hand — the vault permits it, so the channel
       * has to answer it rather than crash on it.
       */
      if (e instanceof Error && e.message.startsWith('revision-missing')) {
        throw new RampaError('revision-missing',
          `Ya no encuentro la versión ${revision} en tu carpeta. Las que quedan siguen `
          + 'ahí, y la que tenías abierta no la he tocado.');
      }
      throw e;
    }
  });
}
