import { normaliseForMatch } from './match.js';
import type { GuideCorpus } from './corpus.js';

/**
 * Reading a guide, and the filter that decides what may leave it
 * (017 T002/T003/T008, FR-1507/1508/1510, ADR 0002, Principle V).
 *
 * ## The one thing this file is for
 *
 * **A diagnosis never reaches the vault.** Not the profile, not the notes, not the
 * overlay. Rampa's profile describes what a learner finds hard, never what he has —
 * and a diagnosis in a profile turns an adaptation tool into a clinical record,
 * which is a different thing with different obligations.
 *
 * The filter is **code**, not a prompt instruction, for the reason `007` settled: a
 * prompt saying «do not extract the diagnosis» travels in the same context window as
 * a document that contains one, and which sentence wins is a coin toss.
 *
 * ## And what was filtered is said
 *
 * In her words, never as a count (FR-1508). «He dejado fuera el diagnóstico y el
 * resumen del informe» is something she can check against the document in her hand;
 * «3 elementos omitidos» is a number she cannot do anything with.
 *
 * A silent filter would make the overlay a partial record of a document she believes
 * was loaded whole — which is worse than not reading it, because she would stop
 * checking.
 */

export interface Measure {
  /** The sentence, as the document says it. */
  text: string;
  /** The section or page it came from. A measure citing nothing cannot be checked. */
  source: string;
  /**
   * Can Rampa act on this at all?
   *
   * «Apoyo del PT tres sesiones semanales» is a real measure and not one a worksheet
   * generator does anything about. Kept and marked, never dropped.
   */
  actionable: boolean;
}

export interface GuideReading {
  measures: Measure[];
  /** What was deliberately left out, in her words (FR-1508). */
  omitted: string[];
  /** Required sections the document does not appear to have. */
  missingSections: string[];
  kind: 'acns' | 'acs' | 'unknown';
}

/** One candidate line, as the extraction step found it. */
export interface Candidate {
  text: string;
  source: string;
}

/**
 * Measures Rampa cannot act on, by what they are about.
 *
 * Hours, staffing, placement, therapy: things a school arranges. Recognising them is
 * not a judgement about their importance — it is the difference between «recorded and
 * marked» and «recorded as if a worksheet generator would honour it».
 */
const NOT_OURS: Array<[RegExp, string]> = [
  [/\bsesion(es)?\b|\bhoras?\b|\bsemanal/i, 'es una medida de horario o de apoyo'],
  [/\bapoyo (del|de la|en)\b|\bPT\b|\bAL\b|\blogopeda|\bfisioterap|\bmonitor/i,
    'depende de personal del centro'],
  [/\baula (de apoyo|específica|especifica)\b|\bmodalidad de escolarización/i,
    'es una decisión de escolarización'],
  [/\bfamilia\b|\btutoría con la familia|\bcoordinación con/i,
    'es coordinación con personas'],
  [/\btransporte|\bcomedor|\bmobiliario|\bsilla\b|\brampa\b/i,
    'es una medida material del centro'],
];

/**
 * Extract the measures, and leave the clinical material out.
 *
 * Takes candidates rather than raw text: **the model's job is to find the sentences
 * that look like measures, and this function's job is to decide which of them may be
 * kept.** Splitting it that way is what makes the filter testable with no provider,
 * and what makes it impossible for a prompt change to weaken it.
 */
export function readGuide(
  candidates: readonly Candidate[],
  corpus: GuideCorpus,
  opts: { declaredKind?: string; sectionsFound?: readonly string[] } = {},
): GuideReading {
  const measures: Measure[] = [];
  /** Set, so «diagnóstico» appearing in four lines is one sentence to her. */
  const omittedWhy = new Set<string>();

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (!text) continue;

    const clinical = clinicalTermIn(text, corpus.clinicalTerms);
    if (clinical) {
      /*
       * Named by **what was left out**, not by where. «He dejado fuera lo que
       * hablaba del diagnóstico» is checkable; quoting the line would put the
       * diagnosis in the interface, which is the same leak one screen further on.
       */
      omittedWhy.add(`He dejado fuera lo que hablaba de «${clinical}»: eso no lo guardo.`);
      continue;
    }

    const notOurs = NOT_OURS.find(([re]) => re.test(text))?.[1];
    measures.push({
      text,
      source: candidate.source.trim() || 'sin indicar',
      actionable: notOurs === undefined,
    });
  }

  const missingSections = corpus.acnsSections
    .filter((s) => opts.sectionsFound !== undefined
      && !opts.sectionsFound.some((f) => normaliseForMatch(f).includes(normaliseForMatch(s.label))))
    .map((s) => s.label);

  return {
    measures,
    omitted: [...omittedWhy],
    missingSections,
    kind: kindOf(opts.declaredKind),
  };
}

/**
 * Why a measure is not actionable, in her words — for the confirmation screen.
 *
 * Recomputed rather than stored on the measure, because the reason is presentation
 * and the measure is the record. A measure whose reason we later phrase differently
 * is the same measure.
 */
export function whyNotOurs(text: string): string | null {
  return NOT_OURS.find(([re]) => re.test(text))?.[1] ?? null;
}

/** The clinical term found, as the corpus spells it, or `null`. */
export function clinicalTermIn(text: string, terms: readonly string[]): string | null {
  const haystack = normaliseForMatch(text);
  for (const term of terms) {
    const needle = normaliseForMatch(term);
    if (!needle) continue;
    /*
     * Word-boundary matching, and it matters in both directions. «CI» must not fire
     * on «ciencias», and `TEA` must not fire on «tea» inside «teatro» — but
     * `discapacidad intelectual` is two words and has to match as a phrase.
     */
    if (new RegExp(`(^|[^\\p{L}])${escape(needle)}([^\\p{L}]|$)`, 'u').test(haystack)) {
      return term;
    }
  }
  return null;
}

const kindOf = (declared?: string): GuideReading['kind'] => {
  const d = normaliseForMatch(declared ?? '');
  if (!d) return 'unknown';
  if (d.includes('significativa') && !d.includes('no significativa')) return 'acs';
  if (d.includes('no significativa') || d.includes('acns')) return 'acns';
  if (d.includes('acs') || d.includes('diac')) return 'acs';
  return 'unknown';
};

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
