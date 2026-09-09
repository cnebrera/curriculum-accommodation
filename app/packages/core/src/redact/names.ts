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

/**
 * Frequent given names in Spanish classrooms.
 *
 * ## Why this list grew, and whose problem the old one was
 *
 * It held about sixty traditional Spanish names and the review (AGE-01, decision
 * P17) found what that cost: **Sofía** — top three in Spain for a decade —
 * **Fátima**, **Mohamed**, **Aya** and **Ainhoa** were all absent, and an absent
 * name is a name that reaches the provider without the teacher being asked. The
 * bias fell precisely on migrant pupils, who are over-represented in a PT's
 * caseload. The canonical example in this file's own docblock («Lucía no
 * arranca…») worked only because Lucía happened to be on the list.
 *
 * So: the frequent names of the whole classroom, Spanish-origin and not —
 * Moroccan and Arabic, Romanian, Latin American, Chinese, Sub-Saharan, Eastern
 * European. Accented and unaccented forms both, because `findProbableNames`
 * lower-cases without folding.
 *
 * **Two honest caveats.** This is assembled from what frequency lists in Spain
 * look like, not from a verified INE extract — a name that is common somewhere
 * and missing here is a defect, and BACKLOG G42 records that the list wants to
 * become corpus a teacher can extend for her own school and her own country.
 * And it is deliberately **not load-bearing**: the note-initial rule below
 * catches an unknown name at the start of a note whether it is listed or not,
 * which is the case the review found. The list is what catches it in the middle.
 */
