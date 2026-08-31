/**
 * Filtering a caseload (015 T002, FR-1303).
 *
 * ## What is deliberately absent from this file
 *
 * **No sort argument. No axis. No ordering of any kind.**
 *
 * That absence is the load-bearing part. The obvious build for "views and filters
 * over thirty learners" is a sortable table, and the columns available are the
 * nine axis values — so a grid of children ordered by their barriers is one
 * parameter away at all times. Principle V forbids it, and a rule somebody has to
 * remember is not how this project enforces things (Principle IX, one level up).
 *
 * So a ranking is not expressible: nothing in the data path accepts a barrier to
 * order by. `packages/core/test/roster.test.ts` asserts that over this module's
 * own exports, so adding one later fails a test rather than passing a review.
 *
 * Pure, deterministic, no clock and no IO — forty rows, which is a real caseload.
 */

/** Only what a caseload row needs. Deliberately not the whole profile. */
export interface RosterRow {
  code: string;
  /** Display only; resolved in the renderer and never stored (014 FR-1207). */
  name: string;
  /** An `011` year id, e.g. `es:primaria-5`. */
  year?: string;
  stage?: string;
  school?: string;
}

/**
 * «Show me the ones with nothing recorded here.»
 *
 * A sentinel rather than `undefined`, because the two mean different things:
 * `{ year: undefined }` is "do not filter by course", and `{ year: UNSET }` is
 * "the ones with no course". Conflating them hides exactly the learners she added
 * in a hurry — the ones who needed something tomorrow.
 */
export const UNSET = '__sin__';

export interface RosterFilter {
  year?: string;
  stage?: string;
  school?: string;
  /** From the **work** (014's record), never from the profile's current course. */
  schoolYear?: string;
}

const matches = (value: string | undefined, wanted: string | undefined): boolean => {
  if (wanted === undefined) return true;              // not filtering
  if (wanted === UNSET) return !value;                // absent, deliberately asked for
  return value === wanted;
};

/**
 * Filter, preserving order.
 *
 * `workedIn` answers "which school years did I make something for this learner
 * in?" — supplied by the caller from `014`'s record rather than read here, so this
 * module stays free of the vault. It is optional: with no record available the
 * school-year filter matches nothing rather than everything, because claiming
 * work exists that we cannot see is the worse failure.
 */
export function filterRoster(
  rows: readonly RosterRow[],
  filter: RosterFilter,
  workedIn?: (code: string) => readonly string[],
): RosterRow[] {
  return rows.filter((r) => {
    if (!matches(r.year, filter.year)) return false;
    if (!matches(r.stage, filter.stage)) return false;
    if (!matches(r.school, filter.school)) return false;

    if (filter.schoolYear !== undefined) {
      const years = workedIn?.(r.code) ?? [];
      if (filter.schoolYear === UNSET) return years.length === 0;
      if (!years.includes(filter.schoolYear)) return false;
    }
    return true;
  });
}

/**
 * Which learner she means, by the name she sees or by the code.
 *
 * The code is here because it is what is printed on the sheet — so when she is
 * holding a worksheet and wants the child it belongs to, the thing in her hand is
 * the thing she can type.
 *
 * Accent- and case-insensitive: «lucia» finds «Lucía». A teacher typing fast does
 * not reach for the accent, and a search that requires one is a search that fails
 * on the name it was built for.
 */
export function searchRoster(rows: readonly RosterRow[], query: string): RosterRow[] {
  const needle = fold(query);
  if (!needle) return [...rows];
  return rows.filter((r) => fold(r.name).includes(needle) || fold(r.code).includes(needle));
}

const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * The values actually present in this caseload, for a filter that offers only
 * what exists.
 *
 * Derived rather than a fixed list: a dropdown offering «4.º de la ESO» to a
 * primary-school teacher is a dropdown she has to read past four times a day.
 *
 * `hasUnset` is separate from the values, because "some learner has no course
 * recorded" is a fact the filter must be able to offer and is not a value.
 */
export function facetsOf(rows: readonly RosterRow[]): {
  years: string[]; stages: string[]; schools: string[];
  hasUnset: { year: boolean; stage: boolean; school: boolean };
} {
  const uniq = (xs: Array<string | undefined>): string[] =>
    [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();

  return {
    years: uniq(rows.map((r) => r.year)),
    stages: uniq(rows.map((r) => r.stage)),
    schools: uniq(rows.map((r) => r.school)),
    hasUnset: {
      year: rows.some((r) => !r.year),
      stage: rows.some((r) => !r.stage),
      school: rows.some((r) => !r.school),
    },
  };
}

/**
 * Group, never rank (015 T014, FR-1310).
 *
 * Groups are sorted by their heading; **members keep the input's order**. That
 * asymmetry is the requirement: a group whose members were ordered by anything
 * about them is the first step to the table this feature refuses to build.
 *
 * It lives here, in `core`, rather than in the screen — because "do the members
 * keep their order?" is then a behavioural test over a pure function instead of a
 * regex counting `.sort(` calls in a `.tsx`, which is a test the next person
 * deletes rather than fixes.
 *
 * `label` turns an `011` year id into her words. Passed in, so this module knows
 * nothing about school systems.
 */
export function groupRoster(
  rows: readonly RosterRow[],
  label: (yearId: string) => string,
  unplaced = 'Sin curso',
): Array<[string, RosterRow[]]> {
  const groups = new Map<string, RosterRow[]>();
  for (const r of rows) {
    const heading = r.year ? label(r.year) : (r.stage ?? unplaced);
    const list = groups.get(heading) ?? [];
    list.push(r);                    // input order, deliberately
    groups.set(heading, list);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    // `unplaced` last: it is a real group, and not the first thing she looks for.
    if (a === unplaced) return 1;
    if (b === unplaced) return -1;
    return a.localeCompare(b, 'es');
  });
}
