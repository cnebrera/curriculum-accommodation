/**
 * Resumable onboarding (006 FR-401). She can close the app mid-setup and lose
 * nothing — which matters, because the person we are designing for will be
 * interrupted.
 */
export type Step = 'vault' | 'connect' | 'learner' | 'done';

const KEY = 'rampa.onboarding';

export interface OnboardingState {
  step: Step;
  vaultRoot?: string;
  providerId?: string;
  learnerCode?: string;
  /**
   * Which service she was in the middle of setting up (009 FR-719).
   *
   * She will be interrupted — that is the premise of a resumable onboarding —
   * and coming back to "¿puedes usar una tarjeta?" after she had already
   * answered it and opened Groq's console is how a setup gets abandoned.
   * Cleared on success.
   */
  connectServiceId?: string;
}

export function loadState(): OnboardingState {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as OnboardingState; }
  catch { return { step: 'vault' }; }
}

export function saveState(s: OnboardingState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: setup just restarts */ }
}

export function clearState(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clean up */ }
}

/**
 * Where setup actually stands, asked of the system rather than of a flag.
 *
 * The vault comes first and is asked of the main process (T083): before this,
 * a relaunch never reopened the vault, `learners.list()` threw into its catch,
 * and the app landed on a broken "first learner" step with no vault behind it.
 */
export async function detectStep(): Promise<Step> {
  try {
    const root = await window.rampa.vault.current();
    if (!root) return 'vault';
    const provider = await window.rampa.providers.current();
    if (!provider.configured) return 'connect';
    const learners = await window.rampa.learners.list();
    if (learners.length === 0) return 'learner';
    return 'done';
  } catch { return 'vault'; }
}
