import type { ReactNode } from 'react';
import { Callout } from '../components/Callout.js';
import { Icon } from '../components/Icon.js';
import { EmptyState } from '../components/EmptyState.js';
import { isEmpty, type Async } from './async.js';

/**
 * Loading, failed, nothing-there — rendered the same way everywhere (FR-1108).
 *
 * The requirement is not that the three states exist; it is that they *read*
 * identically. Before this they did not exist at all on most screens, and where
 * they did, one screen showed a spinner, another an empty card, and a third
 * silently nothing — so a teacher had no way to learn what "still working" looks
 * like in this application, because it looked different on every page.
 *
 * Usage:
 *
 *     const learners = useLearners();
 *     <Loaded from={learners} empty={{ title: '…', body: '…' }}>
 *       {(list) => <ul>{list.map(…)}</ul>}
 *     </Loaded>
 */
export function Loaded<T>({ from, children, empty, busyLabel }: {
  from: Async<T>;
  children: (value: T) => ReactNode;
  /**
   * Omit it and an empty value renders through `children` like any other. That
   * is the right default: an empty array is often perfectly renderable — a table
   * with no rows still has its headings — and forcing an empty state on every
   * caller produces the second kind of blank screen.
   */
  empty?: { title: string; body: ReactNode; action?: ReactNode };
  busyLabel?: string;
}) {
  if (from.state === 'loading') {
    /*
     * Text, not a spinner.
     *
     * `role="status"` so a screen reader is told the page is working rather than
     * finding it briefly empty and announcing nothing — the only signal a
     * non-sighted teacher gets. And a sentence rather than an animation because
     * `data-motion="reduced"` exists precisely for people for whom the animation
     * is not neutral, and a loading indicator that has to be suppressed in that
     * mode is a loading indicator that mode has no replacement for.
     */
    return (
      <p className="small muted row gap2" role="status">
        <Icon name="loader-circle" className="icon-spin" />{busyLabel ?? 'Un momento…'}
      </p>
    );
  }

  if (from.state === 'error') {
    return (
      <Callout intent="danger">
        <p>{from.message}</p>
        {/* Every failure here is one a retry can fix — the connection dropped,
            the vault was on a share that woke up late. A dead end would send her
            to restart the application to find out. */}
        <div className="row">
          <button className="btn btn-sm" onClick={from.retry}><Icon name="refresh-cw" /> Volver a intentarlo</button>
        </div>
      </Callout>
    );
  }

  if (empty && isEmpty(from.value)) {
    return <EmptyState title={empty.title} action={empty.action}>{empty.body}</EmptyState>;
  }

  return <>{children(from.value)}</>;
}
