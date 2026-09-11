import type { IRDocument, Block, Notice } from '../ir/types.js';
import { recipeIds } from '../ir/provenance.js';
import { recipeRef, type Selection } from '../recipes/index.js';
import { parseReportNotes } from './notes.js';
import { phraseOf } from '../guide/corpus.js';

/**
 * The adaptation report, grouped by decision rather than by paragraph.
 *
 * The teacher reviews about fifteen decisions instead of re-reading twelve
 * pages — that is what makes the time saving real, and it is where the errors
 * that matter get caught.
 */
/**
 * Los números del original que ya no encabezan una tarea en el adaptado.
 *
 * Una tarea es un `.exercise` o un `.assessment`. Un `.scaffold` no lo es, y ésa es la
 * distinción que hace falta: en el pase de G69 el «1» seguía en la hoja, dentro de un
 * ejemplo resuelto.
 *
 * La comparación es **por prefijo** para que `4` siga contando como encabezado cuando se
 * ha extendido en `4a` y `4b` — que es lo que la regla dura 7 prescribe y no un defecto.
 */
function numbersNoLongerHeadingATask(
  original: IRDocument | undefined, adapted: IRDocument,
): string[] {
  if (!original) return [];
  const isTask = (b: { classes: string[] }): boolean =>
    b.classes.includes('exercise') || b.classes.includes('assessment');
  const heading = new Set(adapted.blocks.filter(isTask)
    .map((b) => b.attrs['data-number']).filter((n): n is string => typeof n === 'string'));
  const kept = (n: string): boolean =>
    heading.has(n) || [...heading].some((h) => h.startsWith(n));
  return [...new Set(original.blocks.filter(isTask)
    .map((b) => b.attrs['data-number'])
    .filter((n): n is string => typeof n === 'string' && n.trim() !== ''))]
    .filter((n) => !kept(n));
}

export interface Decision {
  title: string;
  recipe: string;
  axis: string;
  blocks: string[];
}

