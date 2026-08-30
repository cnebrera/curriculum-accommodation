import { useAsync, useCommand, type Loadable } from './async.js';

/** What a list of learners needs to render a row, and nothing else. */
export interface LearnerRow {
  code: string;
  /** Display only — see the boundary note in `names.ts`. */
  name: string;
  axes: Record<string, number>;
  works: number;
  avoid: number;
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
        profile: { axes?: Record<string, number>; works?: unknown[]; avoid?: unknown[] };
      };
      return {
        code,
        name: names[code] ?? code,
        axes: l.profile.axes ?? {},
        works: (l.profile.works ?? []).length,
        avoid: (l.profile.avoid ?? []).length,
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
