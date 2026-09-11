import { useState } from 'react';
import { Section, Field } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useConversation, useTurn, useRestoreRevision, type Revision,
} from '../data/conversation.js';

/**
 * «Casi» costs one turn, not one re-run (026 T016/T024).
 *
 * ## Why it lives where the document is
 *
 * The answer to «casi, pero hazlo más corto» is a change to *this* sheet, and every
 * second she spends navigating to find where to ask is a second she could have spent
 * looking at the sheet. So the panel is under the document on the review screen, not on a
 * screen of its own.
 *
 * ## What each turn shows, and why the changes line is not the model's
 *
 * «Qué ha cambiado» is derived from the two revisions by `revisionDiff`. A model asked
 * what it changed answers confidently, including about changes it did not make — and
 * this is the line she uses to decide whether to look at the sheet at all. An account
 * that is wrong in her favour is an account that stops her looking.
 */
export function ConversationPanel({ jobId, learner }: {
  /** The document's identity — the same pair `resolveDocument` answers for. */
  jobId: string;
  /** Absent for a composition, present for a learner's adapted sheet. */
  learner?: string;
}) {
  const state = useConversation(jobId, learner);
  const turn = useTurn();
  const restore = useRestoreRevision();
  const [text, setText] = useState('');

  const send = async (): Promise<void> => {
    const asked = text.trim();
    if (!asked) return;
    const result = await turn.run(jobId, learner, asked);
    if (!result) return;
    setText('');
    state.reload();
  };

  return (
    <Section
      title="¿Quieres que le cambie algo?"
      lede="Dímelo con tus palabras y te lo dejo en una versión nueva. La de ahora no se pierde.">

      {turn.error ? <Callout intent="danger">{turn.error.message}</Callout> : null}
      {restore.error ? <Callout intent="danger">{restore.error.message}</Callout> : null}

      <Loaded from={state}>
        {(conversation) => (
          <div className="stack gap3">
            {conversation.turns.length ? (
              /*
               * One card per turn — decided by looking at it (T030).
               *
               * As a bullet list the turns ran together: the cost line of one sat flush
               * against her words in the next, so «lo que pedí» and «lo que pedí después»
               * read as one blob. A conversation she cannot scan is a conversation she
               * cannot use to decide whether the last change helped.
               */
              <div className="stack gap2">
                {conversation.turns.map((t, i) => (
                  <div className="card card-object stack gap2" key={i}>
                    <strong>{t.text}</strong>
                    {t.outcome.kind === 'refusal' ? (
                      /*
                       * A refusal reads as Rampa protecting her criteria, not as Rampa
                       * disobeying: it says what it would have changed and which rule
                       * stops it. T030 puts eyes on whether that lands.
                       */
                      <Callout intent="decide" title="Esto no lo he hecho">
                        {t.outcome.because}
                      </Callout>
                    ) : t.outcome.kind === 'no-change' ? (
                      <p className="small">No he cambiado nada: ya estaba como me pedías.</p>
                    ) : (
                      <ul className="bullets">
                        {t.changed.map((c, j) => <li key={j}>{c}</li>)}
                      </ul>
                    )}
                    <p className="small muted">
                      {whenSpanish(t.at)} · {t.costCents === null
                        ? 'no sé lo que ha costado'
                        : `${t.costCents} céntimo${t.costCents === 1 ? '' : 's'}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <Field label="Qué le cambio" htmlFor="turno"
                   help="Por ejemplo: «quita los tres últimos», «más espacio para contestar», «cambia el contexto por fútbol».">
              <textarea className="input" id="turno" rows={3} value={text}
                        onChange={(e) => setText(e.target.value)} />
            </Field>

            <div className="row gap2">
              <button className="btn" disabled={turn.busy || !text.trim() || conversation.running}
                      aria-busy={turn.busy}
                      onClick={() => void send()}>
                {turn.busy ? 'Cambiándolo…' : 'Cambiar esto'}
              </button>
            </div>

            <RevisionList
              revisions={conversation.revisions}
              onRestore={(n) => void restore.run(jobId, learner, n).then(() => state.reload())}
              busy={restore.busy} />
          </div>
        )}
      </Loaded>
    </Section>
  );
}

/**
 * «05/09/2026 10:12», the way dates are written in her language.
 *
 * The turn is stamped ISO because that is what a machine should store, and shown the
 * Spanish way because that is what she reads — the same split `formatDate` already makes
 * on the connection screen. Written here rather than imported from `data/services.ts`
 * because that one takes a date and this one takes a date **and a time**; a second
 * argument on the shared helper would be a helper doing two jobs for two callers.
 */
const whenSpanish = (at: string): string => {
  const [date, time] = at.split(' ');
  const [y, m, d] = (date ?? '').split('-');
  return d && m && y ? `${d}/${m}/${y}${time ? ` ${time}` : ''}` : at;
};

/**
 * The way back, listed (T024, FR-2402).
 *
 * The point of showing it is not that she uses it often — it is that the next turn costs
 * nothing to fear. A conversation where «la tercera versión era peor» is unrecoverable is
 * a conversation she stops having.
 *
 * Which revision is signed is shown in **words**, never in colour alone (`010` FR-812).
 */
function RevisionList({ revisions, onRestore, busy }: {
  revisions: readonly Revision[];
  onRestore: (n: number) => void;
  busy: boolean;
}) {
  if (revisions.length <= 1) return null;
  return (
    <div className="stack gap2">
      <strong>Las versiones que hay</strong>
      <ul className="bullets">
        {revisions.map((r) => (
          <li key={r.n}>
            Versión {r.n}
            {r.current ? ' · la que estás viendo' : ''}
            {r.signed ? ' · firmada' : ''}
            {!r.current ? (
              <>
                {' '}
                <button className="btn btn-sm" disabled={busy} onClick={() => onRestore(r.n)}>
                  Volver a esta
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="field-help">
        Volver a una versión no borra ninguna: la que tienes ahora se guarda también, así
        que siempre puedes deshacer el paso atrás.
      </p>
    </div>
  );
}
