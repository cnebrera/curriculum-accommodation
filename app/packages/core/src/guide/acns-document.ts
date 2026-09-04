import { RampaError } from '../errors.js';
import { parseFrontMatter } from '../vault/parse.js';
import { stampSignedOff } from '../vault/signature.js';

/**
 * The ACNS as a **document**: saved, printed, and unmarked only by a signature
 * (017 FR-1516, review COD-22, decision P46).
 *
 * ## What FR-1516 promised and what existed
 *
 * «The draft MUST carry the draft mark, removable only by sign-off.» What existed was
 * a heading in a string, dumped into a `<div>` as plain text. Nothing wrote it to the
 * vault, nothing rendered it, and `job:signOff` resolves documents by (job × learner)
 * — an ACNS is neither, so there was no signature that could remove the mark. The
 * conservative half was true (the mark never came off) and the mechanism the
 * requirement describes did not exist.
 *
 * That is not a harmless gap. The real flow is that she copies the text by hand into
 * Séneca, and a mark that only ever lived on screen is lost in that copy-paste
 * **without any review having happened**. So the mark has to be in the file, and the
 * signature has to be the thing that takes it out.
 *
 * ## Why the mark is in the body and not only in the renderer
 *
 * For a worksheet the banner is a rendering: `ir.md` has no BORRADOR line, because
 * nobody hands out `ir.md`. The ACNS is the opposite — **the file itself is what she
 * opens and copies from**. A mark added at print time would be absent from the one
 * artefact that actually travels.
 *
 * So: the file carries the mark, the signature rewrites the file, and the renderers
 * still derive their banner from the front matter (`draftMark`) so no screen can
 * decide to omit it.
 *
 * Carlos, deciding it: «el borrador de ACNS se guarda en el vault como documento, se
 * imprime con su marca, y la firma es lo único que la quita — como cualquier otra hoja».
 */

export const ACNS_DRAFT_HEADING = '# BORRADOR de adaptación curricular NO significativa (ACNS)';
export const ACNS_SIGNED_HEADING = '# Adaptación curricular NO significativa (ACNS)';

/**
 * The removable part, and the part that stays. They are different claims.
 *
 * «Sin firmar» stops being true when she signs. «El registro es Séneca» and «la
 * coordina el tutor» never stop being true — Rampa cannot file anything and did not
 * write the curricular proposal, signature or no signature. Keeping them in one block
 * would have meant either a signature that deletes a true statement or a mark that
 * survives its own removal.
 */
const DRAFT_NOTE = [
  '> **Sin firmar.** Mientras no la firmes, esto es un borrador: si lo copias a',
  '> Séneca ahora, estarás presentando algo que no ha revisado nadie.',
];

const STANDING_NOTE = [
  '> **Esto no está presentado.** El registro es **Séneca**: esto es material para',
  '> llevar allí.',
  '>',
  '> **La ACNS la coordina el tutor o la tutora**, y la propuesta curricular la',
  '> completa el profesorado del área. Rampa no la ha escrito: ha ordenado lo que ya',
  '> había hecho para este alumno.',
];

/** The heading and the notes, in the state the signature puts them in. */
export function acnsHeader(signedOff: boolean, signature?: { by: string; on: string }): string[] {
  if (!signedOff) return [ACNS_DRAFT_HEADING, '', ...DRAFT_NOTE, '', ...STANDING_NOTE];
  return [
    ACNS_SIGNED_HEADING,
    '',
    `> **Revisada y firmada** por ${signature?.by ?? 'la docente'}`
      + `${signature?.on ? ` el ${signature.on}` : ''}.`,
    '',
    ...STANDING_NOTE,
  ];
}

/**
 * The stored document: front matter, then the draft.
 *
 * `kind: acns` rather than a new field, and deliberately **not** `generated: true`:
 * `isGenerated` decides whether a document is composed material, and an ACNS is not
 * material at all. A stray `true` there would put it through the composed-material
 * draft mark and, worse, offer it as something to print for a child.
 */
export function acnsDocument(markdown: string, learnerCode: string, on: string): string {
  return `---\nkind: acns\nfor_learner: "${learnerCode}"\ndrafted: "${on}"\n---\n\n${markdown}`;
}

export function acnsIsSigned(raw: string): boolean {
  const review = parseFrontMatter(raw).data['review'];
  return !!review && typeof review === 'object'
    && (review as Record<string, unknown>)['signed_off'] === true;
}

/**
 * The signature, and the only thing that takes the mark out.
 *
 * ## It refuses rather than repairs
 *
 * If the draft heading is not there, this **throws**. She may well have edited the
 * body in Obsidian before signing — that is the point of a vault — but a file with no
 * draft mark is a file whose state we cannot establish, and stamping
 * `signed_off: true` onto it would be asserting a review of something we did not
 * recognise. Same direction as `resolveInVault`: refusal, never sanitisation.
 *
 * ## And signing twice is not an error
 *
 * It is the same answer, so it returns the document unchanged. A second signature is
 * a double click, not an event.
 */
export function signAcns(raw: string, by: string, on: string): string {
  if (acnsIsSigned(raw)) return raw;

  if (!raw.includes(ACNS_DRAFT_HEADING)) {
    throw new RampaError('vault-unreadable',
      'Este fichero ya no tiene la marca de borrador, así que no sé en qué estado está '
      + 'y no lo firmo. Vuelve a hacer el borrador y fírmalo entonces.');
  }

  const lines = raw.split('\n');
  const at = lines.indexOf(ACNS_DRAFT_HEADING);
  // The heading, its blank line and the draft note — exactly what `acnsHeader` wrote.
  const removable = 1 + 1 + DRAFT_NOTE.length + 1;
  const body = [
    ...lines.slice(0, at),
    ...acnsHeader(true, { by, on }).slice(0, 3),
    ...lines.slice(at + removable),
  ].join('\n');

  return stampSignedOff(body, by, on);
}

/**
 * The next free revision number for a kept ACNS.
 *
 * Same shape and same reason as `nextRevision` for adaptations: the number comes from
 * what is on disk, not from a counter somebody has to keep. Pure so it can be tested —
 * the interesting case is the gap, and a loop buried in an IPC handler is a loop that
 * gets its off-by-one found by a teacher.
 */
export function nextAcnsRevision(files: readonly string[]): number {
  const taken = files
    .map((f) => /^acns\.r(\d+)\.md$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  return Math.max(0, ...taken) + 1;
}