export interface ReportInput {
  adapted: IRDocument;
  /**
   * El documento **original**, para que la numeración se pueda comprobar (`039` FR-3709,
   * backlog G69).
   *
   * Opcional porque hay caminos que no tienen uno —una composición se escribe desde cero—
   * y porque todo informe escrito antes de esto se generó sin él. Ausente significa
   * «no hay nada contra lo que comprobar», que es distinto de «está bien».
   *
   * El pase real que lo hizo necesario: un informe decía «no he tocado la numeración
   * original» sobre una hoja donde el ejercicio 1 había dejado de ser un ejercicio y salía
   * ya resuelto. La afirmación se quitó —era media cosa— y ésta es la otra media.
   */
  original?: IRDocument;
  selection?: Selection;
  dropped?: Array<{ id: string; why: string }>;
  undescribedFigures?: string[];
  /**
   * Why a bridge word could not be built, already in her words (`033` FR-3106).
   *
   * Sentences rather than the `BridgeAbsence` union, because the union's own module owns
   * the wording (`explainAbsence`) and a second place turning a `kind` into a sentence is
   * a second place that has to learn about a fourth kind.
   */
  bridgeAbsences?: readonly string[];
  /**
   * Lo que no se aplicó porque **no le toca decidirlo al sistema** (`039` FR-3705…FR-3708).
   *
   * ## Por qué tres campos y no una cadena
   *
   * Esto era `flaggedSignificant?: string[]`, y estaba **declarado, renderizado y sin
   * ningún llamador de producción**: el canal existía dos veces y sólo la mitad conectada.
   * `exam-access-not-difficulty.md` dice de su segunda lista «no está prohibida, **no es
   * tuya la decisión. Márcalo y para**», y no había dónde marcar.
   *
   * Tres campos porque el informe tiene que poder presentarlos **distinto**: el qué y el
   * porqué los produce el sistema; la propuesta es **texto que escribió un modelo**.
   * Mezclados en una cadena, esa distinción se pierde el día que alguien cambie el formato,
   * y es la distinción que el Principio IX vuelve no negociable.
   *
   * ## La propuesta es contenido, no instrucción
   *
   * Que la haya pedido el sistema no la convierte en salida del sistema. Se **muestra**, no
   * se ejecuta, y **no alcanza la hoja por ningún camino**: la hoja se generó sin la
   * adaptación y es la misma hoja. Está en `contracts/escalada.md` con el aumento de
   * superficie dicho en voz alta — es el único texto de modelo que llega al informe
   * **entero y con su forma**, porque aplanarlo lo haría inservible para lo único que
   * sirve, copiarlo a un examen.
   *
   * ## Y es opcional, a propósito
   *
   * Hay adaptaciones que se escalan y no se pueden redactar: «reducir el número de ítems»
   * no tiene un texto que proponer. Una propuesta obligatoria invitaría a inventar una.
   */
  escalated?: readonly { what: string; why: string; proposal?: string }[];
  /**
   * The journal entries **loaded** for this run, by recipe id (003 FR-210).
   *
   * Not what to report — what the model was *allowed* to have used. Every
   * `[memory:...]` declaration is checked against this list, so a claim about
   * learning the model was never given is dropped rather than shown.
   *
   * That check is the whole value of this section. A line saying "your correction
   * changed this" is worth reading only if it cannot be produced by a model that
   * never saw the correction.
   */
  memoryAvailable?: Array<{ recipe: string; source: string }>;
  /**
   * What she said the material is, and what that forbade (012 FR-1006).
   *
   * The report claims to record every decision, and until now it recorded which
   * recipes applied and never **under which rule** — so a teacher signing an
   * adapted exam had no line telling her it had been treated as one. That is the
   * thing she is signing for.
   *
   * `null` or absent for material that predates `012`, and the report then says
   * nothing rather than claiming a rule governed something it did not.
   */
  kind?: { id: string; label: string; forbids: string[] } | null;
  /**
   * Which normativa's wording names what this adaptation is (`029` T009/T012).
   *
   * The sentence below used to name one community's platform in a string literal, in a
   * report every teacher in Spain reads. Absent is generic mode — the report still says
   * what was and was not changed, and simply does not claim to know where she registers
   * things.
   */
  wording?: { phrases?: Record<string, string>; generic?: Record<string, string> };
  /** Printed under it, so the document says which corpus it followed (FR-2705). */
  provenanceLine?: string;
  /**
   * Which version of the pedagogical corpus produced this (`034` FR-3207, Principle VI).
   *
   * A report from January has to keep saying which judgement made it, six corpus
   * corrections later — otherwise «lo revisé y estaba bien» becomes unanswerable the
   * moment a recipe changes. New jobs only: an update governs what happens next and
   * never rewrites what is already signed.
   *
   * `0` and absent both mean «this was made before the corpus was numbered», which is
   * every sheet in every vault that predates this feature, and is said rather than
   * hidden.
   */
  corpusVersion?: number;
  /**
   * Pictograms, **only when she turned them on** (018 FR-1607).
   *
   * Absent means she did not, and the report then says nothing at all about them.
   * Not «no pictograms were added»: a tool that keeps mentioning pictograms is a
   * tool arguing with her about how a child is seen, and she has already answered.
   */
  pictograms?: {
    used: Array<{ blockId: string; word: string; id: string }>;
    /** Ambiguities, in her words. She chooses; we do not (FR-1609). */
    skipped: string[];
  };
}

export interface Report {
  decisions: Decision[];
  notDone: string[];
  /**
   * The stated kind disagrees with what the blocks look like (012 FR-1005).
   *
   * **Reported, never acted on.** Ingested material is attacker-controllable
   * (Principle IX), so a document that could promote itself to an exam could
   * equally demote an exam to a worksheet — and the second direction is the
   * dangerous one. She may also be adapting last year's exam as practice, which
   * is a perfectly ordinary thing to do and not a mistake to correct.
   */
  kindDisagreement: string | null;
  notices: Array<{ block: string | null; notice: Notice }>;
  /** Prior learning that verifiably changed something (003 FR-210). */
  memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  markdown: string;
}

