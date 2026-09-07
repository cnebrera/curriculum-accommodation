import { ChooseKind, WhoElse, StepStrip } from './PrepareSteps.js';
import { Page, Section, Actions } from '../shell/Page.js';
import { IngestScreen } from '../ingest/IngestScreen.js';
import { VerifyScreen } from '../ingest/VerifyScreen.js';
import { AdaptScreen } from '../adapt/AdaptScreen.js';
import { ComposeScreen, ComposeSummary } from '../compose/ComposeScreen.js';
import type { ComposeResult } from '../data/compose.js';
import type { Flow, RouteAction } from '../nav/route.js';

/**
 * Un paso a la vez, dentro del alumno (020 US2, FR-1809…1816).
 *
 * ## Lo que hace y lo que no
 *
 * Enruta. Las pantallas largas —traer el material, comprobar la lectura, componer,
 * adaptar, revisar— son las que ya existían y **no cambian**: `020` mueve cosas de
 * sitio; `001`, `002`, `008` y `012` siguen siendo dueñas de lo que hacen. Un diff a
 * este fichero que toque cómo se adapta algo está especificando lo que le toca a otra.
 *
 * ## Por qué el estado no está aquí
 *
 * Está en la ruta. Los dos defectos de navegación de este proyecto eran estado sostenido
 * en una pantalla que navegar destruye: la puerta olvidaba de qué niño era al pulsar
 * «Volver», y «Mis alumnos» no hacía nada desde dentro de un perfil. Aquí el paso, el
 * trabajo, el tipo de material y para quién más viven en el reductor, así que salirse y
 * volver a entrar por el raíl no pierde nada.
 *
 * ## Y el resumen de la composición, que sigue siendo la excepción
 *
 * `composed` es un `useState` de `App.tsx`: es el resultado de una llamada que ya se ha
 * pagado, y meterlo en la ruta lo haría serializable — un objeto grande en algo que
 * mañana alguien querrá persistir para «devuélveme donde estaba». Se pasa por aquí tal
 * cual, señalado, en vez de mudarse a medias.
 */
