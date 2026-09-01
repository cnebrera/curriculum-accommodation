import { jobAdapted, jobIR } from './paths.js';
import type { Vault } from './io.js';
import { parseIR } from '../ir/parse.js';
import { isGenerated } from '../ir/types.js';

/**
 * Which document is «the document» of a job (021 T003-T005, contracts/document.md).
 *
 * ## The defect this replaces
 *
 * `material/<job>/<learner>/adapted.md` was hard-coded in **eight** places, so printing,
 * exporting, signing off and correcting could only ever be done to an adaptation. A
 * document Rampa had **composed** — for that child, from his objectives, at his level —
 * existed in her folder and there was not one thing the application could do with it.
 *
 * Carlos found it with a sheet he wanted for tomorrow: «he preparado material, pero no
 * hay visualizador o botón de descarga».
 *
 * That is Principle IV failing on its own terms. «One extraction, N outputs» says every
 * modality is a rendering of the same document; one composition had **zero** outputs.
 *
 * ## No new stored fact
 *
 * A composed job already records who it was for, so this needs nothing added to any file.
 * That matters beyond tidiness: a new field would be absent from every job already in a
 * vault, so the feature would work only for material made after it shipped — which for a
 * teacher who has already composed something is the same limbo with a newer date on it.
 */

export type ResolvedDocument =
  | {
      of: 'adapted';
      path: string;
      job: string;
      /** From the directory: an adaptation is per learner by construction. */
      learner: string;
    }
  | {
      of: 'composed';
      path: string;
      job: string;
      /**
       * From the front matter, and **optional on purpose**.
       *
       * Every job composed before `020`/`021` records nobody. Those still resolve, render
       * with the default presentation, and say so — refusing them would be this feature's
       * own limbo with a newer date on it.
       */
      learner?: string;
    }
  | {
      of: 'none';
      job: string;
      /**
       * Which kind of nothing, because they are different sentences to a teacher.
       *
       * Before this, both produced «Este trabajo todavía no está adaptado» — which for
       * composed material was simply false, and is how the whole defect was found.
       */
      because: 'not-adapted-for-this-learner' | 'no-document-at-all';
    };

/**
 * Who a job was started for.
 *
 * `for_learner` is the name (`020` T006) and `composed_for` is the older spelling that
 * `002` has been writing — accepted, because a vault written last week has documents in
 * it. The same accommodation `isGenerated` makes for `kind: generated`.
 *
 * Implemented here rather than in `020` because `021` arrived first and needed it; two
 * functions answering «who was this job started for?» is the defect both specifications
 * were written to avoid (`021` research R2).
 */
export function startedFor(frontMatter: Record<string, unknown>): string | undefined {
  for (const key of ['for_learner', 'composed_for']) {
    const v = frontMatter[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

export async function resolveDocument(
  vault: Vault, job: string, learner?: string,
): Promise<ResolvedDocument> {
  if (learner) {
    const path = jobAdapted(job, learner);
    // An adaptation wins when one exists: she adapted it for this learner, so that is
    // the document for this learner. The composition stays reachable in its own right.
    if (await vault.exists(path)) return { of: 'adapted', path, job, learner };
  }

  const irPath = jobIR(job);
  const raw = await vault.readRaw(irPath);
  if (raw !== null) {
    const doc = parseIR(raw);
    /*
     * **Only a composition, never an ingested reading.**
     *
     * `ir.md` holds both: what Rampa read from a photograph, and what Rampa wrote from
     * objectives. The first is not material she can hand out — it has not been through
     * the verification gate or an adaptation, and printing it would be printing the
     * extraction. `isGenerated` is the existing distinction and it already accepts the
     * older spellings.
     */
    if (isGenerated(doc)) {
      const who = startedFor(doc.frontMatter);
      /*
       * A composition belongs to the child it was composed for.
       *
       * Asked about **another** learner, the answer is «not adapted for this learner» —
       * not this composition. Handing back a sheet written for Lucía when she asked
       * about Marco would be worse than returning nothing, because it would print.
       */
      if (learner && who && who !== learner) {
        return { of: 'none', job, because: 'not-adapted-for-this-learner' };
      }
      return { of: 'composed', path: irPath, job, ...(who ? { learner: who } : {}) };
    }
    // There is a document, it is a reading, and she asked about a learner it was never
    // adapted for. That is the first sentence, not the second.
    if (learner) return { of: 'none', job, because: 'not-adapted-for-this-learner' };
  }

  return {
    of: 'none',
    job,
    because: learner && raw !== null
      ? 'not-adapted-for-this-learner'
      : 'no-document-at-all',
  };
}

/**
 * Her sentence for a document that is not there.
 *
 * Here rather than in each caller so the two cases cannot drift into one — which is what
 * had happened: eight places said «todavía no está adaptado», including for material
 * that was composed and needed no adaptation at all.
 */
export function whyNoDocument(d: Extract<ResolvedDocument, { of: 'none' }>): string {
  return d.because === 'not-adapted-for-this-learner'
    ? 'Todavía no has adaptado este material para este alumno.'
    : 'Este trabajo no tiene ningún documento todavía.';
}
