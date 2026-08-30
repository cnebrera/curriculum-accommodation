import { useMonthCost } from '../data/cost.js';

/** In cents, never tokens (006 FR-422). */
export function CostBadge() {
  const cost = useMonthCost();
  /*
   * The one place a silent failure is right, so it is stated rather than
   * inherited: this is a badge in the rail's foot, and a teacher who cannot be
   * told what she has spent this month should not be shown an error about it
   * while she is trying to adapt a worksheet. It simply is not there.
   */
  if (cost.state !== 'ready' || cost.value.jobs === 0) return null;
  return (
    <span className="badge" title="Lo que llevas gastado este mes en tu propia cuenta de IA">
      Este mes: {cost.value.formatted}
    </span>
  );
}
