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
const axisLevel = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const profileSchema = z.object({
  code: z.string().min(1),
  axes: z.record(z.string(), axisLevel).default({}),
  axes_confirmed: z.record(z.string(), z.string()).optional(),
  works: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  response: z.record(z.string(), z.string()).default({}),
  language: z.record(z.string(), z.string()).default({}),
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
  status: z.enum(['active', 'archived', 'forgotten']).default('active'),
});

export const rosterSchema = z.object({
  academic_year: z.string().optional(),
  setting: z.string().optional(),
  learners: z.array(rosterEntrySchema).default([]),
});
export type Roster = z.infer<typeof rosterSchema>;

export const journalEntrySchema = z.object({
  date: z.string(),
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
