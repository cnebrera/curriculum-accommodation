import type { ReactNode } from 'react';

/**
 * One shape, four intents (spec 010 FR-824). Replaces `Notice`.
 *
 * Every intent states its kind in words as well as in colour, because FR-812
 * forbids colour as the only carrier — a colourblind reader, a bad school
 * screen and a photocopy all have to be able to tell these apart.
 *
 * `role` follows the intent rather than being passed in: an error is an alert
 * and needs to interrupt a screen reader; the others are status and must not.
 */
export type Intent = 'info' | 'decide' | 'danger' | 'ok';

const KIND: Record<Intent, string> = {
  info: 'Información',
  decide: 'Necesita tu decisión',
  danger: 'Atención',
  ok: 'Hecho',
};

export function Callout({ intent = 'info', title, children }: {
  intent?: Intent;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`callout callout-${intent}`}
      role={intent === 'danger' ? 'alert' : 'status'}
    >
      {/* The kind is announced even when the caller gives no title, so the
          intent is never carried by the border colour alone. */}
      <strong>{title ?? KIND[intent]}</strong>
      {!title && <span className="sr-only">{KIND[intent]}</span>}
      <div>{children}</div>
    </div>
  );
}
