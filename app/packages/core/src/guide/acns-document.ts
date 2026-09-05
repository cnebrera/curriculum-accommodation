import { RampaError } from '../errors.js';
import { parseFrontMatter } from '../vault/parse.js';
import { stampSignedOff } from '../vault/signature.js';
import { phraseOf } from './corpus.js';

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

/**
 * The token the draft mark is made of, and it is **code's** (029 T009, FR-2709).
 *
 * The corpus supplies what the document is *called*; it does not supply the word
 * BORRADOR, and it has no field through which it could. That split is the whole reason
 * a corpus can be a Markdown file a stranger wrote: the mark is Principle VII, the mark
 * is a guard, and a guard a corpus could word is a guard a corpus could empty.
 *
 * It is also what makes `signAcns` work across a change of normativa: the line it has
 * to find starts with a constant nobody can edit.
 */
export const DRAFT_PREFIX = '# BORRADOR ';

export interface NormativeWording {
  /**
   * The corpus's printed sentences. Missing keys fall through to the generic file's
   * and then to the built-in minimum — `phraseOf`'s three tiers, so a document never
   * has a hole where its «this is not filed» line should be.
   */
  phrases?: Record<string, string>;
  /** The generic file's, which is the base layer and always present. */
  generic?: Record<string, string>;
  /** The platform of record, interpolated into the unsigned note. */
  register?: string;
  /** Which corpus this was drafted under, built by the resolver (029 T012, FR-2705). */
  provenanceLine?: string;
}

/** A phrase, quoted as Markdown, keeping the line breaks the author wrote. */
const quote = (text: string): string[] => text.split('\n').map((l) => `> ${l}`.trimEnd());

/**
 * The removable part, and the part that stays. They are different claims.
 *
 * «Sin firmar» stops being true when she signs. «Esto no está presentado» and «la
 * coordina el tutor» never stop being true — Rampa cannot file anything and did not
 * write the curricular proposal, signature or no signature. Keeping them in one block
 * would have meant either a signature that deletes a true statement or a mark that
 * survives its own removal.
 *
 * Exactly **two lines**, always, whatever the register is called. `signAcns` removes a
 * fixed number of lines, and a note whose length depended on a corpus would be a
 * signature that ate the sentence below it in some territories and not others.
 */
const draftNote = (w: NormativeWording): string[] => [
  '> **Sin firmar.** Mientras no la firmes, esto es un borrador: si lo copias a',
  `> ${w.register ?? 'tu plataforma de registro'} ahora, estarás presentando algo que `
    + 'no ha revisado nadie.',
];

const standingNote = (w: NormativeWording): string[] => [
  ...quote(phraseOf('not-filed', w.phrases, w.generic)),
  '>',
  ...quote(phraseOf('authorship-footer', w.phrases, w.generic)),
];

/** The heading and the notes, in the state the signature puts them in. */
export function acnsHeader(
  signedOff: boolean,
  wording: NormativeWording = {},
  signature?: { by: string; on: string },
): string[] {
  const standing = [
    ...standingNote(wording),
    ...(wording.provenanceLine ? ['>', ...quote(wording.provenanceLine)] : []),
  ];
  if (!signedOff) {
    return [
      DRAFT_PREFIX + phraseOf('draft-title', wording.phrases, wording.generic),
      '', ...draftNote(wording), '', ...standing,
    ];
  }
  return [
    `# ${phraseOf('signed-title', wording.phrases, wording.generic)}`,
    '',
    `> **Revisada y firmada** por ${signature?.by ?? 'la docente'}`
      + `${signature?.on ? ` el ${signature.on}` : ''}.`,
    '',
    ...standing,
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
export function acnsDocument(
  markdown: string, learnerCode: string, on: string, signedTitle?: string,
): string {
  /*
   * `signed_title` is the document recording **what it is**, at the moment it was
   * drafted — not a cached copy of a corpus field.
   *
   * FR-2710: a document is what it was when it was signed. Without this, signing a
   * draft after she had switched normativa would title it with the *new* territory's
   * name while the standing note inside it still said the old one's. The document
   * carrying its own identity is the only place the answer cannot drift from.
   */
  const title = signedTitle ? `\nsigned_title: ${JSON.stringify(signedTitle)}` : '';
  return `---\nkind: acns\nfor_learner: "${learnerCode}"\ndrafted: "${on}"${title}\n---\n\n${markdown}`;
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

  const lines = raw.split('\n');
  const at = lines.findIndex((l) => l.startsWith(DRAFT_PREFIX));
  if (at === -1) {
    throw new RampaError('vault-unreadable',
      'Este fichero ya no tiene la marca de borrador, así que no sé en qué estado está '
      + 'y no lo firmo. Vuelve a hacer el borrador y fírmalo entonces.');
  }

  /*
   * The title the signed document takes comes from the **file**, not from whichever
   * normativa is selected right now. She may have changed corpus between drafting and
   * signing, and re-titling a document she is about to sign with a different
   * territory's name would be the application editing what she is signing for.
   *
   * Absent — a draft written before `029` — falls back to the draft line with the
   * BORRADOR token taken off, which is what that line always was.
   */
  const stored = parseFrontMatter(raw).data['signed_title'];
  const signedHeading = typeof stored === 'string' && stored.trim() !== ''
    ? `# ${stored.trim()}`
    : `# ${capitalise(lines[at]!.slice(DRAFT_PREFIX.length).replace(/^de /, ''))}`;

  // The heading, its blank line and the draft note — exactly what `acnsHeader` wrote,
  // and `draftNote` is two lines whatever the register is called.
  const removable = 1 + 1 + 2 + 1;
  const body = [
    ...lines.slice(0, at),
    signedHeading,
    '',
    `> **Revisada y firmada** por ${by}${on ? ` el ${on}` : ''}.`,
    ...lines.slice(at + removable),
  ].join('\n');

  return stampSignedOff(body, by, on);
}

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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
