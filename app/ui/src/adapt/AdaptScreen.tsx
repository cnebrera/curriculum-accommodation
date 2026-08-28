import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { fromWire } from '../../../packages/core/src/errors.js';
import { Callout } from '../components/Callout.js';
import { ReportView, type Decision } from '../review/ReportView.js';
import { Stages, Stream } from '../components/Progress.js';
import { NameWarning } from '../components/NameWarning.js';
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

export function AdaptScreen({ onReview }: {
  onReview: (jobId: string, learner: string, recipes: string[]) => void;
}) {
  const { t: es } = useStrings();
  const [learners, setLearners] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [learner, setLearner] = useState('');
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>('compose');
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState<{ stage: string; detail?: string } | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    decisions: Decision[]; notDone: string[];
    memoryApplied: Array<{ source: string; effect: string }>;
  } | null>(null);
  // Computed and discarded was the defect (T089, 007 SC-502): the notices were
  // returned as a bare count and InjectionNotice was never mounted anywhere.
  const [notices, setNotices] = useState<JobNotice[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [retried, setRetried] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  // 006 US4-3: told first, not billed first (T091).
  const [costGate, setCostGate] = useState<{ formatted: string } | null>(null);
  const online = useOnline();

  useEffect(() => {
    void window.rampa.learners.list().then((l: string[]) => { setLearners(l); setLearner(l[0] ?? ''); });
    void window.rampa.names.all().then(setNames);
    return window.rampa.job.onProgress(setProgress);
  }, []);

  const startJob = async () => {
    const check = await window.rampa.names.check(text);
    if (check.flagged.length) { setFlagged(check.flagged); return; }
    const id = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
    await window.rampa.job.create(id, text, 'es');
    setJobId(id);
    setStage('verify');
  };

  const runAdapt = async (confirmedCost = false) => {
    if (!confirmedCost) {
      const est = await window.rampa.cost.estimate(text.length + 20_000);
      if (est.unusual) { setCostGate({ formatted: est.formatted }); return; }
    }
    setCostGate(null);
    setStage('working'); setError(null);
    try {
      await window.rampa.job.verify(jobId);
      const r = await window.rampa.job.adapt(jobId, learner);
      setReportData(r.reportData ?? null);
      setNotices(r.notices ?? []);
      setRecipes(r.recipes ?? []);
      setRetried(Boolean(r.retried));
      setCost(typeof r.costCents === 'number' ? r.costCents : null);
      setStage('done');
    } catch (e: unknown) {
      // The kind survives the IPC round trip encoded in the message; decoding it
      // here is what makes the Spanish error map actually apply.
      const { kind, message } = fromWire(e);
      setError(es.errors[kind] ?? message ?? es.errors['unknown']!);
      setStage('verify');
    }
  };

  return (
    <div className="stack">
      <h1>{es.adapt.title}</h1>
      {!online ? <Callout intent="decide">{es.errors['offline']}</Callout> : null}

      {stage === 'compose' ? (
        <div className="stack">
          <div>
            <label htmlFor="who">{es.adapt.forWhom}</label>
            <select id="who" value={learner} onChange={(e) => setLearner(e.target.value)}>
              {learners.map((c) => <option key={c} value={c}>{names[c] ?? c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="text">{es.adapt.paste}</label>
            <textarea id="text" value={text} onChange={(e) => { setText(e.target.value); setFlagged([]); }} />
          </div>
          <NameWarning
            flagged={flagged}
            onAddName={async (n) => {
              const code = await window.rampa.learners.newCode();
              await window.rampa.names.set(code, n);
              setNames(await window.rampa.names.all());
              setFlagged(flagged.filter((f) => f !== n));
            }}
            onSendAnyway={() => setFlagged([])}
          />
          <div>
            <button className="primary" disabled={!text.trim() || !learner || !online} onClick={() => void startJob()}>
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {stage === 'verify' ? (
        <div className="stack">
          <Callout intent="decide" title={es.adapt.verifyTitle}>{es.adapt.verifyWhy}</Callout>
          <div className="material" lang="es">{text}</div>
          {error ? <Callout intent="danger">{error}</Callout> : null}

          {costGate ? (
            <Callout intent="decide" title="Esta ficha va a costar más de lo normal">
              <p>Serían unos {costGate.formatted}, más que tus fichas habituales. Tú decides.</p>
              <div className="row">
                <button className="primary" onClick={() => void runAdapt(true)}>Adelante</button>
                <button onClick={() => setCostGate(null)}>Mejor no</button>
              </div>
            </Callout>
          ) : null}

          <div className="row">
            <button className="primary" onClick={() => void runAdapt()}>{es.adapt.verifyOk}</button>
            <button onClick={() => setStage('compose')}>Corregir el texto</button>
          </div>
        </div>
      ) : null}

      {stage === 'working' ? (
        <div className="card stack gap4">
          <Stages stages={STAGES} current={stageIndex(progress?.stage)} />
          {/* Once the model is streaming there is no total to divide by, so the
              bar approaches without ever claiming completion. */}
          {progress?.detail?.includes('caracteres') && (
            <Stream label="Adaptando" chars={parseInt(progress.detail, 10) || 0} />
          )}
        </div>
      ) : null}

      {stage === 'done' ? (
        <div className="stack">
          <Callout intent="ok" title="Listo">
            Está adaptado y sin firmar. Ahora tienes que mirarlo tú.
            {cost !== null ? ` Esta ficha ha costado unos ${cost} céntimo${cost === 1 ? '' : 's'}.` : ''}
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
          <div className="row">
            <button className="primary" onClick={() => onReview(jobId, learner, recipes)}>Revisar y firmar</button>
            <button onClick={() => {
              setStage('compose'); setText(''); setReportData(null);
              setNotices([]); setRecipes([]); setRetried(false); setCost(null);
            }}>Otra ficha</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
