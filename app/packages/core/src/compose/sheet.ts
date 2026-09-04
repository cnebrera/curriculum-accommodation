import type { Block, IRDocument } from '../ir/types.js';
import { irToMarkdown } from '../ingest/to-ir.js';
import type { Accepted } from './loop.js';
import { NO_ANSWERS_ES } from './unverifiable.js';

/**
 * The composed sheet, and the answer key that does not live on it
 * (002 T013/T014/T016, FR-105/106).
 *
 * ## Two documents, and the separation is the requirement
 *
 * The child's sheet is IR, and goes through the adaptation machinery unchanged —
 * that is T013, and it is why composition produces a *job* rather than a finished
 * page: one composition, N presentations (Principle IV). The learner's profile
 * decides how it looks; it does not decide what is asked.
 *
 * The answer key is a **separate document for her**. Not an attribute, not a
 * hidden block, not a `data-answer` the renderer is trusted to strip: a different
 * file. An answer that exists anywhere in the child's document is an answer one
 * bug away from being on his sheet, and the bug would be invisible — a worksheet
 * with the answers in the markup looks exactly like a worksheet.
 *
 * `buildSheet` therefore takes the answers and *does not write them*, and the
 * test asserts that over the serialised document rather than over this comment.
 *
 * ## The key is keyed to the expression, not to the number
 *
 * Exercise 3 on the composed sheet may be exercise 2 on the adapted one — a
 * recipe that splits a page or drops nothing can still renumber. `47 × 8 = 376`
 * survives that; «3. 376» does not, and a key that has silently slid by one is
 * worse than no key at all, because she will trust it.
 */

/**
 * One problem on the sheet (027 US1, FR-2501).
 *
 * `answer` present means **computed by code** from quantities found in `statement`.
 * Absent means nothing could check it, and the block says so per item (FR-2504) — a
 * sheet marked «unverified somewhere» teaches her to distrust all of it.
 */
export interface ProblemItem {
  /** The statement, verbatim, as the child reads it. Carries no answer, ever. */
  statement: string;
  /** The admitted operation: every operand was found in the statement. */
  expression?: string;
  /** Computed by the arithmetic verifier. Never the model's claim. */
  answer?: string;
}

/** One exam question: numbered, asking, withholding (027 US2, FR-2503). */
export interface ExamQuestion {
  /** The prompt, as the learner reads it. Carries no answer, ever. */
  text: string;
  /** Present and code-verified for a computable question. */
  expression?: string;
  /** Computed by code. Absent ⇒ this question is declared unverified. */
  answer?: string;
  /**
   * The model's draft answer, for a question code cannot check (research R3).
   *
   * Reaches **the key only**, led by its own unchecked label. This departs from the
   * skill path, where a model's stated answer is dropped entirely (`NO_ANSWERS_ES`) —
   * and the departure is argued, not accidental: an exam key silent on six of ten
   * questions is a key she completes by hand or stops reading. The label does the work
   * `NO_ANSWERS_ES` fears is undone, per entry, and FR-2512 keeps the key out of every
   * learner-facing path structurally.
   */
  draftAnswer?: string;
}

/**
 * One group on the sheet, of whichever shape the kind produces (027 T007).
 *
 * A union rather than three optional fields, so the compiler refuses a group that is
 * two shapes at once — `021` FR-1909's «the kind governs what is produced» is a claim
 * about shape, and a type that admits «exercises **and** questions» is a type that lets
 * the claim be false.
 *
 * `of` is optional on the exercise variant because that is what every existing caller
 * already builds: the skill path's contract is untouched (FR-2507).
 */
export type SheetGroup = ExerciseGroup | ProblemGroup | QuestionGroup;

export interface ProblemGroup {
  of: 'problems';
  objective: string;
  instruction: string;
  problems: readonly ProblemItem[];
}

export interface QuestionGroup {
  of: 'questions';
  objective: string;
  instruction: string;
  questions: readonly ExamQuestion[];
}

