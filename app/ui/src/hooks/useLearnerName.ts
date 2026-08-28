import { useEffect, useState } from 'react';

/**
 * Display only.
 *
 * The value returned here shows a teacher "Lucía" because that is how she
 * thinks. It must never be put into anything that gets sent: the substitution
 * happens at the egress chokepoint, and this hook exists on the other side of it
 * (contracts/ipc-surface.md rule 3).
 */
export type DisplayName = string & { readonly __display: unique symbol };

export function useLearnerName(code: string | null): DisplayName | null {
  const [name, setName] = useState<DisplayName | null>(null);
  useEffect(() => {
    if (!code) { setName(null); return; }
    let live = true;
    void window.rampa.names.resolve(code).then((n: string | null) => {
      if (live) setName((n as DisplayName | null) ?? null);
    });
    return () => { live = false; };
  }, [code]);
  return name;
}

/** What a teacher should see: her name for the child, falling back to the code. */
export const display = (code: string, name: DisplayName | null): string => name ?? code;