/**
 * The prohibitions, in her words rather than as corpus ids.
 *
 * The ids are machine-readable on purpose (`forbids: [quantities, operations]`)
 * so the report can name them; a report that printed `curricular-demand` would be
 * asking her to learn our vocabulary to read her own document.
 *
 * An unknown id falls through as itself rather than being dropped: a new
 * prohibition added to the corpus should read oddly for one release, not vanish.
 */
const FORBIDS_LABELS: Record<string, string> = {
  'curricular-demand': 'la exigencia curricular',
  numbering: 'la numeración original',
  'question-demand': 'lo que pregunta cada pregunta',
  'item-count': 'cuántas preguntas se evalúan',
  content: 'lo que dice el texto',
  coverage: 'nada de lo que había que cubrir',
  quantities: 'las cantidades',
  operations: 'las operaciones que se practican',
};

const FORBIDS_ES = (ids: readonly string[]): string =>
  ids.map((i) => FORBIDS_LABELS[i] ?? i).join(', ');

const titleFor = (recipeId: string, count: number): string => {
  const many = count > 1 ? `${count} bloques` : 'un bloque';
  return `${recipeId} · ${many}`;
};

export function buildReport(input: ReportInput): Report {
  const { adapted } = input;
  const groups = new Map<string, Decision>();

  for (const b of adapted.blocks) {
    const recipe = b.attrs['data-recipe'];
    if (!recipe) continue;
    const axis = b.attrs['data-axis'] ?? '—';
    const key = `${recipe}|${axis}`;
    const existing = groups.get(key);
    if (existing) existing.blocks.push(b.id);
    else groups.set(key, { title: '', recipe, axis, blocks: [b.id] });
  }

  const decisions = [...groups.values()].map((d) => ({
    ...d, title: titleFor(recipeIds(d.recipe).join(', '), d.blocks.length),
  }));

  // What was NOT done goes first: it is what the teacher needs to see.
  const notDone: string[] = [];

  // The model's own declarations (T087). Flags first: they are the ones that
  // need a decision from her, and a decision she never sees is a decision made
  // for her.
  const declared = parseReportNotes(adapted);
  for (const f of declared.flags) notDone.push(`Necesita que lo decidas tú: ${f}`);
  for (const d of declared.dropped) notDone.push(`Quité el bloque "${d.id}": ${d.why}`);

  for (const d of input.dropped ?? []) notDone.push(`Quité el bloque "${d.id}": ${d.why}`);
  for (const f of input.undescribedFigures ?? []) notDone.push(f);
  for (const c of input.selection?.resolved ?? []) {
    notDone.push(`Conflicto entre "${c.kept}" y "${c.dropped}": me quedé con "${c.kept}" porque ${c.because}.`);
  }

  /**
   * FR-210 · which memory item altered a decision.
   *
   * Memory is meant to be as traceable as a recipe, and it was not. The previous
   * implementation reported **every entry loaded** with the fixed string
   * "Apliqué lo aprendido antes" — so an entry that happened to match a recipe id
   * and changed nothing looked exactly like a correction that did. A list where
   * everything is claimed is a list she stops reading, and then the one line that
   * mattered goes with it.
   *
   * Now: the model declares what it used, and this checks the declaration against
   * what was actually loaded. Two failure modes closed at once — the noise, and
   * the fabrication.
   */
  const available = new Map((input.memoryAvailable ?? []).map((m) => [m.recipe, m.source]));
  const memoryApplied = declared.memory
    .filter((m) => available.has(m.recipe))
    .map((m) => ({ recipe: m.recipe, source: available.get(m.recipe)!, effect: m.effect }));

  const notices: Report['notices'] = [
    ...adapted.notices.map((n) => ({ block: null, notice: n })),
    ...adapted.blocks.flatMap((b: Block) => b.notices.map((n) => ({ block: b.id, notice: n }))),
  ];

  /*
   * FR-1005. Assessment-shaped blocks in something she called anything else.
   *
   * One direction only, and deliberately: an exam mislabelled as a worksheet is
   * the dangerous case, because it gets adapted under the loose rule. A worksheet
   * containing an `.assessment` block is ordinary — most worksheets end with one.
   */
  const assessmentBlocks = adapted.blocks.filter((b: Block) => b.classes.includes('assessment'));
  const kindDisagreement =
    input.kind && input.kind.id !== 'exam' && assessmentBlocks.length > 0
      ? `Dijiste que esto es «${input.kind.label.toLowerCase()}», y he encontrado `
        + `${assessmentBlocks.length === 1 ? 'un bloque' : `${assessmentBlocks.length} bloques`}`
        + ' con forma de pregunta de examen. Lo he adaptado como me dijiste — puede que'
        + ' estés usando un examen del año pasado para practicar, que es normal. Si era un'
        + ' examen de verdad, dímelo y lo vuelvo a hacer con la regla de exámenes.'
      : null;

  const md: string[] = ['# Qué he cambiado y por qué', ''];

  /*
   * What this is, in the regulation's own words (017 FR-1501).
   *
   * Rampa has been producing **adaptaciones no significativas** since the first
   * worksheet — an ACNS changes methodology, activities, timing and materials and no
   * objective, which is Principle III stated as regulation. It had never said so, and
   * that mattered in both directions:
   *
   * - She has to write and register that document, and a report that describes its
   *   contents without naming it leaves her to make the connection.
   * - Naming it is also a **limit**: what Rampa did is not the significant kind, and a
   *   document that left that open invites somebody to treat it as one.
   *
   * The register is named in the same breath, because the one thing this must never be
   * mistaken for is a filed document (`017` FR-1502, SC-1506).
   *
   * What that document is *called* and where it is registered comes from her normativa
   * (`029` T009) — it was a string literal naming Andalucía's platform, in a report
   * every teacher in Spain reads.
   */
  md.push(
    ...phraseOf('report-note', input.wording?.phrases, input.wording?.generic)
      .split('\n').map((l) => `> ${l}`.trimEnd()),
    ...(input.provenanceLine
      ? ['>', ...input.provenanceLine.split('\n').map((l) => `> ${l}`.trimEnd())]
      : []),
    ...(input.corpusVersion !== undefined && input.corpusVersion > 0
      ? ['>', `> Hecho con el criterio pedagógico versión ${input.corpusVersion}.`]
      : []),
    '');

  /*
   * What it was treated as, first, because it is the rule everything below
   * happened under and she is signing for it.
   */
  if (input.kind) {
    md.push(`## Lo he tratado como: ${input.kind.label.toLowerCase()}`, '');
    /*
     * La **regla**, y no una afirmación de haberla cumplido (backlog G69).
     *
     * Esta línea decía «Eso quiere decir que no he tocado: …» y se construye entera
     * desde `kind.forbids`, o sea desde el corpus del tipo de material. Nada la
     * comprueba. Así que el informe afirmaba, en pasado y sobre cada restricción del
     * tipo, que se habían respetado todas — y en un pase real de verdad afirmó «no he
     * tocado la numeración original» sobre una hoja en la que el ejercicio 1 había
     * dejado de ser un ejercicio y salía ya resuelto.
     *
     * Es la misma clase de frase que `recommend.ts` publicó una vez —«hay más baratos,
     * pero salieron peor en las pruebas», con los tests en verde porque nada se había
     * medido— y la regla que salió de aquello es la de G29: sin evidencia, no hay
     * afirmación. Aquí no hay evidencia posible: `ReportInput` no recibe el documento
     * original, así que no hay nada contra lo que comprobar la numeración.
     *
     * Lo que sí es verdad, y es lo que ella necesita antes de firmar, es **bajo qué
     * regla se ha trabajado**. Eso es lo que dice ahora, y dice también que
     * comprobarlo es suyo.
     */
    if (input.kind.forbids.length) {
      md.push(
        `La regla de ese tipo de material es no tocar: ${FORBIDS_ES(input.kind.forbids)}.`,
        '',
        'Eso es la regla con la que he trabajado, no una comprobación de haberla '
        + 'cumplido: eso lo ves tú en la hoja.',
        '');
    }
  }

  /*
   * Y ahora **la comprobación**, cuando hay con qué hacerla (FR-3709).
   *
   * «Encabeza una tarea» y no «aparece», que es la diferencia entera: en el pase que
   * produjo G69 el número 1 seguía en la hoja — dentro de un `.scaffold`, como ejemplo
   * resuelto— y buscarlo lo habría encontrado. Lo que había dejado de ser es un ejercicio.
   *
   * Un número que se extiende en `4a`/`4b` no es un aviso: sigue encabezando tareas, dos,
   * y es exactamente lo que la regla dura 7 prescribe. Por eso se compara por prefijo.
   */
  const lost = numbersNoLongerHeadingATask(input.original, input.adapted);
  if (lost.length) {
    md.push('## La numeración', '',
      `${lost.length === 1 ? 'El número' : 'Los números'} `
      + `${lost.map((n) => `**${n}**`).join(', ')} `
      + `${lost.length === 1 ? 'dejó' : 'dejaron'} de encabezar una tarea: `
      + 'en el material original era una y en el adaptado ya no.',
      '',
      'Puede estar bien —un ejercicio convertido en ejemplo resuelto es una decisión '
      + 'legítima y a veces la buena— pero cambia lo que el alumno tiene que hacer, '
      + 'así que lo miras tú.',
      '');
  }

  if (kindDisagreement) {
    md.push('## Una cosa sobre lo que es este material', '', kindDisagreement, '');
  }

  if (notDone.length) {
    md.push('## Lo que NO he hecho', '');
    for (const n of notDone) md.push(`- ${n}`);
    md.push('');
  }

  /*
   * Su propio apartado, y **nunca dentro del de arriba** (FR-3707).
   *
   * Los dos hechos son verdad y no son el mismo hecho: «no he hecho X» es una acción que
   * no ocurrió; «esto lo decides tú, y aquí tienes el texto» es una decisión pendiente con
   * material para tomarla. Una propuesta impresa entre las primeras se lee como hecha.
   *
   * La propuesta va en bloque y **no pasa por `parseReportNotes`**, cuyo normalizador
   * aplana espacios y quita viñetas. Ese normalizador está bien para lo suyo —las notas
   * que ella escribe a mano— y aquí destruiría el único valor que tiene el texto.
   */
  const escalated = input.escalated ?? [];
  if (escalated.length) {
    md.push('## Esto lo decides tú', '');
    for (const e of escalated) {
      md.push(`### ${e.what}`, '', e.why, '');
      if (e.proposal !== undefined && e.proposal.trim() !== '') {
        md.push('Si decides hacerlo, te lo dejo escrito:', '');
        /*
         * Tal cual, con sus saltos. Como cita, para que se vea de un golpe que es una
         * propuesta y no algo que esté en la hoja — la hoja se generó sin esto.
         */
        for (const line of e.proposal.split('\n')) md.push(`> ${line}`);
        md.push('');
      }
    }
  }

  if (notices.length) {
    md.push('## Avisos sobre el material', '');
    for (const { block, notice } of notices) {
      md.push(`- **${notice.kind === 'instruction-shaped' ? 'Texto que parece dar órdenes' :
        notice.kind === 'hidden-text' ? 'Texto que no se ve en la hoja' :
        notice.kind === 'unreadable' ? 'No pude leerlo' : 'Material demasiado largo'}**` +
        `${block ? ` (bloque ${block})` : ''}: ${notice.message}`);
      md.push(`  > ${notice.quote}`);
    }
    md.push('');
  }

  /*
   * Vehicular supports are grouped apart, and attributed to the mark (`033` T012, FR-3108).
   *
   * His record must never read as if a disability had been observed. Listed among the
   * axis-driven decisions, «apoyo-visual-instrucciones · Barrera: LIN» is what a tutor
   * reads next year — and the barrier named would be one nobody found. What is true is
   * that he was three weeks into the language, which is a different sentence and one that
   * stops being true.
   *
   * Split here rather than at the source because the recipes already say which they are:
   * `marks:` and no axis is the whole test, and the selection carries it.
   */
  const isVehicular = (d: Decision): boolean =>
    input.selection?.selected.some((r) =>
      recipeRef(r) === d.recipe && r.marks.length > 0 && r.axes.length === 0) ?? false;

  const byMark = decisions.filter(isVehicular);
  for (const d of decisions.filter((x) => !isVehicular(x))) {
    md.push(`## ${d.title}`);
    md.push(`Receta: \`${d.recipe}\` · Barrera: \`${d.axis}\``);
    md.push(`Bloques: ${d.blocks.join(', ')}`);
    md.push('');
  }

  if (byMark.length) {
    md.push('## Apoyo por el idioma, no por una barrera', '');
    md.push('Esto lo he hecho porque tienes apuntado que está aprendiendo el idioma del '
      + 'aula. **No es una dificultad suya de lenguaje**: es una barrera de acceso que se '
      + 'irá, y este apartado está aparte para que su expediente no diga otra cosa.', '');
    for (const d of byMark) {
      md.push(`### ${d.title}`);
      md.push(`Receta: \`${d.recipe}\` · Por: la lengua vehicular en adquisición`);
      md.push(`Bloques: ${d.blocks.join(', ')}`);
      md.push('');
    }
    /*
     * And what could not be bridged, in her words (FR-3106).
     *
     * A deterministic fact the code states — the set had no such language, the word had
     * no entry — and never a judgement handed to the model. She needs it because the
     * remedy is hers: the sheet went out with visual support and no bridge words, and
     * she is the one who can decide whether that is enough.
     */
    for (const line of input.bridgeAbsences ?? []) md.push(`- ${line}`);
    if (input.bridgeAbsences?.length) md.push('');
  }

  if (declared.other.length) {
    md.push('## Otras notas sobre la adaptación', '');
    for (const o of declared.other) md.push(`- ${o}`);
    md.push('');
  }

  /*
   * An access arrangement, named as one (019 T010, FR-1718).
   *
   * A changed response route in an exam is **not** a difficulty change — that is
   * what `recipes/core/response-route.md` is built to guarantee — but it is a thing
   * a school records and an inspector asks about. It has to appear as its own line
   * with its own name, because «he aplicado response-route» in a list of decisions
   * is invisible to the person who has to declare it.
   */
  if (input.kind?.id === 'exam'
      && decisions.some((d) => recipeIds(d.recipe).includes('response-route'))) {
    md.push('## Adaptación de acceso', '');
    md.push('He cambiado **cómo contesta**, no lo que se pregunta. Eso es una'
      + ' adaptación de acceso, y en un examen se registra como tal — no es que la'
      + ' prueba sea más fácil.', '');
  }

  /*
   * Pictograms, and the ambiguities first. «He puesto 12» is a count; «hay dos
   * dibujos para "rana" y no he puesto ninguno» is a decision she can make.
   */
  if (input.pictograms) {
    md.push('## Pictogramas', '');
    for (const s of input.pictograms.skipped) md.push(`- ${s}`);
    if (input.pictograms.used.length) {
      const words = [...new Set(input.pictograms.used.map((u) => u.word))];
      md.push(`- He puesto pictograma en: ${words.join(', ')}.`);
      md.push('  > La atribución va en la hoja y no se puede quitar: es condición de'
        + ' la licencia.');
    } else if (input.pictograms.skipped.length === 0) {
      md.push('- No he encontrado ninguna palabra del juego de pictogramas en este'
        + ' material.');
    }
    md.push('');
  }

  if (memoryApplied.length) {
    md.push('## Lo que cambió porque tú lo corregiste antes', '');
    for (const m of memoryApplied) {
      md.push(`- ${m.effect}`);
      md.push(`  > De lo que me dijiste sobre \`${m.recipe}\`.`);
    }
    md.push('');
  }

  if (decisions.length === 0 && notDone.length === 0) {
    md.push('_No he cambiado nada. Revisa si el perfil tiene ejes sin observar._', '');
  }

  return { decisions, notDone, kindDisagreement, notices, memoryApplied, markdown: md.join('\n') };
}