/** One group of exercises: what she asked for, and what survived verification. */
export interface ExerciseGroup {
  of?: 'exercises';
  /** Her objective, verbatim and in her words. It is what `data-objective` holds. */
  objective: string;
  /** The instruction line above the exercises, in her language. */
  instruction: string;
  accepted: readonly Accepted[];
  /**
   * True for a skill with no verifier (FR-125).
   *
   * Nothing checked these. The blocks carry `data-unverified`, **no answer of
   * theirs reaches the key**, and the report leads with the sentence rather than
   * mentioning it. The failure mode this guards against is not that the draft
   * exists — it is a sheet where checked and unchecked exercises look alike to
   * her.
   */
  unverified?: boolean;
}

export interface SheetInput {
  title: string;
  lang: string;
  /** Her objectives, verbatim, in her order — including any that produced nothing. */
  objectives: readonly string[];
  /**
   * The material kind this counts as (`012`, and `002` FR-126).
   *
   * **A composed sheet is one of the four kinds like any other**, and it must be
   * bound by that kind's prohibitions from the moment it is first revised. It was
   * not: the front matter carried `kind: generated`, `materialKind('generated')`
   * resolved to `null`, and the sheet reached `runAdaptation` with **no kind rule
   * governing it** — which is precisely the failure `012` exists to prevent, arriving
   * through a different door.
   *
   * `problems` is the one that matters most here. A composed arithmetic sheet has a
   * verified answer key, and `problems` forbids changing the quantities and the
   * operations — so it is the prohibition that stops a revision quietly invalidating
   * the key.
   *
   * Chosen by the caller from what was composed, not defaulted: `worksheet` for skill
   * practice, `problems` for word problems, `study` for a composed text.
   */
  materialKind: string;
  /**
   * Sentences that must be **on the page** for this kind (`021` FR-1911/FR-1912).
   *
   * From `material-kinds.md`'s `composing.on_document`, passed in rather than looked up:
   * this function stays free of any knowledge about which kinds need what, which is the
   * same separation the recipes have. For three of the four kinds it is empty.
   *
   * On the page and not only on the screen, because paper outlives the screen it was made
   * on — and whoever picks up a generated exam next did not see the warning she saw.
   */
  kindNotes?: readonly string[];
  /** What the content rests on, for a content composition (FR-102). */
  anchor?: string;
  /**
   * Whose level this was pitched at (FR-122).
   *
   * Recorded because the level is per learner and the sheet is a file: a composed
   * sheet adapted for a second learner is legal and ordinary, and this is the only
   * thing that says the bounds were somebody else's.
   */
  composedFor?: { code: string; yearId?: string };
  /**
   * Content blocks the model wrote, already checked against her objectives and
   * against the anchor (002 T017-T019).
   *
   * They arrive **before** the exercises, because that is the order he reads them
   * in: the explanation, then the practice. Their ids and attributes are rewritten
   * here — see `contentBlock`.
   */
  content?: readonly Block[];
  groups: readonly SheetGroup[];
  /**
   * How many sessions this material is for (002 FR-130).
   *
   * Recorded, not acted on. «A PT works in sessions and the application has no
   * concept of one» — so this is her unit written down where it belongs, on the
   * material, rather than the application organising anything around a unit it does
   * not understand. `017`'s temporalización can then say «tres sesiones» instead of
   * only «del 3 de marzo al 12 de junio».
   */
  sessions?: number;
  /**
   * How long one session is (`021` FR-1929).
   *
   * Recorded beside `sessions` for the same reason and used the same way: it is her
   * plan, written on the material, and `017`'s ACNS reads it for the temporalización.
   * Rampa organises nothing around it — «tres sesiones de veinte minutos» is her unit
   * written down where it belongs.
   */
  minutesPerSession?: number;
  /**
   * The date, passed in. Never computed here: when something happened is a fact
   * about the process (Principle II), and a pure function that reads the clock is
   * a function whose output cannot be asserted.
   */
  composedOn: string;
  /**
   * Things the model must be told and she must be shown: a level that could not
   * be checked, an objective that produced nothing. They land in `report-notes`,
   * which is never learner-facing.
   */
  notes?: readonly string[];
}