export function PrepareFlow({
  code, flow, also, job, go, composed, setComposed,
}: {
  code: string;
  /*
   * No `name` prop, and `props-are-read.test.ts` es lo que lo quitó: lo declaré por
   * simetría con las demás pantallas del alumno y no lo lee nadie, porque cada paso pone
   * su propio título. Un prop declarado, tipado y leído por nadie es el defecto insignia
   * de este repositorio, cazado al crearse otra vez.
   */
  flow: Flow;
  also: readonly string[];
  job?: string;
  go: (a: RouteAction) => void;
  /**
   * El resultado de una composición ya pagada, tal cual (`002`).
   *
   * Tipado de verdad y no `unknown`: lo escribí como `unknown` para no importar el tipo
   * y el compilador lo rechazó en el llamante — con razón. Un `unknown` aquí sería un
   * `as never` en el consumidor, que es una aserción de tipo puesta para que compile en
   * vez de para decir algo.
   */
  composed: { jobId: string; result: ComposeResult } | null;
  setComposed: (v: { jobId: string; result: ComposeResult } | null) => void;
}) {
  const step = (s: Flow['step']) => go({ type: 'flow/step', step: s });
  const leave = () => go({ type: 'flow/leave' });

  if (flow.of === 'adapt') {
    if (flow.step === 'kind') {
      return <ChooseKind flow={flow} go={go} onNext={() => step('bring')} />;
    }
    if (flow.step === 'bring') {
      return (
        <Framed flow={flow} onLeave={leave}>
          <IngestScreen
            forLearner={code}
            onIngested={(r) => { go({ type: 'flow/job', job: r.jobId }); step('verify'); }}
            onResume={(jobId) => { go({ type: 'flow/job', job: jobId }); step('verify'); }}
            /*
             * Pegar texto se salta el paso 3 y **eso es lo correcto**: comprobar la
             * lectura (`008` FR-608) es comprobar lo que se leyó de una foto, y no hay
             * nada que comprobar de un texto que ella misma tiene delante. Lo que no se
             * salta es el paso 4: sin él, pegar texto perdería el lote entero.
             */
            onAlreadyText={() => step('whoElse')} />
        </Framed>
      );
    }
    if (flow.step === 'verify') {
      return job ? (
        <Framed flow={flow} onLeave={leave}>
          <VerifyScreen jobId={job} onVerified={() => step('whoElse')} />
        </Framed>
      ) : <Lost onLeave={leave} />;
    }
    if (flow.step === 'whoElse') {
      return (
        <WhoElse code={code} flow={flow} also={also} go={go}
                 onNext={() => step('review')} />
      );
    }
    /*
     * Paso 5. `AdaptScreen` ya sabía hacer un lote y revisar hoja por hoja — lo que
     * recibe de aquí es lo que ella ya contestó, así que no vuelve a preguntar nada
     * (FR-1816).
     */
    return (
      <Framed flow={flow} onLeave={leave}>
        <AdaptScreen
          onReview={(jobId, learner, recipes) => go({
            type: 'legacy', view: 'review', job: jobId,
            sheet: { learner, recipes },
            back: { of: 'learner', code, tab: 'prepare' },
          })}
          onChooseFile={() => step('bring')}
          onFinished={leave}
          {...(job ? { presetJobId: job } : {})}
          presetLearners={[...also]}
          {...(flow.kind ? { presetKind: flow.kind } : {})} />
      </Framed>
    );
  }

  if (flow.step === 'ask') {
    return (
      <Framed flow={flow} onLeave={leave}>
        <ComposeScreen
          learners={[...also]}
          onComposed={(jobId, result) => {
            setComposed({ jobId, result });
            go({ type: 'flow/job', job: jobId });
            step('summary');
          }}
          onBack={leave} />
      </Framed>
    );
  }

  if (flow.step === 'summary') {
    return composed ? (
      <Framed flow={flow} onLeave={leave}>
        <ComposeSummary
          result={composed.result}
          jobId={composed.jobId}
          learners={[...also]}
          onAdapt={() => { setComposed(null); step('whoElse'); }}
          onDiscard={() => { setComposed(null); leave(); }} />
      </Framed>
    ) : <Lost onLeave={leave} />;
  }

  if (flow.step === 'whoElse') {
    return <WhoElse code={code} flow={flow} also={also} go={go} onNext={() => step('review')} />;
  }

  return (
    <Framed flow={flow} onLeave={leave}>
      <AdaptScreen
        onReview={(jobId, learner, recipes) => go({
          type: 'legacy', view: 'review', job: jobId,
          sheet: { learner, recipes },
          back: { of: 'learner', code, tab: 'prepare' },
        })}
        onChooseFile={() => step('ask')}
        onFinished={leave}
        {...(job ? { presetJobId: job } : {})}
        presetLearners={[...also]} />
    </Framed>
  );
}

/**
 * La tira de pasos y la salida, alrededor de una pantalla que no las conoce.
 *
 * Envuelve en vez de editar cada pantalla, y eso es deliberado: `IngestScreen` y
 * `AdaptScreen` funcionan igual dentro de un flujo y fuera de él, y darles un prop
 * «estoy en el paso 3 de 5» sería meterles la navegación dentro.
 */
function Framed({ flow, onLeave, children }: {
  flow: Flow;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="stack gap4">
      <div className="row gap2" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <StepStrip flow={flow} />
        {/*
          Irse siempre se puede (FR-1808), y lo que ya se haya gastado lo dice la propia
          pantalla del coste — no este control, que no lo sabe.
        */}
        <button className="btn btn-sm btn-ghost" onClick={onLeave}>Dejarlo por ahora</button>
      </div>
      {children}
    </div>
  );
}

/**
 * Un paso que necesita un trabajo y no lo tiene.
 *
 * Pasa si vuelve a entrar por el raíl a un flujo cuyo `job` se quedó atrás. Se dice y se
 * sale, en vez de renderizar una pantalla a medias — que es lo que hacía la puerta
 * cuando olvidaba de quién era.
 */
function Lost({ onLeave }: { onLeave: () => void }) {
  return (
    <Page title="Se me ha perdido el hilo"
          lede="Este paso necesita el material que trajiste y no lo tengo a mano.">
      <Section>
        <Actions primary={
          <button className="btn btn-primary" onClick={onLeave}>Empezar otra vez</button>
        } />
      </Section>
    </Page>
  );
}
