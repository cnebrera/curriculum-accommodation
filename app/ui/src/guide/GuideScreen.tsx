import { useState } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { InjectionNotice } from '../components/InjectionNotice.js';
import {
  useReadGuide, useApplyGuide, useDraftAcns, useAskGuide, useHelpWithAcs,
  useSaveAcns, useStoredAcns, useAcnsHtml, useAcnsPdf, useSignOffAcns,
  type GuideRead, type Measure, type Turn,
} from '../data/guide.js';
import { DocumentViewer } from '../viewer/DocumentViewer.js';
import { useKnownAreas } from '../data/learners.js';

/**
 * The adaptación curricular (017 T012, T014-T018, T023-T026).
 *
 * ## What this screen is for
 *
 * The document the orientador gave her. Rampa reads it, keeps the **measures**, and
 * from then on every adaptation honours them — which is what
 * `profiles/<code>/adaptations.md` has always done for measures she typed by hand.
 * This is a way in, not a new capability.
 *
 * ## The three lists, and why they are three
 *
 * The measures, what was left out, and the measures Rampa cannot act on. Collapsing
 * them into one would hide the second — and a silent filter makes the overlay a
 * partial record of a document she believes was loaded whole (FR-1508).
 */
export function GuideScreen({
  jobId, learnerCode, learnerName, onDone, onBack, onBring, onAsk,
}: {
  /** A job already ingested and already through `008`'s verification gate. */
  jobId: string | null;
  learnerCode: string;
  learnerName?: string;
  onDone: () => void;
  onBack: () => void;
  /**
   * Bring the document, from here (COD-01, decision P37).
   *
   * This screen said «trae primero el documento y comprueba que lo he leído bien»
   * and offered **no control to do it**: a note describing a step with no door.
   * The only route was the door → «Adaptar algo que tengo» → choose a material
   * kind (is a DIAC «una ficha» or «un examen»?) → bring the photo → verify →
   * abandon the adapt flow → walk back to the learner. So the entry point of a
   * feature marked «Built» was a dead end.
   */
  onBring?: () => void;
  /**
   * Ask about the document (`017` US3, COD-01).
   *
   * `GuideConversation` was rendered by `App.tsx` and **dispatched by nothing** —
   * a whole user story that could not be opened. Optional because it needs a job:
   * there is nothing to ask about until a document is in.
   */
  onAsk?: () => void;
}) {
  const read = useReadGuide();
  const apply = useApplyGuide();
  const [reading, setReading] = useState<GuideRead | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [document, setDocument] = useState('');

  const start = async (): Promise<void> => {
    if (!jobId) return;
    const r = await read.run(jobId);
    if (!r) return;
    setReading(r);
    // Everything ticked to begin with: she is confirming a reading, not building a
    // list from scratch. Unticking is the correction, and it is one click.
    setChosen(new Set(r.measures.map((m) => m.text)));
  };

  const confirm = async (): Promise<void> => {
    if (!reading) return;
    const measures = reading.measures.filter((m) => chosen.has(m.text));
    /*
     * The kind travels with the measures (decision P12). The screen already knew
     * it — it renders «esto parece una adaptación significativa» from the same
     * value — and it stopped there, so the overlay never recorded whether the
     * document was an ACNS or an ACS. That is the one fact that tells a later
     * adaptation it may work at the modified level.
     */
    const done = await apply.run(learnerCode, measures, document.trim() || 'la adaptación curricular',
      reading.omitted,
      // `unknown` is a real answer and not a missing one: a document the reading
      // could not classify must not be recorded as either kind.
      reading.kind === 'acs' || reading.kind === 'acns' ? reading.kind : undefined);
    if (done) onDone();
  };

  if (!reading) {
    return (
      <Page
        title="Traer la adaptación curricular"
        lede={`El documento oficial de ${learnerName ?? learnerCode}. Me quedo con las medidas y las aplico a todo lo que adapte después.`}
        actions={
          <Actions
            primary={
              <button className="btn btn-primary" disabled={!jobId || read.busy}
                      aria-busy={read.busy} onClick={() => void start()}>
                Leer las medidas
              </button>
            }
            note={jobId
              ? undefined
              : onBring
                ? 'Tráelo y te lo leo página a página antes de guardar nada.'
                : 'Trae primero el documento y comprueba que lo he leído bien.'}>
            {/*
              The control the note used to describe and not offer. Not primary:
              «Leer las medidas» is this screen's one strong control (`013`
              FR-1105), and it becomes the right one the moment there is a document.
            */}
            {onBring ? (
              <button className="btn" onClick={onBring}>
                {jobId ? 'Traer otro documento' : 'Traer el documento'}
              </button>
            ) : null}
            {onAsk ? (
              <button className="btn" onClick={onAsk}>Preguntar sobre él</button>
            ) : null}
            <button className="btn btn-ghost" onClick={onBack}>Volver</button>
          </Actions>
        }>

        {read.error ? <Callout intent="danger">{read.error.message}</Callout> : null}

        {/*
          FR-1509, and in the same words `009` uses for a photograph with a name on
          it. The honest part is the second sentence: what Rampa **keeps** and what
          the provider **sees** are not the same thing.
        */}
        <Callout intent="decide" title="Lo que sale de tu ordenador">
          <p>
            Para leer el documento tengo que enviarlo a tu servicio de IA. Se envía
            la página <strong>entera</strong>: si ahí está el diagnóstico, el informe
            psicopedagógico o algo de la familia, eso lo ve el proveedor.
          </p>
          <p>
            De lo que vuelve <strong>yo sólo guardo las medidas</strong>. El
            diagnóstico no se escribe en ningún sitio, y te digo exactamente qué he
            dejado fuera. Pero eso es lo que guardo yo, no lo que ha visto él.
          </p>
          <p className="small">
            Si prefieres que no salga, puedes escribir las medidas a mano en su
            fichero de adaptaciones: funciona igual y no sale nada.
          </p>
        </Callout>
      </Page>
    );
  }

  const actionable = reading.measures.filter((m) => m.actionable);
  const notOurs = reading.measures.filter((m) => !m.actionable);
  const toggle = (text: string): void => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(text)) next.delete(text); else next.add(text);
    return next;
  });

  return (
    <Page
      title="Esto es lo que he sacado del documento"
      lede="Míralo antes de que lo guarde. Nada de esto está escrito todavía."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" disabled={apply.busy || chosen.size === 0}
                    aria-busy={apply.busy} onClick={() => void confirm()}>
              Guardar {chosen.size} {chosen.size === 1 ? 'medida' : 'medidas'}
            </button>
          }
          note={chosen.size === 0 ? 'No has dejado ninguna marcada.' : undefined}>
          {/*
            `017` US3, from where she is actually looking at the document. Beside
            «descartar» rather than instead of it: asking is a read, it writes
            nothing, and it must not look like a step of saving.
          */}
          {onAsk ? (
            <button className="btn" onClick={onAsk}>Preguntar sobre él</button>
          ) : null}
          <button className="btn btn-ghost" onClick={onBack}>Descartar</button>
        </Actions>
      }>

      {apply.error ? <Callout intent="danger">{apply.error.message}</Callout> : null}

      {/* The document is content, and content is never instruction (Principle IX). */}
      <InjectionNotice notices={reading.notices.map(({ block, notice }) => ({
        block, quote: notice.quote, message: notice.message,
      }))} />

      {reading.kind === 'acs' ? (
        <Callout intent="decide" title="Esto parece una adaptación significativa">
          Una ACS modifica objetivos y criterios de evaluación. Yo aplico sus medidas
          de presentación igual que las de una ACNS — pero lo que se modifica lo
          decidió el equipo docente, y yo no toco esa parte.
        </Callout>
      ) : null}

      <Section title="Medidas" lede="Se aplicarán a todo lo que adapte para él. Desmarca lo que no quieras.">
        {actionable.length === 0 ? (
          <p className="small">No he encontrado ninguna medida que yo pueda aplicar.</p>
        ) : (
          <ul className="pick-list" role="list">
            {actionable.map((m) => (
              <li key={m.text}>
                <label className="check">
                  <input type="checkbox" checked={chosen.has(m.text)}
                         onChange={() => toggle(m.text)} />
                  <span>
                    {m.text}{' '}
                    {/* The citation, so she can check it against the document. */}
                    <span className="meta">({m.source})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {notOurs.length ? (
        <Section
          title="Medidas que yo no puedo aplicar"
          lede="Están aquí porque el documento las dice. Yo no hago nada con ellas, y no las voy a olvidar por eso.">
          <ul className="bullets">
            {notOurs.map((m) => (
              <li key={m.text}>
                <label className="check">
                  <input type="checkbox" checked={chosen.has(m.text)}
                         onChange={() => toggle(m.text)} />
                  <span>{m.text} <span className="meta">({m.source})</span></span>
                </label>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {reading.omitted.length ? (
        /*
          FR-1508 · what was left out, and why. Not a count: «3 elementos omitidos»
          is a number she cannot check against the document in her hand.
        */
        <Section title="Lo que no he guardado">
          <ul className="bullets">
            {reading.omitted.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
          <p className="field-help">
            Esto no se escribe en ningún fichero. Su perfil dice lo que le cuesta,
            nunca lo que tiene.
          </p>
        </Section>
      ) : null}

      {reading.missingSections.length ? (
        <Section title="Lo que no he encontrado en el documento"
                 lede="Puede que esté y yo no lo haya visto, o puede que falte. Es cosa tuya.">
          <ul className="bullets">
            {reading.missingSections.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </Section>
      ) : null}

      <Section title="¿De qué documento es?">
        {/*
          `label` was missing here until 2026-09-04: an input with a placeholder, a
          section title above it and **no accessible name**. Found while writing the e2e
          for the signature field below, which had the same hole for the same reason —
          `Field`'s label is optional, so forgetting it typechecks and looks right.
        */}
        <Field label="De qué documento es" htmlFor="doc"
               help="Para que su fichero de adaptaciones diga de dónde salió esto.">
          <input className="input" id="doc" type="text" value={document}
                 placeholder="Por ejemplo: el DIAC de marzo, o la ACNS del tutor"
                 onChange={(e) => setDocument(e.target.value)} />
        </Field>
      </Section>
    </Page>
  );
}

/**
 * The ACNS draft (T019-T022, US2).
 *
 * The one Rampa is *entitled* to help with: an ACNS changes no objective, which is
 * the line Principle III already refuses to cross. Every measure in it traces to an
 * adaptation Rampa already made, and what cannot be sourced is **named** rather than
 * filled in.
 */
export function AcnsDraftScreen({ learnerCode, learnerName, onBack }: {
  learnerCode: string;
  learnerName?: string;
  onBack: () => void;
}) {
  const draft = useDraftAcns();
  const [result, setResult] = useState<Awaited<ReturnType<typeof draft.run>>>(undefined);
  /**
   * Which área this ACNS is for (`032` FR-3004).
   *
   * The regulation writes an ACNS **per área**, and the curricular level she has recorded
   * for Matemáticas is not the one for Lengua — so a draft that ignores the subject cites
   * the wrong gap for one of them. Optional: without it the draft uses the general value
   * and says, in the document, that it did.
   */
  const [subject, setSubject] = useState('');
  const areas = useKnownAreas(learnerCode);

  return (
    <Page
      title={`Borrador de ACNS para ${learnerName ?? learnerCode}`}
      lede="No la escribo yo: ordeno lo que ya había hecho para él. Lo que no puedo sacar de ahí te lo señalo."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" disabled={draft.busy} aria-busy={draft.busy}
                    onClick={() => void draft.run(learnerCode, subject.trim() || undefined)
                      .then(setResult)}>
              {result ? 'Volver a hacerlo' : 'Hacer el borrador'}
            </button>
          }>
          <button className="btn btn-ghost" onClick={onBack}>Volver</button>
        </Actions>
      }>

      {draft.error ? <Callout intent="danger">{draft.error.message}</Callout> : null}

      <Section title="¿De qué área?"
               lede="La normativa hace una ACNS por área. Si me la dices, cito lo que tengas apuntado de esa; si no, el nivel general.">
        <Field label="Área" htmlFor="acns-area">
          <input className="input" id="acns-area" style={{ maxWidth: '22em' }}
                 value={subject} onChange={(e) => setSubject(e.target.value)} />
          {/* Buttons, never a `<datalist>` — see the note in `AxisEditor.tsx`. */}
          {(areas.state === 'ready' ? areas.value : []).length ? (
            <div className="row gap2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="small muted">Las que ya usas:</span>
              {(areas.state === 'ready' ? areas.value : []).map((a) => (
                <button type="button" className="btn btn-sm" key={a}
                        aria-pressed={subject === a} onClick={() => setSubject(a)}>
                  {a}
                </button>
              ))}
            </div>
          ) : null}
        </Field>
      </Section>

      {result ? (
        <>
          {result.missing.length ? (
            /*
              First, and before the draft itself. FR-1514: what she has to put in is
              more useful to her than what is already there, and a list of gaps below
              a finished-looking document is a list she reads after deciding it is
              finished.
            */
            <Callout intent="decide" title="Esto lo tienes que poner tú">
              <ul className="bullets">
                {result.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </Callout>
          ) : null}

          <Section title="El borrador">
            <div className="material" lang="es">{result.markdown}</div>
          </Section>

          {result.sources.length ? (
            <Section title="De dónde sale cada cosa">
              <ul className="bullets">
                {[...new Set(result.sources)].map((s) => <li key={s}>{s}</li>)}
              </ul>
            </Section>
          ) : null}

          <AcnsDocumentSection learnerCode={learnerCode} />
        </>
      ) : (
        /* One already in her folder from another day: reachable without redrafting. */
        <AcnsDocumentSection learnerCode={learnerCode} />
      )}
    </Page>
  );
}

/**
 * The document, once it exists: saved, printed, signed (FR-1516, decision P46).
 *
 * ## The gap this closes
 *
 * The draft was a string on a screen. Nothing kept it, nothing printed it, and the
 * mark FR-1516 calls «removable only by sign-off» had no signature that could remove
 * it — so what actually happened is that she retyped it into Séneca and the mark was
 * lost in the copy-paste, with no review having happened anywhere.
 *
 * ## Why saving is a separate press
 *
 * «Hacer el borrador» writes nothing (Principle VIII): she reads the gaps and the
 * sources and *then* decides. A preview that saved would put a document in her folder
 * for having looked at one.
 */
function AcnsDocumentSection({ learnerCode }: { learnerCode: string }) {
  const stored = useStoredAcns(learnerCode);
  const save = useSaveAcns();
  const html = useAcnsHtml();
  const pdf = useAcnsPdf();
  const sign = useSignOffAcns();
  const [showing, setShowing] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [saved, setSaved] = useState<{ path: string; kept?: string } | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  if (showing !== null) {
    return (
      <DocumentViewer html={showing} title="La ACNS, como se imprime"
                      onClose={() => setShowing(null)} />
    );
  }

  const exists = stored.state === 'ready' && stored.value !== null;
  const signed = stored.state === 'ready' && stored.value?.signed === true;
  const problem = save.error ?? html.error ?? pdf.error ?? sign.error;

  const doSave = async (): Promise<void> => {
    const r = await save.run(learnerCode);
    if (!r) return;
    setSaved({ path: r.path, ...(r.kept ? { kept: r.kept } : {}) });
    stored.reload();
  };

  return (
    <Section
      title="Guardarla, imprimirla y firmarla"
      lede="Es un documento como cualquier otro: mientras no la firmes lleva la marca de borrador, y la marca sólo se va cuando la firmas.">

      {problem ? <Callout intent="danger">{problem.message}</Callout> : null}

      <div className="row gap2" style={{ flexWrap: 'wrap' }}>
        <button className="btn" disabled={save.busy} aria-busy={save.busy}
                onClick={() => void doSave()}>
          {exists ? 'Guardarla otra vez' : 'Guardarla en mi carpeta'}
        </button>
        {exists ? (
          <>
            <button className="btn" disabled={html.busy}
                    onClick={() => void html.run(learnerCode).then((h) => h && setShowing(h))}>
              Verla como se imprime
            </button>
            <button className="btn" disabled={pdf.busy}
                    onClick={() => void pdf.run(learnerCode).then((p) => p && setPdfPath(p))}>
              Guardarla en PDF
            </button>
          </>
        ) : null}
      </div>

      {saved ? (
        <p className="field-help">Está en <code>{saved.path}</code>.</p>
      ) : null}
      {saved?.kept ? (
        /*
          A signed one is never overwritten. Said out loud, because the alternative is
          her believing the signed version is gone.
        */
        <Callout intent="info">
          La que ya estaba firmada no la he tocado: la he guardado en{' '}
          <code>{saved.kept}</code>.
        </Callout>
      ) : null}
      {pdfPath ? <p className="field-help">El PDF está en <code>{pdfPath}</code>.</p> : null}

      {signed ? (
        <Callout intent="info" title="Firmada">
          Ya no lleva la marca de borrador. Lo que sigue faltando es llevarla a Séneca:
          el registro no es este fichero.
        </Callout>
      ) : exists ? (
        <>
          <Field label="Quién la firma" htmlFor="acns-role"
                 help="Una ACNS la coordina el tutor o la tutora, y quién la ha revisado es parte del documento.">
            <input className="input" id="acns-role" type="text" value={role}
                   placeholder="Por ejemplo: la tutora, o el equipo docente"
                   onChange={(e) => setRole(e.target.value)} />
          </Field>
          {/*
            Plain, not primary. `013` FR-1105: one primary control per screen, and this
            page's primary is «Hacer el borrador» in its own action bar. Emphasis
            everywhere is emphasis nowhere — the same correction `023` T024 had to make.
          */}
          <button className="btn" disabled={sign.busy || !role.trim()}
                  aria-busy={sign.busy}
                  onClick={() => void sign.run(learnerCode, role.trim()).then((r) => {
                    if (r) stored.reload();
                  })}>
            Firmarla y quitarle la marca
          </button>
          <p className="field-help">
            Firmar dice que la has leído. No la presenta: eso sigue siendo cosa tuya, en Séneca.
          </p>
        </>
      ) : null}
    </Section>
  );
}

/**
 * Asking about a guide (T023/T024, US3).
 *
 * One loaded document, cited answers, and **the exchange reaches nothing**: no vault
 * write, no adaptation, no profile change. What is kept is what she selects, and
 * until she does, nothing is written (FR-1521, Principle VIII).
 */
export function GuideConversation({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const ask = useAskGuide();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  /*
   * `null` means «no lo sé», not «cero» (2026-09-01).
   *
   * A service whose model has no published price reports no cost, and one unpriced answer
   * makes the conversation's total unknown — a running total that silently skips the turns
   * it could not price is not a running total.
   */
  const [cost, setCost] = useState<number | null>(0);

  const send = async (): Promise<void> => {
    const q = question.trim();
    if (!q) return;
    const r = await ask.run(jobId, q, turns);
    if (!r) return;
    setTurns((prev) => [...prev, { question: q, answer: r.answer }]);
    setCost((c) => (c === null || r.costCents === null ? null : c + r.costCents));
    setQuestion('');
  };

  return (
    <Page
      title="Preguntar sobre este documento"
      lede="Sólo sobre este documento. Si algo no lo dice, te digo que no lo dice."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" disabled={ask.busy || !question.trim()}
                    aria-busy={ask.busy} onClick={() => void send()}>
              Preguntar
            </button>
          }
          note={cost === null
            ? 'No sé lo que llevas gastado: tu servicio de IA no publica su precio aquí.'
            : cost > 0 ? `Llevas ${(cost / 100).toFixed(2)} € en esta conversación.` : undefined}>
          <button className="btn btn-ghost" onClick={onBack}>Volver</button>
        </Actions>
      }>

      {ask.error ? <Callout intent="danger">{ask.error.message}</Callout> : null}

      {turns.map((t, i) => (
        <Section key={i} title={t.question}>
          <div className="material" lang="es">{t.answer}</div>
        </Section>
      ))}

      <Section title={turns.length ? 'Otra pregunta' : 'Tu pregunta'}>
        <Field canvas htmlFor="q"
               help="Nada de esto se guarda solo. Si quieres quedarte con algo, cópialo a tus notas.">
          <textarea className="textarea" id="q" rows={3} value={question}
                    placeholder="¿Qué falta en este documento? ¿Las medidas encajan con lo que tengo apuntado de él?"
                    onChange={(e) => setQuestion(e.target.value)} />
        </Field>
      </Section>
    </Page>
  );
}

/**
 * Helping her write the ACS (T025/T026, US4).
 *
 * **She** states which objectives the team decided to modify. Rampa helps her express
 * them and never proposes the list — and refuses outright where no evaluación
 * psicopedagógica is recorded, without drafting around it.
 *
 * The checkbox is not a formality. An ACS without that report is procedurally void,
 * and a document that *looks* complete invites somebody to file it — so the person
 * harmed by a plausible draft is the child.
 */
export function AcsHelpScreen({ learnerCode, learnerName, onBack }: {
  learnerCode: string;
  learnerName?: string;
  onBack: () => void;
}) {
  const help = useHelpWithAcs();
  const [evaluation, setEvaluation] = useState(false);
  const [decided, setDecided] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const go = async (): Promise<void> => {
    const r = await help.run(learnerCode, evaluation, decided.trim());
    if (!r) return;
    setAnswer(r.answer);
    setDeclined(r.declined);
  };

  return (
    <Page
      title={`Ayuda con la ACS de ${learnerName ?? learnerCode}`}
      lede="Tú traes lo que ha decidido el equipo docente. Yo te ayudo a redactarlo."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary"
                    disabled={help.busy || !evaluation || !decided.trim()}
                    aria-busy={help.busy} onClick={() => void go()}>
              Ayúdame a redactarlo
            </button>
          }
          note={!evaluation
            ? 'Sin evaluación psicopedagógica no puedo seguir.'
            : !decided.trim() ? 'Dime qué ha decidido el equipo.' : undefined}>
          <button className="btn btn-ghost" onClick={onBack}>Volver</button>
        </Actions>
      }>

      {help.error ? <Callout intent="danger">{help.error.message}</Callout> : null}

      <Callout intent="decide" title="Lo que yo no hago aquí">
        <p>
          <strong>No propongo qué objetivos quitar.</strong> Eso lo decide el equipo
          docente con Orientación, a partir de la evaluación psicopedagógica. Si me lo
          pides, te lo voy a decir en una frase y no lo voy a hacer.
        </p>
      </Callout>

      <Section title="La evaluación psicopedagógica">
        <label className="check">
          <input type="checkbox" checked={evaluation}
                 onChange={(e) => setEvaluation(e.target.checked)} />
          <span>Existe evaluación psicopedagógica para este alumno</span>
        </label>
        <p className="field-help">
          Sin ella una ACS es <strong>nula de procedimiento</strong>. No te voy a
          redactar un documento que parezca completo sin eso: quien sale perjudicado
          es él, no el expediente. Yo no guardo el informe ni lo resumo — sólo necesito
          saber que existe.
        </p>
      </Section>

      <Section title="Qué ha decidido el equipo docente">
        <Field canvas htmlFor="decided"
               help="Los objetivos y criterios que se modifican, y por qué se sustituyen. Con tus palabras.">
          <textarea className="textarea" id="decided" rows={8} value={decided}
                    onChange={(e) => setDecided(e.target.value)} />
        </Field>
      </Section>

      {answer ? (
        <Section title={declined ? 'No he hecho eso' : 'Así lo redactaría'}>
          {declined ? (
            <Callout intent="decide">{answer}</Callout>
          ) : (
            <div className="material" lang="es">{answer}</div>
          )}
        </Section>
      ) : null}
    </Page>
  );
}
