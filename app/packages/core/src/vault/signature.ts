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
export function stampSignedOff(
  raw: string, by: string, date: string,
  /**
   * A second look somebody else gave it, when there is one (`030` FR-2810).
   *
   * **Two facts, one signer.** The signature stays one person's (`005` FR-512): «by» is
   * who signed, and this says who else read it and when. Nothing anywhere reads
   * `second_look` to allow or block signing — a sheet signed with no second look simply
   * has no key, which is also a fact.
   *
   * A parameter rather than something this function looks up, because `stampSignedOff`
   * is pure and the file it would have to read lives in the vault. The caller that knows
   * about the vault is the one that resolves it.
   */
  secondLook?: { by: string; date: string; revision: number },
): string {
  const extra = secondLook
    ? `  second_look:\n    by: "${secondLook.by.replace(/"/g, '')}"\n`
      + `    date: "${secondLook.date}"\n    revision: ${secondLook.revision}\n`
    : '';
  const block = `review:\n  signed_off: true\n  by: "${by.replace(/"/g, '')}"\n`
    + `  date: "${date}"\n${extra}`;
  return /^---\r?\n/.test(raw)
    ? raw.replace(/^---\r?\n/, `---\n${block}`)
    : `---\n${block}---\n\n${raw}`;
}
