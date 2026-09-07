import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { useErrorText } from '../data/async.js';
import { FlaggedNames } from './FlaggedNames.js';
import { useLearnerChoices } from '../data/learners.js';
import { useMaterialKinds } from '../data/corpus.js';
import { useNameCheck, useSetName } from '../data/names.js';
import { useNewLearnerCode } from '../data/learners.js';
import { useCostEstimate } from '../data/cost.js';
import {
  useCreateJob, useVerifyJob, useAdapt, useJobProgress, useBatchCommand, useProfileGap,
  type BatchOutcome, type ProfileGap,
} from '../data/jobs.js';
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
  onReview, onChooseFile, onFinished, presetJobId, presetLearners, presetKind, resumeBatch,
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
  /**
   * The work reached «hecho» (P14, FLU-08).
   *
   * The door's answers survive only while a job is half done. They used to survive
   * the job itself, so the next visit to «Preparar material» arrived with «examen»
   * already pressed for what was a worksheet — `012` FR-1001 and `016` FR-1403 exist
   * against exactly that, and a preselection by session residue is a default wearing
   * another name.
   */
  onFinished?: () => void;
  /**
   * A run that already happened, come back to (FLU-01, P11).
   *
   * The batch is re-derived from the vault — which learners got a sheet, and which of
   * those are signed — rather than restored from the state the review unmounted. So
   * «volver» from the review lands on the list again and the second sheet of a batch
   * can be signed, which it could not be at all.
   *
   * Mutually exclusive with `presetJobId`: one says «this material is ready to
   * verify», the other says «this job is finished».
   */
  resumeBatch?: string;
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
  /**
   * What the whole batch would cost, said **before** she presses (`005` FR-514).
   *
   * Until `020` T024 the only figure on this screen was the unusual-cost gate's, which
   * by definition appears when the answer is «more than normal». So the ordinary case —
   * three sheets, an ordinary bill — ran with no figure at all, and FR-514 asks for one
   * every time, with the number of sheets it covers.
   *
   * `null` while it is being asked and when there is nothing to price yet; the line is
   * simply absent then, because a blank where a price goes reads as free.
   */
  const [batchCost, setBatchCost] =
    useState<{ formatted: string | null; sheets: number } | null>(null);
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
  /**
   * Which of the batch are signed, read from the vault rather than assumed.
   *
   * The badge said «Sin firmar» for every sheet that produced one, which was true the
   * instant the run ended and false the moment she signed one and came back. A
   * signature is a file (`007` FR-509), so it is asked for rather than remembered.
   */
  const [signed, setSigned] = useState<Record<string, boolean>>({});
  const batchOf = useBatchCommand();
  /**
   * One decoder, shared with every other screen (`013` FR-1109).
   *
   * This screen had its own `es.errors[kind] ?? message`, which was a fourth copy of the
   * same lookup **with the same inversion** — a template beating a message that carried a
   * value. One function, so there is one behaviour to fix.
   */
  const describe = useErrorText();
  /** How many of the batch actually produced a sheet. */
  const done = outcome?.results.filter((r) => r.ok).length ?? 0;
  /** And how many of those still need her signature — read from the disk, not assumed. */
  const unsigned = outcome?.results.filter((r) => r.ok && !signed[r.learner]).length ?? 0;
  // 006 US4-3: told first, not billed first (T091).
  const [costGate, setCostGate] = useState<{ formatted: string; who: string[] } | null>(null);
  /**
   * What the profile is not telling us yet, asked **before** the run (P15).
   *
   * The diagnosis already existed and arrived in the report — after she had paid.
   * A tutor who is not a PT leaves half the interview blank because he does not
   * know the answers, few recipes select, the sheet comes back looking almost like
   * the original, and his conclusion in week one is «esta herramienta no hace
   * nada» rather than «mi perfil está incompleto».
   *
   * Once she has seen it and said «seguir igual», it does not ask again on this
   * screen: a question asked every time is a question that gets clicked through,
   * which is the argument `005` FR-514 makes about cost.
   */
  const [profileGate, setProfileGate] = useState<{
    /**
     * The whole batch, not only the learners with a gap.
     *
     * Carrying the flagged ones and re-running with those would silently drop the
     * learners whose profile was fine — «seguir igual» has to mean the run she
     * asked for, not the subset this notice happened to be about.
     */
    who: string[];
    gaps: Array<{ learner: string; gap: ProfileGap }>;
  } | null>(null);
  const [profileSeen, setProfileSeen] = useState(false);
  const profileGapFor = useProfileGap();
  /**
   * She is being asked something, so the screen's own strong control steps down
   * (`013` FR-1105). One expression for both gates, so a third one cannot forget.
   */
  const gateOpen = Boolean(profileGate || costGate);
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
    if (!presetJobId || resumeBatch) return;
    setJobId(presetJobId);
    setStage('verify');
    void blocksFor.run(presetJobId).then((blocks) => {
      if (!blocks) return;
      setText((blocks as Array<{ content: string }>).map((b) => b.content).join('\n\n'));
    });
    // `blocksFor` is a stable command; including it would re-read on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetJobId, resumeBatch]);

  /**
   * Back from the review, onto the batch it came from (FLU-01, P11).
   *
   * Everything here comes off the disk: `job:learners` says which learners this job
   * produced a sheet for, and `job:isSignedOff` says which of those are done. The
   * failures of the original run are **not** restored, because they were never
   * written anywhere — and inventing rows for them would be the same lie in the
   * other direction. A learner whose sheet did not happen simply is not in the list,
   * and running again for her is one control away.
   */
  useEffect(() => {
    if (!resumeBatch) return;
    setJobId(resumeBatch);
    void batchOf.run(resumeBatch).then((rows) => {
      if (!rows) return;
      setOutcome({
        jobId: resumeBatch,
        results: rows.map((r) => ({ learner: r.learner, ok: true as const, result: {} })),
      });
      setSigned(Object.fromEntries(rows.map((r) => [r.learner, r.signedOff])));
      setStage('done');
    });
    // `batchOf` is a stable command; including it would re-read on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeBatch]);

  // The first learner is selected once the roster arrives, and only if she has
  // not already picked someone.
  useEffect(() => {
    if (choices.state === 'ready' && learners.length === 0) {
      const first = choices.value[0]?.code;
      if (first) setLearners([first]);
    }
  }, [choices, learners.length]);

  /**
   * The batch's price, asked when she arrives at the screen that spends it.
   *
   * On `verify` and not on `compose`, deliberately: the material is settled by then, so
   * this is one call rather than one per keystroke, and the figure describes the thing
   * she is about to send rather than the thing she is still typing.
   *
   * It is **not** the figure the gate judges. That one is asked again at press time, for
   * the learners actually going ahead — the profile notice can send her back and she can
   * come forward with a different set. Both go through the same `cost:estimate`, which
   * is now the only place the batch arithmetic lives, so they cannot disagree about how
   * a batch is priced — only about when it was asked, which is the honest difference.
   */
  useEffect(() => {
    if (stage !== 'verify' || !text.trim() || learners.length === 0) { setBatchCost(null); return; }
    let live = true;
    void estimate.run(text.length, learners.length).then((est) => {
      if (live && est) setBatchCost({ formatted: est.formatted, sheets: learners.length });
    });
    return () => { live = false; };
    // `estimate` is a stable command; including it would re-ask on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, text, learners.length]);

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
    setSigned({});
    // A new piece of material is a new decision, so the profile notice comes back.
    setProfileGate(null); setProfileSeen(false);
    // «Otra ficha» is a new job, so the door's answers do not come with it (P14).
    onFinished?.();
  };

  const runAdapt = async (confirmedCost = false, only?: string[]) => {
    const who = only ?? learners;
    if (who.length === 0) return;

    /*
     * Before the estimate, because this one can end the run without spending
     * anything at all — and because «voy a aplicar 2 adaptaciones» is what tells
     * her whether the price is worth paying.
     *
     * Offline: `job:profileGap` reads the profile, the recipes and
     * `instructions/axes.md`. No provider, no writes, no cost.
     */
    if (!profileSeen) {
      const gaps = (await Promise.all(who.map(async (learner) => {
        const gap = await profileGapFor.run(jobId, learner);
        return gap ? { learner, gap } : null;
      }))).filter((g): g is { learner: string; gap: ProfileGap } => g !== null);
      setProfileSeen(true);
      const worth = gaps.filter((g) => g.gap.unobserved.length > 0 || g.gap.willApply === 0);
      if (worth.length) { setProfileGate({ who: [...who], gaps: worth }); return; }
    }

    if (!confirmedCost) {
      /*
       * The estimate is for the batch (005 FR-514/515): three ordinary sheets
       * can be an unusual bill, and pricing one of them would let exactly that
       * through the gate that exists to stop it.
       *
       * Which is why `who.length` is passed rather than multiplied in here. The
       * multiplication used to be on this line, next to a bare `20_000`, and `020` T024
       * needed the same number on screen before the press — two copies of it would be a
       * screen quoting one price and refusing at another.
       */
      const est = await estimate.run(text.length, who.length);
      /*
       * `formatted !== null` written out rather than relied on (2026-09-01).
       *
       * `unusual` is already false when the cost is unknown — a gate that cannot see a
       * figure must not claim the figure is large — so this could lean on that and stay
       * silent. It does not, because then the guarantee would live in `ipc/cost.ts` and
       * be *assumed* here, which is how this project's field-nobody-reads defect works
       * in the other direction.
       */
      if (est?.unusual && est.formatted !== null) {
        setCostGate({ formatted: est.formatted, who });
        return;
      }
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
    // Nothing is signed the instant a run ends, and this says so from the disk's side
    // rather than by assumption — see `signed`.
    setSigned(Object.fromEntries(r.results.filter((x) => x.ok).map((x) => [x.learner, false])));
    setStage('done');
    /*
     * The work is done, so the door's answers stop applying (P14). Here rather than at
     * the signature: a batch of three is «done» once, and the intent must not survive
     * to preselect «examen» for the next worksheet.
     */
    onFinished?.();
  };

  return (
    /*
     * What this screen is, said from where she actually is (`020` T025).
     *
     * It used to say «Adaptar material · trae el material como lo tengas y dime para
     * quién es y qué es», which is the whole job — written when the door led straight
     * here and this was the only screen. Inside the flow it announced three steps she
     * had already been through, under a strip reading «5. Revisar y firmar». Looking at
     * it is what found it.
     *
     * Not conditional on being in a flow, and that is the point: `PrepareFlow` is the
     * only thing that renders this screen, both of its branches, so an `inFlow ? … : …`
     * would have been a second wording nothing can reach — which is the defect this
     * repository keeps finding, written on purpose this time and caught before the
     * commit.
     */
    <Page title="Última mirada antes de adaptar"
          lede="Mira el texto, añade a quien falte y dime cuándo. Lo que es y de quién
                ya me lo has dicho.">
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

          {/*
            Before she spends (FLU-12, decision P15). «Voy a aplicar N
            adaptaciones; estos ejes están sin observar y por eso estas reglas no
            se activan; esto es lo que habría que mirar en clase» — and she decides
            whether to go on or fill the profile in first.

            Every word about what to observe comes from `instructions/axes.md`
            through `job:profileGap`, not from this file: what to look for in a
            child is pedagogical judgement (Principle I).
          */}
          {profileGate ? (
            <Callout intent="decide" title="Antes de gastar: lo que sé de este alumno">
              {profileGate.gaps.map(({ learner, gap }) => (
                <div className="stack gap2" key={learner}>
                  <p style={{ margin: 0 }}>
                    <strong>{nameOf(learner)}</strong>{' — '}
                    {gap.willApply === 0
                      ? 'no tengo ninguna adaptación que aplicarle.'
                      : `voy a aplicarle ${gap.willApply} ${
                          gap.willApply === 1 ? 'adaptación' : 'adaptaciones'}.`}
                    {gap.disabled.length
                      ? ` Hay ${gap.disabled.length} más que no se activan porque falta observar algo.`
                      : ''}
                  </p>
                  {gap.unobserved.length ? (
                    <>
                      <p className="small" style={{ margin: 0 }}>
                        Sin observar:{' '}
                        {gap.unobserved.map((u) => u.name).join(' · ')}
                      </p>
                      <details className="small">
                        <summary style={{ cursor: 'pointer' }}>
                          Qué mirar en clase para completarlo
                        </summary>
                        <div className="stack gap2" style={{ marginTop: 'var(--s2)' }}>
                          {gap.unobserved.map((u) => (
                            <div key={u.axis}>
                              <strong>{u.name}</strong>
                              <ul className="bullets" style={{ margin: 0 }}>
                                {u.levels.map((l, i) => <li key={i}>{l}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </details>
                    </>
                  ) : null}
                </div>
              ))}
              <div className="row">
                <button className="btn btn-primary"
                        onClick={() => {
                          const { who } = profileGate;
                          setProfileGate(null);
                          void runAdapt(false, who);
                        }}>
                  Seguir igual
                </button>
                <button className="btn" onClick={() => setProfileGate(null)}>
                  Antes completo su perfil
                </button>
              </div>
            </Callout>
          ) : null}

          {costGate ? (
            <Callout intent="decide" title="Esto va a costar más de lo normal">
              {/* «unos» aquí, porque esto **es** una estimación — y una sola vez: la
                  función que da la cifra ya no lo pone. */}
              <p>Serían unos {costGate.formatted}, más de lo que te cuesta normalmente. Tú decides.</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => void runAdapt(true, costGate.who)}>Adelante</button>
                <button className="btn" onClick={() => setCostGate(null)}>Mejor no</button>
              </div>
            </Callout>
          ) : null}

          {/*
            While she is being asked something, the question is the screen
            (`013` FR-1105, backlog G31, decision P35).

            Both gates put a strong «Adelante» / «Seguir igual» on screen, and
            leaving this one strong too gave two solid buttons — «emphasis that is
            everywhere is emphasis nowhere», and the first thing
            `e2e/primary-control.spec.ts` caught when it was written. It caught it
            on the notice added twenty minutes earlier, which is the whole argument
            for having written the test.
          */}
          {/*
            One figure for the whole batch, with the number of sheets it covers, on the
            row she is about to press (`005` FR-514).

            Next to the control rather than in a callout at the top: `012` FR-1006 made
            that argument for the exam constraint and it is the same one — a notice above
            the form is read once and then becomes furniture, and this sentence has to be
            adjacent to the commitment.
          */}
          {batchCost ? (
            <p className="small" role="status">
              {batchCost.sheets === 1 ? 'Una hoja' : `${batchCost.sheets} hojas`}
              {batchCost.formatted !== null
                ? ` · unos ${batchCost.formatted} en total.`
                /*
                 * No price, no figure — the rule this whole module was rewritten around
                 * on 2026-09-01. A teacher on a free service was being shown euros from
                 * Anthropic's price list, so «no lo sé» is said out loud instead of a
                 * blank, which she would read as «no cuesta nada».
                 */
                : '. No puedo decirte lo que costará: tu servicio no tiene tarifa'
                  + ' publicada aquí.'}
            </p>
          ) : null}

          <div className="row">
            <button className={gateOpen ? 'btn' : 'btn btn-primary'}
                    onClick={() => void runAdapt()}>{es.adapt.verifyOk}</button>
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
            {/*
              One sentence per situation, because the batch's own sentence was being told
              to somebody whose run produced nothing: «0 de 1 ficha adaptada, sin firmar.
              Hay que mirar cada una por separado» — mirar *qué*. Carlos hit exactly that.
            */}
            {/*
              «sin firmar» used to be part of this sentence unconditionally, which was
              true for exactly as long as nobody had signed anything. Coming back from
              signing Lucía's sheet, it told her three sheets were unsigned while the
              badge beside one of them said «Firmada» — so the count is derived like
              the badges are.
            */}
            <Callout intent={done === 0 ? 'danger' : unsigned === 0 ? 'ok' : 'decide'}
                     title={done === 0 ? 'No ha salido'
                       : unsigned === 0 ? 'Listas' : 'Casi'}>
              {done === 0
                ? (outcome.results.length === 1
                    ? 'No he podido preparar la ficha. Abajo está por qué.'
                    : 'No he podido preparar ninguna. Abajo está por qué, alumno por alumno.')
                : `${done} de ${outcome.results.length} ${
                    outcome.results.length === 1 ? 'ficha adaptada' : 'fichas adaptadas'
                  }${
                    unsigned === 0 ? ', y firmadas.'
                      : unsigned === done ? ', sin firmar. Hay que mirar cada una por separado.'
                      : `. ${unsigned === 1 ? 'Queda una por firmar' : `Quedan ${unsigned} por firmar`}.`
                  }`}
              {cost !== null ? ` En total han costado unos ${cost} céntimo${cost === 1 ? '' : 's'}.` : ''}
            </Callout>

            <div className="stack gap3">
              {outcome.results.map((r) => (
                <div className="card stack gap2" key={r.learner}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{nameOf(r.learner)}</strong>
                    <Badge>
                      {!r.ok ? 'No ha salido' : signed[r.learner] ? 'Firmada' : 'Sin firmar'}
                    </Badge>
                  </div>
                  {r.ok ? (
                    <div className="row">
                      {/*
                        One per learner, and never a «firmar todo» (FR-512). What changed
                        with FLU-01 is that this is now reachable **again**: the review
                        gives her a way back to this list, and the list itself is derived
                        from the vault rather than from state that navigation destroyed.

                        Strong only when there is one row (`013` FR-1105). Three learners
                        meant three solid buttons — «emphasis that is everywhere is
                        emphasis nowhere» — and with several sheets they are three equal
                        choices anyway, with the state on the badges. Same call as the
                        record's own «Revisar y firmar», for the same reason.
                      */}
                      <button className={outcome.results.length === 1
                                ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
                              onClick={() => onReview(jobId, r.learner, r.result.recipes ?? [])}>
                        {signed[r.learner] ? 'Verla otra vez' : 'Revisar y firmar'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/*
                        Named, and hers alone: this is not a verdict on the others
                        (FR-507).

                        `describe` rather than `es.errors[r.kind] ?? r.message`, which was
                        a **fourth** copy of that lookup and had the same inversion the
                        other three had: a template winning over a message that carried
                        the word she needed. `name-unconfirmed` says «hay un posible
                        nombre en tus notas: Marta» and this line turned it into «puede
                        que haya un nombre».
                      */}
                      <p className="small" style={{ margin: 0 }}>
                        {describe({ message: r.message, kind: r.kind }).message}
                      </p>

                      {/*
                        And the way out.

                        `name-unconfirmed` asks her to «dime si es un alumno… o márcalo
                        como que no es un nombre» — and until now there was **nowhere to
                        say either**: `names:ignore` was exposed over IPC, had a hook in
                        the data layer, and no screen called it. An error that asks a
                        question and offers no way to answer it is a dead end, and this is
                        the one Carlos walked into.
                      */}
                      {r.kind === 'name-unconfirmed' ? (
                        <FlaggedNames learner={r.learner}
                                      onResolved={() => void runAdapt(true, [r.learner])} />
                      ) : (
                        <div className="row">
                          <button className="btn btn-sm"
                                  onClick={() => void runAdapt(true, [r.learner])}>
                            Intentarlo otra vez solo con {nameOf(r.learner)}
                          </button>
                        </div>
                      )}
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
