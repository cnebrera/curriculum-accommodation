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
  /**
   * The vault schema version this packet was written under (`032` FR-3008, P50).
   *
   * Stated so a receiver on an older build can say «este paquete trae datos de una
   * versión más nueva; verás el valor general» — **a sentence instead of a silent
   * difference**. Without it the degradation is real but invisible: her colleague's
   * application quietly shows less than the packet contains and neither of them can tell.
   *
   * Not a wall. `004` FR-314 makes inheritance declinable item by item, and refusing a
   * whole packet over a version number would take that choice away from her.
   */
  schema: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function buildPacket(
  learner: LoadedLearner,
  academicYear: string,
  summary: string,
  /** The version the sending vault is at. Absent means 1, like the marker itself. */
  schema = 1,
): Packet {
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
   * The vehicular mark travels too (`033` FR-3110), and with its real date.
   *
   * It is an observation like any other and it belongs in a handover more than most: a
   * child who arrived in February is exactly the child whose next teacher needs to know
   * why last year's sheets look the way they do — and, just as much, that what she is
   * reading is a **transition and not a disability**. So the claim says so in words.
   *
   * `noted_on` rather than today: the date she wrote it is what tells the receiving
   * teacher whether this is still true. A mark from October on a packet read in June is
   * a claim about a child who has had eight months of the language since.
   */
  if (learner.profile.vehicular) {
    const mark = learner.profile.vehicular;
    claims.push({
      text: mark.intensity === 0
        ? 'Ya sigue la clase en el idioma del aula (lo apuntó ella)'
        : `Está aprendiendo el idioma del aula · nivel ${mark.intensity} de 3`
          + (mark.languages.length ? ` · habla ${mark.languages.join(', ')}` : ''),
      evidence: 'from-profile',
      date: mark.noted_on,
      confirmation: 'unconfirmed',
    });
  }

  /*
   * Per-area CUR travels as the profile data it is (`032` FR-3008, research R4).
   *
   * One claim per pair, beside the axes, with the same evidence and the same
   * item-by-item acceptance — **no parallel channel for one field**, which is the
   * two-copies defect in transit. `004` FR-314 makes inheritance declinable item by item,
   * and a pair is exactly the size of thing she should be able to decline: «lo de Mates
   * lo he visto yo, lo de Lengua me lo dijeron y prefiero mirarlo».
   *
   * An área name is a subject, not a child — the packet's no-names rule and the egress
   * redaction apply to it as to any string, and nothing here exempts it.
   *
   * A receiver on an older build simply does not build these claims: `cur_areas` is an
   * unknown key it carries verbatim, and the general value is what takes effect. Less
   * detail, never wrong detail — which is R1's shape paying off rather than luck.
   */
  for (const [area, level] of Object.entries(learner.profile.cur_areas ?? {})) {
    claims.push({
      text: `CUR en ${area} = ${level}`,
      evidence: 'from-profile',
      /*
       * No date. `axes_confirmed` is keyed by axis and there is no per-area equivalent,
       * so stamping one would be the fabrication `noted_on` was fixed for two paragraphs
       * below — a claim she made in October arriving dated today, on the field whose
       * whole job is to say how old it is. «No consta» is a fact she needs.
       */
      date: '',
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
  return { code: learner.profile.code, academicYear, createdAt: today(), claims, summary,
           containsLearnerScope: true, schema };
}

/** Prose first: most receiving teachers will not have this application. */
export function packetToMarkdown(p: Packet): string {
  const l: string[] = [
    `# Traspaso · ${p.code}`, '',
    `Curso ${p.academicYear} · preparado el ${p.createdAt}`
    // Stated, so an older receiver can say what it is not showing rather than show less
    // in silence (`032` FR-3008).
    + ` · formato ${p.schema}`, '',
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
