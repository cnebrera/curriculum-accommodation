import type { ReactNode } from 'react';

/** A small state marker. The glyph is decorative; the text carries it. */
export type BadgeTone = 'neutral' | 'accent' | 'decide' | 'draft' | 'ok' | 'work';

const GLYPH: Record<BadgeTone, string> = {
  neutral: '', accent: '', decide: '▲', draft: '●', ok: '✓', work: '◐',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const glyph = GLYPH[tone];
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge-${tone}`}>
      {glyph && <span aria-hidden="true">{glyph}</span>}
      {children}
    </span>
  );
}
