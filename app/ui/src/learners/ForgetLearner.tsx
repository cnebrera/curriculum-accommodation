import { useState } from 'react';
import { Callout } from '../components/Callout.js';

/**
 * Removing a learner (003 US4, FR-215/216/217/218/220).
 *
 * **This screen did not exist.** `planForget` and `executeForget` were written,
 * tested and exposed over IPC — including two carefully-worded lists, `survives`
 * and `outOfReach`, saying exactly what erasure does not reach — and no component
 * ever called them. So the one action a school is legally obliged to be able to
 * perform was unreachable, and the sentences that make it honest were never read
 * by anybody.
 *
 * Found by `003`'s audit. The core was right; nothing connected it to her.
 *
 * Three things this must do and does:
 *
 * - **List everything first** (FR-215). She confirms a list, not a word.
 * - **Say what survives** (FR-218). A pattern already contributed to the corpus
 *   does not come back. Uncomfortable, true, and it belongs *in* the flow rather
 *   than in a document she reads afterwards.
 * - **Say what is out of reach** (FR-220). The copy she made onto a USB stick in
 *   June is hers to delete. She is the data controller; if she believes this
 *   erasure was complete when it was not, it is her statement that is wrong.
 */
interface Plan {
  code: string;
  paths: string[];
  survives: string[];
  outOfReach: string[];
}

export function ForgetLearner({ code, name, onDone }: {
  code: string;
  /** Her name for him, shown only here and only to her. */
  name?: string;
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ removed: string[]; remaining: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = name ?? code;

  if (result) {
    return (
      <div className="stack gap4">
        <Callout intent={result.remaining.length ? 'danger' : 'ok'}
                 title={result.remaining.length
                   ? 'He borrado casi todo, pero no todo'
                   : `He borrado todo lo de ${label}`}>
          {result.remaining.length ? (
            <>
              <p style={{ marginTop: 0 }}>
                Quedan {result.remaining.length} sitio(s) donde todavía aparece. Es un
                fallo mío, no tuyo — dímelo y lo arreglo:
              </p>
              <ul className="stack gap1">
                {result.remaining.map((p) => <li key={p}><code>{p}</code></li>)}
              </ul>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              {result.removed.length} fichero(s) y carpeta(s). Queda constancia de que
              lo borraste, con la fecha y sin nada suyo dentro.
            </p>
          )}
        </Callout>
        <div className="row">
          <button className="btn" onClick={onDone}>Volver</button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="stack gap4">
        <h2>Borrar todo lo de {label}</h2>
        <p>
          Te voy a enseñar exactamente qué se borra antes de borrar nada. Nada
          desaparece hasta que lo confirmes.
        </p>
        {error ? <Callout intent="danger" title="No he podido mirarlo">{error}</Callout> : null}
        <div className="row gap2">
          <button className="btn btn-primary" onClick={() => {
            setError(null);
            void window.rampa.memory.forgetPlan(code)
              .then((p) => setPlan(p as Plan))
              .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Algo ha ido mal.'));
          }}>
            Ver qué se borraría
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Mejor no</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap5">
      <h2>Esto es lo que se borra de {label}</h2>

      {/* FR-215 · the list, before anything. */}
      <div className="card stack gap2">
        <span className="small"><strong>{plan.paths.length} sitio(s) en tu carpeta</strong></span>
        <ul className="stack gap1" style={{ margin: 0, paddingLeft: '1.4em' }}>
          {plan.paths.map((p) => <li key={p} className="small"><code>{p}</code></li>)}
        </ul>
        {plan.paths.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            No encuentro nada suyo. Puede que ya lo borraras.
          </p>
        ) : null}
      </div>

      {/* FR-218 · what does not come back. */}
      <Callout intent="decide" title="Esto no se retira">
        <ul className="stack gap2" style={{ margin: 0, paddingLeft: '1.2em' }}>
          {plan.survives.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Callout>

      {/* FR-220 · what is not mine to delete. */}
      <Callout intent="danger" title="Esto no lo puedo borrar yo">
        <ul className="stack gap2" style={{ margin: 0, paddingLeft: '1.2em' }}>
          {plan.outOfReach.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Callout>

      <div className="stack gap3">
        <label htmlFor="confirm">
          Escribe <strong>{code}</strong> para confirmar.
        </label>
        {/*
          The code and not the word "borrar": typing a code she has to read off
          the list above is a deliberate act, and it is the one control here whose
          job is to make an accident impossible.
        */}
        <input className="input" id="confirm" value={typed} autoComplete="off"
               onChange={(e) => setTyped(e.target.value)} />
        <div className="row gap2">
          <button className="btn btn-danger" disabled={typed.trim() !== code || busy}
                  aria-busy={busy}
                  onClick={() => {
                    setBusy(true);
                    void window.rampa.memory.forget(code)
                      .then((r) => setResult(r as typeof result))
                      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Algo ha ido mal.'))
                      .finally(() => setBusy(false));
                  }}>
            {busy ? 'Borrando…' : 'Borrar todo lo suyo'}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        </div>
      </div>

      {error ? <Callout intent="danger" title="No he podido borrarlo">{error}</Callout> : null}
    </div>
  );
}
