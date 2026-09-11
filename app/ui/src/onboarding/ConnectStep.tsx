import { useEffect, useState, type ReactNode } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { Icon } from '../components/Icon.js';
import { useRecommendService } from '../data/corpus.js';
import { useKeyShapeCheck, useValidateKey, useSaveKey } from '../data/providers.js';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { Walkthrough } from './Walkthrough.js';
import { ServiceComparison } from './ServiceComparison.js';
import { loadServices, formatDate, type Service } from '../data/services.js';
import { loadState, saveState } from '../data/onboarding.js';

/**
 * The step most likely to lose her (009 US1–US4, replacing 006 FR-403).
 *
 * The previous version offered two services with a radio button each and one
 * error message for every possible failure. The vocabulary was the barrier, and
 * it still is: "create an API key" is five unfamiliar words before anything
 * works.
 *
 * So: **one question**, then **one recommendation with a reason she could repeat
 * to her head teacher**, then the walkthrough for that service, and the paste
 * box. Comparing all six is one click away and never in the way.
 *
 * Not one word about any service is written in this file. Every label, cost,
 * limit, step and warning comes from `instructions/providers/`, and the
 * recommendation comes from the rule in `@rampa/core` over IPC — because the
 * rule is the part of this feature that is wrong in ways nobody notices, and it
 * belongs where 21 tests can see it.
 */
type Stage = 'question' | 'recommendation' | 'compare' | 'walkthrough';

interface Reco {
  ok: boolean;
  serviceId?: string;
  reason?: string;
  because?: string;
  message?: string;
  suggestion?: string;
}

type Verdict =
  | { ok: true; costCents: number }
  | { ok: false; text: string; switchTo?: Service };

