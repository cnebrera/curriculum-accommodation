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

/**
 * A bar for work whose size is genuinely known (008 T018; 024 T012).
 *
 * `Stream` deliberately shows characters rather than a percentage, because during
 * an adaptation nothing knows how long the answer will be and a fake percentage
 * that sticks at 90% is worse than an honest count. This is the other case: the
 * total is known before the first call, so a real fraction is available and showing
 * it is not a guess.
 *
 * ## Why it is `Counted` and not `Pages`
 *
 * It was `Pages`, for ingest. `024` needed exactly this — a download of 13.802
 * pictograms knows its own size — and the honest options were a second bar or a
 * noun. A second bar would have been the seventh instance of two copies of one
 * truth in this repository, so: a noun.
 */
export function Counted({ done, total, one, many }: {
  done: number;
  total: number;
  /** «Página», «Dibujo» — the singular, because 1 de 13.802 is a real state. */
  one: string;
  /** The plural for the accessible label. */
  many?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const n = (x: number) => x.toLocaleString('es-ES');
  const label = `${one} ${n(done)} de ${n(total)}`;
  return (
    <div className="stack gap1">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total}
           aria-valuenow={done} aria-label={label}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {/*
        The number in text as well as in the bar. A bar alone carries its meaning in
        width, which is the same failure as carrying it in colour (010 FR-812) — and
        «13.140 de 13.802» is the thing she actually wants to know.
      */}
      <span className="meta">
        {n(done)} de {n(total)} {many ?? `${one.toLowerCase()}s`} · {pct}%
      </span>
    </div>
  );
}

