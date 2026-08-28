import type { LoadedLearner } from '../vault/profile.js';

/**
 * Handover (spec 004). Moving the files is the easy half; the hard half is the
 * receiving teacher not believing them more than they should.
 *
 * A packet believed wholesale is worse than no packet: the new teacher stops
 * observing, and a child is held inside last year's description of them. Some
 * children change precisely because the adaptation worked.
 */
export type Evidence = 'observed' | 'inferred' | 'reported';
export type Confirmation = 'unconfirmed' | 'confirmed' | 'disconfirmed';

export interface PacketClaim {
  text: string;
  evidence: Evidence;
  date: string;
  confirmation: Confirmation;
  source?: string;
}

export interface Packet {
  code: string;
  academicYear: string;
  createdAt: string;
  claims: PacketClaim[];
  summary: string;
  /** Never present in a shareable packet. */
  containsLearnerScope: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function buildPacket(learner: LoadedLearner, academicYear: string, summary: string): Packet {
  const claims: PacketClaim[] = [];
  for (const [axis, level] of Object.entries(learner.profile.axes ?? {})) {
    claims.push({
      text: `${axis} = ${level}`,
      evidence: 'observed',
      date: learner.profile.axes_confirmed?.[axis] ?? today(),
      confirmation: 'unconfirmed',
    });
  }
  for (const w of learner.profile.works) claims.push({ text: w, evidence: 'observed', date: today(), confirmation: 'unconfirmed', source: 'works' });
  for (const a of learner.profile.avoid) claims.push({ text: a, evidence: 'observed', date: today(), confirmation: 'unconfirmed', source: 'avoid' });
  return { code: learner.profile.code, academicYear, createdAt: today(), claims, summary, containsLearnerScope: true };
}

/** Prose first: most receiving teachers will not have this application. */
export function packetToMarkdown(p: Packet): string {
  const l: string[] = [
    `# Traspaso · ${p.code}`, '',
    `Curso ${p.academicYear} · preparado el ${p.createdAt}`, '',
    '> **Esto son observaciones de otra aula, no un diagnóstico.**',
    '> Trátalas como hipótesis que confirmar en las primeras semanas.',
    '> Si algo ya no encaja, no está mal escrito: el niño ha cambiado.', '',
    '## Lo que te contaría tomando un café', '', p.summary.trim() || '_(sin resumen)_', '',
    '## Lo observado', '',
    '| Qué | Cómo lo sé | Desde | Estado |', '|---|---|---|---|',
  ];
  const label: Record<Evidence, string> = { observed: 'observado', inferred: 'deducido', reported: 'me lo contaron' };
  for (const c of p.claims) l.push(`| ${c.text} | ${label[c.evidence]} | ${c.date} | sin confirmar |`);
  l.push('', '---', '', 'Este documento **acompaña** al expediente oficial, no lo sustituye.');
  return l.join('\n');
}

/** Strips every learner-scoped claim. Enforced here, not by the teacher remembering. */
export function toShareable(p: Packet): Packet {
  return { ...p, claims: [], summary: '', containsLearnerScope: false };
}

const ACADEMIC_YEAR = /^(\d{4})-(\d{2,4})$/;

/** A packet older than one academic year is history, not a profile. */
export function isStale(p: Packet, currentYear: string): boolean {
  const a = ACADEMIC_YEAR.exec(p.academicYear); const b = ACADEMIC_YEAR.exec(currentYear);
  if (!a || !b) return false;
  return Number(b[1]) - Number(a[1]) >= 1;
}