/**
 * The key learns to say what it does not know (027 T007, data-model).
 *
 * A union so the two cases cannot be confused, and `status` optional on the computed
 * variant so every existing caller keeps working unchanged — the skill path's contract
 * is untouched (FR-2507), and an `AnswerLine` **is** a computed entry.
 *
 * In sheet order, not in two lists: an exam key that runs 1, 2, 4, 5 and then «and by
 * the way, 3 and 6» is a key she marks from with her finger on the wrong line.
 */
export type KeyEntry =
  | (AnswerLine & { status?: 'computed' })
  | {
      status: 'declared-unverified';
      objective: string;
      number: number;
      /** The question or statement, so she knows which one she is completing. */
      text: string;
      /** The model's draft, labelled per entry as unchecked. Never on the sheet. */
      draftAnswer?: string;
    };

/** Was this entry computed by code? The only authority the key claims. */
export const isComputed = (e: KeyEntry): e is AnswerLine =>
  !('status' in e) || e.status === 'computed';

/**
 * Objectives with anything on the sheet that nothing could check.
 *
 * Two sources, one answer: a whole group with no verifier (`002` FR-125) and an
 * individual item that could not be computed (`027` FR-2504). Derived here so the front
 * matter, the report and the checklist read one fact.
 */
function unverifiedObjectives(
  groups: readonly SheetGroup[], key: readonly KeyEntry[],
): string[] {
  const out = new Set<string>();
  for (const g of groups) if (g.of !== 'problems' && g.of !== 'questions' && g.unverified) out.add(g.objective);
  for (const e of key) if (!isComputed(e)) out.add(e.objective);
  return [...out];
}

/** «la 4», «la 4 y la 5», «la 4, la 5 y la 7» — a list a person reads out loud. */
const spanishList = (numbers: readonly number[]): string => {
  const parts = numbers.map((n) => `la ${n}`);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
};

/** How many items a group has, whichever shape it is. */
const countOf = (g: SheetGroup): number =>
  g.of === 'problems' ? g.problems.length
    : g.of === 'questions' ? g.questions.length
      : g.accepted.length;

export interface AnswerLine {
  objective: string;
  /** Position on the composed sheet, for reading down the page. */
  number: number;
  expression: string;
  /** Computed by code. Never the model's claim. */
  answer: string;
}

/** One exercise on the sheet, whether or not anything could check it. */
export interface ExerciseLine {
  objective: string;
  number: number;
  expression: string;
  /** False for a skill with no verifier (FR-125). */
  verified: boolean;
}

export interface ComposedSheet {
  doc: IRDocument;
  /** The IR as it is written to `ir.md`. */
  markdown: string;
  /**
   * Only the checked ones — the computed subset of `key`.
   *
   * Kept because its callers count verified work («N ejercicios con las cuentas
   * comprobadas»), and derived from `key` rather than accumulated beside it.
   */
  answers: AnswerLine[];
  /**
   * Every key entry, in sheet order, computed or declared unverified (027 T007).
   *
   * This is what `renderAnswerKey` writes. `answers` is a filter of it.
   */
  key: KeyEntry[];
  /**
   * **Every** exercise on the sheet, checked or not.
   *
   * Separate from `answers` on purpose: the report lists what is on the page, and
   * building that list from the answers would silently omit the unverified
   * exercises — the ones she most needs to see listed.
   */
  listing: ExerciseLine[];
}

