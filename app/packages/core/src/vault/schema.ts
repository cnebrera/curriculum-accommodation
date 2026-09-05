import { z } from 'zod';
import type { Repair } from './parse.js';

/**
 * Schemas with repair semantics. A field that does not validate is kept in
 * `_unparsed` and reported — it is never dropped, and never silently coerced.
 */

export const AXES = ['PER-V','PER-A','DEC','LIN','COG','ATE','EJE','MOT','REG','CUR'] as const;
export type Axis = (typeof AXES)[number];

/**
 * An axis is 0-3, or absent.
 *
 * A missing axis is NEVER coerced to 0. `null` means "not observed" and leaves
 * the recipes that depend on it switched off; 0 means "no barrier" and is an
 * assertion. Confusing the two silently disables adaptations a learner needs,
 * which is a safety issue rather than a nicety — see docs/axis-calibration.md.
 */
/**
 * A date as it arrives from YAML front matter.
 *
 * **This was `z.string()`, and it silently broke the whole of spec 003.**
 *
 * `js-yaml` parses an unquoted `2026-08-28` into a `Date` object. `ipc/memory.ts`
 * writes `date: ${stamp}` unquoted, so every corpus-scope journal entry the
 * application has ever written failed this schema, was dropped by `loadJournal`'s
 * `if (!value.date) continue`, and **was never loaded again**.
 *
 * The consequence is the exact failure spec 003 exists to prevent: a teacher
 * records that a rule did not work, the entry is written to disk where she can
 * see it, and the next adaptation has never heard of it. She would conclude the
 * correction was ignored, which it was — and there was nothing on screen to tell
 * her why.
 *
 * Found by `003`'s audit, on the first test that loaded a journal end to end.
 * The same defect was found and fixed in `008`'s catalogue parser a few hours
 * earlier, in a different module, by a test written for a different reason.
 */
const yamlDate = z.union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

