import { useAxisDefs, type AxisDef } from '../data/axes-defs.js';

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
 *
 * ## Why an axis is only a button when it does something
 *
 * It used to render `<button disabled>` whenever `onPick` was absent — which is
 * the whole caseload list. Three consequences, all real and none visible:
 *
 * 1. **The learner card stopped being clickable in the middle.** The card is a
 *    `<button>` and the strip sits inside it, so clicking a child's card where
 *    the eye naturally lands hit a disabled control — and a disabled form control
 *    swallows the click without dispatching or bubbling it. She had to aim at the
 *    name.
 * 2. **Nested buttons are invalid HTML.** React builds the DOM with `appendChild`
 *    rather than the parser, so it renders; a browser parsing the same markup
 *    hoists the inner buttons out of the card entirely.
 * 3. A screen reader announced nine dimmed buttons that were never controls.
 *
 * Found on 2026-08-30 by `014`'s end-to-end test failing to click a learner. No
 * layout, contrast or axe check could see it: nothing overlapped, nothing was
 * clipped, and every control had a label.
 */
export function AxisStrip({ axes, onPick, compact }: {
  axes: Record<string, number>;
  onPick?: (axis: AxisDef) => void;
  /**
   * Only the barriers she has actually observed, plus a count of the rest
   * (015 T014).
   *
   * On a caseload card the full strip is ten axes of which eight are usually
   * `s/o`, wrapping to two rows and making one learner 250 px tall — so a
   * caseload of thirty is a page nobody scrolls, which is the problem this
   * feature exists to solve.
   *
   * **The unobserved ones are still counted, not hidden.** Principle V's point
   * is that unobserved is not zero, and a card implying a child has no barriers
   * because nobody has looked would be exactly the wrong summary. So the card
   * says «3 sin observar» rather than saying nothing — and the profile editor
   * keeps the full strip, because that is where she looks at them one by one.
   */
  compact?: boolean;
}) {
  const defs = useAxisDefs();
  const shown = compact ? defs.filter((a) => axes[a.key] !== undefined) : defs;
  const unobserved = compact ? defs.length - shown.length : 0;

  return (
    <div className="axes">
      {shown.map((a) => {
        const level = axes[a.key];
        const unobserved = level === undefined;
        const behaviour = unobserved ? '' : a.levels[level!];
        const label = unobserved
          ? `${a.name}: sin observar`
          : `${a.name}: nivel ${level} de 3${behaviour ? ` — ${behaviour}` : ''}`;
        const shared = {
          key: a.key,
          className: 'axis',
          title: label,
          ...(unobserved ? { 'data-unobserved': '' } : {}),
        };

        // Not a control: a `<span>` with the label an assistive reader needs.
        if (!onPick) {
          return (
            <span {...shared} role="img" aria-label={label}>
              <span className="nm">{a.name}</span>
              <span className="bars" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <i key={i} className="b" {...(!unobserved && i < level! ? { 'data-on': '' } : {})} />
                ))}
              </span>
              <span className="lv" aria-hidden="true">{unobserved ? 's/o' : level}</span>
            </span>
          );
        }

        return (
          <button
            {...shared}
            type="button"
            aria-label={label}
            onClick={() => onPick(a)}
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
      {/* One sentence, not two. «10 sin observar» and «sin barreras apuntadas»
          are the same fact, and a card that says it twice reads as a card that
          does not know what it is telling you. */}
      {compact && shown.length === 0 ? (
        <span className="axes-unobserved">Sin barreras apuntadas todavía</span>
      ) : unobserved > 0 ? (
        <span className="axes-unobserved">{unobserved} sin observar</span>
      ) : null}
    </div>
  );
}
