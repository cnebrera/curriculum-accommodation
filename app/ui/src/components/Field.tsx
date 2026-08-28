import { useId, type ReactNode } from 'react';

/**
 * A form field with its label, help and message (spec 010 FR-814, T008).
 *
 * Three things this gets right that the previous ad-hoc markup did not:
 *
 * 1. **The label is always visible.** A placeholder standing in for a label
 *    disappears the moment she types, leaving her without the question.
 * 2. **The message is associated**, via `aria-describedby`, so a screen reader
 *    reads the error with the field rather than as loose text nearby.
 * 3. **An error carries a glyph and words**, not just a red border (FR-812).
 */
export type FieldState = 'idle' | 'error' | 'ok';

export function Field({ label, help, state = 'idle', message, children }: {
  label: string;
  help?: ReactNode;
  state?: FieldState;
  message?: ReactNode;
  /** Receives the id and describedby it must apply. */
  children: (props: { id: string; 'aria-describedby': string | undefined }) => ReactNode;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const msgId = message ? `${id}-msg` : undefined;
  const describedBy = [helpId, msgId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field" data-state={state === 'idle' ? undefined : state}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': describedBy })}
      {help && <span className="help" id={helpId}>{help}</span>}
      {message && (
        <span className="msg" id={msgId}>
          <span className="ic" aria-hidden="true">{state === 'error' ? '✕' : '✓'}</span>
          <span>
            {/* Spoken, so the state is not carried by colour and a glyph alone. */}
            <span className="sr-only">{state === 'error' ? 'Error: ' : 'Correcto: '}</span>
            {message}
          </span>
        </span>
      )}
    </div>
  );
}
