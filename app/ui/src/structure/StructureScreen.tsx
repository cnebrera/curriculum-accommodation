import { useState } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { useSaveStructure, type StructureKind } from '../data/structure.js';
import { useCurrentSet } from '../data/pictograms.js';

/**
 * The day on a strip, and a routine in steps (028 T011/T013/T014, FR-2601/2606/2612/2613).
 *
 * ## Why this is not a third option inside «Preparar»
 *
 * Adapting starts from a document she has. Composing starts from an objective. An agenda
 * starts from neither — it starts from the shape of a day, which she already knows.
 * Routed through either existing door it would have to answer «¿qué tipo de material?»
 * and «¿qué tiene que aprender?» before reaching the one question that matters, and a
 * flow that asks the wrong questions first is a flow she concludes is not for what she
 * wants.
 *
 * ## One box, one line each
 *
 * Deliberately not a drag-and-drop board. The moments of a morning are a list she can
 * type in twenty seconds, and the ordering she wants is the one she typed — the builder
 * never sorts, dedupes or completes it. Five minutes from opening the learner to a
 * printed strip is the feature's own success criterion, and every control that is not a
 * text box is time spent away from that.
 */
const KINDS: Array<{ id: StructureKind; label: string; lede: string; placeholder: string }> = [
  {
    id: 'agenda',
    label: 'La agenda de un día',
    lede: 'Los momentos, en el orden en que pasan. Una tira que se pega a la mesa o a la pared.',
    placeholder: 'asamblea\ndesayuno\npatio\nmatemáticas\ncomedor\ncasa',
  },
  {
    id: 'secuencia',
    label: 'Los pasos de una rutina',
    lede: 'Una cosa por paso, numerada. Lavarse las manos, ponerse el abrigo, entrar en clase.',
    placeholder: 'abrir el grifo\njabón\nfrotar\naclarar\nsecar',
  },
];

export function StructureScreen({ learnerCode, learnerName, onMade }: {
  learnerCode: string;
  learnerName?: string;
  /** Where a finished document goes: the record, so she can print it. */
  onMade: (jobId: string) => void;
}) {
  const [kind, setKind] = useState<StructureKind>('agenda');
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState('');
  const save = useSaveStructure();
  const set = useCurrentSet();
  const [result, setResult] = useState<{ gaps: string[] } | null>(null);

  const chosen = KINDS.find((k) => k.id === kind)!;
  const items = lines.split('\n').map((l) => l.trim()).filter(Boolean);

  const make = async (): Promise<void> => {
    const created = new Date().toISOString().slice(0, 10);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
    const made = await save.run({
      jobId: `job-${stamp}`,
      learnerCode,
      kind,
      ...(title.trim() ? { title: title.trim() } : {}),
      items: items.map((word) => ({ word })),
      created,
    });
    if (!made) return;
    /*
     * The words with no drawing, named. Not an error and not a blocker: the strip prints
     * with the word where the picture would be, which is what «declared gap» means — and
     * most words in most days have no pictogram, so treating it as a fault would make the
     * ordinary case look broken.
     */
    setResult({ gaps: made.gaps.map((g) => g.word) });
    onMade(made.jobId);
  };

  const noSet = set.state === 'ready' && set.value === null;

  return (
    <Page
      title={`El día y las rutinas de ${learnerName ?? learnerCode}`}
      lede="Una agenda o una secuencia de pasos, con sus dibujos. La hago aquí mismo: no cuesta dinero y no hace falta internet."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" disabled={save.busy || items.length === 0}
                    aria-busy={save.busy}
                    onClick={() => void make()}>
              {save.busy ? 'Haciéndola…' : 'Hacerla'}
            </button>
          }
          note={items.length === 0 ? 'Escribe al menos un momento.' : undefined} />
      }>

      {save.error ? <Callout intent="danger">{save.error.message}</Callout> : null}

      {/*
        The missing set, once and with one way to fix it (`025` FR-2303's pattern,
        FR-2612). The door still works: she can write the whole day and get a strip of
        words, which is a real material — the drawings are what is missing, not the page.
      */}
      {noSet ? (
        <Callout intent="info" title="Todavía no tienes dibujos">
          <p>
            Puedo hacerte la tira igual, con las palabras. Para que lleve pictogramas
            necesito un juego: está en <strong>Configuración ▸ Pictogramas</strong>.
          </p>
        </Callout>
      ) : null}

      <Section title="¿Qué le hago?">
        <fieldset className="fieldset-bare">
          <legend className="sr-only">Qué tipo de material de estructura</legend>
          {/* `door-choices`, the container this application already has — the styles test
                caught «doors», a name I invented for a grid that existed. */}
          <div className="door-choices">
            {KINDS.map((k) => (
              <button key={k.id} type="button"
                      className={k.id === kind ? 'door door-on' : 'door'}
                      aria-pressed={k.id === kind}
                      onClick={() => setKind(k.id)}>
                <strong>{k.label}</strong>
                <span className="small">{k.lede}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Cómo va el día"
               lede="Una cosa por línea, en el orden en que pasan. No lo ordeno yo: sale como lo escribas.">
        <Field label="Cómo se llama" htmlFor="titulo"
               help="Opcional. Por ejemplo: «Los lunes por la mañana».">
          <input className="input" id="titulo" type="text" style={{ maxWidth: '24em' }}
                 value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field canvas htmlFor="momentos"
               label={kind === 'agenda' ? 'Los momentos' : 'Los pasos'}
               help="Con tus palabras. Busco un dibujo para cada una; donde no haya, sale la palabra sola.">
          <textarea className="input" id="momentos" rows={8} value={lines}
                    placeholder={chosen.placeholder}
                    onChange={(e) => setLines(e.target.value)} />
        </Field>
      </Section>

      {result ? (
        <Section title="Hecha">
          {result.gaps.length ? (
            <Callout intent="info" title="Estas van sin dibujo">
              <p>
                {result.gaps.join(', ')}. La tira las lleva con la palabra. Si quieres que
                lleven dibujo, elígeselo en <strong>Configuración ▸ Pictogramas</strong> y
                vuelve a hacerla — lo que elijas vale también para sus fichas.
              </p>
            </Callout>
          ) : null}
          <p className="small">
            Está en «Lo que le he preparado», con las demás. Desde ahí la imprimes.
          </p>
        </Section>
      ) : null}

      {/*
        FR-2613, and it is not a disclaimer — it is the difference between a material and
        a therapy. Rampa prints strips; whether this child needs a communication system,
        and which one, is a decision made by people with an assessment in front of them.
        Said here, where somebody might otherwise conclude that Rampa is one.
      */}
      <Section>
        <p className="small muted">
          Esto son materiales, no un sistema de comunicación. Si el niño necesita un SAAC,
          eso lo decide su equipo con la evaluación delante — yo hago las hojas.
        </p>
      </Section>
    </Page>
  );
}
