import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  filterRoster, searchRoster, facetsOf, groupRoster, UNSET, type RosterRow,
} from '../src/index.js';

/**
 * Navigating a caseload (015 T001-T005).
 *
 * Two kinds of test here, and the second kind is the point.
 *
 * The first kind checks the filter works. The second checks that a **ranking of
 * children is not expressible** — asserted over the module's own signatures, so
 * adding a sort key later fails a test rather than passing a review. Principle V,
 * enforced the way Principle IX says to enforce things: by code that does not
 * consult anybody's memory.
 */
const row = (over: Partial<RosterRow> & { code: string }): RosterRow => ({
  name: over.code, ...over,
});

/** A caseload of forty, which is the working ceiling for one PT. */
const FORTY: RosterRow[] = Array.from({ length: 40 }, (_, i) => row({
  code: `A${String(i).padStart(2, '0')}`,
  name: `Alumno ${i}`,
  year: i % 4 === 0 ? undefined : `es:primaria-${(i % 6) + 1}`,
  stage: i % 4 === 0 ? undefined : 'Primaria',
  school: i % 5 === 0 ? undefined : (i % 2 ? 'CEIP Las Encinas' : 'CEIP El Olivar'),
}));

/**
 * The learner this feature is most likely to lose: added in a hurry because he
 * needed something tomorrow, so nothing is recorded about him.
 */
const IN_A_HURRY = row({ code: 'Z99', name: 'Iván' });

describe('filtering', () => {
  it('narrows by course and preserves order', () => {
    const out = filterRoster(FORTY, { year: 'es:primaria-2' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.year === 'es:primaria-2')).toBe(true);
    // Stable: the same relative order as the input.
    const codes = out.map((r) => r.code);
    expect([...codes].sort()).toEqual(codes);
  });

  it('combining filters narrows, and clearing restores', () => {
    const both = filterRoster(FORTY, { stage: 'Primaria', school: 'CEIP El Olivar' });
    expect(both.length).toBeLessThan(filterRoster(FORTY, { stage: 'Primaria' }).length);
    expect(filterRoster(FORTY, {})).toHaveLength(40);
  });

  it('an empty filter object is not a filter', () => {
    expect(filterRoster(FORTY, { year: undefined, school: undefined })).toHaveLength(40);
  });
});

describe('a missing field never makes a child disappear', () => {
  const rows = [...FORTY, IN_A_HURRY];

  it('finds him unfiltered', () => {
    expect(filterRoster(rows, {}).map((r) => r.code)).toContain('Z99');
  });

  /**
   * `UNSET` is why this is a sentinel and not `undefined`. «Do not filter by
   * course» and «show me the ones with no course» are different questions, and
   * conflating them hides exactly the learners with the least recorded about
   * them.
   */
  it('finds him under «sin curso»', () => {
    const out = filterRoster(rows, { year: UNSET });
    expect(out.map((r) => r.code)).toContain('Z99');
    expect(out.every((r) => !r.year)).toBe(true);
  });

  it('finds him under «sin colegio» and «sin etapa»', () => {
    expect(filterRoster(rows, { school: UNSET }).map((r) => r.code)).toContain('Z99');
    expect(filterRoster(rows, { stage: UNSET }).map((r) => r.code)).toContain('Z99');
  });

  it('does not find him when a real course is asked for', () => {
    expect(filterRoster(rows, { year: 'es:primaria-2' }).map((r) => r.code)).not.toContain('Z99');
  });
});

describe('the school year comes from the work, not the profile', () => {
  const rows = [row({ code: 'E38', year: 'es:primaria-5' }), row({ code: 'M12', year: 'es:primaria-3' })];
  /** E38 changed course; her work from last year is still hers. */
  const worked = (code: string): string[] =>
    code === 'E38' ? ['2024-2025', '2025-2026'] : ['2025-2026'];

  it('finds a learner under a year she no longer belongs to', () => {
    const out = filterRoster(rows, { schoolYear: '2024-2025' }, worked);
    expect(out.map((r) => r.code)).toEqual(['E38']);
  });

  it('finds both in the current year', () => {
    expect(filterRoster(rows, { schoolYear: '2025-2026' }, worked)).toHaveLength(2);
  });

  it('«sin trabajo todavía» finds the learner nothing was made for', () => {
    const withNone = [...rows, row({ code: 'N01' })];
    const out = filterRoster(withNone, { schoolYear: UNSET }, (c) => (c === 'N01' ? [] : ['2025-2026']));
    expect(out.map((r) => r.code)).toEqual(['N01']);
  });

  /**
   * With no record available, a school-year filter matches nothing rather than
   * everything. Claiming work exists that we cannot see is the worse failure:
   * she would filter to last year, see her whole caseload, and conclude the
   * filter is broken — or worse, that she worked with all of them.
   */
  it('matches nothing when no record is supplied', () => {
    expect(filterRoster(rows, { schoolYear: '2025-2026' })).toEqual([]);
  });
});

