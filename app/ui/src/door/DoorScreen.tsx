import { Page, Section, Actions } from '../shell/Page.js';
import { useMaterialKinds } from '../data/corpus.js';
import { Loaded } from '../data/Loaded.js';
import { LearnerPicker } from './LearnerPicker.js';
import { whatIsMissing, type Intent, type IntentAction, type Work } from './intent.js';

/**
 * The front door (016 T007, FR-1401).
 *
 * ## The question it asks
 *
 * Today's first screen asks for a file. That is the application's question, not
 * hers: she does not arrive holding a file, she arrives with *a thing she has to
 * get done by tomorrow* — and sometimes that thing has no file at all. «Que
 * aprenda a multiplicar con llevadas» is an objective, not a document.
 *
 * A door that asks "which file?" cannot reach `002` at all, which is precisely why
 * `002` sat specified and unreachable for a month.
 *
 * ## Learner → work → material
 *
 * Chosen in clarification, against my recommendation. I argued work-first because
 * `012` US1 asks for the kind before anything else and because Principle IV pulls
 * that way — one worksheet for three learners is the classroom's common case, and
 * a flow starting with one child makes the other two an afterthought.
 *
 * He was right that work-first reads as *our* order. She arrives thinking about a
 * child. So the cost is paid explicitly instead: the learner chosen first is **the
 * first learner** (FR-1411), and «añadir otro» sits in the flow rather than beside
 * it, because Principle IV is the common case and not a repair (FR-1412).
 *
 * ## What this screen must never grow
 *
 * An adaptation behaviour of its own (FR-1410). Its entire job is to reach `001`,
 * `002` and `012` with three answers already given. A diff to this file that
 * touches how material is adapted is specifying something one of those owns.
 */

/** The two doors, as peers. Neither is pre-selected (contracts/door.md rule 2). */
const DOORS: Array<{ work: Work; title: string; when: string }> = [
  {
    work: 'adapt',
    title: 'Adaptar algo que tengo',
    when: 'Una ficha, un examen, unos apuntes, una hoja de problemas. Da igual si es'
      + ' una foto, un PDF o texto pegado.',
  },
  {
    work: 'compose',
    title: 'Hacer material para que aprenda algo',
    when: 'No tienes nada y sabes qué le hace falta: «multiplicar con llevadas»,'
      + ' «los ríos de España».',
  },
];

