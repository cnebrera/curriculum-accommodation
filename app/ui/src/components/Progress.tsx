/**
 * "Adapting" has a shape she can read.
 *
 * Two forms, because the job has two phases with different information: named
 * stages while the application is working locally, and a growing bar once the
 * model is streaming. Both carry their state in text for anyone not watching
 * the animation, and `aria-live="polite"` so a screen reader is told without
 * being interrupted.
 */
export function Stages({ stages, current }: { stages: readonly string[]; current: number }) {
  return (
    <div className="stack gap2">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 'var(--text-sm)' }}>{stages[current] ?? ''}</strong>
        <span className="meta">{current + 1} de {stages.length}</span>
      </div>
      <div className="progress-steps" aria-hidden="true">
        {stages.map((s, i) => <i key={s} {...(i <= current ? { 'data-done': '' } : {})} />)}
      </div>
      <span className="sr-only" aria-live="polite">
        Paso {current + 1} de {stages.length}: {stages[current]}
      </span>
    </div>
  );
}

export function Stream({ label, chars }: { label: string; chars: number }) {
  // No total to divide by, so the bar approaches but never claims completion —
  // a bar that sits at 100% while still working is a lie she will remember.
  const pct = Math.min(92, Math.round((chars / 6000) * 100));
  return (
    <div className="stack gap2">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 'var(--text-sm)' }}>{label}</strong>
        <span className="meta">{chars.toLocaleString('es-ES')} caracteres</span>
      </div>
      <div className="progress" role="progressbar" aria-label={label}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
