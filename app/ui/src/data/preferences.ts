/**
 * Her display preferences (spec 010 US3, T026/T027).
 *
 * Applied as `data-*` attributes on the root element, which is what makes
 * FR-818 ("applies immediately") true with no state plumbing: the tokens
 * redefine themselves under `[data-text]`, `[data-contrast]` and `[data-motion]`
 * and the whole interface follows from one attribute write.
 *
 * **Not a mode.** The default already meets AA for everyone; these are
 * adjustments on top, for the teacher whose eyes need something different —
 * including the teacher who has a disability herself.
 *
 * Stored outside the vault: they are hers, but they are not her professional
 * record, and a handover packet arriving with someone else's font size would be
 * a small thing that reads as carelessness about a bigger one (FR-820).
 */
export interface DisplayPrefs {
  theme: 'light' | 'dark' | 'system';
  text: 'normal' | 'large' | 'xlarge';
  contrast: 'normal' | 'high';
  motion: 'normal' | 'reduced';
}

export const DEFAULTS: DisplayPrefs = {
  theme: 'system', text: 'normal', contrast: 'normal', motion: 'normal',
};

/** What the operating system already says, so she is not asked (FR-817). */
export function fromSystem(): DisplayPrefs {
  const q = (s: string) => typeof matchMedia === 'function' && matchMedia(s).matches;
  return {
    theme: 'system',
    text: 'normal',
    contrast: q('(prefers-contrast: more)') ? 'high' : 'normal',
    motion: q('(prefers-reduced-motion: reduce)') ? 'reduced' : 'normal',
  };
}

export function apply(p: DisplayPrefs): void {
  const r = document.documentElement;
  // `system` means "keep following the OS", which is different from a value she
  // once chose while the OS later changed — so the attribute is removed rather
  // than set, and the media query in the tokens takes over again.
  if (p.theme === 'system') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', p.theme);

  if (p.text === 'normal') r.removeAttribute('data-text');
  else r.setAttribute('data-text', p.text);

  if (p.contrast === 'normal') r.removeAttribute('data-contrast');
  else r.setAttribute('data-contrast', p.contrast);

  if (p.motion === 'normal') r.removeAttribute('data-motion');
  else r.setAttribute('data-motion', p.motion);
}

export async function load(): Promise<DisplayPrefs> {
  try {
    const stored = await window.rampa.settings.display();
    return { ...fromSystem(), ...(stored ?? {}) };
  } catch {
    return fromSystem();
  }
}

export async function save(p: DisplayPrefs): Promise<void> {
  apply(p);
  try { await window.rampa.settings.setDisplay(p); } catch { /* applied anyway */ }
}

/** Called once before the first paint, so the first frame is already hers. */
export async function applyStoredPreferences(): Promise<DisplayPrefs> {
  const p = await load();
  apply(p);
  return p;
}
