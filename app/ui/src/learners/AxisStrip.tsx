import { useAxisDefs, type AxisDef } from './axisDefs.js';

/**
 * Ten barriers, at a glance (spec 010 FR, T013).
 *
 * A profile is ten axes at 0–3 or unobserved: a small, fixed data shape that
 * deserves a component rather than ten selects. No radar chart — it does not
 * read and it does not compare.
 *
 * Level is carried by **bars, a number, and a word**, because a level shown only
 * as colour is a level she cannot check (FR-812). And **unobserved is dashed and
 * empty, not zero**: confusing the two silently disables adaptations the learner
 * needs, which is a safety issue rather than a nicety.
 */
export function AxisStrip({ axes, onPick }: {
  axes: Record<string, number>;
  onPick?: (axis: AxisDef) => void;
}) {
  const defs = useAxisDefs();
  return (
    <div className="axes">
      {defs.map((a) => {
        const level = axes[a.key];
        const unobserved = level === undefined;
        const behaviour = unobserved ? '' : a.levels[level!];
        const label = unobserved
          ? `${a.name}: sin observar`
          : `${a.name}: nivel ${level} de 3${behaviour ? ` — ${behaviour}` : ''}`;
        return (
          <button
            key={a.key}
            type="button"
            className="axis"
            {...(unobserved ? { 'data-unobserved': '' } : {})}
            title={label}
            aria-label={label}
            onClick={onPick ? () => onPick(a) : undefined}
            disabled={!onPick}
          >
            <span className="nm">{a.name}</span>
            <span className="bars" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i key={i} className="b" {...(!unobserved && i < level! ? { 'data-on': '' } : {})} />
              ))}
            </span>
            <span className="lv" aria-hidden="true">{unobserved ? 's/o' : level}</span>
          </button>
        );
      })}
    </div>
  );
}
