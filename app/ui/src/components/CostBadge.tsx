import { useMonthCost } from '../data/cost.js';

/**
 * What she has spent on her own AI service this month, in cents, never tokens (006 FR-422).
 *
 * ## Two corrections from use (2026-09-01)
 *
 * **It says what the figure is of.** It read «Este mes: 4 céntimos», and the only place
 * the words «tu propia cuenta de IA» appeared was a `title` attribute — a tooltip, which
 * is invisible on a touchpad and to a screen reader in browse mode. Carlos read the badge
 * as a commercial plan, which is exactly what a bare figure in the foot of a rail looks
 * like. Now the label is on screen.
 *
 * **It refuses to invent.** Where the jobs of the month were run against a model with no
 * published price here (Groq, Mistral, DeepSeek, OpenAI — see `costCents`), there is no
 * figure, and this says so instead of printing one. «Nada» would be a lie in the same
 * direction as the old fabricated euros, just quieter.
 */
export function CostBadge() {
  const cost = useMonthCost();
  /*
   * The one place a silent failure is right, so it is stated rather than
   * inherited: this is a badge in the rail's foot, and a teacher who cannot be
   * told what she has spent this month should not be shown an error about it
   * while she is trying to adapt a worksheet. It simply is not there.
   */
  if (cost.state !== 'ready' || cost.value.jobs === 0) return null;
  const { formatted, unknown } = cost.value;

  if (formatted === null) {
    return (
      <span className="badge">
        Tu servicio de IA no publica aquí su precio, así que no sé lo que llevas gastado
      </span>
    );
  }

  return (
    <span className="badge">
      Llevas {formatted} en tu servicio de IA este mes
      {unknown > 0 ? `, y ${unknown} ${unknown === 1 ? 'trabajo' : 'trabajos'} que no sé cobrar` : ''}
    </span>
  );
}
