import type { ReactNode } from 'react';

/**
 * The page shell (013 T003, FR-1101).
 *
 * **A screen declares what it is. This decides where things go.**
 *
 * Before it existed, every screen rendered its own `<h1>` and its own content
 * with a `stack gap4` chosen by eye — so there was no shared rhythm, no measure
 * on anything, and content stranded at the top left of a 1366px window. Adding a
 * screen meant inventing a layout, which is why each one looked slightly
 * different and none looked finished.
 *
 * If a screen cannot be built with this, **fix the shell**. Working around it
 * once is how a shell stops being worth having by the fourth screen.
 */
export function Page({ title, lede, variant, actions, children }: {
  title: string;
  /** One line, in her words, under the title. Optional and usually worth it. */
  lede?: ReactNode;
  /**
   * `wide` for the two-column comparison work, where the comparison IS the
   * feature (008's verification screen). A variant, not an exception.
   */
  variant?: 'wide';
  /** The screen's actions, if they belong at the foot rather than in a section. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={variant === 'wide' ? 'page page-wide' : 'page'}>
      <header className="page-head">
        <h1>{title}</h1>
        {lede ? <p className="page-lede">{lede}</p> : null}
      </header>
      {children}
      {actions}
    </div>
  );
}

/**
 * One idea. Sections are separated by more air than the fields inside them are,
 * which is the whole of what "vertical rhythm" means here and what was missing.
 */
export function Section({ title, lede, children }: {
  title?: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      {title ? <h2>{title}</h2> : null}
      {lede ? <p className="section-lede">{lede}</p> : null}
      {children}
    </section>
  );
}

/**
 * One question, and the control that answers it.
 *
 * Owns the measure (FR-1102). A control inside a field fills the field, so no
 * screen has to decide how wide an input is — which is how they all ended up
 * 1000px wide, because nobody decided at all.
 */
export function Field({ label, htmlFor, help, canvas, children }: {
  label?: ReactNode;
  htmlFor?: string;
  /** Under the control, not above it: she reads it after wondering, not before. */
  help?: ReactNode;
  /**
   * A surface she fills rather than a field she completes — the paste box, the
   * house-style editor. Wider, and the only thing that is.
   */
  canvas?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={canvas ? 'field field-canvas' : 'field'}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}

/**
 * What she does next, and **only one primary** (FR-1105).
 *
 * The prop is singular on purpose. Before this, every button was the same heavy
 * gradient slab, so weight carried no information and nothing on the page told
 * her what to do — the type of failure that is invisible in a component library
 * and obvious on a screen.
 */
export function Actions({ primary, children, note }: {
  primary?: ReactNode;
  /** Secondary controls. Rendered after the primary, in her reading order. */
  children?: ReactNode;
  /** A quiet line beside the buttons — a cost, a count, a consequence. */
  note?: ReactNode;
}) {
  return (
    <div className="actions">
      {primary}
      {children}
      {note ? <span className="actions-note">{note}</span> : null}
    </div>
  );
}
