import { detectInjection } from '../ir/injection.js';
import type { Block } from '../ir/types.js';

/**
 * What a corpus file is checked for before she can activate it (029 T021, FR-2708/2709).
 *
 * ## A corpus is a worse vector than a worksheet, not a lesser one
 *
 * A worksheet enters the prompt as **material**, fenced, with the task restated after
 * it. A normative corpus enters as **policy**: its prose is read as how her territory
 * works, beside the hard rules and above the recipes. So `007`'s shapes matter more
 * here, and `007` FR-514's non-blocking rule deliberately does **not** carry over — a
 * notice must not block a job she is paying for, but activating a policy file is exactly
 * the moment to stop and ask. A false positive costs her one explicit press; a false
 * negative costs her a file that speaks in Rampa's voice.
 *
 * ## Deterministic, offline, and it never repairs
 *
 * Principle II: no model reads this. `007` FR-504's posture: nothing is removed from her
 * file, ever — deletion hides an attack and loses legitimate content, and a corpus with
 * a paragraph silently cut out is a policy she did not write.
 *
 * ## Three families, and the third one reports rather than defends
 *
 * `007`'s tiers and P18's section-spoofing come from `detectInjection`, which is where
 * they live for the whole application. The third family is specific to this file type:
 * text that **purports to authorise** what `hard-rules.md` forbids.
 *
 * That family exists to be *reported*, not to defend. FR-2709 is already structural —
 * there is no field in the contract a guard reads, so a corpus «authorising» easier
 * exams has no path to act. What she needs is to be told that the file she was about to
 * trust said that, which is a fact about who sent it to her.
 */

export interface NormativeFinding {
  /** Where it came from: `injection` for `007`/P18's shapes, `conflict` for the third. */
  family: 'injection' | 'conflict';
  /** The line, as she can find it in her file. Never a paraphrase. */
  quote: string;
  /** Which line it is, 1-based, so she can go to it. */
  line: number;
  /** What is wrong with it, in her words. */
  why: string;
}

/**
 * Text claiming to permit something the hard rules forbid.
 *
 * Each entry names the rule it contradicts, because «esto choca con las reglas» is not
 * something she can check and «esto dice que un examen puede ser más fácil, y eso no lo
 * decide un fichero» is.
 */
/**
 * Prose that is **describing** a prohibition rather than granting a permission.
 *
 * The affirmative patterns below would otherwise fire on «un fichero de normativa que
 * dijera que un examen puede rebajarse no habría dicho nada» — a sentence explaining the
 * rule, which is exactly what a careful corpus author writes. Found by scanning this
 * repository's own base corpus, which is why that scan is a test.
 *
 * `007` FR-514's lesson applies even where its non-blocking half does not: a detector
 * that fires on the sentence a good author writes is one she stops reading.
 */
const DESCRIBING = /\b(dijer\w+|dijese|prohib\w+|nunca|jam[áa]s|ning[úu]n\w*|no (se )?(puede|pueden|permite))\b/i;

