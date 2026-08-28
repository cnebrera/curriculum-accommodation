/**
 * Resumable onboarding (006 FR-401). She can close the app mid-setup and lose
 * nothing — which matters, because the person we are designing for will be
 * interrupted.
 */
export type Step = 'vault' | 'connect' | 'learner' | 'done';

const KEY = 'rampa.onboarding';

export interface OnboardingState { step: Step; vaultRoot?: string; providerId?: string; learnerCode?: string; }

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

/** Where setup actually stands, asked of the system rather than of a flag. */
export async function detectStep(): Promise<Step> {
  try {
    const provider = await window.rampa.providers.current();
    const learners = await window.rampa.learners.list().catch(() => [] as string[]);
    if (!provider.configured) return 'connect';
    if (learners.length === 0) return 'learner';
    return 'done';
  } catch { return 'vault'; }
}