export function buildSheet(input: SheetInput): ComposedSheet {
  const blocks: Block[] = [];
  const key: KeyEntry[] = [];
  const listing: ExerciseLine[] = [];
  let n = 0;
  let line = 1;

  const push = (b: Omit<Block, 'line' | 'notices'>): void => {
    blocks.push({ ...b, line, notices: [] });
    line += 3;
  };

  /*
   * The model's content, with its ids and attributes **rewritten by us**.
   *
   * Ids because a model-chosen id can collide with a group's or repeat itself, and
   * a duplicate id makes two blocks one for every check downstream that keys on
   * it. Attributes because the only two it may set are the two that trace it —
   * left alone, a model could add `data-recipe` and `data-axis` and the report
   * would show a decision that no recipe made.
   */
  for (const [c, b] of (input.content ?? []).entries()) {
    push({
      id: `c${c + 1}`,
      classes: b.classes,
      attrs: {
        ...(b.attrs['data-objective'] ? { 'data-objective': b.attrs['data-objective'] } : {}),
        ...(b.attrs['data-anchor'] ? { 'data-anchor': b.attrs['data-anchor'] } : {}),
      },
      content: b.content,
    });
  }

  /*
   * The kind's own sentences, before the first exercise (`021` T022).
   *
   * A `note` block rather than `report-notes`: `report-notes` is the model's channel to
   * her and never reaches the sheet, and these have to be **printed**. They are the
   * difference between a generated exam and an exam.
   */
  for (const [i, text] of (input.kindNotes ?? []).entries()) {
    push({
      id: `kind-note-${i + 1}`,
      classes: ['note'],
      attrs: {},
      content: text,
    });
  }

  /*
   * Where the page's own notices end and the work begins.
   *
   * Remembered rather than assumed, because the unverified-items note has to go **here**
   * — beside the draft mark, before the first question — and it cannot be written yet:
   * which items nobody checked is only known once the groups have been walked. Appending
   * it at the end put it under the last question, where she reads it after using the
   * sheet. Caught by asserting its position rather than its presence.
   */
  const headEnds = blocks.length;

  for (const [g, group] of input.groups.entries()) {
    if (countOf(group) === 0) continue;

    push({
      id: `g${g + 1}-instruction`,
      classes: ['instruction'],
      attrs: { 'data-objective': group.objective },
      content: group.instruction,
    });

    const at = (unverified: boolean): Record<string, string> => ({
      'data-objective': group.objective,
      ...(unverified ? { 'data-unverified': '1' } : {}),
    });

    if (group.of === 'problems') {
      for (const item of group.problems) {
        n += 1;
        /*
         * The statement, and **nothing else**.
         *
         * No operation and no answer: the operation is a fact about how it was checked
         * and belongs in the key beside the answer, not on the page. A problem whose
         * arithmetic is printed under it is a problem that has been solved for him.
         */
        push({
          id: `g${g + 1}-p${n}`,
          /*
           * `exercise`, and **not a new `problem` class** — a deliberate departure from
           * plan.md, recorded rather than slipped in.
           *
           * `BlockClass` is a closed vocabulary and recipes select on it: `scope` is
           * matched against the classes a document actually contains
           * (`recipes/index.ts`, `presentClasses`). A `problem` class nothing scopes to
           * would put every composed problems sheet **outside every recipe's scope** —
           * so adapting one for a learner would apply nothing at all, which is this
           * feature's own «offered and not produced» failure one layer down.
           *
           * And a word problem *is* an exercise: a task the child performs. The
           * statement is its content, which is the only difference from a bare
           * operation, and that difference needs no new class to express.
           */
          classes: ['exercise'],
          attrs: {
            ...at(item.answer === undefined),
            /*
             * **Somewhere to work it out** — decided by printing the page (T024).
             *
             * This was exam-only, because that is what the task said. Then the problems
             * page came out of LibreOffice with three stories crammed at the top and
             * two thirds of an empty sheet underneath: a word problem is a page a child
             * writes the operation on, and one with no room for it sends him to a
             * notebook and back, which is the transition that loses him.
             *
             * The attribute, not the class, for the reason the exam gives: an
             * **ingested** problems sheet already has its own space on the page it was
             * photographed from.
             */
            'data-answer-space': '1',
          },
          content: `${n}. ${item.statement}`,
        });
        listing.push({
          objective: group.objective, number: n,
          expression: item.expression ?? item.statement,
          verified: item.answer !== undefined,
        });
        key.push(item.answer !== undefined && item.expression
          ? { objective: group.objective, number: n, expression: item.expression, answer: item.answer }
          : { status: 'declared-unverified', objective: group.objective, number: n,
              text: item.statement });
      }
      continue;
    }

    if (group.of === 'questions') {
      for (const q of group.questions) {
        n += 1;
        push({
          id: `g${g + 1}-q${n}`,
          /*
           * `assessment`, the class the vocabulary **already has** for a question in a
           * test — same departure from plan.md's `question`, and the same argument plus
           * a positive one: `exam-access-not-difficulty` is scoped `[assessment]`, so a
           * composed exam adapted for a learner gets the access-not-difficulty recipe
           * by construction. With a new class it would get nothing.
           */
          classes: ['assessment'],
          /*
           * `data-number` so the renderers can put the number where the page style
           * wants it — the same attribute an ingested exercise carries. The answer
           * space is a **rendering** decision per class (T014) and is deliberately not
           * written here: writing underscores into the IR would put a fixed amount of
           * space into every modality, including the ones with no space at all.
           */
          attrs: {
            ...at(q.answer === undefined),
            'data-number': String(n),
            /*
             * **This block needs somewhere to write** (027 T014, FR-2503).
             *
             * An attribute rather than the `assessment` class alone, because an
             * *ingested* exam already has its answer space on the page it was
             * photographed from — giving every `assessment` block a writing area would
             * add a second one to every adapted exam in the vault. Composed questions
             * are the ones with nothing under them yet.
             *
             * How much space, and whether space means anything at all, is each
             * renderer's decision: lines on paper, a spoken sentence in the linear
             * reading. Writing underscores into the IR would put a fixed amount of
             * ruled paper into a modality that has no paper.
             */
            'data-answer-space': '1',
          },
          content: q.text,
        });
        listing.push({
          objective: group.objective, number: n,
          expression: q.expression ?? q.text, verified: q.answer !== undefined,
        });
        key.push(q.answer !== undefined && q.expression
          ? { objective: group.objective, number: n, expression: q.expression, answer: q.answer }
          : { status: 'declared-unverified', objective: group.objective, number: n,
              text: q.text, ...(q.draftAnswer ? { draftAnswer: q.draftAnswer } : {}) });
      }
      continue;
    }

    for (const item of group.accepted) {
      n += 1;
      push({
        id: `g${g + 1}-e${n}`,
        classes: ['exercise'],
        attrs: at(group.unverified === true),
        /*
         * The trailing `=` and nothing after it. The exercise is the question;
         * the answer is in the other document.
         */
        content: `${n}. ${item.exercise.expression} =`,
      });
      listing.push({
        objective: group.objective, number: n,
        expression: item.exercise.expression, verified: !group.unverified,
      });

      // An unverified group contributes no answer. Not «the model's answer with a
      // caveat»: a proposed result presented as a solution is worse than none,
      // because she marks with it in her hand.
      if (!group.unverified) {
        key.push({
          objective: group.objective,
          number: n,
          expression: item.exercise.expression,
          answer: item.answer,
        });
      }
    }
  }

  /*
   * Which items nobody checked, **on the page, beside the draft mark** (`027` FR-2504).
   *
   * Per item and not per sheet. «Hay preguntas sin comprobar» teaches her to distrust
   * all ten, and a teacher who distrusts all ten checks none of them — so it names the
   * numbers, and the ones it does not name are the ones the arithmetic verifier stands
   * behind.
   *
   * A `note` block, which prints. The draft banner is the first thing on the page and
   * this is the next; `report-notes` would have been the model's channel to her, which
   * never reaches paper — and paper is where this matters, because whoever picks up a
   * generated exam next did not see the screen she saw.
   */
  const declared = key.filter((e) => !isComputed(e)).map((e) => e.number);
  if (declared.length > 0) {
    blocks.splice(headEnds, 0, {
      id: 'unverified-items',
      classes: ['note'],
      attrs: {},
      /*
       * «la 4 y la 5», not «4, 5» — found by printing the page (T024).
       *
       * A comma-separated list of bare digits reads as a **number** in Spanish: «Ojo:
       * 4, 5 no las ha comprobado nadie» starts by saying four point five. It looked
       * like a bug on the page, on the sheet whose whole job is to be trusted about
       * which items were checked.
       *
       * «la» rather than «la pregunta» or «el problema»: it reads naturally for both
       * shapes, and a noun here would be this function knowing which kind it is building
       * — which is exactly what `SheetGroup` exists to keep out of it.
       */
      content: `Ojo: ${spanishList(declared)} no `
        + `${declared.length === 1 ? 'la' : 'las'} ha comprobado nadie. `
        + 'Las demás sí: las cuentas las he calculado yo.',
      line: 0,
      notices: [],
    });
  }

  if (input.notes && input.notes.length > 0) {
    push({
      id: 'report-notes',
      classes: ['report-notes'],
      attrs: {},
      content: input.notes.join('\n'),
    });
  }

  /*
   * `line` assigned once, at the end, over the final order.
   *
   * It was assigned as blocks were pushed, which is fine until one is spliced in — and
   * then a notice against a later block points at the wrong place. A synthetic line
   * number whose only job is to locate a notice must at least be monotonic.
   */
  blocks.forEach((b, i) => { b.line = 1 + i * 3; });

  const unverified = unverifiedObjectives(input.groups, key);

  const doc: IRDocument = {
    frontMatter: {
      /*
       * `generated: true` is what the rest of the pipeline branches on: the
       * provenance check keys blocks to objectives rather than to source blocks, and
       * the adaptation gate knows there was no extraction to verify.
       *
       * It used to be `kind: 'generated'`, which **occupied the field `012` needs**
       * — see `materialKind` above.
       */
      generated: true,
      /*
       * What the record reads to classify this job (`014` `sourceOf`). It looks
       * for `source: composed` and the objectives beside it — written here so the
       * history says «generado a partir de: multiplicar con llevadas» rather than
       * «pegado».
       */
      source: 'composed',
      /*
       * The material kind, and `generated` is **not** one (FR-126). It moved to
       * `composed_as` so both facts survive: what this is (`kind`) and that Rampa
       * made it (`source: composed`, plus the louder draft mark below).
       */
      kind: input.materialKind,
      title: input.title,
      lang: input.lang,
      objectives: [...input.objectives],
      composed_on: input.composedOn,
      ...(input.sessions ? { sessions: input.sessions } : {}),
      ...(input.minutesPerSession ? { minutes_per_session: input.minutesPerSession } : {}),
      ...(input.anchor ? { anchor: input.anchor } : {}),
      ...(input.composedFor ? { composed_for: input.composedFor.code } : {}),
      ...(input.composedFor?.yearId ? { level_from: input.composedFor.yearId } : {}),
      /*
       * The objectives nothing could check (FR-125), in the document so the
       * report, the key and the checklist read one fact rather than three.
       */
      /*
       * Now also true of a group whose **items** are individually unverified (FR-2504):
       * an exam of ten questions where four cannot be computed has an unverified
       * objective, and the checklist and the report have to know without re-deriving it.
       */
      ...(unverified.length ? { unverified_objectives: unverified } : {}),
      /**
       * Louder than elsewhere (Principle VII, T016).
       *
       * Every other document in Rampa is a draft because its *adaptation* has not
       * been reviewed. This one is a draft because its **content** has not been:
       * nobody has read these exercises. The flag is in the front matter so the
       * renderer and the checklist read the same fact rather than each deciding
       * it.
       */
      draft: true,
      content_unreviewed: true,
    },
    blocks,
    notices: [],
  };

  return {
    doc, markdown: irToMarkdown(doc), key, listing,
    /*
     * The computed subset, derived here rather than accumulated in parallel.
     *
     * Its callers count verified work — the review screen's «N ejercicios con las cuentas
     * comprobadas» — and two lists filled in two places is the drift this project has
     * found more often than any other kind of bug.
     */
    answers: key.filter(isComputed),
  };
}

