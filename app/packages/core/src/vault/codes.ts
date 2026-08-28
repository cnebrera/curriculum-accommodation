/**
 * Learner codes are generated, never chosen (006 FR-421).
 *
 * A teacher left to invent codes will use initials — LG for Lucía García —
 * because it is the obvious thing to do, and initials identify a child. So the
 * system issues opaque codes, and flags anything that looks like initials.
 */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O: they read as 1 and 0
const DIGITS = '23456789';                  // no 0 or 1 either

export function generateCode(existing: Iterable<string> = []): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const l = LETTERS[Math.floor(Math.random() * LETTERS.length)]!;
    const d1 = DIGITS[Math.floor(Math.random() * DIGITS.length)]!;
    const d2 = DIGITS[Math.floor(Math.random() * DIGITS.length)]!;
    const code = `${l}${d1}${d2}`;
    if (!taken.has(code)) return code;
  }
  return `X${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/** Two or three letters with no digits reads as initials, which identify. */
export function looksLikeInitials(code: string): boolean {
  return /^[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,3}$/.test(code.trim());
}

export function validateCode(code: string): { ok: boolean; warning?: string } {
  if (!code.trim()) return { ok: false, warning: 'El código no puede estar vacío.' };
  if (looksLikeInitials(code)) {
    return {
      ok: false,
      warning: 'Ese código parece unas iniciales, y las iniciales identifican a un niño. Deja que genere uno.',
    };
  }
  return { ok: true };
}