const axisLevel = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const profileSchema = z.object({
  code: z.string().min(1),
  axes: z.record(z.string(), axisLevel).default({}),
  axes_confirmed: z.record(z.string(), z.string()).optional(),
  /**
   * CUR per area (`032` FR-3001). Keys are subject names as the vault already knows
   * subjects — roster `subjects`, a sheet's `subject` — free-named, no taxonomy.
   * Values are the same 0–3 as `axes.CUR`, the same calibration, the same corpus.
   *
   * **A sibling of `axes`, never a key inside it.** Nested, an older build's schema
   * would reject the whole `axes` object as malformed and set it aside — and a learner
   * with no axes selects no recipes at all: every adaptation off, silently, on the
   * machine of whichever colleague has not updated. As an unknown top-level key it is
   * carried verbatim instead, which is a property of the shape rather than of anyone's
   * care (research R1, asserted by `cur-areas.test.ts`).
   *
   * Optional, and **written only when she details an area**: an empty map written into
   * every profile would bump her vault's schema version for nothing (FR-3005).
   */
  cur_areas: z.record(z.string(), axisLevel).optional(),
  works: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  /**
   * When a preference was noted (`004` FR-303 as amended, decision P44).
   *
   * Text → ISO date, and **optional**: a preference already in a vault has no
   * recorded date, and a handover packet must say «no consta» rather than stamp
   * today's. `buildPacket` stamped `date: today()` on every `works` and `avoid`
   * entry, two lines below the comment explaining why that would be «a
   * fabrication» — so a preference she noted in October reached the receiving
   * teacher dated today, on the one field whose entire job is to say how old the
   * claim is.
   *
   * Keyed by the text rather than by position: a list she reorders in her editor
   * must not shuffle the dates, and the vault is hers to edit.
   */
  noted_on: z.record(z.string(), z.string()).optional(),
  interests: z.array(z.string()).default([]),
  response: z.record(z.string(), z.string()).default({}),
  language: z.record(z.string(), z.string()).default({}),

  /**
   * Who he is (011). All optional, all **absent rather than guessed** — the same
   * rule as an unobserved axis, and for the same reason: a guessed age is acted
   * on.
   *
   * `stage` is stored as a label rather than derived on read, because the vault
   * must be readable without this application (006 FR-410). A profile saying
   * `stage: Primaria` is legible to anyone; one saying only `year: es:primaria-5`
   * needs the corpus to decode.
   */
  age: z.number().int().min(3).max(99).optional(),
  age_recorded: yamlDate.optional(),
  year: z.string().optional(),
  stage: z.string().optional(),
  /**
   * Her school (015 FR-1305).
   *
   * Optional, because a teacher in one school never needs it, and free text
   * because a taxonomy of Spanish schools is a project of its own that would be
   * wrong the week it shipped. Itinerant PTs and orientadores work across
   * centres, which is why this is on the learner rather than on the teacher.
   *
   * **It joins the never-sent set beside the name** (FR-1306). It is not needed
   * for any adaptation, and a school plus a course plus a set of barriers
   * identifies a child far more sharply than a code does.
   */
  school: z.string().optional(),

  /**
   * Pictogram support, **decided by her** (018 T004, FR-1605/1606).
   *
   * Absent means off, and that is the only default there is. No axis value enables
   * this family: it is the one that *adds* to the page, and it is the most visible
   * difference there is — a child in an aula ordinaria holding a sheet covered in
   * pictograms while thirty classmates hold a plain one is being marked out by the
   * tool meant to include him.
   *
   * `decided_on` is here because FR-1606 asks for the **decision** rather than the
   * setting: a flag with no date is indistinguishable from a flag something else
   * set, and SC-1603 is «no profile enables pictograms without a recorded human
   * decision».
   */
  pictograms: z.object({
    enabled: z.boolean().default(false),
    /** Everywhere, on instructions only, or on key vocabulary only. */
    scope: z.enum(['all', 'instructions', 'vocabulary']).default('vocabulary'),
    decided_on: yamlDate.optional(),
    /**
     * Her own vocabulary: her school uses a different picture for «recreo».
     *
     * Word → pictogram id, and hers wins over the set's (FR-1612). Not an error to
     * be corrected — it is the set being wrong for her school.
     */
    overrides: z.record(z.string(), z.string()).default({}),
  }).optional(),
  /**
   * Which normativa **this** learner's documents follow (`029` FR-2702).
   *
   * A corpus id, `'none'`, or absent. Beside `pictograms.overrides` because it is the
   * same shape of fact: a per-learner exception to something that is otherwise a
   * property of her school, and it earns its place for the same reason — the exception
   * is real and rare.
   *
   * The two real cases:
   *
   * - **The child who arrived in October** from another comunidad, whose documents her
   *   colleagues there will read.
   * - **`'none'`**, the child schooled across territories, whose documents must claim
   *   neither. That is why it is a string and not an optional id: «follow the school's»
   *   and «follow nobody's» are different answers, and absent can only mean the first.
   *
   * Absent is absent, never defaulted, and it never appears in learner-facing output —
   * `011` FR-910's rule, extended to it by the existing output check.
   */
  normative_corpus: z.string().optional(),
  /**
   * The vehicular language, still being acquired (`033` FR-3101, data-model R1).
   *
   * ## Beside the axes, never inside them
   *
   * A learner arriving mid-course without the classroom's language fits no axis, and the
   * temptation is `LIN`. It is the wrong home: `LIN` models a language **disorder** in a
   * native speaker, so putting him there writes «dificultad de comprensión lingüística»
   * into a record that follows him — a disability where there is a transition. What he
   * has is a barrier that expires.
   *
   * That is also why it is not in `AXES`: the ten describe barriers, and this one has a
   * date on which it stops being true.
   *
   * ## Absent, and zero, and the difference
   *
   * Absent means nobody has observed it, exactly as with an axis. `intensity: 0` is her
   * **statement that it is over** — «ya sigue la clase en su idioma» — kept with the date
   * she made it, because the fact that a barrier expired is a fact about her observation
   * and not an absence of one. The history lives in `notes.md`, where all profile history
   * lives.
   *
   * ## The languages are hers, and only hers
   *
   * No country, no origin, no nationality, no default. A language derived from «llegó de
   * Marruecos» would be a claim about a child that nobody made, right often enough to
   * look like a feature and wrong for the Amazigh speaker, the French-schooled child and
   * the one whose family speaks Spanish at home.
   * `no-inferred-language.test.ts` asserts that behaviourally and structurally.
   *
   * Codes in the vault (the pictogram metadata's own), names on screen (AGENTS.md rule 7).
   */
  vehicular: z.object({
    intensity: axisLevel,
    languages: z.array(z.string()).default([]),
    /**
     * When she noted it or last changed it. Written by the editor at save time — a real
     * annotation date, never derived and never backfilled (decision P44, the same rule
     * `noted_on` above follows for the qualitative fields).
     */
    noted_on: yamlDate,
  }).optional(),
});
export type Profile = z.infer<typeof profileSchema> & {
  _unparsed?: Record<string, unknown>;
  notes?: string;
};

export const rosterEntrySchema = z.object({
  code: z.string().min(1),
  stage: z.string().optional(),
  year_group: z.string().optional(),
  group: z.string().optional(),
  subjects: z.array(z.string()).default([]),
  /**
   * `'forgotten'` was here and **nothing in the repository ever wrote it** — the
   * project's signature defect, in the erasure path of all places. Removed rather
   * than left as a value a future caller might reach for, because it cannot be
   * used: a tombstoned row still holds the code, so `verifyForgotten` would report
   * it as a residue for ever. Erasure removes the row (P38); the dated line in
   * `.rampa/erasures.md` is where the fact that it happened lives, with nothing of
   * his in it (`003` FR-217).
   */
  status: z.enum(['active', 'archived']).default('active'),
});

export const rosterSchema = z.object({
  academic_year: z.string().optional(),
  setting: z.string().optional(),
  learners: z.array(rosterEntrySchema).default([]),
});
export type Roster = z.infer<typeof rosterSchema>;