/**
 * The answer key, as a document for her (T014).
 *
 * Says whose answers these are in the first two lines, because the one thing that
 * must not happen is this page going into the photocopier with the other one — and
 * because «las he calculado yo, no el modelo» is the fact that makes the sheet
 * worth trusting. It is also the only claim in Rampa's output that is about our
 * own correctness, so it is stated plainly and it is true: the arithmetic is
 * computed offline by code that never sees a model.
 */
/**
 * The one sentence standing between a page of answers and the photocopy pile
 * (021 FR-1922).
 *
 * A shared constant rather than a literal in each renderer, and the reason is the
 * ordinary one: two copies of a string is one copy that gets edited. Since `021` the key
 * is printable and exportable — she takes it to class, which is useful and is exactly
 * what makes the marking load-bearing. It has to survive every format the document can
 * be turned into, so every renderer reads this.
 *
 * Shouted, and that is deliberate. A sheet of sums with the answers filled in looks
 * exactly like a worksheet at arm's length, in a stack, in a hurry.
 */
export const ANSWER_KEY_HEADING =
  'SOLUCIONES · NO REPARTIR — esta hoja es para ti, no para el alumno.';

/**
 * The per-entry label for an answer nobody checked (027 research R3).
 *
 * Its own constant for the same reason `ANSWER_KEY_HEADING` is: it is the whole
 * justification for carrying a model's draft answer at all, and two copies of it is one
 * copy that gets softened. Read by every renderer of the key.
 */
