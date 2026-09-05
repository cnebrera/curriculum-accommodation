import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Which normativa the interface should speak in (`029` T009/T013).
 *
 * ## What crosses, and what does not
 *
 * The labels. Not the corpus file — that is reading material for a model, and a screen
 * that could render it is a screen that could be told something by it (Principle IX).
 * So the renderer gets «cómo se llama el documento aquí» and nothing else.
 *
 * ## Why generic is a shape and not a null
 *
 * Because every screen that names a document has to name it in both worlds, and a
 * component doing `?? 'la adaptación'` at each site is five places that can disagree
 * about what generic mode says. {@link documentName} is that answer, once.
 */
export interface ResolvedNormativeView {
  of: 'corpus' | 'generic';
  /** «Andalucía», or null in generic mode. */
  label: string | null;
  /** «Séneca», or null when the corpus does not name one and in generic mode. */
  register: string | null;
  documents: Array<{ id: string; label: string; touchesObjectives: boolean }>;
  /** The line every drafted document prints. Built by the resolver, never here. */
  provenanceLine: string;
  because?: 'nothing-selected' | 'learner-override' | 'selected-missing';
}

export function useNormative(learnerChoice?: string): Loadable<ResolvedNormativeView> {
  return useAsync(
    () => window.rampa.normative.resolve(learnerChoice) as Promise<ResolvedNormativeView>,
    [learnerChoice]);
}

/**
 * What to call the document on screen.
 *
 * `which` is what the document **does**, because that is the thing that is true
 * everywhere: `unchanged` is the adaptation that modifies no objective, `modified` is
 * the one that does. Her territory's name for it replaces the generic phrase when she
 * has a corpus selected, and the generic phrase is a real sentence rather than a
 * shrug — that is the difference between generic mode being a product and being an
 * apology.
 */
export function documentName(
  n: ResolvedNormativeView | null, which: 'unchanged' | 'modified',
): string {
  const wants = which === 'modified';
  const found = n?.documents.find((d) => d.touchesObjectives === wants);
  if (found) return found.label;
  return wants
    ? 'la adaptación que modifica objetivos'
    : 'la adaptación que no toca objetivos';
}

/**
 * Where she registers things, in her words — or the honest generic phrase.
 *
 * Written to slot into «el registro es …» so both halves read as one sentence. A bare
 * platform name plus a screen composing its own preposition is how «se registra Séneca»
 * happens, which is a sentence nobody would write on purpose.
 */
export const registerName = (n: ResolvedNormativeView | null): string =>
  n?.register ?? 'donde diga la normativa de tu territorio';

/** One corpus in the picker: what it is, where it came from, and who has disagreed. */
export interface CorpusListing {
  id: string;
  label: string;
  territory: string | null;
  origin: 'bundled' | 'subido' | 'modificado';
  reviewed: boolean;
  lastChecked: string | null;
  /** What her territory calls its documents. Enough to recognise it as hers. */
  documents: string[];
}

export interface NormativeList {
  selected?: string;
  corpora: CorpusListing[];
  /**
   * The id she selected that is no longer there (FR-2711).
   *
   * Named by the main process rather than computed here from `selected` not being in
   * `corpora`: the pane has to say «la que elegiste ya no está» in the same sentence
   * shape as everything else, and a screen deriving that is a second place that has to
   * learn what «missing» means.
   */
  missing: string | null;
}

export function useNormativeList(): Loadable<NormativeList> {
  return useAsync(() => window.rampa.normative.list() as Promise<NormativeList>, []);
}

/** Selecting takes an id; deselecting is the same call with `null`. */
export function useSelectNormative() {
  return useCommand((id: string | null) =>
    window.rampa.normative.select(id) as Promise<{ ok: boolean }>);
}