export const journalEntrySchema = z.object({
  date: yamlDate,
  recipes: z.array(z.string()).default([]),
  scope: z.enum(['learner', 'practice', 'corpus']),
  learner: z.string().optional(),
  status: z.enum(['open', 'promoted', 'archived']).default('open'),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

/**
 * The keys a schema knows about, or null if it is not an object schema.
 *
 * Needed because zod **strips unknown keys silently** on a successful parse.
 * That default is wrong for this project: the vault format contract promises
 * *"unknown keys are preserved verbatim — the app is a guest in these files"*,
 * and a teacher who adds a field of her own by hand must not lose it the next
 * time she presses Guardar. Found by the T092c round-trip test, which is the
 * second data-loss defect in the same area — the first was the profile editor
 * blanking the qualitative fields.
 */
function schemaKeys(schema: z.ZodTypeAny): string[] | null {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  return shape && typeof shape === 'object' ? Object.keys(shape) : null;
}

/** Whatever the schema would have thrown away, kept aside untouched. */
function carriedThrough(
  schema: z.ZodTypeAny,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const known = schemaKeys(schema);
  if (!known) return {};
  const carried: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!known.includes(k)) carried[k] = v;
  }
  return carried;
}

/**
 * Validate, keeping what does not fit rather than rejecting the file.
 * Returns the parsed value plus repairs describing what was set aside.
 *
 * Two different things end up in `unparsed`, and neither is ever dropped:
 * fields the schema knows but could not read (reported as a repair, because she
 * may want to fix them), and fields the schema does not know at all (carried
 * silently — they are hers, and they are not a problem).
 */
export function validateWithRepair<T extends z.ZodTypeAny>(
  schema: T,
  data: Record<string, unknown>,
  file?: string,
): { value: z.infer<T>; unparsed: Record<string, unknown>; repairs: Repair[] } {
  const repairs: Repair[] = [];
  const unparsed: Record<string, unknown> = carriedThrough(schema, data);

  let attempt = schema.safeParse(data);
  if (attempt.success) return { value: attempt.data, unparsed, repairs };

  // Move each offending top-level key aside, then retry. Nothing is deleted.
  const working = { ...data };
  for (const issue of attempt.error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || !(key in working)) continue;
    unparsed[key] = working[key];
    delete working[key];
    repairs.push({
      file,
      what: `field-set-aside:${key}`,
      message: `No entendí el campo "${key}", así que lo he dejado aparte sin tocarlo. Puedes revisarlo cuando quieras.`,
    });
  }

  attempt = schema.safeParse(working);
  if (attempt.success) return { value: attempt.data, unparsed, repairs };

  // Still failing: hand back defaults rather than an exception, and say so.
  repairs.push({
    file,
    what: 'schema-unrecoverable',
    message: 'Este fichero tenía un formato que no pude interpretar. Lo he dejado como estaba y he seguido sin él.',
  });
  const empty = schema.safeParse({});
  return {
    value: (empty.success ? empty.data : ({} as z.infer<T>)),
    unparsed: { ...unparsed, ...working },
    repairs,
  };
}

/** Axis value or null. Never returns 0 for "unknown". */
export function axisLevelOf(p: Pick<Profile, 'axes'>, axis: Axis): 0 | 1 | 2 | 3 | null {
  const v = p.axes?.[axis];
  return v === 0 || v === 1 || v === 2 || v === 3 ? v : null;
}

/**
 * The CUR that governs one area: the pair, else the general, else unobserved
 * (`032` FR-3001).
 *
 * **One helper, called by every consumer.** «No pair for this area means use the
 * general» has to mean the same thing in the prompt, in the compose level, in the ACNS
 * draft and on the profile screen; written four times it would be expressed four ways,
 * and the one written `?? 0` would assert that a child is at his year's level in a
 * subject nobody assessed. Same argument as `031`'s single freshness deriver.
 *
 * `null` rather than 0 for «nobody said», keeping `011`'s rule: 0 is an assertion — «al
 * nivel de su curso» — that a person makes. Recipes keyed on an unobserved axis stay
 * off, which is `satisfied()`'s existing behaviour and needs no special case here.
 *
 * **Only CUR.** No other axis gains this, and there is deliberately no generic
 * `axisLevelOf(p, axis, area)`: the functional axes describe barriers that travel with
 * the child between subjects, so a per-area DEC would be a category error in the
 * opposite direction (FR-3002, asserted by test because the temptation is structural).
 */
export function curFor(
  p: Pick<Profile, 'axes' | 'cur_areas'>,
  area?: string,
): 0 | 1 | 2 | 3 | null {
  const pair = area === undefined ? undefined : p.cur_areas?.[area];
  if (pair === 0 || pair === 1 || pair === 2 || pair === 3) return pair;
  // Exact-string keys: «Mates» and «Matemáticas» are two areas. The near-duplicate flag
  // belongs at entry time (FR-3007); canonicalising stored data would be Rampa rewriting
  // what she typed in her own file.
  return axisLevelOf(p as Pick<Profile, 'axes'>, 'CUR');
}
