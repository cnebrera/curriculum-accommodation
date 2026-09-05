import type { NormativeCorpus } from './parse.js';

/**
 * Which normativa, and how the document says so (029 T007, FR-2701/2702/2705/2706/2711).
 *
 * ## One place, because a provenance line assembled twice drifts once
 *
 * Every drafted document and every report prints where its vocabulary came from. That
 * line is built **here and nowhere else**, out of the corpus's own review status and an
 * origin the filesystem derived — so an unreviewed or locally-edited corpus cannot
 * print as reviewed by any route, including a caller that meant well.
 *
 * ## The precedence, and the one rung that is a refusal
 *
 * `learner ▸ configuración ▸ generic`, the `024` FR-2215 chain. Three of the four
 * outcomes are ordinary; the fourth is the one worth writing down:
 *
 * - the learner names a corpus that exists → hers;
 * - the learner says `none` → **generic, forced** — the child schooled across
 *   territories whose documents must not claim either one;
 * - Configuración names one that exists → that;
 * - Configuración names one that is **gone** → generic **with a notice**, and never a
 *   different corpus. Falling through to «the next one available» would silently draft
 *   a document under a territory she did not pick, which is the failure this whole
 *   feature exists to end, arriving from the inside.
 */

/** Where the file came from. Derived, never stored — a stored origin lies when copied. */
export type NormativeOrigin = 'bundled' | 'subido' | 'modificado';

export type ResolvedNormative =
  | {
      of: 'corpus';
      corpus: NormativeCorpus;
      origin: NormativeOrigin;
      /** Which rung chose it. The report says so when it was the learner's. */
      via: 'learner' | 'configuracion';
      provenanceLine: string;
    }
  | {
      of: 'generic';
      because: 'nothing-selected' | 'learner-override' | 'selected-missing';
      /** The name she picked, when it is gone — so the notice can say which. */
      missing?: string;
      provenanceLine: string;
    };

export interface NormativeInputs {
  /** `profile.normative_corpus`: a corpus id, `'none'`, or absent. */
  learnerChoice?: string;
  /** `normative/selection.md`'s `selected`. */
  selected?: string;
  /** Every corpus available, bundled and vault, with its derived origin. */
  available: ReadonlyArray<{ corpus: NormativeCorpus; origin: NormativeOrigin }>;
}

export function resolveNormative(input: NormativeInputs): ResolvedNormative {
  const find = (id: string) => input.available.find((a) => a.corpus.id === id);

  const learner = input.learnerChoice?.trim();
  if (learner === 'none') {
    return { of: 'generic', because: 'learner-override', provenanceLine: GENERIC_LINE };
  }
  if (learner) {
    const hit = find(learner);
    if (hit) return asCorpus(hit.corpus, hit.origin, 'learner');
    /*
     * A learner's corpus that is gone falls to Configuración rather than straight to
     * generic — the override is «use this instead of the school's», and the school's is
     * still the honest answer when hers has disappeared. It is generic only if that one
     * is missing too, and then the notice names what she selected, which is the file she
     * can actually go and look for.
     */
  }

  const selected = input.selected?.trim();
  if (selected && selected !== 'none') {
    const hit = find(selected);
    if (hit) return asCorpus(hit.corpus, hit.origin, 'configuracion');
    return {
      of: 'generic',
      because: 'selected-missing',
      missing: selected,
      provenanceLine: `${GENERIC_LINE}\n\n${missingNotice(selected)}`,
    };
  }

  return { of: 'generic', because: 'nothing-selected', provenanceLine: GENERIC_LINE };
}

const asCorpus = (
  corpus: NormativeCorpus, origin: NormativeOrigin, via: 'learner' | 'configuracion',
): ResolvedNormative => ({
  of: 'corpus', corpus, origin, via,
  provenanceLine: `Siguiendo el corpus normativo: **${corpus.label}** `
    + `(${ORIGIN_WORDS[origin]}, ${reviewWords(corpus)}).`,
});

/**
 * What each origin is called, in her words.
 *
 * «Modificado por ti» is visibility, not punishment: editing a corpus is exactly what
 * the format is for, and a document drafted under an edited file should say so — the
 * alternative is a line claiming the shipped Andalusian corpus over a file somebody
 * changed last March.
 */
const ORIGIN_WORDS: Record<NormativeOrigin, string> = {
  bundled: 'incluido con Rampa',
  subido: 'subido por ti',
  modificado: 'subido por ti y modificado después',
};

/**
 * The review half, and it can only ever say «revisado» when the file says so.
 *
 * Built from `review` in the same expression that builds the origin, so there is no
 * caller-supplied path to a line that claims a review nobody did. That is FR-2706 as
 * one function rather than as a rule people have to remember.
 */
function reviewWords(corpus: NormativeCorpus): string {
  if (!corpus.review.reviewed) return 'sin revisar por ninguna docente';
  const by = corpus.review.by;
  const on = corpus.review.on;
  if (by && on) return `revisado por ${by} el ${on}`;
  if (by) return `revisado por ${by}`;
  return 'revisado';
}

/**
 * Generic mode's line, which is a product and not an apology (FR-2703).
 *
 * It names exactly what Rampa did not assume — the document, who signs it, where it is
 * registered — and points at the one person who can settle it. A generic draft that
 * merely omitted those would look like a complete document with three quiet holes in it.
 */
export const GENERIC_LINE =
  'No hay ninguna normativa elegida, así que esto es un **borrador genérico**: he '
  + 'ordenado lo que ya habías hecho para este alumno, sin dar por hecho qué documento '
  + 'exige tu territorio, quién lo firma ni dónde se registra. Eso lo verificas tú con '
  + 'tu orientador u orientadora antes de presentarlo.';

/**
 * The FR-2711 notice: what she picked, that it is not there, and what happened instead.
 *
 * Separate from the generic line because they are different facts. «Esto es genérico» is
 * a description of the document; «la normativa que elegiste ya no está» is news about
 * her setup, and merging them would bury the half she has to act on.
 */
export const missingNotice = (id: string): string =>
  `**Ojo:** la normativa que tenías elegida (\`${id}\`) ya no está, así que este `
  + 'documento ha salido en genérico. No he puesto otra en su lugar: cuál se usa lo '
  + 'eliges tú, en Configuración ▸ Normativa.';
