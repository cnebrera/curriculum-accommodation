import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { useLearnerChoices } from '../data/learners.js';
import { useMaterialKinds } from '../data/corpus.js';
import { useNameCheck, useSetName } from '../data/names.js';
import { useNewLearnerCode } from '../data/learners.js';
import { useCostEstimate } from '../data/cost.js';
import { useCreateJob, useVerifyJob, useAdapt, useJobProgress, type BatchOutcome } from '../data/jobs.js';
import { useBlocksCommand } from '../data/ingest.js';
import { Callout } from '../components/Callout.js';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { ReportView, type Decision } from '../review/ReportView.js';
import { Stages, Stream } from '../components/Progress.js';
import { NameWarning } from '../components/NameWarning.js';
import { Badge } from '../components/Badge.js';
import { InjectionNotice } from '../components/InjectionNotice.js';
import { useOnline } from '../hooks/useOnline.js';

type Stage = 'compose' | 'verify' | 'working' | 'done';

/** The stages the job reports, in order, so progress has a shape she can read. */
const STAGES = [
  'Leyendo el material',
  'Leyendo el perfil y tus notas',
  'Eligiendo las adaptaciones',
  'Adaptando',
  'Guardando',
] as const;
const stageIndex = (s?: string): number => {
  const i = STAGES.findIndex((x) => s?.startsWith(x));
  return i === -1 ? 0 : i;
};

interface JobNotice { block: string | null; notice: { kind: string; quote: string; message: string } }

