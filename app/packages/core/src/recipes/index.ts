import { parseFrontMatter } from '../vault/parse.js';
import { axisLevelOf, type Axis, type Profile, AXES } from '../vault/schema.js';

/** A recipe is one adaptation decision, written in markdown by a teacher. */
export interface Recipe {
  id: string;
  version: number;
  /** Conditions such as `COG>=2`. Empty means it always applies. */
  axes: AxisCondition[];
  scope: string[];
  conflicts: string[];
  evidence?: string;
  lang?: string;
  body: string;
  /** `core` or a language code. */
  origin: 'core' | 'conflict' | 'lang' | 'local';
  path: string;
}

export interface AxisCondition { axis: Axis; op: '>=' | '<=' | '='; level: number; }

const COND = /^([A-Z]+(?:-[A-Z])?)(>=|<=|=)([0-3])$/;

export function parseAxisCondition(raw: string): AxisCondition | null {
  const m = COND.exec(raw.trim());
  if (!m) return null;
  const axis = m[1] as Axis;
  if (!AXES.includes(axis)) return null;
  return { axis, op: m[2] as AxisCondition['op'], level: Number(m[3]) };
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/[,\s]+/).filter(Boolean) : [];

export function parseRecipe(raw: string, path: string, origin: Recipe['origin']): Recipe | null {
  const { data, body } = parseFrontMatter(raw, path);
  const id = typeof data['id'] === 'string' ? data['id'] : null;
  if (!id) return null;
  return {
    id,
    version: Number(data['version'] ?? 1) || 1,
    axes: list(data['axes']).map(parseAxisCondition).filter((c): c is AxisCondition => c !== null),
    scope: list(data['scope']),
    conflicts: list(data['conflicts']),
    evidence: typeof data['evidence'] === 'string' ? data['evidence'] : undefined,
    lang: typeof data['lang'] === 'string' ? data['lang'] : undefined,
    body,
    origin,
    path,
  };
}

const satisfied = (c: AxisCondition, p: Profile): boolean => {
  const level = axisLevelOf(p, c.axis);
  // An unobserved axis is null, not 0. Recipes keyed on it stay off — guessing
  // a zero silently disables adaptations the learner may need.
  if (level === null) return false;
  return c.op === '>=' ? level >= c.level : c.op === '<=' ? level <= c.level : level === c.level;
};

/** A recipe applies when every one of its conditions holds. No conditions means always. */
export const applies = (r: Recipe, p: Profile): boolean =>
  r.axes.length === 0 || r.axes.every((c) => satisfied(c, p));

export interface Selection {
  selected: Recipe[];
  /** Conflicts resolved, and how — recorded so the teacher can settle them. */
  resolved: Array<{ kept: string; dropped: string; because: string }>;
}

/**
 * Select recipes for a profile and resolve conflicts.
 *
 * Order from recipes/core/conflicts/README.md: the overlay wins, then `works`
 * and `avoid`, then access beats optimisation, then the higher level, then the
 * more conservative option. A conflict is never resolved silently.
 */
export function selectRecipes(all: Recipe[], profile: Profile, lang?: string): Selection {
  const candidates = all.filter((r) => applies(r, profile) && (!r.lang || r.lang === lang));
  const byId = new Map(candidates.map((r) => [r.id, r]));
  const dropped = new Set<string>();
  const resolved: Selection['resolved'] = [];

  const severity = (r: Recipe) => Math.max(0, ...r.axes.map((c) => c.level));
  const isAccess = (r: Recipe) => r.axes.some((c) => c.axis === 'PER-V' || c.axis === 'PER-A');

  for (const r of candidates) {
    for (const otherId of r.conflicts) {
      const other = byId.get(otherId);
      if (!other || dropped.has(r.id) || dropped.has(other.id)) continue;

      let keep = r, lose = other, because = '';
      if (isAccess(other) && !isAccess(r)) { keep = other; lose = r; because = 'el acceso vence a la optimización'; }
      else if (isAccess(r) && !isAccess(other)) { because = 'el acceso vence a la optimización'; }
      else if (severity(other) > severity(r)) { keep = other; lose = r; because = 'la barrera más severa decide'; }
      else if (severity(r) > severity(other)) { because = 'la barrera más severa decide'; }
      else { keep = other; lose = r; because = 'empate: se elige la opción más conservadora'; }

      dropped.add(lose.id);
      resolved.push({ kept: keep.id, dropped: lose.id, because });
    }
  }

  return { selected: candidates.filter((r) => !dropped.has(r.id)), resolved };
}

export const recipeRef = (r: Recipe): string => `${r.id}@${r.version}`;
