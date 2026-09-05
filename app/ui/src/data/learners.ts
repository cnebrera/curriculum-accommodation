import { useAsync, useCommand, type Loadable } from './async.js';

/** What a list of learners needs to render a row, and nothing else. */
export interface LearnerRow {
  code: string;
  /** Display only — see the boundary note in `names.ts`. */
  name: string;
  axes: Record<string, number>;
  works: number;
  avoid: number;
  /** For filtering (015). An `011` year id, e.g. `es:primaria-5`. */
  year?: string;
  /** His age, from `011`. On the card because it is what she scans by. */
  age?: number;
  stage?: string;
  /** Never sent — see `roster-privacy.test.ts` (015 FR-1306). */
  school?: string;
}

/**
 * The roster, with the names already joined on (013 FR-1107).
 *
 * Three screens were each doing this join by hand — list the codes, fetch the
 * name map, load every profile, zip them — and each did it slightly differently.
 * `LearnersScreen` awaited the profiles in sequence inside a `Promise.all` map;
 * `AdaptScreen` skipped the profiles and kept two parallel `useState`s that
 * could disagree about which learners exist.
 *
 * Joined once here, so a screen asks for learners and gets learners.
 */
export function useLearners(): Loadable<LearnerRow[]> {
  return useAsync(async () => {
    const codes = (await window.rampa.learners.list()) as string[];
    const names = (await window.rampa.names.all()) as Record<string, string>;
    const rows = await Promise.all(codes.map(async (code): Promise<LearnerRow> => {
      const l = (await window.rampa.learners.load(code)) as {
        profile: {
          axes?: Record<string, number>; works?: unknown[]; avoid?: unknown[];
          year?: string; stage?: string; school?: string; age?: number;
        };
      };
      return {
        code,
        // Empty rather than the code, and the screen decides how to say «sin nombre».
        // Falling back to the code put an identifier where a child's name goes — so a
        // seeded caseload read as «S1, S2, S3» and Carlos took those for names. They are
        // what goes to disk *instead* of a name, which is the whole of `003`.
        name: names[code] ?? '',
        axes: l.profile.axes ?? {},
        works: (l.profile.works ?? []).length,
        avoid: (l.profile.avoid ?? []).length,
        ...(l.profile.year ? { year: l.profile.year } : {}),
        ...(l.profile.age ? { age: l.profile.age } : {}),
        ...(l.profile.stage ? { stage: l.profile.stage } : {}),
        ...(l.profile.school ? { school: l.profile.school } : {}),
      };
    }));
    return rows;
  }, []);
}

/**
 * Just the codes and the names — for the "¿para quién?" select, which does not
 * need a profile per learner and should not pay for one on every mount.
 */
export function useLearnerChoices(): Loadable<Array<{ code: string; name: string }>> {
  return useAsync(async () => {
    const codes = (await window.rampa.learners.list()) as string[];
    const names = (await window.rampa.names.all()) as Record<string, string>;
    // The picker needs something to show, and there the code IS the label of last
    // resort — a select with an empty option is unusable. The list is different: it has
    // room to say what is missing.
    return codes.map((code) => ({ code, name: names[code] ?? code }));
  }, []);
}

export function useLearner(code: string | null): Loadable<unknown> {
  return useAsync(() => (code ? window.rampa.learners.load(code) : Promise.resolve(null)), [code]);
}

/** The same read, on demand — the profile editor loads inside its own effect. */
export function useLoadLearner() {
  return useCommand((code: string) => window.rampa.learners.load(code));
}

export function useSaveLearner() {
  return useCommand((profile: unknown) => window.rampa.learners.save(profile));
}

export function useNewLearnerCode() {
  return useCommand(() => window.rampa.learners.newCode() as Promise<string>);
}

/**
 * The subjects this vault already knows, to suggest areas from (`032` FR-3007).
 *
 * One channel, not two calls: the record scan behind it is O(jobs), and a screen that
 * asked for the roster and the record separately would read the material directory once
 * per learner it displays — `020` FR-1828's rule, one directory up.
 *
 * **Suggestions, never a taxonomy.** There is no fixed list of Spanish school subjects
 * anywhere in this: what counts as an área is judgement (Principle I), so the vocabulary
 * is what she has actually written in her roster and what her sheets say they are about.
 * And a sheet's `subject` was read out of a document somebody else wrote, so whatever
 * renders these renders them as plain text (Principle IX).
 */
export function useKnownAreas(code?: string): Loadable<string[]> {
  return useAsync(async () => (await window.rampa.learners.areas(code)) as string[], [code]);
}
