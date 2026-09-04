import type { LoadedLearner } from '../vault/profile.js';

/**
 * Handover (spec 004). Moving the files is the easy half; the hard half is the
 * receiving teacher not believing them more than they should.
 *
 * A packet believed wholesale is worse than no packet: the new teacher stops
 * observing, and a child is held inside last year's description of them. Some
 * children change precisely because the adaptation worked.
 */
/**
 * How much a claim is worth, and **who is allowed to say so** (`004` FR-302 as
 * amended, decision P44 / review COD-17).
 *
 * `from-profile` is new and it is the honest default: it says where the claim came
 * from, which the application knows, instead of how strong it is, which only a
 * person can judge. The other three stay, for the packet's review step — where a
 * person is doing exactly that judging.
 *
 * The defect this replaced: `buildPacket` stamped `'observed'` on **100% of
 * claims**, and the other two were unreachable because the profile stores no such
 * thing and no screen asks. So the anti-anchoring this specification exists for was
 * inverted — everything arrived at the receiving teacher at the *highest*
 * confidence, «seen repeatedly», fabricated. And the test asserted it:
 * `every(c => c.evidence === 'observed')`.
 */
export type Evidence = 'from-profile' | 'observed' | 'inferred' | 'reported';
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
      // Where it came from, not how strong it is — see `Evidence`.
      evidence: 'from-profile',
      /*
       * Empty rather than today (004 FR-303).
       *
       * This was `?? today()`. An axis nobody had ever confirmed came out stamped
       * with **today's date**, so the receiving teacher read "confirmed today" for
       * a claim that had never been confirmed at all — on the one field whose
       * entire job is to say how old the claim is.
       *
       * It is the same mistake the credential store deliberately avoided, in a
       * comment written a few files away: *"Empty rather than today's date:
       * claiming we checked it this morning would be a fabrication on the one
       * screen whose job is to report that fact."* Written there, missed here.
       *
       * A missing date is a fact she needs. An invented one is a lie that reads
       * like reassurance, which is worse than a gap in a document whose whole
       * purpose is to be believed less than it could be.
       */
      date: learner.profile.axes_confirmed?.[axis] ?? '',
      confirmation: 'unconfirmed',
    });
  }
  /*
   * And the real date, or none (FR-303 as amended, decision P44).
   *
   * These two lines said `date: today()`, **two lines below** the comment above
   * explaining why exactly that would be a fabrication. A preference she noted in
   * October reached the receiving teacher dated today, on the one field whose job
   * is to say how old the claim is — and the fix applied to the axes in T003 was
   * not applied here, in the same function.
   */
  const notedOn = (text: string): string => learner.profile.noted_on?.[text] ?? '';
  for (const w of learner.profile.works) {
    claims.push({
      text: w, evidence: 'from-profile', date: notedOn(w),
      confirmation: 'unconfirmed', source: 'works',
    });
  }
  for (const a of learner.profile.avoid) {
    claims.push({
      text: a, evidence: 'from-profile', date: notedOn(a),
      confirmation: 'unconfirmed', source: 'avoid',
    });
  }
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
  /*
   * The column heading is «Cómo lo sé», and «apuntado en el perfil» is the honest
   * answer for anything the application put there itself (decision P44). It used to
   * say «observado» for every row — the strongest of the four — which is precisely
   * the anchoring this document is designed to prevent.
   */
  const label: Record<Evidence, string> = {
    'from-profile': 'apuntado en el perfil',
    observed: 'observado',
    inferred: 'deducido',
    reported: 'me lo contaron',
  };
  for (const c of p.claims) {
    // "sin fecha" rather than an empty cell: a blank in a table reads as a
    // rendering fault, and this is a fact — nobody has confirmed this.
    l.push(`| ${c.text} | ${label[c.evidence]} | ${c.date || 'sin fecha'} | sin confirmar |`);
  }
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
