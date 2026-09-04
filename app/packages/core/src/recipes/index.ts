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

/**
 * A recipe with no axis conditions is a GUARD, not an adaptation.
 *
 * `exam-access-not-difficulty` and `keep-curricular-terms` constrain every other
 * recipe rather than competing with them, so conflict resolution must never drop
 * one. An earlier version did: it saw a severity of 0 (a guard names no axis) and
 * kept a simplification recipe over the exam guard — which is precisely the
 * failure this project is built around, an adaptation quietly making an exam
 * easier. Caught by the end-to-end test over the real corpus, not by review.
 */
export const isGuard = (r: Recipe): boolean => r.axes.length === 0;

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
/**
 * Does this recipe apply anywhere in this document?
 *
 * Set intersection over parsed front matter — deterministic, no model
 * (Principle II).
 *
 * Two absences both mean "yes", and for different reasons. **No document** means
 * the caller is not filtering, which is every caller that predates `012`. **No
 * scope** on a recipe means it declares no restriction, so restricting it would
 * be inventing one on the author's behalf.
 */
export function inScope(recipe: Recipe, presentClasses?: readonly string[]): boolean {
  if (!presentClasses) return true;
  if (recipe.scope.length === 0) return true;
  return recipe.scope.some((c) => presentClasses.includes(c));
}

/**
 * What this profile is not telling us yet (FLU-12, decision P15).
 *
 * ## The failure it exists to name
 *
 * The design is right: an unobserved axis is `null`, not zero, and recipes keyed
 * on it stay off — guessing a zero silently disables adaptations the learner may
 * need (hard rule 3). But read from the other side, from a tutor who is not a PT:
 * he leaves half the interview blank because he genuinely does not know the
 * answers, few recipes select, the sheet comes back looking almost like the
 * original, and his conclusion in week one is **«esta herramienta no hace nada»**
 * rather than «mi perfil está incompleto».
 *
 * The diagnosis existed and arrived too late: the report says «revisa si el perfil
 * tiene ejes sin observar» *after* the run, which is after she has paid.
 *
 * ## What is derived, and what is not invented
 *
 * Everything here comes from files that already exist. The axis names and what
 * each level looks like are `instructions/axes.md` — so the «questions that would
 * help» are the corpus's own descriptions of what to look for, not prose written
 * in code (Principle I). Which recipes stay off is computed from their own `axes:`
 * conditions.
 *
 * **Only recipes held off *solely* by an unobserved axis are listed.** A recipe
 * that is off because the axis was observed at a lower level is correctly off, and
 * saying otherwise would send her to change a profile that is already right.
 */
export interface ProfileGap {
  /** How many adaptations this run will actually apply. */
  willApply: number;
  /** Axes with nothing observed, with the corpus's own description of each level. */
  unobserved: Array<{ axis: Axis; name: string; levels: readonly string[] }>;
  /** Recipes that stay off only because an axis has not been observed. */
  disabled: Array<{ recipe: string; axes: Axis[] }>;
}

export function profileGap(
  /** Recipes eligible for this document — already filtered by language and scope. */
  candidates: readonly Recipe[],
  profile: Profile,
  /** `parseAxisDefs(instructions/axes.md)`, so every word she reads is corpus. */
  defs: readonly { key: Axis; name: string; levels: readonly string[] }[],
  selection: Selection,
): ProfileGap {
  const selectedIds = new Set(selection.selected.map((r) => r.id));
  const blind = AXES.filter((a) => axisLevelOf(profile, a) === null);
  const blindSet = new Set<Axis>(blind);

  const disabled: ProfileGap['disabled'] = [];
  for (const r of candidates) {
    if (selectedIds.has(r.id)) continue;
    const failing = r.axes.filter((c) => !satisfied(c, profile)).map((c) => c.axis);
    // Off for some other reason (a conflict, or an axis observed too low) is off
    // for a reason she cannot fix by observing more.
    if (failing.length === 0) continue;
    if (!failing.every((a) => blindSet.has(a))) continue;
    disabled.push({ recipe: r.id, axes: [...new Set(failing)] });
  }

  return {
    willApply: selection.selected.length,
    unobserved: blind.map((axis) => {
      const def = defs.find((d) => d.key === axis);
      return { axis, name: def?.name ?? axis, levels: def?.levels ?? [] };
    }),
    disabled,
  };
}

export function selectRecipes(
  all: Recipe[], profile: Profile, lang?: string,
  /**
   * The block classes present in the document being adapted (012 T005, FR-1004).
   *
   * **Optional, and its absence means "do not filter".** Every existing caller
   * passes nothing, so omitting it preserves today's behaviour exactly — which
   * matters because turning this on changes selection for every document this
   * application has ever adapted, and `selection-baseline.test.ts` exists to make
   * that diff visible rather than silent.
   *
   * ## Why this parameter had to exist at all
   *
   * `recipe.scope` has been parsed into the `Recipe` type since recipes were
   * introduced, populated across all nine corpus files, and **read by nothing**.
   * It could not be read: this function had never been given a document to
   * compare a scope against. So `exam-access-not-difficulty`, scoped
   * `[assessment]`, was offered for a study text with no assessment block in it —
   * for all four baseline profiles.
   *
   * Fifth instance of the same shape in this project, after the corpus journal
   * dates, `planForget`, the injection notices and `evidence:`.
   */
  presentClasses?: readonly string[],
): Selection {
  const candidates = all
    .filter((r) => applies(r, profile) && (!r.lang || r.lang === lang))
    .filter((r) => inScope(r, presentClasses));
  const byId = new Map(candidates.map((r) => [r.id, r]));
  const dropped = new Set<string>();
  const resolved: Selection['resolved'] = [];

  const severity = (r: Recipe) => Math.max(0, ...r.axes.map((c) => c.level));
  const isAccess = (r: Recipe) => r.axes.some((c) => c.axis === 'PER-V' || c.axis === 'PER-A');

  for (const r of candidates) {
    for (const otherId of r.conflicts) {
      const other = byId.get(otherId);
      if (!other || dropped.has(r.id) || dropped.has(other.id)) continue;

      // Rule 0: a guard is never dropped. It constrains the other recipe rather
      // than competing with it, so both stay and the constraint is recorded.
      if (isGuard(r) || isGuard(other)) {
        const guard = isGuard(r) ? r : other;
        const constrained = isGuard(r) ? other : r;
        if (!isGuard(constrained)) {
          resolved.push({ kept: guard.id, dropped: '', 
            because: `"${guard.id}" es una guarda: no se descarta, limita a "${constrained.id}"` });
        }
        continue;
      }

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
