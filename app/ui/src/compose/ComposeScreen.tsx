import { useState } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { useMaterialKinds } from '../data/corpus.js';
import { Loaded } from '../data/Loaded.js';
import { DocumentViewer } from '../viewer/DocumentViewer.js';
import { useDocumentHtml, useAnswerKeyHtml, useLevelQuestion } from '../data/jobs.js';
import { useKnownAreas } from '../data/learners.js';
import { useEducationSystems } from '../data/corpus.js';
import { useCorrectComposition } from '../data/compose.js';
import { ScopeQuestion } from '../review/ScopeQuestion.js';
import { Callout } from '../components/Callout.js';
import { Stages, Stream } from '../components/Progress.js';
import { InjectionNotice } from '../components/InjectionNotice.js';
import { useCompose, type ComposeResult } from '../data/compose.js';
import { useJobProgress } from '../data/jobs.js';
import { useOnline } from '../hooks/useOnline.js';

/**
 * Material for something he has to learn (016 T012, `002`).
 *
 * The door's other half, and the one that made `002` worth building: she arrives
 * with «que aprenda a multiplicar con llevadas» and no file, and a file picker
 * cannot help her.
 *
 * ## What this screen asks, and what it does not
 *
 * Objectives, an anchor when one is needed, how many exercises. It does **not**
 * ask for a level: that comes from the education corpus for the learner's year
 * (`002` FR-122), and a field here would be a level a teacher could talk into
 * existence — which is the substitution the requirement forbids.
 *
 * ## The anchor is asked for here, not discovered later
 *
 * `002` refuses to compose content without one. That refusal is right and it is
 * the wrong place to *meet* it: a run that fails after she pressed the button has
 * cost her the wait. So the box appears as soon as an objective looks like content,
 * before she can start.
 */
const STAGES = [
  'Leyendo lo que quieres que aprenda',
  'Preparando los ejercicios',
  'Escribiendo el texto',
  'Guardando',
] as const;

const stageIndex = (s?: string): number => {
  const i = STAGES.findIndex((x) => s?.startsWith(x));
  return i === -1 ? 0 : i;
};

/**
 * Does this line look like content rather than a skill?
 *
 * A **hint**, and it is deliberately generous in one direction: it asks for the
 * anchor whenever it is unsure. `002`'s `readObjective` makes the real decision in
 * the main process, where an unrecognised objective falls to `content` for the same
 * reason — that is the branch that gets human verification.
 *
 * The words are the same ones `objectives.ts` recognises. Duplicated knowingly:
 * the alternative is a round trip per keystroke, and the cost of being wrong here
 * is one visible text box rather than a wrong document.
 */
const SKILL_WORDS =
  /multiplic|tabla[s]? de multiplicar|divi[dis]|repart|\bsum|añad|agreg|\brest|quit|sustra/i;

export const looksLikeContent = (line: string): boolean =>
  line.trim().length > 0 && !SKILL_WORDS.test(line);