export const UNCHECKED_ENTRY_ES =
  'propuesta del modelo, **sin comprobar**: revísala antes de corregir con ella';

export function renderAnswerKey(input: {
  title: string;
  composedOn: string;
  answers: readonly KeyEntry[];
  /** Objectives nothing could check, named rather than omitted (FR-125). */
  unverifiedObjectives?: readonly string[];
}): string {
  const lines: string[] = [
    `# Soluciones — ${input.title}`,
    '',
    // Before the first answer, never after the last: she stops reading when she has
    // found what she came for, and a warning below the answers is one she reads after
    // printing them.
    `**${ANSWER_KEY_HEADING}** No la imprimas junto con la suya.`,
    '',
    'Las cuentas las he calculado yo, no el modelo de IA: son exactas. Lo que sí '
    + 'tienes que revisar es si los ejercicios le sirven.',
    '',
    `Generado el ${input.composedOn}.`,
  ];

  let current = '';
  for (const e of input.answers) {
    if (e.objective !== current) {
      current = e.objective;
      lines.push('', `## ${e.objective}`, '');
    }
    if (isComputed(e)) {
      lines.push(`${e.number}. ${e.expression} = **${e.answer}**`);
      continue;
    }
    /*
     * A question code could not check, **led by its label** (FR-2504, research R3).
     *
     * Led, not followed: she reads down a key while marking, and a caveat after the
     * answer is a caveat she reads after using it. The draft answer only appears at all
     * because an exam key silent on six of ten questions is one she completes by hand
     * or stops reading — and it appears nowhere else, ever (FR-2512).
     */
    lines.push(`${e.number}. ${e.text}`);
    lines.push(`   — ${UNCHECKED_ENTRY_ES}${e.draftAnswer ? `: ${e.draftAnswer}` : '.'}`);
  }

  if (input.answers.length === 0) {
    lines.push('', 'No he podido generar ningún ejercicio comprobable.');
  }

  /*
   * Named, not omitted. A key that silently covers three of five objectives is a
   * key she reads as complete — and the two it skipped are precisely the ones she
   * needed to look at.
   */
  if (input.unverifiedObjectives?.length) {
    lines.push('', '## Sin soluciones', '', NO_ANSWERS_ES, '');
    for (const o of input.unverifiedObjectives) lines.push(`- ${o}`);
  }

  return lines.join('\n') + '\n';
}