describe('finding a learner by what she has in her hand', () => {
  const rows = [
    row({ code: 'E38', name: 'Lucía' }),
    row({ code: 'M12', name: 'Mateo' }),
    row({ code: 'I07', name: 'Iván' }),
  ];

  it('matches the name she sees', () => {
    expect(searchRoster(rows, 'luc').map((r) => r.code)).toEqual(['E38']);
  });

  /** The code is what is printed on the sheet, so it is what she can type. */
  it('matches the code', () => {
    expect(searchRoster(rows, 'm12').map((r) => r.code)).toEqual(['M12']);
  });

  /**
   * A teacher typing fast does not reach for the accent, and a search that
   * requires one is a search that fails on the name it was built for.
   */
  it('ignores accents and case', () => {
    expect(searchRoster(rows, 'lucia').map((r) => r.code)).toEqual(['E38']);
    expect(searchRoster(rows, 'IVAN').map((r) => r.code)).toEqual(['I07']);
    expect(searchRoster(rows, 'Iván').map((r) => r.code)).toEqual(['I07']);
  });

  it('an empty query is not a filter', () => {
    expect(searchRoster(rows, '   ')).toHaveLength(3);
  });

  it('two Lucías both survive four characters', () => {
    const two = [row({ code: 'A1', name: 'Lucía Fernández' }), row({ code: 'A2', name: 'Lucía Ortega' })];
    expect(searchRoster(two, 'lucí')).toHaveLength(2);
    expect(searchRoster(two, 'orte').map((r) => r.code)).toEqual(['A2']);
  });
});

describe('the filter offers only what exists', () => {
  it('lists the courses actually in this caseload', () => {
    const facets = facetsOf([
      row({ code: 'A', year: 'es:primaria-2', stage: 'Primaria', school: 'CEIP X' }),
      row({ code: 'B', year: 'es:primaria-2', stage: 'Primaria' }),
    ]);
    // A dropdown offering «4.º de la ESO» to a primary teacher is one she reads
    // past four times a day.
    expect(facets.years).toEqual(['es:primaria-2']);
    expect(facets.schools).toEqual(['CEIP X']);
  });

  it('says separately that some learner has nothing recorded', () => {
    const facets = facetsOf([row({ code: 'A', year: 'es:primaria-2' }), row({ code: 'B' })]);
    expect(facets.hasUnset).toEqual({ year: true, stage: true, school: true });
  });

  it('says so when every learner has a course', () => {
    const facets = facetsOf([row({ code: 'A', year: 'es:primaria-2', stage: 'P', school: 'X' })]);
    expect(facets.hasUnset).toEqual({ year: false, stage: false, school: false });
  });
});

