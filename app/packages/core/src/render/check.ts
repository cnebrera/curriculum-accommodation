import { RampaError } from '../errors.js';
import type { IRDocument } from '../ir/types.js';

/**
 * Output check: learner data must not appear in learner-facing material
 * (007 FR-507).
 *
 * The renderer already has no path to the profile, so this is the second net:
 * it catches a code or a name arriving through the adapted content itself,
 * which is exactly what an injection would try. The worst outcome in the system
 * is an adapted worksheet carrying a child's barriers round a classroom.
 */
export interface OutputCheckResult { ok: boolean; findings: string[]; }

export function checkOutput(
  html: string,
  learnerCodes: readonly string[],
  knownNames: readonly string[] = [],
  /**
   * Anything else about this learner that must not be on his sheet
   * (011 T018, FR-910; `015` FR-1306).
   *
   * The profile has gained fields since this check was written — an age, a course,
   * a stage, a school — and **adding a field without extending this check is how
   * the next one reaches a sheet.** `011`'s own task says so, and `015`'s school
   * field is the case that makes it concrete: a school plus a course plus a set of
   * barriers identifies a child far more sharply than a code does.
   *
   * ## Three of those four, and the fourth is not an oversight (backlog G78)
   *
   * Both callers — `jobs/print.ts` and `jobs/export.ts` — pass `school`, `year` and
   * `stage`. **Not the age**, and it stays out on purpose: the needle would be `"14"`,
   * and two digits are a substring of most primary arithmetic. That is the empty-code
   * failure again, the one `print.ts` documents — a guard that fires on everything is a
   * guard that gets switched off — and it is the same reason the `< 4` skip below
   * exists.
   *
   * The age is therefore **not checked here**, and saying so is better than a promise
   * this function does not keep. What would check it is a needle with context around it
   * («14 años»), which is a different shape of check and is written up in G78 rather
   * than half-done here.
   *
   * Passed in rather than derived from a profile, because this function must never
   * be handed a profile: what it takes is the list of strings that would be a
   * finding, and the caller is the one place that knows the profile.
   */
  learnerFacts: readonly string[] = [],
): OutputCheckResult {
  const findings: string[] = [];

  for (const code of learnerCodes) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${code}(?![\\p{L}\\p{N}])`, 'u');
    // The id attribute legitimately carries block ids; only flag visible text.
    const visible = html.replace(/<[^>]+>/g, ' ');
    if (re.test(visible)) findings.push(`El código "${code}" aparece en el material del alumno.`);
  }

  const visible = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  for (const name of knownNames) {
    for (const part of name.trim().split(/\s+/)) {
      if (part.length >= 3 && visible.includes(part.toLowerCase())) {
        findings.push(`El nombre "${part}" aparece en el material del alumno.`);
      }
    }
  }
  /*
   * Substring, not word-boundary, and case-insensitively — «CEIP Miguel Hernández»
   * on a worksheet is a finding whatever the punctuation around it, and a school's
   * name is exactly the kind of string that arrives with a stray comma.
   *
   * Short values are skipped: a stage like «ESO» or an age like «9» would fire on
   * ordinary content. That is a real limit and it is the honest one — the fields
   * worth checking are the identifying ones, and a two-character value identifies
   * nobody on its own.
   */
  for (const fact of learnerFacts) {
    const needle = fact.trim().toLowerCase();
    if (needle.length < 4) continue;
    if (visible.includes(needle)) {
      findings.push(`«${fact.trim()}» aparece en el material del alumno, y es un dato suyo.`);
    }
  }

  return { ok: findings.length === 0, findings };
}

export function assertNoLearnerData(
  html: string, learnerCodes: readonly string[], knownNames: readonly string[] = [],
  learnerFacts: readonly string[] = [],
): void {
  const r = checkOutput(html, learnerCodes, knownNames, learnerFacts);
  if (!r.ok) throw new RampaError('render-learner-data', r.findings.join(' '), r.findings);
}

/**
 * An essential figure with no description blocks the render (006 §render).
 * Emitting an exercise the learner cannot possibly answer is worse than no sheet.
 */
export function checkEssentialFigures(doc: IRDocument): string[] {
  return doc.blocks
    .filter((b) => b.classes.includes('figure') && b.attrs['data-role'] === 'essential')
    .filter((b) => !/^>\s+/m.test(b.content) && !b.attrs['data-longdesc'])
    .map((b) => `La figura "${b.id}" es imprescindible para resolver la tarea y no tiene descripción.`);
}
