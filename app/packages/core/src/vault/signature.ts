/**
 * The signature block, written in exactly one place (007 FR-509).
 *
 * ## Why this was extracted
 *
 * `ipc/signoff.ts` built the YAML inline, and on 2026-09-04 the ACNS became a signable
 * document too (P46) — so a second file was about to write the same three lines. Two
 * spellings of `review.signed_off` is one spelling that drifts, and what depends on it
 * is `isSignedOff`, the single reader that decides whether a document announces itself
 * as unreviewed. A missed quote or a renamed key would silently stop the draft mark
 * from ever appearing, which fails **open**.
 *
 * So the two callers share the writer. `untrusted.test.ts` still enumerates every file
 * that may sign, because more than one *caller* is a decision worth forcing even when
 * the mechanism is shared.
 *
 * ## The quoting is not cosmetic
 *
 * Unquoted, YAML hands `date` back as a `Date` object, and the next thing to validate
 * that block would drop it — the same defect the journal's own timestamp already had.
 */
export function stampSignedOff(raw: string, by: string, date: string): string {
  const block = `review:\n  signed_off: true\n  by: "${by.replace(/"/g, '')}"\n  date: "${date}"\n`;
  return /^---\r?\n/.test(raw)
    ? raw.replace(/^---\r?\n/, `---\n${block}`)
    : `---\n${block}---\n\n${raw}`;
}
