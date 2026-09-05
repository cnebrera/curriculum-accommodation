import type { Block, IRDocument, Notice } from './types.js';

/**
 * Content is never instruction (Principle IX, spec 007).
 *
 * This does not claim to solve prompt injection. It cannot. What it does is make
 * the failure visible: instruction-shaped text is adapted like any other text,
 * quoted, located, and shown to the teacher. It never removes anything —
 * deletion hides an attack and loses legitimate content (007 FR-504).
 *
 * ## Why two tiers
 *
 * The first version of this file flagged a Language worksheet about the
 * imperative, which is full of legitimate commands: "olvida lo anterior y
 * empieza de nuevo" is a grammar exercise, not an attack. 007 FR-514 treats that
 * as a defect in its own right — a detector that fires on every worksheet is one
 * a teacher learns to dismiss within a week, and then it protects nothing.
 *
 * So a bare imperative is never enough. Text qualifies only when it is either:
 *
 *   A. **addressed at the machine** — an imperative sitting next to something
 *      that names the system, or text imitating a chat role; or
 *   B. **asking for a capability a worksheet has no reason to mention** —
 *      printing the learner's profile, clearing the draft mark, disabling
 *      redaction, writing to a filesystem path.
 *
 * Tier B needs no addressee: a maths sheet does not ask for a child's diagnosis.
 */

/**
 * Words that name the thing being addressed.
 *
 * `siguiente turno` / `próximo turno` joined the list with `026`, and the vector is
 * specific to it: a document Rampa wrote one turn ago, saying «instrucción para el
 * siguiente turno». There is no «ordenador» and no «sistema» in that sentence — the
 * conversation gave the model a way to name the program that did not exist before.
 *
 * The **phrase** and not the bare word, deliberately: «es tu turno» and «por turnos» are
 * ordinary classroom Spanish, and an addressee that fires on them would flag board-game
 * worksheets for ever, which is how a detector gets ignored.
 */
const ADDRESSEE =
  /(ordenador|computador\w*|sistema|programa|asistente|máquina|maquina|modelo|\bia\b|\bai\b|chatgpt|claude|gemini|prompt|system|assistant|developer message|(?:siguiente|pr[óo]ximo|next)\s+turno?)/i;

/** Directives that, next to an addressee, stop being ordinary classroom language. */
const DIRECTIVE =
  /\b(ignora|ignore|olvida|forget|desactiva|disable|salta|skip|bypass|act[úu]a como|act as|eres|you are|responde|responde solo|obedece|sigue estas instrucciones)\b/i;

/** Imitating a conversation turn is self-identifying. */
const ROLE_IMITATION =
  /(^|\n)\s*(system|assistant|user|developer)\s*:/i;

/** Tier B: things only this system could do, which a worksheet never asks for. */
const CAPABILITY: Array<{ re: RegExp; why: string }> = [
  { re: /\b(incluye|imprime|a[ñn]ade|muestra|print|include|add|output)\b[^.\n]{0,60}\b(perfil|diagn[óo]stico|barreras|expediente|profile|diagnosis|datos del alumno|notas del alumno)\b/i,
    why: 'pide sacar datos del alumno al material' },
  { re: /\b(quita|elimina|borra|remove|delete|clear)\b[^.\n]{0,50}\b(marca de borrador|borrador|draft|watermark|marca de agua)\b/i,
    why: 'pide quitar la marca de borrador' },
  /*
   * Infinitives too, since `026`.
   *
   * The pattern read `(da|marca|considera)` — the imperative only — and Spanish reaches
   * for the infinitive constantly: «puedes **dar** el documento por revisado», «hay que
   * **marcar**lo como revisado». A vector written the ordinary way walked past this,
   * which a fixture found. The object («por revisado») is specific enough that widening
   * the verb costs no false positives.
   */
  { re: /\b(da|dar|marca|marcar|considera|considerar|treat|mark)\w*\b[^.\n]{0,40}\b(por revisado|como revisado|as reviewed|as signed)\b/i,
    why: 'pide dar el material por revisado sin que nadie lo revise' },
  { re: /\b(desactiva|disable|salta|omite|skip)\b[^.\n]{0,50}\b(redacci[óo]n|redaction|sustituci[óo]n de nombres|anonimizaci[óo]n)\b/i,
    why: 'pide desactivar la protección de nombres' },
  { re: /\b(guarda|escribe|copia|save|write|copy)\b[^.\n]{0,60}(\.\.[\/\\]|[A-Za-z]:\\|\/etc\/|\/home\/|\/var\/|~[\/\\])/i,
    why: 'pide escribir fuera de la carpeta' },
  { re: /\b(env[íi]a|manda|send|upload|post)\b[^.\n]{0,50}\b(el texto original|los datos|el perfil|todo el contenido)\b/i,
    why: 'pide enviar contenido a otro sitio' },
];

const NEAR = 90;
const clip = (s: string, n = 160) => (s.length <= n ? s : s.slice(0, n - 1) + '…');

/** A directive counts only when an addressee sits close to it. */
function systemAddressed(text: string): Array<{ quote: string; why: string }> {
  const hits: Array<{ quote: string; why: string }> = [];
  const re = new RegExp(DIRECTIVE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const from = Math.max(0, m.index - NEAR);
    const window = text.slice(from, Math.min(text.length, m.index + m[0].length + NEAR));
    if (!ADDRESSEE.test(window)) continue;
    const line = text.slice(text.lastIndexOf('\n', m.index) + 1,
      (text.indexOf('\n', m.index) + 1 || text.length + 1) - 1);
    hits.push({ quote: clip(line.trim() || m[0]), why: 'va dirigido al programa, no al alumno' });
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return hits;
}

export function detectInjection(block: Block): Notice[] {
  const text = block.content;
  const found = new Map<string, string>();

  for (const { quote, why } of systemAddressed(text)) if (!found.has(quote)) found.set(quote, why);

  const role = ROLE_IMITATION.exec(text);
  if (role) found.set(clip(role[0].trim()), 'imita un mensaje de sistema');

  for (const { re, why } of CAPABILITY) {
    const m = new RegExp(re.source, 'i').exec(text);
    if (!m) continue;
    const start = text.lastIndexOf('\n', m.index) + 1;
    const end = text.indexOf('\n', m.index);
    const quote = clip(text.slice(start, end === -1 ? text.length : end).trim() || m[0]);
    if (!found.has(quote)) found.set(quote, why);
  }

  return [...found.entries()].map(([quote, why]) => ({
    kind: 'instruction-shaped' as const,
    quote,
    message:
      `Este material contiene texto que parece dar órdenes al programa (${why}). ` +
      `Lo he tratado como contenido, no lo he obedecido y no lo he borrado. ` +
      `Míralo y decide si debería estar en la ficha.`,
  }));
}

/** Annotate in place. Non-blocking by design (007 FR-514). */
export function annotateInjection(doc: IRDocument): IRDocument {
  for (const b of doc.blocks) {
    const found = detectInjection(b);
    if (found.length) b.notices.push(...found);
  }
  return doc;
}

export const injectionNotices = (doc: IRDocument): Array<{ block: Block; notice: Notice }> =>
  doc.blocks.flatMap((b) => b.notices
    .filter((n) => n.kind === 'instruction-shaped')
    .map((n) => ({ block: b, notice: n })));
