import { Page, Section, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import { useMaterialKinds } from '../data/corpus.js';
import { useLearners } from '../data/learners.js';
import { whatIsMissing, type Flow, type RouteAction } from '../nav/route.js';

/**
 * Los cinco pasos, dentro del alumno (020 US2, FR-1812…1816).
 *
 * ## Qué reemplaza, y por qué no es una mudanza
 *
 * `016` puso una puerta delante de todo que preguntaba «¿qué vas a hacer?» y «¿para
 * quién?». Elegías a Lucía en la puerta y **no estabas dentro de Lucía en ningún
 * sentido**: la puerta y «Mis alumnos» empezaban las dos por el alumno y ninguna llevaba
 * a la otra.
 *
 * Aquí ya se sabe de quién es —se ha entrado por él— así que el paso 1 es la pregunta que
 * quedaba: qué necesitas. Y el que entró **está en el lote**, no al lado: `016` FR-1411
 * dice que el primero es el primero y nunca el único, y eso lo garantiza `withSelf` en el
 * reductor y no un control de esta pantalla.
 *
 * ## Por qué los pasos están en la ruta y no aquí
 *
 * Los dos defectos de navegación que este proyecto ha encontrado eran los dos estado
 * sostenido en el sitio equivocado: la puerta olvidaba qué niño era al pulsar «Volver»
 * porque la pantalla se desmontaba, y «Mis alumnos» no hacía nada desde dentro de un
 * perfil. Lo que tiene que sobrevivir a navegar no puede vivir en algo que navegar
 * destruye.
 *
 * ## Y el menú del alumno no desaparece
 *
 * Los pasos se dibujan **dentro** de su sección, con el raíl del alumno a la vista y el
 * paso actual marcado. Un flujo que se lleva la navegación por delante es un flujo del
 * que sólo se sale acabándolo o perdiendo lo hecho, y una maestra con clase en diez
 * minutos tiene que poder irse (FR-1808).
 */

/** Las dos ramas, como iguales. Ninguna preseleccionada (FR-1812). */
const BRANCHES: Array<{ of: 'adapt' | 'compose'; title: string; when: string }> = [
  {
    of: 'adapt',
    title: 'Adaptar algo que tengo',
    when: 'Una ficha, un examen, unos apuntes, una hoja de problemas. Da igual si es'
      + ' una foto, un PDF o texto pegado.',
  },
  {
    of: 'compose',
    title: 'Hacer material para que aprenda algo',
    when: 'No tienes nada y sabes qué le hace falta: «multiplicar con llevadas»,'
      + ' «los ríos de España».',
  },
];

/** Los pasos que se le enseñan, para que sepa dónde está y cuánto queda. */
const STEPS: Record<Flow['of'], Array<{ step: string; label: string }>> = {
  adapt: [
    { step: 'kind', label: '¿Qué es?' },
    { step: 'bring', label: 'Tráelo' },
    { step: 'verify', label: 'Comprueba la lectura' },
    { step: 'whoElse', label: '¿Para quién más?' },
    { step: 'review', label: 'Revisar y firmar' },
  ],
  compose: [
    { step: 'ask', label: '¿Qué tiene que aprender?' },
    { step: 'summary', label: 'Míralo antes de pagar' },
    { step: 'whoElse', label: '¿Para quién más?' },
    { step: 'review', label: 'Revisar y firmar' },
  ],
};

/**
 * Paso 1: qué necesitas. Y nada más, porque de quién es ya se sabe.
 */
export function ChooseBranch({ code, name, onStart }: {
  code: string;
  name?: string;
  onStart: (of: 'adapt' | 'compose') => void;
}) {
  void code;
  return (
    <Page
      title={`Prepararle algo a ${name ?? 'este alumno'}`}
      lede="Adaptar algo que ya tienes, o hacer material desde cero para lo que le hace
            falta. Las dos cosas acaban en una hoja suya.">
      <Section title="¿Qué necesitas?">
        {/*
          Ninguna preseleccionada (FR-1812). Una por defecto sería nuestra idea de lo
          que suele hacer, presentada como la suya — y la rama equivocada no se nota
          hasta tres pasos después.
        */}
        <div className="door-choices">
          {BRANCHES.map((b) => (
            <button key={b.of} className="door" onClick={() => onStart(b.of)}>
              <strong>{b.title}</strong>
              <span className="small">{b.when}</span>
            </button>
          ))}
        </div>
      </Section>
    </Page>
  );
}

/**
 * La tira de pasos, con el actual marcado.
 *
 * `010` FR-812: el paso actual no se señala sólo con color — lleva `aria-current` y el
 * número delante, así que se sabe dónde está sin distinguir el relleno.
 */
export function StepStrip({ flow }: { flow: Flow }) {
  const steps = STEPS[flow.of];
  const at = steps.findIndex((s) => s.step === flow.step);
  return (
    <ol className="row gap2 small" style={{ flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
      {steps.map((s, i) => (
        <li key={s.step} {...(i === at ? { 'aria-current': 'step' as const } : {})}>
          {i === at ? <strong>{i + 1}. {s.label}</strong> : <span className="muted">{i + 1}. {s.label}</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Paso 2 de adaptar: qué es este material (FR-1813).
 *
 * **Nunca preseleccionado.** Un «ficha» por defecto es cómo un examen se adapta como
 * ficha, en silencio, con la regla dura sobre no tocar el criterio sin nada que le diga
 * a qué documento gobernaba. Y la lista sale de `instructions/material-kinds.md`: un
 * tipo nuevo aparece aquí sin que este fichero cambie.
 */
export function ChooseKind({ flow, go, onNext }: {
  flow: Flow & { of: 'adapt' };
  go: (a: RouteAction) => void;
  onNext: () => void;
}) {
  const kinds = useMaterialKinds();
  const chosen = flow.kind;

  return (
    <Page
      title="¿Qué es este material?"
      lede="Cambia lo que puedo tocar y lo que no."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" disabled={chosen === undefined}
                    onClick={onNext}>
              Seguir
            </button>
          }
          /*
           * Lo que falta, en sus palabras, en vez de un botón gris sin explicación
           * (`013` FR-1105). Y para un examen, lo que está a punto de comprometerse
           * (FR-1405) — en esta fila y no en un aviso arriba, porque un aviso arriba se
           * lee una vez y luego es mobiliario.
           */
          note={chosen === undefined ? 'Dime qué es este material.' : <Constraint kind={chosen} />}>
          <button className="btn btn-ghost" onClick={() => go({ type: 'flow/leave' })}>
            Dejarlo
          </button>
        </Actions>
      }>
      <StepStrip flow={flow} />
      <Section>
        <Loaded from={kinds} busyLabel="Leyendo los tipos de material">
          {(all) => (
            <div className="door-choices">
              {all.map((k) => (
                <button key={k.id} className={chosen === k.id ? 'door door-on' : 'door'}
                        aria-pressed={chosen === k.id}
                        onClick={() => go({ type: 'flow/kind', kind: k.id })}>
                  <strong>{k.label}</strong>
                  {k.before ? <span className="small">{k.before}</span> : null}
                </button>
              ))}
            </div>
          )}
        </Loaded>
      </Section>
    </Page>
  );
}

/**
 * Paso 4: ¿para quién más? (FR-1814, FR-1816.)
 *
 * El que entró **ya está**, y no se le vuelve a preguntar ni qué trabajo es ni qué
 * material. Ése es el paso que salva el Principio IV sin una segunda entrada global:
 * añadir a los demás es un paso del flujo y no una reparación.
 *
 * Y va **después** de comprobar la lectura, no antes: `005` FR-514 quiere el coste del
 * lote como una cifra antes de la tirada, así que el número de hojas tiene que saberse
 * justo antes de adaptar — preguntarlo antes pondría precio a una tirada que puede no
 * ocurrir.
 */
export function WhoElse({ code, flow, also, go, onNext }: {
  code: string;
  flow: Flow;
  also: readonly string[];
  go: (a: RouteAction) => void;
  onNext: () => void;
}) {
  const learners = useLearners();
  /*
   * `useLearners` already resolves the names for display, so there is no second lookup
   * here. The codes are what travel; the names are what she reads — `003`'s boundary,
   * and the reason a name never appears in the route.
   */
  const chosen = new Set(also.length ? also : [code]);
  const nameOf = (row: { code: string; name: string }) => row.name || row.code;

  return (
    <Page
      title="¿Para quién más?"
      lede="El mismo material, preparado para cada uno. Se lee una vez y se adapta tantas
            veces como alumnos haya."
      actions={
        <Actions
          primary={<button className="btn btn-primary" onClick={onNext}>Seguir</button>}
          note={chosen.size === 1
            ? 'Sólo para el alumno por el que entraste.'
            : `${chosen.size} alumnos, ${chosen.size} hojas. Una firma por hoja.`}>
          <button className="btn btn-ghost" onClick={() => go({ type: 'flow/leave' })}>
            Dejarlo
          </button>
        </Actions>
      }>
      <StepStrip flow={flow} />
      <Section>
        <Loaded from={learners}>
          {(all) => (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {all.map((row) => (
                <li key={row.code}>
                  <label className="check">
                    <input type="checkbox" checked={chosen.has(row.code)}
                           /*
                            * El que entró no se puede quitar aquí: se entró por él, y una
                            * casilla que lo saca del lote es una casilla que deja un
                            * flujo sin dueño a mitad. Para no prepararle nada, se sale.
                            */
                           disabled={row.code === code}
                           onChange={(e) => {
                             const next = new Set(chosen);
                             if (e.target.checked) next.add(row.code);
                             else next.delete(row.code);
                             go({ type: 'flow/also', codes: [...next] });
                           }} />
                    <span>
                      {nameOf(row)} <code className="small">{row.code}</code>
                      {row.code === code
                        ? <span className="small muted"> · por el que entraste</span>
                        : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </Section>
    </Page>
  );
}

/**
 * Lo que está a punto de comprometerse, para un tipo que nos ata (FR-1405).
 *
 * Las palabras salen del `before:` del corpus, así que un tipo añadido después tiene su
 * frase sin que este fichero cambie. Un tipo que no tiene nada que decir no dice nada:
 * una promesa inventada sobre lo que no se va a tocar es peor que ninguna.
 */
function Constraint({ kind }: { kind: string }) {
  const kinds = useMaterialKinds();
  if (kinds.state !== 'ready') return null;
  const found = kinds.value.find((k) => k.id === kind);
  return <>{found?.before ?? 'Lo prepararé para cada uno.'}</>;
}

/** Lo que falta, para la pantalla que quiera decirlo. */
export { whatIsMissing };