const COMMON_NAMES = new Set([
  // Spanish-origin, girls
  'lucia','lucía','maria','maría','carmen','ana','isabel','laura','marta','sara','paula','julia',
  'alba','elena','claudia','irene','noa','vega','daniela','valeria','martina','carla','nerea',
  'sofia','sofía','emma','olivia','mia','mía','valentina','lara','jimena','abril','ines','inés',
  'candela','manuela','chloe','chloé','ainhoa','aitana','alma','ariadna','nora','triana','vera',
  'adriana','alicia','africa','áfrica','angela','ángela','beatriz','blanca','celia','clara','cristina',
  'gabriela','gemma','gloria','iria','leire','lidia','lorena','lucero','luna','marina','mar','mireia',
  'natalia','nayara','nieves','patricia','pilar','raquel','rocio','rocío','rosa','ruth','silvia',
  'teresa','veronica','verónica','victoria','yaiza','zoe','zoé',
  // Spanish-origin, boys
  'antonio','jose','josé','manuel','francisco','juan','david','javier','daniel','carlos','miguel',
  'alejandro','pablo','sergio','jorge','alberto','adrian','adrián','diego','mario','hugo','martin',
  'martín','lucas','leo','izan','thiago','marco','bruno','gael','enzo','dylan','aitor','unai',
  'alvaro','álvaro','angel','ángel','dario','darío','eric','fernando','gonzalo','guillermo','ian',
  'ignacio','inigo','iñigo','isaac','ismael','ivan','iván','joel','jon','luis','marcos','mateo',
  'matias','matías','nicolas','nicolás','oliver','oscar','óscar','pau','pedro','rafael','raul','raúl',
  'ruben','rubén','samuel','santiago','sergi','victor','víctor','xavier','yago',
  // Moroccan and Arabic — the largest migrant community in Spanish schools
  'mohamed','mohammed','muhammad','ahmed','ahmad','ali','omar','yusuf','youssef','yassin','yassine',
  'amine','amin','anas','bilal','hamza','hicham','ibrahim','idris','ilias','imran','ismail','karim',
  'khalid','mehdi','nabil','nadir','rachid','rayan','said','salah','samir','tarik','tariq','walid',
  'zakaria','aya','amina','asma','asmae','dounia','fatima','fátima','fatiha','hajar','hanane','ikram',
  'imane','iman','jamila','kaoutar','khadija','latifa','leila','lina','malak','mariam','maryam',
  'meryem','naima','nour','noor','rania','rim','safa','sakina','salma','samira','sara','sanae',
  'siham','soukaina','yasmin','yasmina','zineb','zahra',
  // Romanian and Eastern European
  'andrei','alexandru','bogdan','catalin','cătălin','ciprian','constantin','cosmin','cristian',
  'daniel','dragos','dragoș','florin','gabriel','george','ionut','ionuț','marian','mihai','nicu',
  'petru','razvan','răzvan','stefan','ștefan','valentin','vasile','viorel','alexandra','andreea',
  'bianca','cristina','daniela','denisa','elena','florina','gabriela','georgiana','ioana','ionela',
  'iulia','larisa','madalina','mădălina','mihaela','monica','nicoleta','roxana','simona','stefania',
  'ștefania','vasilica','oleksandr','dmytro','iryna','olena','kateryna','yulia','anastasiia',
  // Latin American — often the same names, plus these
  'brayan','brian','deivid','edwin','jefferson','jhon','jhonny','kevin','maicol','wilson','yeison',
  'anahi','anahí','arianna','dayana','genesis','génesis','karol','katherine','lisbeth','marisol',
  'milagros','nayeli','rosmery','yamileth','yulissa',
  // Chinese (pinyin as written on a Spanish roll)
  'chen','cheng','fang','hui','jia','jian','jing','lei','lin','ling','mei','min','ming','ning',
  'peng','qian','shan','tao','wei','xin','yan','yang','ying','yuan','zhen','zhi',
  // Sub-Saharan and other
  'aminata','aissatou','fatou','mariama','oumou','abdou','amadou','ibrahima','mamadou','moussa',
  'ousmane','sekou','babacar','cheikh','lamine','pape','blessing','favour','joy','precious',
  'chinedu','emeka','ifeanyi','kwame','kofi','olusegun','samba','yaw',
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

  /*
   * Lo que una ficha dice, y lo que Rampa escribe ella misma (backlog G65).
   *
   * Ampliar **esta** lista es seguro y no toca la decisión P17: `COMMON_NAMES` se
   * consulta antes, así que una palabra que además sea nombre —«Rosa», «Abril»,
   * «Luna»— sigue marcándose igual. El coste en falsos positivos que P17 acepta
   * a propósito es el de una palabra **desconocida** en posición de nombre; no
   * incluye preguntarle si «Escribe» es un alumno.
   *
   * Por qué hacían falta las tres familias de abajo, medido:
   *
   * - Un vault recién creado bloqueaba la primera adaptación con «Cómo, Escribe,
   *   Por, Esto» — las cuatro iniciales de las frases del `house.md` **que siembra
   *   Rampa**. La maestra tenía que declarar que el texto de relleno de Rampa no
   *   eran alumnos suyos antes de conseguir una ficha.
   * - La primera extracción real de una ficha de ecosistemas **sin un solo nombre
   *   propio** devolvió siete: «Recuerda, Lee, Escribe, Une, Imagen, Actividad,
   *   Naturaleza». Ahí el barrido tiene que existir (FR-610 protege el vault del
   *   nombre escrito a mano en la hoja), así que la lista es la única salida.
   *
   * Imperativos: son el modo verbal de todo enunciado, y el primer token de cada
   * línea se marca a propósito, así que cada enunciado de cada ficha caía aquí.
   */
  'lee','escribe','une','recuerda','resuelve','completa','calcula','observa','rodea',
  'subraya','copia','dibuja','relaciona','contesta','responde','senala','señala',
  'marca','ordena','clasifica','elige','busca','indica','explica','compara','piensa',
  'comprueba','repasa','corrige','coloca','anota','apunta','tacha','colorea','recorta',
  'pega','traza','mide','suma','resta','multiplica','divide','lee-y-responde',

  // Interrogativos y conectores que abren línea en cualquier hoja.
  'como','cómo','cuando','cuándo','donde','dónde','cuanto','cuánto','cuanta','cuánta',
  'cuantos','cuántos','cuantas','cuántas','cual','cuál','cuales','cuáles','quien','quién',
  'quienes','quiénes','porque','porqué','para','pero','ahora','luego','despues','después',
  'por','que','qué','con','sin','uno','dos','tres','cuatro','cinco','seis','siete','ocho',
  'nueve','diez','hay','son','ser','sea','muy','mas','más','tan','asi','así','aqui','aquí',
  'alli','allí','ademas','además','solo','sólo','tras','ante','bajo','contra','durante',
  'antes','tambien','también','entonces','esto','eso','aquello','todos','todas','cada',
  'otro','otra','otros','otras','mismo','misma','sobre','desde','hasta','entre','segun','según',

  // Sustantivos de hoja: lo que una ficha nombra de sí misma.
  'imagen','imagenes','imágenes','actividad','actividades','naturaleza','ejercicio',
  'ejercicios','problema','problemas','pregunta','preguntas','respuesta','respuestas',
  'texto','textos','pagina','página','paginas','páginas','tarea','tareas','ejemplo',
  'ejemplos','fecha','curso','nota','notas','apartado','apartados','solucion','solución',
  'soluciones','material','materiales','esquema','tabla','figura','dibujo','lectura',
  'operacion','operación','operaciones','resultado','resultados','total','datos',
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

    /*
     * A known name wins over the classroom stop-list, and the order is the
     * decision (P17).
     *
     * `Abril`, `Rosa`, `Nieves`, `Alma`, `Luna` and `Candela` are girls in Spanish
     * classrooms *and* ordinary words, and two of them were already in
     * `NOT_A_NAME` as months and nouns. Whichever set is consulted first decides
     * which error this makes: a question she did not need, or a child's name in a
     * payload. Carlos's answer took the first cost explicitly — «se acepta el
     * coste en falsos positivos: es RGPD de menores».
     */
    if (COMMON_NAMES.has(lower)) { found.add(word); continue; }
    if (NOT_A_NAME.has(lower)) continue;

    /*
     * Mid-sentence capitals in Spanish are usually proper nouns, **and so is the
     * first word of a teacher's note** (AGE-01, decision P17).
     *
     * That second half was the hole. The rule was «only when it is not
     * sentence-initial», and a note starts with the child: «Fátima no arranca sin
     * el primer paso hecho». An unlisted name in that position was not flagged,
     * so she was never asked, so it left the machine — and the names most likely
     * to be unlisted were the migrant ones. The list was doing work it could not
     * be trusted to do.
     *
     * So the first candidate token of each **line** is treated as a candidate
     * whatever its position. A line, not a sentence: «No arranca sola.» opening a
     * note is a false positive we accept, while flagging every sentence-initial
     * capital in a paragraph would fire on every «Necesita», «Cuando» and «Hoy»
     * and teach her to dismiss the question — which is the failure mode this
     * file's own docblock warns about.
     */
    const before = text.slice(Math.max(0, m.index! - 2), m.index!);
    const sentenceStart = m.index === 0 || /[.!?¿¡]\s*$/.test(before) || /\n\s*$/.test(before);
    const lineStart = m.index === 0 || /\n\s*$/.test(text.slice(0, m.index!));
    if ((!sentenceStart || lineStart) && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(word)) found.add(word);
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
