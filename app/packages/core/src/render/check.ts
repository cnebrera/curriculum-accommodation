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
  return { ok: findings.length === 0, findings };
}

export function assertNoLearnerData(
  html: string, learnerCodes: readonly string[], knownNames: readonly string[] = [],
): void {
  const r = checkOutput(html, learnerCodes, knownNames);
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
