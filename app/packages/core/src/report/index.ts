import type { IRDocument, Block, Notice } from '../ir/types.js';
import { parseRecipeRef } from '../ir/provenance.js';
import type { Selection } from '../recipes/index.js';
import { parseReportNotes } from './notes.js';

/**
 * The adaptation report, grouped by decision rather than by paragraph.
 *
 * The teacher reviews about fifteen decisions instead of re-reading twelve
 * pages — that is what makes the time saving real, and it is where the errors
 * that matter get caught.
 */
export interface Decision {
  title: string;
  recipe: string;
  axis: string;
  blocks: string[];
}

export interface ReportInput {
  adapted: IRDocument;
  selection?: Selection;
  dropped?: Array<{ id: string; why: string }>;
  undescribedFigures?: string[];
  flaggedSignificant?: string[];
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
    ...d, title: titleFor(parseRecipeRef(d.recipe).id, d.blocks.length),
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
  for (const s of input.flaggedSignificant ?? []) notDone.push(`Adaptación significativa, no la he hecho: ${s}`);
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
   * What it was treated as, first, because it is the rule everything below
   * happened under and she is signing for it.
   */
  if (input.kind) {
    md.push(`## Lo he tratado como: ${input.kind.label.toLowerCase()}`, '');
    if (input.kind.forbids.length) {
      md.push(`Eso quiere decir que no he tocado: ${FORBIDS_ES(input.kind.forbids)}.`, '');
    }
  }

  if (kindDisagreement) {
    md.push('## Una cosa sobre lo que es este material', '', kindDisagreement, '');
  }

  if (notDone.length) {
    md.push('## Lo que NO he hecho', '');
    for (const n of notDone) md.push(`- ${n}`);
    md.push('');
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

  for (const d of decisions) {
    md.push(`## ${d.title}`);
    md.push(`Receta: \`${d.recipe}\` · Barrera: \`${d.axis}\``);
    md.push(`Bloques: ${d.blocks.join(', ')}`);
    md.push('');
  }

  if (declared.other.length) {
    md.push('## Otras notas sobre la adaptación', '');
    for (const o of declared.other) md.push(`- ${o}`);
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