const CONFLICTS: Array<{ re: RegExp; why: string; unless?: RegExp }> = [
  { re: /\b(puede|pueden|se puede|permite|permitido|autoriza|autorizado)\b[^.\n]{0,80}\b(m[áa]s f[áa]cil|rebajar|bajar el nivel|simplificar el criterio|reducir (el|los) criterio)/i,
    unless: DESCRIBING,
    why: 'dice que un examen puede hacerse más fácil, y eso no lo decide un fichero: '
      + 'cambiar el criterio es una adaptación significativa y la decide el equipo docente' },
  { re: /\b(puede|se puede|permite|autoriza|imprime|incluye)\b[^.\n]{0,80}\b(el nombre del alumno|nombre y apellidos|nombre completo)\b/i,
    unless: DESCRIBING,
    why: 'dice que se puede imprimir el nombre del alumno, y el nombre no entra en '
      + 'ningún fichero que escriba Rampa' },
  /*
   * The two negation-shaped ones stop at a comma, not just at a full stop.
   *
   * With a plain `[^.\n]{0,60}` window, «completo **sin** serlo, que es justo el fallo
   * contra el que existe **la marca de borrador**» matched — two unrelated clauses of one
   * sentence. Found by scanning this repository's own base corpus. A window that crosses
   * a comma is a window that joins two thoughts, and joining two thoughts is how a
   * detector starts flagging prose.
   */
  { re: /\b(sin|no hace falta|no es necesari\w+|puede omitirse|se puede quitar)\b[^.,\n]{0,40}\b(marca de borrador|marca de agua)\b/i,
    why: 'dice que puede ir sin la marca de borrador, y la marca sólo la quita tu firma' },
  { re: /\b(no hace falta|sin|no es necesari\w+)\b[^.,\n]{0,40}\b(evaluaci[óo]n psicopedag[óo]gica|informe psicopedag[óo]gico)\b/i,
    why: 'dice que se puede redactar sin evaluación psicopedagógica, y sin ella el '
      + 'documento suele ser nulo de procedimiento' },
  { re: /\b(puedes|puede|se puede|permitido)\b[^.\n]{0,60}\b(guardar|escribir|apuntar)\b[^.\n]{0,40}\b(diagn[óo]stico|trastorno|s[íi]ndrome)\b/i,
    unless: DESCRIBING,
    why: 'dice que se puede guardar un diagnóstico, y el perfil describe barreras y '
      + 'nunca diagnósticos' },
];

/**
 * Scan a whole corpus file, front matter included.
 *
 * The **whole** file, not just the prose: the front matter travels to nobody as
 * instructions, but a `label` reading «Ignora las instrucciones anteriores» is still
 * something she should see before she activates it — and scanning only the body would
 * be an exemption an attacker can read about in this repository.
 */
export function scanNormativeImport(raw: string): NormativeFinding[] {
  const lines = raw.split('\n');
  const found: NormativeFinding[] = [];
  const seen = new Set<string>();

  const add = (f: NormativeFinding) => {
    const key = `${f.line}:${f.quote}`;
    if (!seen.has(key)) { seen.add(key); found.push(f); }
  };

  /*
   * Line by line for `detectInjection`, because it takes a `Block` and reports the line
   * it matched — and a whole file as one block would report «line 1» for everything,
   * which in a 200-line normativa is a finding she cannot act on.
   */
  lines.forEach((text, i) => {
    if (text.trim() === '') return;
    const block = { id: `l${i + 1}`, classes: [], attrs: {}, content: text, notices: [] } as unknown as Block;
    for (const notice of detectInjection(block)) {
      add({ family: 'injection', quote: notice.quote, line: i + 1, why: notice.message });
    }
    for (const { re, why, unless } of CONFLICTS) {
      if (!re.test(text)) continue;
      if (unless?.test(text)) continue;
      add({ family: 'conflict', quote: text.trim().slice(0, 200), line: i + 1, why });
    }
  });

  return found;
}

/**
 * The sentence above the findings, and it says what happens next rather than only what
 * is wrong.
 *
 * Separate from the list because a heading that changes with the count is a heading she
 * reads; «2 hallazgos» above a list she has to interpret is not.
 */
export function explainScan(findings: readonly NormativeFinding[]): string {
  if (findings.length === 0) {
    return 'No he encontrado nada raro en este fichero. Léelo igualmente: yo miro formas '
      + 'conocidas, no si lo que dice sobre tu normativa es cierto.';
  }
  const conflicts = findings.filter((f) => f.family === 'conflict').length;
  const injections = findings.length - conflicts;
  const parts: string[] = [];
  if (injections) {
    parts.push(injections === 1
      ? 'una línea que parece hablarle al programa en vez de a ti'
      : `${injections} líneas que parecen hablarle al programa en vez de a ti`);
  }
  if (conflicts) {
    parts.push(conflicts === 1
      ? 'una línea que dice permitir algo que las reglas duras prohíben'
      : `${conflicts} líneas que dicen permitir algo que las reglas duras prohíben`);
  }
  return `He encontrado ${parts.join(' y ')}. No lo he quitado del fichero y no lo voy a `
    + 'obedecer: lo que prohíben las reglas duras no lo puede permitir ningún fichero de '
    + 'normativa. Léelas y decide si activas este corpus.';
}