export function DoorScreen({ intent, dispatch, onAdapt, onCompose, onNewLearner }: {
  /**
   * Held **above** this screen, and that is FR-1408 rather than a style choice.
   *
   * The first version owned the intent in its own reducer, and the e2e suite
   * caught what that costs: she typed an objective, pressed «Volver», and the door
   * had forgotten which child it was for — because the screen had unmounted. Work
   * that must survive navigation cannot live in a screen that navigation destroys.
   */
  intent: Intent;
  dispatch: (action: IntentAction) => void;
  /**
   * Into `001`/`012`'s path. No arguments: the answers are in `intent`, which the
   * caller already holds — passing them back would be a second copy of one truth,
   * and this project has found that defect enough times to stop writing it.
   */
  onAdapt: () => void;
  /** Into `002`'s path. The kind is a fact about what gets produced, not a question. */
  onCompose: () => void;
  onNewLearner: () => void;
}) {
  const kinds = useMaterialKinds();
  const missing = whatIsMissing(intent);

  const go = (): void => {
    if (intent.work === 'compose') onCompose();
    else if (intent.work === 'adapt' && intent.kind) onAdapt();
  };

  return (
    <Page
      title="¿Qué vas a hacer?"
      lede="Empieza por el alumno. Luego me dices qué necesitas."
      actions={
        <Actions
          primary={
            <button className="btn btn-primary" onClick={go} disabled={missing !== null}>
              Empezar
            </button>
          }
          /*
           * `013` FR-1105 and `002`'s own habit: the action says what is missing
           * rather than going grey. And for an exam, what it is about to do —
           * FR-1405, on this row rather than in a callout above the form, because a
           * callout at the top is read once and then becomes furniture (research
           * R3).
           */
          note={missing ?? <ExamConstraint intent={intent} />}>
          {/*
            «Quitar lo elegido», not «Empezar de nuevo»: two controls whose names
            begin with the same word. Found by the e2e suite as an ambiguous
            locator, which is the same defect a teacher meets as a moment of
            hesitation. The wording matches `015`'s «Quitar los filtros».
          */}
          {intent.learners.length > 0 || intent.work !== null ? (
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
              Quitar lo elegido
            </button>
          ) : null}
        </Actions>
      }>

      <Section title="¿Para quién?"
               lede={intent.learners.length > 1
                 ? `${intent.learners.length} alumnos. El mismo material, preparado para cada uno.`
                 : 'Elige uno. Podrás añadir más antes de empezar.'}>
        <LearnerPicker
          chosen={intent.learners}
          onPick={(code) => dispatch({ type: 'learner/add', code })}
          onUnpick={(code) => dispatch({ type: 'learner/remove', code })}
          onNewLearner={onNewLearner} />
      </Section>

      {/*
        The work, once there is somebody to do it for. Hidden rather than disabled
        before that: a screen showing three sections of controls she cannot use yet
        is a screen she has to work out, and the order is the point of this door.
      */}
      {intent.learners.length > 0 ? (
        <Section title="¿Y qué necesitas?">
          <div className="door-choices">
            {DOORS.map((d) => (
              <button
                key={d.work}
                className={intent.work === d.work ? 'door door-on' : 'door'}
                aria-pressed={intent.work === d.work}
                onClick={() => dispatch({ type: 'work/set', work: d.work })}>
                <strong>{d.title}</strong>
                <span className="small">{d.when}</span>
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {/*
        What the material is (`012` FR-1001/1403). Only for the adapt door, and
        **never pre-selected**: a defaulted «ficha» is how an exam gets adapted as a
        worksheet, silently, with the hard rule about preserving the criterion
        having nothing telling it which document it governed.
      */}
      {intent.work === 'adapt' ? (
        <Section title="¿Y qué es?" lede="Cambia lo que puedo tocar y lo que no.">
          <Loaded from={kinds} busyLabel="Leyendo los tipos de material">
            {(all) => (
              <div className="door-choices">
                {all.map((k) => (
                  <button
                    key={k.id}
                    className={intent.kind === k.id ? 'door door-on' : 'door'}
                    aria-pressed={intent.kind === k.id}
                    onClick={() => dispatch({ type: 'kind/set', kind: k.id })}>
                    <strong>{k.label}</strong>
                    {k.before ? <span className="small">{k.before}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </Loaded>
        </Section>
      ) : null}
    </Page>
  );
}

/**
 * What she is about to commit to, for a kind that constrains us (FR-1405).
 *
 * `012` FR-1006 puts this in the report, afterwards. That is where she reads it
 * when deciding whether to sign; this is where she reads it when deciding whether
 * to spend. Both are needed and neither replaces the other.
 *
 * The words come from the corpus's `before:` line, so a kind added later gets a
 * sentence without this file changing.
 */
function ExamConstraint({ intent }: { intent: Intent }) {
  const kinds = useMaterialKinds();
  if (intent.work !== 'adapt' || !intent.kind || kinds.state !== 'ready') return null;

  const kind = kinds.value.find((k) => k.id === intent.kind);
  /*
   * The sentence comes from the corpus, not from here. A kind with nothing to say
   * says nothing — an invented promise about what will not be touched is worse
   * than none.
   */
  if (!kind?.before) {
    return <>Lo prepararé para {intent.learners.length === 1 ? 'él' : 'cada uno'}.</>;
  }
  return <>{kind.before}</>;
}
