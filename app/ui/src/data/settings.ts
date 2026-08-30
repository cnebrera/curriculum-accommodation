import { useCommand } from './async.js';

/**
 * Her display preferences, as commands.
 *
 * The *reading* of these does not live here: they are applied to the document
 * before the first paint by `preferences.ts`, because a screen that renders at
 * the default size and then jumps to hers is worse than a slower first frame —
 * and much worse for the teacher who set the largest size because she needs it.
 */
export function useSaveDisplayPrefs() {
  return useCommand((p: unknown) => window.rampa.settings.setDisplay(p));
}
