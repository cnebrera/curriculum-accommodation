/**
 * The mark: ground, ramp, threshold, door — four strokes.
 *
 * The door is drawn identically however you arrive, which is the product's
 * thesis: a ramp does not lead somewhere else, it leads to the same door.
 *
 * Below 20px the arched top stops resolving, so the small variant draws the
 * frame straight and thickens the stroke. It is a different path, not the same
 * one scaled — scaling this mark down is how it turns to mush in a tab.
 */
export function Logo({ size = 32, tone = 'accent', title }: {
  size?: number;
  tone?: 'accent' | 'ink' | 'faint' | 'on-accent';
  title?: string;
}) {
  const stroke = {
    accent: 'var(--accent)', ink: 'var(--ink)',
    faint: 'var(--line-strong)', 'on-accent': 'var(--on-accent)',
  }[tone];
  const small = size < 20;

  return (
    <svg
      width={size} height={Math.round(size * 32 / 36)} viewBox="0 0 36 32"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g fill="none" stroke={stroke} strokeWidth={small ? 4.4 : 2.7}
         strokeLinecap="round" strokeLinejoin="round">
        {small ? (
          <>
            <path d="M25 17 V7" />
            <path d="M25 17 H34" />
            <path d="M2 26 H21" />
            <path d="M3 26 L25 17" />
          </>
        ) : (
          <>
            <path d="M24 17 V11 Q24 6 29 6 Q34 6 34 11 V17" />
            <path d="M24 17 H34" />
            <path d="M2 26 H21" />
            <path d="M3 26 L24 17" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Mark plus word, with the rule beneath rising at 1:12 — the accessible
 *  gradient in building code, and the reason the angle means anything. */
export function Wordmark({ size = 22 }: { size?: number }) {
  const w = size * 7;
  return (
    <span className="row gap2" style={{ alignItems: 'flex-end' }}>
      <Logo size={size * 1.15} title="Rampa" />
      <span className="stack" style={{ gap: 3 }}>
        <span style={{
          fontSize: size, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1,
        }}>Rampa</span>
        <svg width={w} height={Math.round(w / 12) + 2} viewBox={`0 0 ${w} ${Math.round(w / 12) + 2}`} aria-hidden="true">
          <path d={`M1 ${Math.round(w / 12) + 1} L${w - 1} 1`} fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
