import { useState } from 'react';
import { Callout } from '../components/Callout.js';
import { useForgetPlan, useForgetLearner } from '../data/notes.js';

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
  /**
   * What is removed from **inside** a file rather than by deleting one.
   *
   * Two of the five residues the review found are of this shape: her name for him
   * in the encrypted map, and his row in the roster. Deleting either file would
   * take every other learner with it, which is why a plan that only ever collected
   * paths could not name them — and why «he borrado todo lo de X» was false about
   * the most personal datum in the system.
   */
  entries: Array<{ of: 'name' | 'roster'; where: string }>;
  /**
   * Which shared material survives, and how many other learners are the reason
   * (`014` FR-1211, review COD-20, decision P45).
   *
   * `planForget` has returned this since `014` — `Array<{ job, alsoUsedBy }>`,
   * exactly what the requirement asks for — and **this interface omitted it**, so
   * no JSX could render it. What reached her was the aggregate sentence injected
   * into `survives`: «N materiales se quedan…». The *how many*, never the *which*.
   * Half a requirement living only in the type of the main process, which is the
   * same shape this screen's own docblock denounces about its past.
   *
   * **Counts, not codes.** Naming another child inside a dialogue about erasing
   * this one is exposure that buys nothing, and she can see who from their own
   * records.
   */
  sharedKept: Array<{ job: string; alsoUsedBy: number }>;
  survives: string[];
  outOfReach: string[];
}

/** Said in her words here, because the sentence she reads is the interface's. */
const ENTRY_SAYS: Record<'name' | 'roster', string> = {
  name: 'Tu nombre para él, del listado cifrado de este equipo.',
  roster: 'Su fila de la lista de clase.',
};

export function ForgetLearner({ code, name, onDone }: {
  code: string;
  /** Her name for him, shown only here and only to her. */
  name?: string;
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<{ removed: string[]; remaining: string[] } | null>(null);
  const forgetPlan = useForgetPlan();
  const forget = useForgetLearner();
  /* Either step can fail, and they fail for different reasons — a plan that
     cannot be read, a deletion that cannot complete — so the message is
     whichever one actually happened rather than a shared `error` string that
     each branch had to remember to clear. */
  const error = forgetPlan.error?.message ?? forget.error?.message ?? null;

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
              <p>
                Quedan {result.remaining.length} sitio(s) donde todavía aparece. Es un
                fallo mío, no tuyo — dímelo y lo arreglo:
              </p>
              <ul className="stack gap1">
                {result.remaining.map((p) => <li key={p}><code>{p}</code></li>)}
              </ul>
            </>
          ) : (
            <p>
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
            void forgetPlan.run(code).then((p) => { if (p) setPlan(p as Plan); });
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
        <ul className="bullets">
          {plan.paths.map((p) => <li key={p} className="small"><code>{p}</code></li>)}
        </ul>
        {plan.paths.length === 0 ? (
          <p className="small muted">
            No encuentro ficheros suyos. Puede que ya los borraras.
          </p>
        ) : null}

        {/*
          And the two that are edits (FR-215: list *everything* before confirming).
          In the same card as the paths rather than in a callout of their own: from
          her side they are not a different kind of thing, they are the rest of the
          list — and they were missing from it entirely.
        */}
        {plan.entries.length ? (
          <>
            <span className="small"><strong>Y de dentro de dos ficheros</strong></span>
            <ul className="bullets">
              {plan.entries.map((e) => (
                <li key={e.of} className="small">
                  {ENTRY_SAYS[e.of]} <code>{e.where}</code>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {/*
        FR-1211 · **which** shared material stays, and why (decision P45).

        Its own block rather than a line inside «esto no se retira»: that callout is
        about things erasure cannot reach at all, and these are files that stay for
        a reason she can check — another child of hers is still using them. The
        distinction matters because the action is different: nothing to do here,
        versus «erase that child too and this goes».
      */}
      {plan.sharedKept.length ? (
        <div className="card stack gap2">
          <span className="small">
            <strong>
              {plan.sharedKept.length === 1
                ? 'Un material se queda, y por qué'
                : `${plan.sharedKept.length} materiales se quedan, y por qué`}
            </strong>
          </span>
          <ul className="bullets">
            {plan.sharedKept.map((k) => (
              <li key={k.job} className="small">
                <code>{k.job}</code>{' — '}
                {k.alsoUsedBy === 1
                  ? 'lo usa otro alumno tuyo'
                  : `lo usan otros ${k.alsoUsedBy} alumnos tuyos`}.
                {' '}Lo de {label} sí se borra.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* FR-218 · what does not come back. */}
      <Callout intent="decide" title="Esto no se retira">
        <ul className="bullets">
          {plan.survives.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Callout>

      {/* FR-220 · what is not mine to delete. */}
      <Callout intent="danger" title="Esto no lo puedo borrar yo">
        <ul className="bullets">
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
          <button className="btn btn-danger" disabled={typed.trim() !== code || forget.busy}
                  aria-busy={forget.busy}
                  onClick={() => {
                    void forget.run(code).then((r) => { if (r) setResult(r as typeof result); });
                  }}>
            {forget.busy ? 'Borrando…' : 'Borrar todo lo suyo'}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        </div>
      </div>

      {error ? <Callout intent="danger" title="No he podido borrarlo">{error}</Callout> : null}
    </div>
  );
}