export function AdaptScreen({
  onReview, onChooseFile, presetJobId, presetLearners, presetKind,
}: {
  onReview: (jobId: string, learner: string, recipes: string[]) => void;
  /**
   * The other door (008). Pasting text is now the minority case: the worksheet
   * usually lives on a publisher's platform with no export, so what she has is a
   * photograph — and a gate over text she typed herself checks nothing.
   */
  onChooseFile?: () => void;
  /**
   * A job whose extraction she has already verified — from `008`'s ingest, or a
   * composed sheet (`002`), or a reuse from the record (`016` T018). Skips the
   * paste box: the material is in the vault, not in this component.
   */
  presetJobId?: string;
  /**
   * Answers the door already has (`016`, contracts/door.md rule 1).
   *
   * **No screen re-asks what the intent already holds.** That is the failure every
   * wizard has: she answers «para quién» on the door and is asked again here, and
   * concludes the first answer did not register. So when these arrive, the two
   * question is not rendered — she can still change it from the door.
   *
   * **The learners are a different case.** The door answers «para quién» with one
   * learner and FR-1411 says the first is the first, not the only one — so that list
   * stays on screen with the door's choice already ticked, and adding the second is
   * one click rather than a trip back.
   */
  presetLearners?: readonly string[];
  presetKind?: string;
}) {
  const { t: es } = useStrings();
  /*
   * One hook where there were two `useState`s kept in step by hand (013
   * FR-1107). `learners` and `names` were fetched by separate calls in the same
   * effect and could disagree about which learners exist — and if
   * `names.all()` rejected, the select rendered every child as a bare code with
   * no indication that anything had failed.
   */
  const choices = useLearnerChoices();
  /*
   * Several learners, and `016`'s clarification is why this reads the way it
   * does. She chooses a learner first — that is the order she thinks in — and
   * this control is where the first learner becomes several. FR-1412 says a
   * second learner must not feel like a correction to a flow that started with
   * one, which is a statement about this select and nothing else.
   */
  const [learners, setLearners] = useState<string[]>([...(presetLearners ?? [])]);
  const learner = learners[0] ?? '';
  const [text, setText] = useState('');
  /**
   * What the material is (012 FR-1001/1003).
   *
   * `null` until she says, and there is **no default**. `job:create` wrote
   * `kind: 'worksheet'` unconditionally until today, so an exam became a
   * worksheet before the model saw it — silently, and the hard rule about
   * preserving the criterion had nothing telling it which documents it governed.
   */
  const [kind, setKind] = useState<string | null>(presetKind ?? null);
  const kinds = useMaterialKinds();
  const [stage, setStage] = useState<Stage>('compose');
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState<
    { stage: string; detail?: string; learner?: string; index?: number; of?: number } | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const nameCheck = useNameCheck();
  const setName = useSetName();
  const newCode = useNewLearnerCode();
  const estimate = useCostEstimate();
  const createJob = useCreateJob();
  const verifyJob = useVerifyJob();
  const adapt = useAdapt();
  /* Decoded in the data layer (FR-1109). This screen used to call `fromWire`
     itself and look the kind up in `es.errors` — correctly, which is why the
     screens that did not do it went unnoticed for so long. */
  const error = adapt.error?.message ?? verifyJob.error?.message ?? createJob.error?.message ?? null;
  const [reportData, setReportData] = useState<{
    decisions: Decision[]; notDone: string[];
    memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  } | null>(null);
  // Computed and discarded was the defect (T089, 007 SC-502): the notices were
  // returned as a bare count and InjectionNotice was never mounted anywhere.
  const [notices, setNotices] = useState<JobNotice[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [retried, setRetried] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  /** Per learner, because a failure belongs to a learner (005 FR-507). */
  const [outcome, setOutcome] = useState<BatchOutcome | null>(null);
  // 006 US4-3: told first, not billed first (T091).
  const [costGate, setCostGate] = useState<{ formatted: string; who: string[] } | null>(null);
  const online = useOnline();
  /** Her name for the child; the code is what is on the sheet, not on this screen. */
  const nameOf = (code: string): string =>
    (choices.state === 'ready' ? choices.value.find((c) => c.code === code)?.name : undefined) ?? code;

  useJobProgress(setProgress);
  const blocksFor = useBlocksCommand();

  /**
   * A job that already exists, brought in from somewhere else.
   *
   * **This was a live defect until 016 T018.** `presetJobId` was declared, typed
   * and passed in by `App.tsx` after every ingest — and never read. So a teacher
   * who photographed a worksheet, waited for the extraction and confirmed every
   * page landed on this screen with an empty paste box and no job: the whole
   * photograph path could not reach an adaptation. The seventh instance in this
   * project of a field written, typed and read by nothing.
   *
   * The text is read back from the vault rather than carried in state, because for
   * a composed sheet or a reused job there is no state to carry it in — and
   * `006`'s premise is that the vault is the truth.
   */
  useEffect(() => {
    if (!presetJobId) return;
    setJobId(presetJobId);
    setStage('verify');
    void blocksFor.run(presetJobId).then((blocks) => {
      if (!blocks) return;
      setText((blocks as Array<{ content: string }>).map((b) => b.content).join('\n\n'));
    });
    // `blocksFor` is a stable command; including it would re-read on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetJobId]);

  // The first learner is selected once the roster arrives, and only if she has
  // not already picked someone.
  useEffect(() => {
    if (choices.state === 'ready' && learners.length === 0) {
      const first = choices.value[0]?.code;
      if (first) setLearners([first]);
    }
  }, [choices, learners.length]);

  const startJob = async () => {
    const check = await nameCheck.run(text);
    if (!check) return;  // the failure is on screen already
    if (check.flagged.length) { setFlagged(check.flagged); return; }
    const id = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
    if (!kind) return;   // the primary control is disabled; belt and braces
    if (await createJob.run(id, text, kind, 'es') === undefined) return;
    setJobId(id);
    setStage('verify');
  };

  const startOver = (): void => {
    setStage('compose'); setText(''); setReportData(null); setOutcome(null);
    setNotices([]); setRecipes([]); setRetried(false); setCost(null);
  };

  const runAdapt = async (confirmedCost = false, only?: string[]) => {
    const who = only ?? learners;
    if (who.length === 0) return;

    if (!confirmedCost) {
      /*
       * The estimate is for the batch (005 FR-514/515): three ordinary sheets
       * can be an unusual bill, and pricing one of them would let exactly that
       * through the gate that exists to stop it.
       */
      const est = await estimate.run((text.length + 20_000) * who.length);
      if (est?.unusual) { setCostGate({ formatted: est.formatted, who }); return; }
    }
    setCostGate(null);
    setStage('working');

    /*
     * The gate applies to **text she pasted**, and only to that.
     *
     * An ingested job was confirmed page by page on `008`'s verification screen,
     * and a composed one has no reading to confirm (`002` T013). Calling
     * `job:verify` for either throws — which is the second half of the
     * `presetJobId` defect: even once the job id arrived, the flow bounced back
     * here with «hay que confirmarlo página a página» about a page she had already
     * confirmed.
     */
    if (!presetJobId && await verifyJob.run(jobId) === undefined) {
      setStage('verify');
      return;
    }
    const r = await adapt.run(jobId, who);
    if (!r) { setStage('verify'); return; }

    setOutcome(r);
    // The single-learner case keeps today's screen: the report, then one button.
    const first = r.results.find((x) => x.ok);
    if (first?.ok) {
      setReportData((first.result.reportData ?? null) as typeof reportData);
      setNotices((first.result.notices ?? []) as JobNotice[]);
      setRecipes(first.result.recipes ?? []);
      setRetried(Boolean(first.result.retried));
    }
    setCost(r.results.reduce((sum, x) =>
      sum + (x.ok && typeof x.result.costCents === 'number' ? x.result.costCents : 0), 0) || null);
    setStage('done');
  };

  return (
    <Page title={es.adapt.title}
          lede="Trae el material como lo tengas y dime para quién es y qué es.">
      {!online ? <Callout intent="decide">{es.errors['offline']}</Callout> : null}

      {stage === 'compose' ? (
        <>
          <Section>
            {/*
              A checkbox list rather than a select plus an "add another" control.
              Two controls over one list is two copies of one truth, which is the
              defect this project keeps finding — and it would read as «this
              child, and then corrections», which is exactly what `016` FR-1412
              says a second learner must not feel like.

              A real fieldset so the question and its answers are one group to a
              screen reader rather than N unrelated checkboxes.
            */}
            {/*
              **Never hidden**, even when the door already picked somebody.
              
              It was, briefly, and the e2e suite caught what that costs: the door
              answers «para quién» with **one** learner, and FR-1411 says the first is
              the first and not the only one. Hiding the control that adds the others
              is FR-1412 broken in the most literal way — the second learner becomes
              unreachable rather than merely feeling like a correction.
              
              The kind is different and stays hidden: there is nothing to add to it.
            */}
            <fieldset className="fieldset-bare">
              {/* h2, not h3: this fieldset is the section's own heading and the
                  page title above it is the h1. `ConnectionScreen`'s fieldsets
                  use h3 because a Section h2 precedes them — copying the markup
                  without the context skipped a level, which the a11y suite
                  caught immediately. */}
              <legend><h2>{es.adapt.forWhom}</h2></legend>
              {choices.state === 'ready' ? choices.value.map((c) => (
                <label key={c.code} className="check" htmlFor={`who-${c.code}`}>
                  <input type="checkbox" id={`who-${c.code}`}
                         checked={learners.includes(c.code)}
                         onChange={(e) => setLearners((prev) => e.target.checked
                           ? [...prev, c.code]
                           : prev.filter((x) => x !== c.code))} />
                  <span>{c.name}</span>
                </label>
              )) : null}
              <p className="field-help">
                {presetLearners?.length
                  ? 'Ya está marcado el que elegiste. Puedes añadir más: el material se lee una sola vez y sale una versión para cada uno — no se paga la lectura tres veces.'
                  : 'Puedes marcar varios. El material se lee una sola vez y sale una versión para cada uno — no se paga la lectura tres veces.'}
              </p>
            </fieldset>
          </Section>

          {/*
            Hidden rather than removed when the door already asked (`016`).
            `hidden` keeps one markup path: a second branch rendering a different
            tree is where the two copies start to drift, and this screen has
            already been that.
          */}
          <fieldset className="fieldset-bare" hidden={presetKind !== undefined}>
            <legend><h2>¿Qué es?</h2></legend>
            {kinds.state === 'ready' ? kinds.value.map((k) => (
              <label key={k.id} className="check" htmlFor={`kind-${k.id}`}>
                <input type="radio" id={`kind-${k.id}`} name="material-kind"
                       checked={kind === k.id}
                       onChange={() => setKind(k.id)} />
                <span>{k.label}</span>
              </label>
            )) : null}
            <p className="field-help">
              Un examen no se adapta como una ficha: cambio cómo se lee y cómo
              contesta, y no lo que se pregunta. Por eso te lo pregunto antes.
            </p>
          </fieldset>

          <Section title="¿De dónde sacamos el material?">
            {/*
              Two doors, and the file one is the common case: the worksheet lives
              on a publisher's platform with no export, so what she has is a
              photograph. It reads first for that reason.
            */}
            {onChooseFile ? (
              <Field help="Si la tienes en la plataforma de la editorial y no se puede descargar, hazle una foto. Es lo normal.">
                <div className="row">
                  <button className="btn" onClick={onChooseFile}>
                    Traer una foto, un PDF o un Word
                  </button>
                </div>
              </Field>
            ) : null}

            <Field label={es.adapt.paste} htmlFor="text" canvas
                   help="O pégalo aquí si ya lo tienes en texto.">
              <textarea className="textarea" id="text" value={text} onChange={(e) => { setText(e.target.value); setFlagged([]); }} />
            </Field>
          </Section>

          <NameWarning
            flagged={flagged}
            onAddName={async (n) => {
              const code = await newCode.run();
              if (!code) return;
              await setName.run(code, n);
              choices.reload();
              setFlagged(flagged.filter((f) => f !== n));
            }}
            onSendAnyway={() => setFlagged([])}
          />

          {/*
            One primary control on the screen (FR-1105). The file button above is
            secondary weight now — before this, both were the same heavy slab and
            neither told her which was the way forward.
          */}
          <Actions
            primary={
              <button className="btn btn-primary btn-lg"
                      disabled={!text.trim() || learners.length === 0 || !kind || !online}
                      onClick={() => void startJob()}>
                Continuar
              </button>
            }
            note={
              learners.length === 0 ? 'Marca al menos un alumno.'
              : !kind ? 'Dime qué es: una ficha, un examen, apuntes o problemas.'
              : !text.trim() ? 'Trae el material o pega el texto para seguir.'
              : undefined
            }
          />
        </>
      ) : null}

      {stage === 'verify' ? (
        <div className="stack">
          <Callout intent="decide" title={es.adapt.verifyTitle}>{es.adapt.verifyWhy}</Callout>
          <div className="material" lang="es">{text}</div>
          {error ? <Callout intent="danger">{error}</Callout> : null}

          {costGate ? (
            <Callout intent="decide" title="Esto va a costar más de lo normal">
              <p>Serían unos {costGate.formatted}, más de lo que te cuesta normalmente. Tú decides.</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => void runAdapt(true, costGate.who)}>Adelante</button>
                <button className="btn" onClick={() => setCostGate(null)}>Mejor no</button>
              </div>
            </Callout>
          ) : null}

          <div className="row">
            <button className="btn btn-primary" onClick={() => void runAdapt()}>{es.adapt.verifyOk}</button>
            <button className="btn" onClick={() => setStage('compose')}>Corregir el texto</button>
          </div>
        </div>
      ) : null}

      {stage === 'working' ? (
        <div className="card stack gap4">
          {/* Whose adaptation this is (005 FR-519). Shown only when there is more
              than one, because «1 de 1» is noise on the common case. */}
          {progress?.of && progress.of > 1 ? (
            <p className="meta" role="status">
              {progress.index} de {progress.of}
              {progress.learner ? ` · ${nameOf(progress.learner)}` : ''}
            </p>
          ) : null}
          <Stages stages={STAGES} current={stageIndex(progress?.stage)} />
          {/* Once the model is streaming there is no total to divide by, so the
              bar approaches without ever claiming completion. */}
          {progress?.detail?.includes('caracteres') && (
            <Stream label="Adaptando" chars={parseInt(progress.detail, 10) || 0} />
          )}
        </div>
      ) : null}

      {stage === 'done' && outcome ? (
        outcome.results.length === 1 && outcome.results[0]?.ok ? (
          /*
             One learner: today's screen, unchanged. The common case must not get
             worse to make room for the uncommon one.
          */
          <div className="stack">
            <Callout intent="ok" title="Listo">
              Está adaptado y sin firmar. Ahora tienes que mirarlo tú.
              {cost !== null ? ` Ha costado unos ${cost} céntimo${cost === 1 ? '' : 's'}.` : ''}
            </Callout>

            {/* Anything the material tried to do, or that could not be read. */}
            <InjectionNotice
              notices={notices.map((n) => ({
                block: n.block, quote: n.notice.quote, message: n.notice.message,
              }))}
            />

            {retried ? (
              <Callout intent="decide">
                El primer intento volvió incompleto y lo he vuelto a pedir. Esta es la
                segunda versión: míratela con calma.
              </Callout>
            ) : null}

            {reportData
              ? <ReportView {...reportData} />
              : <Callout intent="info">Preparando el informe…</Callout>}
            <Actions
              primary={
                <button className="btn btn-primary btn-lg" onClick={() => onReview(jobId, learner, recipes)}>
                  Revisar y firmar
                </button>
              }>
              <button className="btn" onClick={startOver}>Otra ficha</button>
            </Actions>
          </div>
        ) : (
          /*
             Several learners (005 US2/US3).
             
             One row per learner, each with its own outcome and its own way in.
             Deliberately **not** a table: this is the first screen in the
             application where children appear one under another, and a grid with
             their axes as columns is one layout decision away from being a league
             table of disability (Principle V, `015` FR-1310). Rows carry a name, a
             state and an action, and nothing about the child.

             And deliberately no «revisar todo» or «firmar todo». One signature per
             sheet, because a signature is a claim she read it (Principle VII,
             FR-512).
          */
          <div className="stack">
            <Callout intent={outcome.results.every((r) => r.ok) ? 'ok' : 'decide'}
                     title={outcome.results.every((r) => r.ok) ? 'Listas' : 'Casi'}>
              {outcome.results.filter((r) => r.ok).length} de {outcome.results.length}{' '}
              {outcome.results.length === 1 ? 'ficha adaptada' : 'fichas adaptadas'}, sin firmar.
              Hay que mirar cada una por separado.
              {cost !== null ? ` En total han costado unos ${cost} céntimo${cost === 1 ? '' : 's'}.` : ''}
            </Callout>

            <div className="stack gap3">
              {outcome.results.map((r) => (
                <div className="card stack gap2" key={r.learner}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{nameOf(r.learner)}</strong>
                    <Badge>{r.ok ? 'Sin firmar' : 'No ha salido'}</Badge>
                  </div>
                  {r.ok ? (
                    <div className="row">
                      <button className="btn btn-primary btn-sm"
                              onClick={() => onReview(jobId, r.learner, r.result.recipes ?? [])}>
                        Revisar y firmar
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Named, and hers alone: this is not a verdict on the
                          others (FR-507). */}
                      <p className="small" style={{ margin: 0 }}>
                        {es.errors[r.kind] ?? r.message}
                      </p>
                      <div className="row">
                        <button className="btn btn-sm"
                                onClick={() => void runAdapt(true, [r.learner])}>
                          Intentarlo otra vez solo con {nameOf(r.learner)}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <Actions>
              <button className="btn" onClick={startOver}>Otra ficha</button>
            </Actions>
          </div>
        )
      ) : null}
    </Page>
  );
}
