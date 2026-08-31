import { useState } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
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
  const [objectives, setObjectives] = useState('');
  const [anchor, setAnchor] = useState('');
  const [howMany, setHowMany] = useState(10);
  const [progress, setProgress] = useState<{ stage: string; detail?: string } | null>(null);
  const compose = useCompose();
  const online = useOnline();

  useJobProgress(setProgress);

  const lines = objectives.split('\n').map((l) => l.trim()).filter(Boolean);
  const contentLines = lines.filter(looksLikeContent);
  const needsAnchor = contentLines.length > 0;
  const missing = lines.length === 0
    ? 'Escribe primero qué quieres que aprenda.'
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
      objectives: lines,
      perObjective: howMany,
      ...(anchor.trim() ? { anchor: anchor.trim() } : {}),
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

        <Field label="Cuántos ejercicios de cada cosa" htmlFor="cuantos">
          <input className="input" id="cuantos" type="number" min={1} max={40}
                 style={{ maxWidth: '8rem' }}
                 value={howMany}
                 onChange={(e) => setHowMany(Number(e.target.value) || 1)} />
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
export function ComposeSummary({ result, learners, onAdapt, onDiscard }: {
  result: ComposeResult;
  learners: readonly string[];
  onAdapt: () => void;
  onDiscard: () => void;
}) {
  const total = result.answers.length;

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
