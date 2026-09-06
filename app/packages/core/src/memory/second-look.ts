import { createHash } from 'node:crypto';
import { jobLearnerDir } from '../vault/paths.js';
import { parseFrontMatter, stringifyFrontMatter } from '../vault/parse.js';

/**
 * «¿Me lo miras antes de firmarlo?» (030 US2, FR-2808…2811).
 *
 * ## The question that has no answer today
 *
 * The persona review found it verbatim from a tutor: she has a draft exam for a learner
 * she shares with the PT, and she wants a second pair of eyes before she signs. Today the
 * answer is «por el pasillo, en papel» — and what comes back is spoken, so it is remade
 * next term.
 *
 * ## What binds a review to a draft, and why it is a hash
 *
 * A review is corrections about **one revision of one document**. She may have re-run the
 * adaptation while her colleague was reading it, and then the corrections are about a
 * sheet that no longer exists. So the packet carries a fingerprint of what travelled, and
 * a mismatch is **declared** — «estas correcciones eran sobre la revisión 3; vas por la
 * 4» — with the corrections still offered. Never silently attached to the current
 * revision: that is the one outcome where she would apply somebody's judgement about a
 * paragraph that has already changed.
 *
 * The hash is the only stored derivative, and it earns its place the same way the corpus
 * activation hash does: without it, «is this still the sheet you read?» needs a second
 * copy of the document or is unanswerable.
 *
 * ## And it is written down, because a correction not written down is remade
 *
 * `instructions/review.md`'s own warning, applied to the case where the corrector is not
 * the person who will act on it. `second-look.md` sits beside the sheet it is about.
 */

export const fingerprint = (document: string): string =>
  createHash('sha256').update(document, 'utf8').digest('hex').slice(0, 16);

export const secondLookPath = (job: string, code: string): string =>
  `${jobLearnerDir(job, code)}/second-look.md`;

export interface SecondLook {
  /** Who says they looked. A claim, like every role in a packet. */
  by: string;
  date: string;
  /** The revision the corrections were about. */
  revision: number;
  /** The fingerprint of what they read. */
  fingerprint: string;
  /** Which packet file it arrived in, so she can find it again. */
  packet: string;
  corrections: string[];
}

export function renderSecondLook(look: SecondLook): string {
  return stringifyFrontMatter(
    {
      by: look.by, date: look.date, revision: look.revision,
      fingerprint: look.fingerprint, packet: look.packet,
      corrections: look.corrections,
    },
    [
      `# Lo que ${look.by} vio en esta hoja`,
      '',
      `Sobre la revisión ${look.revision}, el ${look.date}. Llegó en \`${look.packet}\`.`,
      '',
      ...look.corrections.map((c) => `- ${c}`),
      '',
    ].join('\n'));
}

export function parseSecondLook(raw: string, file = 'second-look.md'): SecondLook | null {
  const { data } = parseFrontMatter(raw, file);
  const by = str(data['by']);
  if (!by) return null;
  return {
    by,
    date: str(data['date']) ?? dateish(data['date']) ?? '',
    revision: typeof data['revision'] === 'number' ? data['revision'] : 1,
    fingerprint: str(data['fingerprint']) ?? '',
    packet: str(data['packet']) ?? '',
    corrections: (Array.isArray(data['corrections']) ? data['corrections'] : [])
      .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
      .map((c) => c.trim()),
  };
}

export type FingerprintVerdict =
  | { of: 'same' }
  /** Declared, never silent — and the corrections are still offered (FR-2811). */
  | { of: 'moved'; say: string };

/**
 * Do these corrections still describe the sheet in front of her?
 *
 * The sentence names **both** revisions, because «no coinciden» leaves her to work out
 * what changed and in which direction. What she needs to decide is whether a correction
 * about the old paragraph still applies to the new one, and she can only decide that
 * knowing which is which.
 */
export function checkFingerprint(
  look: Pick<SecondLook, 'revision' | 'fingerprint'>,
  current: { revision: number; document: string },
): FingerprintVerdict {
  if (look.fingerprint === fingerprint(current.document)) return { of: 'same' };
  return {
    of: 'moved',
    say: `Estas correcciones eran sobre la revisión ${look.revision} y vas por la `
      + `${current.revision}. Te las enseño igual: mira si siguen valiendo para lo que `
      + 'tienes ahora, porque no las voy a aplicar como si fueran sobre esta.',
  };
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function dateish(v: unknown): string | undefined {
  return v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10) : undefined;
}
