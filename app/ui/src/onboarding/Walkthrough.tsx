import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import type { Service } from './services.js';

/**
 * Walking her to the key (009 T016, FR-716/FR-719).
 *
 * Every word here comes from the catalogue entry. The component contributes
 * structure and nothing else — no step text, no warning, no cost. A sentence
 * about a provider written in this file would be the Principle I leak the whole
 * feature exists to prevent, and it would need a release to correct.
 *
 * `signup_first` is shown **before step one**, because discovering at step four
 * that a card is required is the specific failure that field exists to stop.
 */
export function Walkthrough({
  service, onBack, children,
}: {
  service: Service;
  onBack: () => void;
  /** The paste box. Passed in so this component owns no credential state. */
  children: React.ReactNode;
}) {
  const { t: es } = useStrings();
  const c = es.connect;

  return (
    <div className="stack gap5">
      <div className="stack gap2">
        <h2>{c.walkthroughTitle(service.label)}</h2>
        {service.intro ? <p className="lede">{service.intro}</p> : null}
      </div>

      {service.signupFirst ? (
        <Callout intent="decide" title={c.beforeYouStart}>{service.signupFirst}</Callout>
      ) : null}

      <div className="stack gap3">
        <button className="btn btn-primary btn-lg"
                onClick={() => void window.rampa.corpus.openKeyPage(service.id)}>
          {c.openPage}
        </button>
        {/*
          The id, not the URL. The main process looks the destination up in the
          catalogue, so this button cannot be made to open anything else.

          The hint below is said out loud because a link that silently replaces
          the application window looks like a crash to someone who has never
          seen one do that.
        */}
        <p className="small">{c.openPageHint}</p>
      </div>

      <div className="stack gap3">
        <h3>{c.stepsTitle}</h3>
        <ol className="steps">
          {service.steps.map((step, i) => (
            // The text is the corpus author's, rendered as text and never as
            // markup: Principle IX, content is never instruction.
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {children}

      {service.troubleshooting.length ? (
        <details className="details">
          <summary>{c.cantFind}</summary>
          <ul className="stack gap2">
            {service.troubleshooting.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </details>
      ) : null}

      <div className="row">
        <button className="btn btn-ghost" onClick={onBack}>{c.otherService}</button>
      </div>
    </div>
  );
}