describe('a ranking of children is not expressible', () => {
  /**
   * T005 · Principle V, enforced structurally rather than remembered.
   *
   * The obvious build for this feature is a sortable table whose columns are the
   * nine axis values. That is a league table of disability. So the check is not
   * "did we build one" — it is that **nothing in this module could be asked to**.
   */
  const source = readFileSync(
    join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'roster', 'filter.ts'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the module never mentions an axis', () => {
    expect(code).not.toMatch(/\baxes?\b/i);
    for (const axis of ['COG', 'ATE', 'EJE', 'DEC', 'LIN', 'MOT', 'REG', 'PER-V', 'PER-A']) {
      expect(code, `${axis} reached the roster module`).not.toContain(axis);
    }
  });

  it('no exported function takes a sort key or an ordering', () => {
    expect(code).not.toMatch(/\bsort(By|Key|Order)?\s*[:?]/);
    expect(code).not.toMatch(/\border(By)?\s*[:?]/);
    expect(code).not.toMatch(/\bdesc(ending)?\b/i);
  });

  it('the row it operates on carries no barrier at all', () => {
    // If a caseload row ever gains axes, a view can render them as columns and
    // this whole defence becomes a comment.
    const rowShape = /export interface RosterRow \{([\s\S]*?)\n\}/.exec(code)?.[1] ?? '';
    expect(rowShape).not.toMatch(/axes|level|score|total/i);
    expect(rowShape.split('\n').filter((l) => l.includes(':')).length,
      'RosterRow grew fields; check none of them is a barrier').toBeLessThanOrEqual(5);
  });

  it('filterRoster returns rows, never a ranking', () => {
    const out = filterRoster(FORTY, {});
    // Same objects, same order — no derived score attached on the way through.
    expect(out).toEqual([...FORTY]);
  });
});

describe('grouping does not rank', () => {
  const label = (id: string): string => ({ 'es:primaria-3': '3.º de Primaria', 'es:primaria-5': '5.º de Primaria' }[id] ?? id);

  it('sorts the groups and leaves the members alone', () => {
    const rows = [
      row({ code: 'C', year: 'es:primaria-5' }),
      row({ code: 'A', year: 'es:primaria-3' }),
      row({ code: 'B', year: 'es:primaria-5' }),
    ];
    const groups = groupRoster(rows, label);

    expect(groups.map(([h]) => h)).toEqual(['3.º de Primaria', '5.º de Primaria']);
    // C before B, exactly as they arrived. The moment members are sorted, a view
    // can order children — which is the whole thing this feature refuses.
    expect(groups[1]![1].map((r) => r.code)).toEqual(['C', 'B']);
  });

  it('puts «Sin curso» last, because it is a real group', () => {
    const rows = [row({ code: 'Z' }), row({ code: 'A', year: 'es:primaria-3' })];
    expect(groupRoster(rows, label).map(([h]) => h)).toEqual(['3.º de Primaria', 'Sin curso']);
  });

  it('falls back to the stage when there is no course', () => {
    expect(groupRoster([row({ code: 'A', stage: 'ESO' })], label).map(([h]) => h)).toEqual(['ESO']);
  });

  it('never returns a number about a group', () => {
    const groups = groupRoster([row({ code: 'A', year: 'es:primaria-3' })], label);
    // `[heading, members]` and nothing else: no count, no average, no severity.
    for (const g of groups) expect(g).toHaveLength(2);
  });
});

describe('the screens did not become a dashboard', () => {
  /**
   * T015. The word-ban here is deliberately narrow.
   *
   * My first version forbade `total` and `average`, and it failed on
   * `total={rows.length}` — the legitimate «3 de 30» count. A test that flags a
   * correct line is a test the next person deletes rather than fixes, so it bans
   * the vocabulary of **ranking a child** and nothing else. The structural half
   * is `groupRoster` above and `filterRoster`'s signature.
   */
  const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', 'ui', 'src');
  const read = (...p: string[]): string =>
    readFileSync(join(uiRoot, ...p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the caseload computes no score over a child', () => {
    const src = read('learners', 'LearnersScreen.tsx') + read('learners', 'RosterFilters.tsx');
    expect(src).not.toMatch(/promedio|puntuaci|ranking|clasificaci|severidad|gravedad/i);
    // A reduce over axes would be the shape of a summary of a child.
    expect(src).not.toMatch(/axes[^\n]{0,40}\.reduce/);
  });

  it('the filter bar offers no ordering', () => {
    const src = read('learners', 'RosterFilters.tsx');
    expect(src).not.toMatch(/\bsortBy|\borderBy|mayor a menor|de más a menos|descend/i);
  });

  it('the caseload card shows barriers, and never a count of them as severity', () => {
    const src = read('learners', 'LearnersScreen.tsx');
    // «N apoyos · N a evitar» is a count of *her notes*, which is hers. A count
    // of axes at a level would be a count of him.
    expect(src).not.toMatch(/axes[^\n]{0,40}(length|filter\()[^\n]{0,20}>=/);
  });
});
