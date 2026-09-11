import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.js';

/**
 * A small state marker. The icon is decorative; the text carries it (FR-812).
 *
 * Icons from the set rather than font glyphs (`041` FR-3918): `▲ ● ✓ ◐` were a
 * different drawing on every operating system, and `◐` in particular has no glyph
 * at all in several system fonts, so «work» sometimes showed a box.
 */
export type BadgeTone = 'neutral' | 'accent' | 'decide' | 'draft' | 'ok' | 'work';

const ICON: Partial<Record<BadgeTone, IconName>> = {
  decide: 'circle-help', draft: 'circle-alert', ok: 'circle-check', work: 'loader-circle',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const icon = ICON[tone];
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge-${tone}`}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
