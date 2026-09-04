import type { SheetGroup } from './sheet.js';

/**
 * What actually came out, read from the **structure of what was produced**
 * (`027` T019, FR-2506, research R5).
 *
 * ## The dead code this replaces
 *
 * It was `groups.some((g) => /\bproblema/i.test(g.instruction))` over `instructionFor`'s
 * four fixed sentences — «Resuelve estas sumas», «…restas», «…multiplicaciones»,
 * «…divisiones» — **none of which contains the word «problema»**. So the derivation could
 * only ever return `study` or `worksheet`, and choosing «examen» or «problemas»
 * guaranteed the mismatch note: an apology, every single time, for a discrepancy that
 * had not happened. The review found it (PROD-02); it was never reachable.
 *
 * ## Why structure and not prose, even repaired
 *
 * Because the prose is ours today and the corpus's tomorrow, and a regex over Spanish
 * sentences is the wrong instrument for a fact the code is holding in its hands. After
 * `027` the pipeline knows what it made: the groups are typed.
 *
 * Deriving from `request.kind` was rejected outright — that compares the request with
 * itself, which is the always-green twin of the old always-apology.
 */
export function derivedKind(groups: readonly SheetGroup[], hasContent: boolean): string {
  if (groups.some((g) => g.of === 'questions')) return 'exam';
  if (groups.some((g) => g.of === 'problems')) return 'problems';
  if (groups.length === 0 && hasContent) return 'study';
  return 'worksheet';
}

/**
 * And whether the two disagree (`027` FR-2506).
 *
 * In the core beside the derivation because the pair is one decision: the note fires
 * when what she asked for and what was produced are different, and «different» has to
 * mean the same thing in both halves or the note is either an apology every time — which
 * is what it was — or silent when it matters.
 */
export const kindMismatched = (
  chosen: string | undefined, groups: readonly SheetGroup[], hasContent: boolean,
): boolean => chosen !== undefined && chosen !== derivedKind(groups, hasContent);

