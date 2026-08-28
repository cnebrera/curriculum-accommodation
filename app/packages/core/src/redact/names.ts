/**
 * Names never reach a model (006 FR-418, FR-419).
 *
 * This is the promise the harness could not keep: every safeguard there governs
 * what the agent writes down, and none governs what the teacher types. She will
 * write "Lucía no arranca sin el primer paso hecho", and the name is in the
 * payload before any rule applies. Only something sitting between her and the
 * provider can stop that, which is this.
 *
 * Deterministic by necessity as well as by principle: sending the text somewhere
 * to find out whether it is safe to send would be circular.
 */

export interface RedactionResult {
  text: string;
  /** Known names replaced, as code → count. */
  replaced: Record<string, number>;
  /** Probable names we do not know. The teacher is asked; nothing is rewritten. */
  flagged: string[];
}

/** Frequent Spanish given names. Small on purpose: this only has to catch the common case. */
const COMMON_NAMES = new Set([
  'lucia','lucía','maria','maría','carmen','ana','isabel','laura','marta','sara','paula','julia',
  'alba','elena','claudia','irene','noa','vega','daniela','valeria','martina','carla','nerea',
  'antonio','jose','josé','manuel','francisco','juan','david','javier','daniel','carlos','miguel',
  'alejandro','pablo','sergio','jorge','alberto','adrian','adrián','diego','mario','hugo','martin',
  'martín','lucas','leo','izan','thiago','marco','bruno','gael','enzo','dylan','aitor','unai',
]);

/** Words that start a sentence or are simply capitalised in Spanish prose. */
const NOT_A_NAME = new Set([
  'el','la','los','las','un','una','este','esta','ese','esa','aquel','aquella','su','sus','mi','mis',
  'lengua','matematicas','matemáticas','sociales','naturales','ciencias','historia','geografia',
  'geografía','musica','música','plastica','plástica','ingles','inglés','frances','francés',
  'primaria','secundaria','bachillerato','infantil','unidad','tema','ficha','examen','control',
  'lunes','martes','miercoles','miércoles','jueves','viernes','sabado','sábado','domingo',
  'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre',
  'noviembre','diciembre','rampa','claude','google','anthropic','pdf','html','word',
]);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Accent-insensitive matching.
 *
 * A teacher typing quickly writes "lucia", and an exact match on "Lucía" lets
 * the name through — which defeats the one promise this application exists to
 * keep. Each letter is expanded to a class covering its accented forms, so
 * indices stay intact and the original text is spliced, not normalised.
 * Found by test, not by review.
 */
const FOLD: Record<string, string> = {
  a: 'aáàäâã', e: 'eéèëê', i: 'iíìïî', o: 'oóòöôõ', u: 'uúùüû',
  n: 'nñ', c: 'cç', y: 'yý',
};

function accentInsensitive(word: string): string {
  return [...word].map((ch) => {
    // Fold the character in the NAME to its base letter first. Looking up the
    // accented form directly leaves "Lucía" matching only "Lucía", which is the
    // bug this function exists to prevent.
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const set = FOLD[base];
    return set ? `[${set}${set.toUpperCase()}]` : escapeRe(ch);
  }).join('');
}

/**
 * Replace known names with their codes and flag probable unknown ones.
 * @param known code → the learner's name, as held in the encrypted store.
 */
export function redact(text: string, known: ReadonlyMap<string, string>): RedactionResult {
  let out = text;
  const replaced: Record<string, number> = {};

  // Longest first, so "Ana María" is not half-replaced by "Ana".
  const entries = [...known.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [code, name] of entries) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    // Whole words, accent- and case-insensitive, including each part of a full name.
    for (const part of [trimmed, ...trimmed.split(/\s+/)]) {
      if (part.length < 3) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${accentInsensitive(part)}(?![\\p{L}\\p{N}])`, 'giu');
      out = out.replace(re, () => { replaced[code] = (replaced[code] ?? 0) + 1; return code; });
    }
  }

  return { text: out, replaced, flagged: findProbableNames(out) };
}

/**
 * Narrow heuristic, applied to text the teacher typed.
 *
 * It asks; it never blocks and never rewrites. A detector that fires constantly
 * is one she learns to dismiss, and then it protects nothing.
 */
export function findProbableNames(text: string): string[] {
  const found = new Set<string>();
  const tokens = [...text.matchAll(/(?<![\p{L}\p{N}])(\p{Lu}[\p{Ll}]{2,})(?![\p{L}\p{N}])/gu)];

  for (const m of tokens) {
    const word = m[1]!;
    const lower = word.toLowerCase();
    if (NOT_A_NAME.has(lower)) continue;

    if (COMMON_NAMES.has(lower)) { found.add(word); continue; }

    // Otherwise only when it is not sentence-initial: mid-sentence capitals in
    // Spanish are usually proper nouns.
    const before = text.slice(Math.max(0, m.index! - 2), m.index!);
    const sentenceStart = m.index === 0 || /[.!?¿¡]\s*$/.test(before) || /\n\s*$/.test(before);
    if (!sentenceStart && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(word)) found.add(word);
  }
  return [...found];
}

/** True when nothing recognisable as a learner name survives. */
export function isClean(text: string, known: ReadonlyMap<string, string>): boolean {
  for (const name of known.values()) {
    for (const part of name.trim().split(/\s+/)) {
      if (part.length < 3) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${accentInsensitive(part)}(?![\\p{L}\\p{N}])`, 'iu');
      if (re.test(text)) return false;
    }
  }
  return true;
}