export function ConnectStep({ onDone, serviceId, banner, aside }: {
  onDone: (providerId: string) => void;
  /** The first run's wordmark and step indicator, above the title (`041` T021). */
  banner?: ReactNode;
  /** The other door — «Probar con un ejemplo» — under the question and the recommendation. */
  aside?: ReactNode;
  /**
   * The service she has already named, when there is one (`009` FR-719).
   *
   * Configuración's «Mi servicio de IA» lists the unconnected services as buttons
   * carrying their own label, so pressing «Gemini (Google)» *is* her answer. It used
   * to be dropped — `route.reconnecting` was read as a boolean — and she landed on the
   * card question she had just answered by name, whose endorsed button recommends a
   * different vendor. Backlog G60.
   *
   * Honoured through the same path as `connectServiceId`: the reasoning in the effect
   * below was already written for exactly this, for the interrupted-setup case.
   */
  serviceId?: string;
}) {
  const { t: es } = useStrings();
  const c = es.connect;

  const [services, setServices] = useState<Service[] | null>(null);
  const [stage, setStage] = useState<Stage>('question');
  const [canUseCard, setCanUseCard] = useState<boolean | null>(null);
  const [location, setLocation] = useState<'eu' | undefined>(undefined);
  const [reco, setReco] = useState<Reco | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const recommend = useRecommendService();
  const shapeCheck = useKeyShapeCheck();
  const validateKey = useValidateKey();
  const saveKey = useSaveKey();

  useEffect(() => {
    void loadServices().then((list) => {
      setServices(list);
      /**
       * T017 · FR-719. Reopening returns her to the service she was working on.
       * She will be interrupted — that is the premise of the whole onboarding —
       * and coming back to "¿puedes usar una tarjeta?" after she had already
       * answered it and opened Groq's console is how a setup gets abandoned.
       */
      const saved = serviceId ?? loadState().connectServiceId;
      if (saved && list.some((s) => s.id === saved)) {
        setChosen(saved);
        setStage('walkthrough');
      }
    });
  }, [serviceId]);

  const answer = async (card: boolean, loc?: 'eu') => {
    setCanUseCard(card);
    setLocation(loc);
    const r = await recommend.run({ canUseCard: card, locationConstraint: loc }) as Reco | undefined;
    if (!r) return;  // the failure is on screen; she stays on the question
    setReco(r);
    setStage('recommendation');
  };

  const pick = (id: string) => {
    setChosen(id);
    setKey('');
    setVerdict(null);
    setStage('walkthrough');
    saveState({ ...loadState(), connectServiceId: id });
  };

  const service = services?.find((s) => s.id === chosen) ?? null;

  /**
   * The five sentences (T030–T032).
   *
   * The shape check runs first and offline: it costs nothing, it works when the
   * school connection is down, and it is what makes these five *different*
   * sentences rather than one generic one with five causes.
   */
  const check = async () => {
    if (!service || !services) return;
    setChecking(true);
    setVerdict(null);
    try {
      const shape = await shapeCheck.run(service.id, key) as
        { ok: boolean; kind?: string; ownerId?: string; key?: string } | undefined;
      if (!shape) return;

      if (!shape.ok) {
        const owner = services.find((s) => s.id === shape.ownerId);
        setVerdict({
          ok: false,
          switchTo: shape.kind === 'wrong-service' ? owner : undefined,
          text:
            shape.kind === 'empty' ? c.errEmpty
            : shape.kind === 'page' ? c.errPage
            : shape.kind === 'wrong-service' && owner ? c.errWrongService(owner.label, service.label)
            : shape.kind === 'too-short' ? c.errTooShort
            : c.errUnknown,
        });
        return;
      }

      const r = await validateKey.run(service.id, shape.key ?? key) as
        { ok: boolean; reason?: string; message?: string } | undefined;
      if (!r) return;
      if (r.ok) {
        // FR-730/T035: validation precedes storage, so a failed replacement can
        // never be destructive. The save happens only on this branch.
        if (await saveKey.run(service.id, shape.key ?? key) === undefined) return;
        setVerdict({ ok: true, costCents: service.costCents });
        saveState({ ...loadState(), connectServiceId: undefined });
        setTimeout(() => onDone(service.id), 1200);
        return;
      }
      setVerdict({
        ok: false,
        text:
          r.reason === 'expired' ? c.errExpired
          : r.reason === 'no-credit' ? c.errNoCredit
          : r.reason === 'network' ? c.errNetwork
          : r.reason === 'wrong-provider' ? (r.message ?? c.errUnknown)
          : r.reason === 'malformed' ? (r.message ?? c.errUnknown)
          : c.errUnknown,
      });
    } finally {
      setChecking(false);
    }
  };

  if (!services) {
    return <p className="small" aria-live="polite">Un momento…</p>;
  }

  if (services.length === 0) {
    // An empty catalogue is a broken installation, not a state she caused.
    return (
      <Callout intent="danger" title="No encuentro los servicios">
        Es un problema de la instalación, no tuyo. Vuelve a instalar Rampa.
      </Callout>
    );
  }

  /* ── One question ─────────────────────────────────────────────────────── */
  if (stage === 'question') {
    /*
     * A `Page` per stage (`041` T022, FR-3901): each stage is a screen with its own
     * question, so each gets the title. The framed `.fieldset` with its legend on the
     * border goes — `composition.css` already said it «reads as broken» — for the bare
     * one: the semantics of a fieldset, the appearance of a section.
     */
    return (
      <Page variant="narrow" {...(banner ? { banner } : {})}
            title={es.onboarding.connectTitle} lede={es.onboarding.connectWhy}>
        <fieldset className="fieldset-bare">
          <legend><h2>{c.cardQuestion}</h2></legend>
          <p className="field-help">{c.cardWhy}</p>
          <div className="row gap2">
            {/*
              Neither answer is endorsed, and that is the point (backlog G60).

              «Sí, puedo» used to be `btn-primary` — blue, the recommended action — with
              a caption underneath promising the *free* service, which is what the other
              answer produces. Pressing the endorsed button lands on a vendor with no
              free tier. This is a question about her school's rules, not an action with
              a better and a worse option.
            */}
            <button className="btn" onClick={() => void answer(true, location)}>
              {c.cardYes}
            </button>
            <button className="btn" onClick={() => void answer(false, location)}>
              {c.cardNo}
            </button>
          </div>
          <p className="field-help">{c.cardNoHint}</p>
        </fieldset>

        {/*
          T018 · FR-708. One quiet line, and "no lo sé" is first-class: it leaves
          the recommendation exactly as it would have been. A teacher who has not
          been told what her school requires must not end up worse off than one
          who has.
        */}
        <details className="details">
          <summary>{c.locationQuestion}</summary>
          <div className="stack gap3 details-body">
            <p className="small">{c.locationWhy}</p>
            <div className="segmented" role="group" aria-label={c.locationQuestion}>
              <button type="button" aria-pressed={location === 'eu'} onClick={() => setLocation('eu')}>
                {c.locationEu}
              </button>
              <button type="button" aria-pressed={location === undefined} onClick={() => setLocation(undefined)}>
                {c.locationUnknown}
              </button>
            </div>
            {/* FR-708a. Never claims that nothing personal leaves. */}
            <p className="small">{c.residual}</p>
          </div>
        </details>
        {aside}
      </Page>
    );
  }

  /* ── The comparison ───────────────────────────────────────────────────── */
  if (stage === 'compare') {
    return (
      <ServiceComparison
        services={services}
        onChoose={pick}
        onBack={() => setStage(reco ? 'recommendation' : 'question')}
      />
    );
  }

  /* ── One recommendation, with its reason ──────────────────────────────── */
  if (stage === 'recommendation') {
    const recommended = services.find((s) => s.id === reco?.serviceId);

    return (
      <Page variant="narrow" {...(banner ? { banner } : {})}
            title={reco?.ok ? c.recommendTitle : c.conflictTitle}>

        {reco?.ok && recommended ? (
          <>
            {/* An object card: the service she is being offered is a thing she picks. */}
            <div className="card card-object stack gap4">
              <div className="stack gap1">
                <span className="svc-name">{recommended.label}</span>
                <span className="meta">{recommended.vendor}</span>
              </div>

              <div className="stack gap2">
                <span className="small"><strong>{c.recommendWhy}</strong></span>
                {/* Generated by the rule, so it cannot drift from the decision. */}
                <p>{reco.reason}</p>
              </div>

              <dl className="facts">
                <dt>{c.colCost}</dt>
                <dd>
                  {recommended.costCents === 0
                    ? 'gratis'
                    : `~${recommended.costCents} céntimo${recommended.costCents === 1 ? '' : 's'}`}
                  {!recommended.costMeasured ? <span className="meta"> ({c.estimate})</span> : null}
                </dd>
                <dt>{c.colWhere}</dt>
                <dd>{recommended.processedIn}</dd>
                <dt>{c.colTrains}</dt>
                <dd>{c.trains[recommended.trainsOnInput] ?? recommended.trainsOnInput}</dd>
                {recommended.freeTier ? (<><dt>{c.colFree}</dt><dd>{recommended.freeTier}</dd></>) : null}
              </dl>

              <span className="meta">
                {recommended.freshness === 'ageing'
                  ? <><Icon name="triangle-alert" /> {c.checkedAgo(recommended.monthsSinceChecked)}</>
                  : c.checkedOn(formatDate(recommended.lastChecked))}
              </span>
            </div>

            <Actions primary={
              <button className="btn btn-primary" onClick={() => pick(recommended.id)}>
                <Icon name="plug" /> {c.recommendUse}
              </button>
            }>
              <button className="btn btn-ghost" onClick={() => setStage('compare')}>
                {c.recommendCompare}
              </button>
            </Actions>
          </>
        ) : (
          <>
            {/* FR-713: a dead end is never the last thing she reads. */}
            <Callout intent="decide" title={reco?.message ?? ''}>{reco?.suggestion ?? ''}</Callout>
            <Actions primary={
              <button className="btn btn-primary" onClick={() => setStage('compare')}>
                {c.recommendCompare}
              </button>
            }>
              <button className="btn btn-ghost" onClick={() => { setStage('question'); setReco(null); }}>
                Cambiar mi respuesta
              </button>
            </Actions>
          </>
        )}

        <p className="small">{c.residual}</p>
        {aside}
      </Page>
    );
  }

  /* ── The walkthrough, and the paste box ───────────────────────────────── */
  if (!service) {
    setStage('question');
    return null;
  }

  return (
    <Walkthrough service={service} {...(banner ? { banner } : {})}
                 onBack={() => setStage(reco ? 'recommendation' : 'question')}>
      <Section>
        {/*
          The paste box, as the `Field` it always was by hand — label, control, hint,
          `aria-describedby` — and in `.input-key`, the class `010` wrote for exactly
          this and nothing ever used: a key is a machine string, and mono is what makes
          a truncated paste visible (`041` T022).
        */}
        <Field label={c.pasteLabel} htmlFor="key" help={<span id="key-hint">{c.pasteHint}</span>}>
          <input className="input input-key" id="key" type="password" value={key}
                 autoComplete="off" spellCheck={false} aria-describedby="key-hint"
                 onChange={(e) => { setKey(e.target.value); setVerdict(null); }} />
        </Field>

        <Actions primary={
          <button className="btn btn-primary" disabled={checking || !key} aria-busy={checking}
                  onClick={() => void check()}>
            {checking ? c.checking : es.onboarding.connectCheck}
          </button>
        } />

        {/*
          `role="status"` rather than a bare `aria-live` div: `aria-label` on a
          generic element is prohibited by ARIA in HTML, and axe flags it as
          serious. The role permits a name and already implies polite.

          Named because this window has more than one polite live region — the
          onboarding step counter is the other — and an unnamed one is
          indistinguishable both to a screen reader user and to a test.
        */}
        <div role="status" aria-label="Resultado">
          {verdict?.ok ? (
            <Callout intent="ok" title={
              verdict.costCents === 0
                ? c.connectedFree
                : c.connectedCost(`unos ${verdict.costCents} céntimo${verdict.costCents === 1 ? '' : 's'}`)
            }>
              {/* FR-724: from the entry, never from a hardcoded three. */}
              Ya puedes adaptar tu primera ficha.
            </Callout>
          ) : verdict ? (
            <Callout intent="danger" title="No he podido conectar">
              {verdict.text}
              {verdict.switchTo ? (
                <div className="row">
                  <button className="btn btn-sm" onClick={() => pick(verdict.switchTo!.id)}>
                    {c.errSwitchTo(verdict.switchTo.label)}
                  </button>
                </div>
              ) : null}
            </Callout>
          ) : null}
        </div>
      </Section>
    </Walkthrough>
  );
}