export function ComposeScreen({ learners, onComposed, onBack }: {
  /** From the door. This screen never asks again (contracts/door.md). */
  learners: readonly string[];
  onComposed: (jobId: string, result: ComposeResult) => void;
  onBack: () => void;
}) {
  const kinds = useMaterialKinds();
  const [kind, setKind] = useState<string | null>(null);
  const [objectives, setObjectives] = useState('');
  const [anchor, setAnchor] = useState('');
  /**
   * What subject this is for (`032` FR-3003). Optional — a job with no área uses the
   * general CUR, which is a fallback and never a refusal.
   */
  const [subject, setSubject] = useState('');
  /** Her answer to «¿a qué nivel?», when it was worth asking. `she-chose` if given. */
  const [level, setLevel] = useState('');
  const [howMany, setHowMany] = useState<number | null>(null);
  const [sessions, setSessions] = useState(1);
  const [minutes, setMinutes] = useState(45);
  const [progress, setProgress] = useState<{ stage: string; detail?: string } | null>(null);
  const compose = useCompose();
  const online = useOnline();
  const areas = useKnownAreas(learners[0]);
  /*
   * Whether the enrolled course is contradicted by her own note about **this** subject.
   *
   * Recomputed when the área changes, because that is precisely what it depends on:
   * «Lengua» and «Matemáticas» can give different answers for the same child, which is
   * the whole of `032`.
   */
  const question = useLevelQuestion(learners[0], subject.trim() || undefined);
  const asking = question.state === 'ready' && question.value.ask;

  useJobProgress(setProgress);

  /*
   * What this kind asks about quantity, from the corpus (`021` FR-1925).
   *
   * Carlos, an hour after US2 shipped: «si voy a preparar material de estudio, no tiene
   * sentido que me pregunte número de ejercicios». It does not any more — a study text
   * declares `of: none` and this screen asks nothing about counting for it.
   */
  const chosen = kinds.state === 'ready'
    ? (kinds.value as Array<{ id: string; quantity?: { of: string; label?: string;
                                                       help?: string; default?: number } }>)
        .find((k) => k.id === kind)
    : undefined;
  const quantity = chosen?.quantity;
  const countsSomething = quantity !== undefined && quantity.of !== 'none';

  const lines = objectives.split('\n').map((l) => l.trim()).filter(Boolean);
  const contentLines = lines.filter(looksLikeContent);
  const needsAnchor = contentLines.length > 0;
  const missing = kind === null
    ? 'Dime primero qué quieres que prepare.'
    : lines.length === 0
    ? 'Escribe qué quieres que aprenda.'
    : needsAnchor && anchor.trim() === ''
      ? 'Dame algo en lo que apoyar el contenido.'
      : !online
        ? 'Sin conexión. Esto necesita internet.'
        : null;

  const start = async (): Promise<void> => {
    const jobId = `job-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`;
    const result = await compose.run(jobId, {
      /*
       * The **first** learner (FR-1411). Composition is per learner by nature —
       * the level comes from his year — and the others are reached by adapting the
       * same composed sheet, which is `005` doing what it already does.
       */
      learnerCode: learners[0] ?? '',
      // Hers, never defaulted (`021` FR-1907). The handler refuses a request without it.
      kind: kind ?? '',
      objectives: lines,
      // Only for a kind that counts something. A study text says how much it is through
      // her plan instead (FR-1927).
      ...(countsSomething ? { perObjective: howMany ?? quantity?.default ?? 10 } : {}),
      sessions,
      minutesPerSession: minutes,
      ...(anchor.trim() ? { anchor: anchor.trim() } : {}),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      /*
       * Only if she answered. Not answering composes at the enrolled course exactly as
       * before, with the report naming who did not choose — asking is never blocking
       * (`032` FR-3006).
       */
      ...(level ? { targetYear: level } : {}),
    });
    if (result) onComposed(jobId, result);
  };

  if (compose.busy) {
    return (
      <Page title="Preparando el material"
            lede="Propongo los ejercicios y compruebo las cuentas una a una.">
        <Section>
          <Stages stages={[...STAGES]} current={stageIndex(progress?.stage)} />
          {/* Chars rather than a percentage: there is no total to divide by, and
              a bar that sits at 100% while still working is a lie she remembers. */}
          <Stream label={progress?.detail ?? 'Trabajando'}
                  chars={Number(/(\d+) caracteres/.exec(progress?.detail ?? '')?.[1] ?? 0)} />
        </Section>
      </Page>
    );
  }

  return (
    <Page
      title="Hacer material para que aprenda algo"
      lede="Dime qué tiene que aprender. No hace falta que tengas nada."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" onClick={() => void start()}
                    disabled={missing !== null}>
              Preparar el material
            </button>
          }
          note={
            /*
             * What is missing, in words (`013` FR-1105). A primary action that
             * goes grey with no explanation is a dead end she cannot debug.
             */
            missing ?? 'Compruebo las cuentas antes de dártelo.'
          }>
          <button className="btn btn-ghost" onClick={onBack}>Volver</button>
        </Actions>
      }>

      {compose.error ? <Callout intent="danger">{compose.error.message}</Callout> : null}

      {/*
        What kind of material, first and with nothing pre-chosen (`021` T018, FR-1907).
        Read from the corpus, because a list of four in here would be a second copy of
        `material-kinds.md` — and it is the copy that stops being the authority.

        Before `021` the kind was **derived from whatever came out**, so «solo me ha dicho
        de preparar fichas» was literally true: there was no way to ask for anything else,
        and an exam was unreachable.
      */}
      <Section title="¿Qué quieres que prepare?">
        <Loaded from={kinds} busyLabel="Un momento…">
          {(rows) => (
            <fieldset className="fieldset-bare">
              <legend className="sr-only">Qué tipo de material</legend>
              {/*
                `door-choices`, and `door-on` when it is chosen.

                The first version set `aria-pressed` and nothing else — so the state
                changed, the primary control unlocked, and **she saw no difference at
                all**. Carlos: «no me deja seleccionar el que quiero que prepare». It let
                him; it just never said so.

                `aria-pressed` alone is the assistive half. `door-on` is the half a person
                looking at the screen needs — a border, a tint and a tick, which is
                `010` FR-812's rule that a state carried by one channel is a state
                somebody cannot perceive.
              */}
              <div className="door-choices">
                {(rows as Array<{ id: string; label: string; before?: string;
                                  composing?: { before?: string } }>).map((k) => (
                  <button key={k.id}
                          className={kind === k.id ? 'door door-on' : 'door'}
                          aria-pressed={kind === k.id}
                          onClick={() => setKind(k.id)}>
                    <strong>{k.label}</strong>
                    {/*
                      What composing this kind means, from the corpus — «te voy a proponer
                      las preguntas de una prueba con nota… tú validas cada pregunta».
                      Shown before she presses anything, which is `016` FR-1405's rule
                      applied to writing rather than to adapting.
                    */}
                    {k.composing?.before ? <span className="small">{k.composing.before}</span> : null}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </Loaded>
      </Section>

      <Section title="Qué tiene que aprender"
               lede="Una cosa por línea, con tus palabras.">
        <Field
          canvas
          htmlFor="objetivos"
          help="Por ejemplo: «multiplicar con llevadas». Si escribes «los ríos de España», te pediré en qué apoyarlo.">
          <textarea className="input" id="objetivos" rows={4} value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder={'multiplicar con llevadas\nrestar prestando'} />
        </Field>

        {/*
          The quantity question, in the kind's own words — or absent entirely.

          The label and the default come from `material-kinds.md`, so «cuántas preguntas»
          for an exam and nothing at all for a study text are Markdown edits rather than
          branches in here.
        */}
        {countsSomething ? (
          <Field label={quantity?.label ?? 'Cuántos de cada cosa'} htmlFor="cuantos"
                 {...(quantity?.help ? { help: quantity.help } : {})}>
            <input className="input" id="cuantos" type="number" min={1} max={40}
                   style={{ maxWidth: '8rem' }}
                   value={howMany ?? quantity?.default ?? 10}
                   onChange={(e) => setHowMany(Number(e.target.value) || 1)} />
          </Field>
        ) : null}

        {/*
          Which subject, and only then whether the course on record still holds
          (`032` FR-3003).

          Optional, and placed after the objectives rather than before: she came to
          prepare material about something, and asking «¿de qué asignatura?» before
          «¿qué tiene que aprender?» puts a filing question in front of the work. A job
          with no área uses the general CUR — fallback, never a refusal.
        */}
        <Field label="¿De qué asignatura es?" htmlFor="asignatura"
               help="Opcional. Si la dices, uso su nivel curricular de esa área en vez del general.">
          <input className="input" id="asignatura"
                 style={{ maxWidth: '22em' }} value={subject}
                 onChange={(e) => { setSubject(e.target.value); setLevel(''); }} />
          {/*
            Buttons, never a `<datalist>`: typing one real key into a datalist-linked
            input killed the renderer, and every test that used `fill()` missed it
            because `fill()` sets a value without pressing a key. See the longer note in
            `AxisEditor.tsx`.

            Suggestions are plain text: a sheet's `subject` was read out of a document
            somebody else wrote (Principio IX).
          */}
          {(areas.state === 'ready' ? areas.value : []).length ? (
            <div className="row gap2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="small muted">Las que ya usas:</span>
              {(areas.state === 'ready' ? areas.value : []).map((a) => (
                <button type="button" className="btn btn-sm" key={a}
                        aria-pressed={subject === a}
                        onClick={() => { setSubject(a); setLevel(''); }}>
                  {a}
                </button>
              ))}
            </div>
          ) : null}
        </Field>

        {asking ? <LevelAnswer because={question.state === 'ready' ? question.value.because : null}
                               value={level} onChange={setLevel} /> : null}

        {/*
          Her plan, for every kind (FR-1926).

          Two numbers rather than one, which was Carlos's correction: «ambas cosas,
          sesiones y minutos por sesión». Both are facts she holds with certainty — they
          are her timetable — and for a study text they are how she says how much she
          wants. For an exam they are its duration, set by her rather than by Rampa.

          What Rampa does with them is an estimate and the report says so: how long this
          particular child takes over a page is the one number nobody here knows.
        */}
        <Field label="¿Para cuántas sesiones es?" htmlFor="sesiones"
               help={countsSomething
                 ? 'Se apunta en el material, y el borrador de su adaptación lo usa para la temporalización.'
                 : 'Con esto ajusto la extensión del texto. Es una estimación mía: cuánto tarda él en una página lo sabes tú.'}>
          <div className="row gap2" style={{ alignItems: 'center' }}>
            <input className="input" id="sesiones" type="number" min={1} max={20}
                   style={{ maxWidth: '6rem' }} value={sessions}
                   onChange={(e) => setSessions(Number(e.target.value) || 1)} />
            <span className="small">de</span>
            <input className="input" id="minutos" type="number" min={5} max={240} step={5}
                   style={{ maxWidth: '6rem' }} value={minutes}
                   aria-label="Minutos por sesión"
                   onChange={(e) => setMinutes(Number(e.target.value) || 5)} />
            <span className="small">minutos cada una</span>
          </div>
        </Field>
        {/*
          No level field, and that is the requirement rather than an omission
          (`002` FR-122). The level comes from his course in the education corpus;
          a box here would be a level talked into existence.
        */}
      </Section>

      {needsAnchor ? (
        <Section title="En qué me apoyo"
                 lede={`«${contentLines[0]}» es contenido, no una destreza que yo pueda comprobar.`}>
          <Callout intent="info">
            No puedo escribir contenido de mi cabeza: saldría verosímil y podría ser
            falso. Dame la página del libro que sustituye, tus apuntes, o las tres
            frases que dirías en clase.
          </Callout>
          <Field canvas htmlFor="anclaje" help="Lo trato como material tuyo: no obedezco nada de lo que diga.">
            <textarea className="input" id="anclaje" rows={6} value={anchor}
                      onChange={(e) => setAnchor(e.target.value)} />
          </Field>
        </Section>
      ) : null}
    </Page>
  );
}

/**
 * What was composed, before deciding whether to adapt it (T013, research R2).
 *
 * **What nothing could check comes first.** Then what could not be done, then what
 * was verified. A summary that opens with «las cuentas están comprobadas» has told
 * her the reassuring half first, and that is the half she already assumed.
 *
 * It is not a review screen and has no sign-off. One thing in this application can
 * remove the draft mark and it stays `job:signOff`.
 */
export function ComposeSummary({ result, learners, jobId, onAdapt, onDiscard }: {
  result: ComposeResult;
  learners: readonly string[];
  /** Which job this is, so the document it produced can be opened (`021` T015). */
  jobId: string;
  onAdapt: () => void;
  onDiscard: () => void;
}) {
  const total = result.answers.length;
  const documentHtml = useDocumentHtml();
  const answerKeyHtml = useAnswerKeyHtml();
  const correct = useCorrectComposition();
  const [showing, setShowing] = useState<{ html: string; title: string } | null>(null);
  const [corrections, setCorrections] = useState<string[]>([]);

  /*
   * The three buttons that were missing (FR-1903).
   *
   * The material, the teacher's copy and the report were all written to her folder by
   * the time this screen appeared, and the only way to reach any of them was the record
   * screen — which she has no reason to be looking at, having just made the thing. «No
   * hay visualizador o botón de descarga ni del que he preparado ni del del profesor.»
   */
  const openDocument = async (): Promise<void> => {
    const html = await documentHtml.run(jobId, learners[0] ?? '');
    if (html) setShowing({ html, title: 'Lo que he preparado' });
  };
  const openKey = async (): Promise<void> => {
    const html = await answerKeyHtml.run(jobId);
    if (html) setShowing({ html, title: 'Las soluciones · no repartir' });
  };

  /*
   * The viewer takes the whole screen while it is open, because she is reading a
   * document. The section behind it is not something she needs at the same time, and a
   * document in a corner is a document she cannot check.
   */
  if (showing) {
    return (
      <DocumentViewer html={showing.html} title={showing.title}
                      onClose={() => setShowing(null)} />
    );
  }

  return (
    <Page
      title="Esto es lo que he podido hacer"
      lede="Míralo antes de que lo prepare para él. Todavía no has gastado nada más."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" onClick={onAdapt}>
              {learners.length > 1
                ? `Prepararlo para los ${learners.length} alumnos`
                : 'Prepararlo para él'}
            </button>
          }
          note={`${total} ${total === 1 ? 'ejercicio' : 'ejercicios'} con las cuentas comprobadas.`}>
          <button className="btn btn-ghost" onClick={onDiscard}>Descartar y volver</button>
        </Actions>
      }>

      {/*
        What she just made, reachable from where she is standing (`021` T015, FR-1903).
        Before this the three documents existed in her folder and the only route to any
        of them was the record screen — which she has no reason to open, having just made
        the thing.
      */}
      <Section title="Míralo" lede="Está en tu carpeta, y lo puedes ver aquí mismo.">
        <div className="row gap2" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => void openDocument()}>
            Ver lo que he preparado
          </button>
          {/* Only when there is one: no exercise anything could check, no key. */}
          {total > 0 ? (
            <button className="btn" onClick={() => void openKey()}>
              Ver las soluciones
            </button>
          ) : null}
        </div>
        {documentHtml.error ?? answerKeyHtml.error ? (
          <p className="small">{(documentHtml.error ?? answerKeyHtml.error)!.message}</p>
        ) : null}
      </Section>

      {/*
        Correcting it, without adapting anything (`021` T028, FR-1916).
        
        The same box and the same scope question she gets after an adaptation — she is
        answering «a quién se aplica esto» about her own practice either way, and nothing
        infers it (Principle VIII). What is different underneath: this **composes again**
        and regenerates the verified answer key with it, because a key describing
        exercises that no longer exist is worse than no key.
      */}
      <Section title="¿Hay algo que cambiar?"
               lede="Te lo vuelvo a preparar con lo que me digas. Las soluciones se rehacen y las vuelvo a comprobar.">
        <ScopeQuestion
          learner={learners[0] ?? ''}
          onCaptured={(c) => setCorrections((prev) => [...prev, c.text])} />
        {corrections.length ? (
          <div className="row gap2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={correct.busy}
                    onClick={() => void correct.run(jobId, corrections)}>
              {correct.busy ? 'Rehaciéndolo…' : 'Prepararlo otra vez con esto'}
            </button>
            <span className="small">
              {corrections.length === 1 ? 'Un cambio' : `${corrections.length} cambios`} anotados.
            </span>
          </div>
        ) : null}
        {correct.error ? <p className="small">{correct.error.message}</p> : null}
      </Section>

      {/* First, and unsoftened (`002` FR-125 / T021). */}
      <Section title="Esto es un borrador para que lo revises tú">
        <ul className="bullets">
          {result.reportData.unchecked.map((u, i) => <li key={i}>{u}</li>)}
        </ul>
      </Section>

      {result.reportData.shortfalls.length ? (
        <Section title="Lo que no he podido hacer">
          <ul className="bullets">
            {result.reportData.shortfalls.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Section>
      ) : null}

      {result.needsAnchor.length ? (
        <Callout intent="decide">
          Esto se ha quedado fuera porque necesita algo en lo que apoyarse:{' '}
          {result.needsAnchor.join('; ')}.
        </Callout>
      ) : null}

      {result.cutObjectives.length ? (
        <Callout intent="decide">
          He hecho los primeros y he dejado fuera {result.cutObjectives.length}:{' '}
          {result.cutObjectives.join('; ')}. Pídelos en otro material.
        </Callout>
      ) : null}

      {/*
        Her own anchor, read as data (Principle IX, `002` T018). Through the same
        component the adaptation path uses, so «texto que parece dar órdenes» reads
        identically wherever she meets it.
      */}
      <InjectionNotice notices={result.anchorNotices.map(({ passage, notice }) => ({
        block: passage, quote: notice.quote, message: notice.message,
      }))} />

      {result.reportData.checked.length ? (
        <Section title="Lo que sí he comprobado">
          <ul className="bullets">
            {result.reportData.checked.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Section>
      ) : null}

      <Section title="Las soluciones"
               lede="Están en un documento aparte, para ti. No salen en su hoja.">
        <p className="small">{result.answersPath}</p>
      </Section>
    </Page>
  );
}

/**
 * «Tú misma tienes apuntado que en Matemáticas trabaja contenidos de cursos anteriores»
 * (032 FR-3003, T010).
 *
 * ## An offer, never a gate
 *
 * There is no «continue» button here and no way for this to block: leaving the select
 * empty composes at the enrolled course exactly as it always did, with the report naming
 * that nobody chose the level. Most learners in an aula de apoyo are one or two courses
 * behind — a mandatory stop keyed on that would refuse the ordinary case, which is P12's
 * condemned profile-keyed refusal reborn at finer grain (FR-3006).
 *
 * ## Why it shows a course list rather than deriving one
 *
 * CUR 2 is «contenidos de cursos anteriores» — how many, nobody wrote down. Turning that
 * into `enrolled − 2` would put an invented number on a child's worksheet, and it is
 * precisely the kind of number a teacher cannot check at a glance and has no reason to
 * suspect. She is the only person who can name it, so she names it, and her answer
 * arrives as `she-chose`: P32 intact, FR-129 intact.
 */
function LevelAnswer({ because, value, onChange }: {
  because: string | null;
  value: string;
  onChange: (yearId: string) => void;
}) {
  const loaded = useEducationSystems();
  if (loaded.state !== 'ready') return null;
  const systems = loaded.value as Array<{
    id: string; stages: Array<{ label: string; years: Array<{ id: string; label: string }> }>;
  }>;
  const system = systems[0];
  if (!system) return null;
  const years = system.stages.flatMap((st) => st.years.map((y) => ({ stage: st.label, ...y })));

  return (
    <Field label="¿A qué nivel lo preparo?" htmlFor="nivel"
           help="Si lo dejas en blanco lo preparo para su curso, y el informe dirá que nadie eligió el nivel.">
      {/* Her own recorded observation, said back to her. The sentence comes from the same
          `explainTarget` the report prints, so the screen and the file cannot disagree. */}
      {because ? <p className="small">{because}</p> : null}
      <select className="select" id="nivel" value={value}
              style={{ maxWidth: '22em' }}
              onChange={(e) => onChange(e.target.value)}>
        <option value="">Su curso (nadie lo elige)</option>
        {years.map((y) => (
          <option key={y.id} value={y.id}>{y.label} · {y.stage}</option>
        ))}
      </select>
    </Field>
  );
}
