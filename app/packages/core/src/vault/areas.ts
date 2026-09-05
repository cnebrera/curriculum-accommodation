/**
 * The area vocabulary, and what stops «Mates» and «Matemáticas» becoming two
 * (032 T007, FR-3007, research R2).
 *
 * ## Suggested from what the vault already knows, never from a list somebody wrote
 *
 * Two sources, both of which already mean «a subject this teacher works with»: the
 * roster's `subjects` (`012`) and the `subject` field on her record entries (`014`). A
 * canonical list of Spanish school subjects would be the taxonomy the spec refuses —
 * wrong the week it ships, and a Principle I violation besides, because what counts as an
 * área is judgement.
 *
 * ## Content, not vocabulary
 *
 * A record's `subject` was read out of a document **somebody else wrote**. It reaches a
 * screen as a suggestion and must render as plain text, exactly the rule `RecordScreen`
 * already keeps for the same field (Principle IX). This module returns strings and takes
 * no position on how they are drawn; the caller that renders them owns that.
 *
 * ## Flagged, never merged
 *
 * `nearDuplicate` answers «is this close to something she already has» and stops. It does
 * not rename, does not canonicalise, and is never applied to stored data — a merge she
 * did not ask for is the tool renaming her subjects, and «Lengua» silently folded into
 * «Lenguaje musical» is the kind of plausible-wrong this project fears most.
 */

/**
 * Case and accents away — the same discipline the redaction layer applies.
 *
 * Accents are this project's known blind spot: the one place it was got wrong was found
 * by a test rather than by review, which is why `nearDuplicate` has an explicit
 * accent case rather than trusting the reader to notice.
 */
const fold = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Every subject this vault has seen, deduplicated by exact string, sorted for a stable
 * screen.
 *
 * Deduplicated by the **exact** string and not by `fold`: if her roster says «Matemáticas»
 * and a sheet says «matemáticas», those are two things she has actually written and the
 * flag — not this function — is where that gets raised.
 */
export function knownAreas(sources: {
  /** Roster subjects, across the learners she has. */
  roster?: readonly string[];
  /** `subject` from her record entries. Content: rendered as plain text by the caller. */
  record?: readonly string[];
}): string[] {
  const seen = new Set<string>();
  for (const s of [...(sources.roster ?? []), ...(sources.record ?? [])]) {
    const t = s.trim();
    if (t) seen.add(t);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'es'));
}

/** How many folded letters two names must share before one is «close to» the other. */
const SHARED = 4;

/**
 * The one she may have meant, or `null`.
 *
 * Deterministic and shallow on purpose: equal once folded, or sharing their first four
 * letters. No edit distance — a threshold nobody can explain is a threshold that merges
 * «Lengua» into «Lenguaje musical» on a Tuesday and cannot be argued with afterwards.
 *
 * **Shared prefix, not prefix containment**, and the difference was found by the test
 * rather than by reading. Research R2 names «Mates» / «Matemáticas» as the case to catch
 * and describes it as containment — but «mates» is not a prefix of «matematicas»: they
 * diverge at the fifth letter. A rule that fails its own worked example is a rule
 * somebody wrote from memory of what the strings looked like.
 *
 * Four rather than three, because three folds «Naturales» and «Natación» together, and
 * two would flag «Inglés» against «Informática». Four flags «Lengua» against «Lenguaje
 * musical» — which is correct: flagging costs her one glance, and the merge that flagging
 * prevents costs her a subject.
 *
 * Below four letters nothing matches: «L» is not a near-duplicate of «Lengua», it is a
 * name she has not finished typing.
 */
export function nearDuplicate(typed: string, known: readonly string[]): string | null {
  const t = fold(typed);
  if (!t) return null;
  for (const candidate of known) {
    const k = fold(candidate);
    if (!k) continue;
    // Exact after folding: «matematicas» beside «Matemáticas», or a stray capital.
    if (k === t) return candidate === typed ? null : candidate;
    if (t.length >= SHARED && k.length >= SHARED && t.slice(0, SHARED) === k.slice(0, SHARED)) {
      return candidate;
    }
  }
  return null;
}
