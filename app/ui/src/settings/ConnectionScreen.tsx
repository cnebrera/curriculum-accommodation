import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { Badge } from '../components/Badge.js';
import { loadServices, formatDate, type Service } from '../onboarding/services.js';

/**
 * Changing her mind later (009 US5, T036/T037).
 *
 * The free tier she started on runs out, or her school contracts something, or
 * a service changes its terms. None of that should mean starting over — and
 * before this screen existed, changing service meant reinstalling, because the
 * store held exactly one key and the connection step only ran during onboarding.
 *
 * **The stored key is never displayed** (FR-729), not even masked. A screen that
 * receives a credential in order to show four asterisks is a screen that has the
 * credential, and there is no reason for it to.
 */
interface Connection { serviceId: string; verifiedAt: string }

export function ConnectionScreen({ onReconnect }: { onReconnect: (serviceId: string) => void }) {
  const { t: es } = useStrings();
  const c = es.connect;

  const [services, setServices] = useState<Service[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [jurisdictionNote, setJurisdictionNote] = useState<string | null>(null);

  const refresh = async () => {
    const s = await window.rampa.providers.connections() as
      { active: string | null; connected: Connection[] };
    setActive(s.active);
    setConnections(s.connected);
  };

  useEffect(() => {
    void loadServices().then(setServices);
    void refresh();
  }, []);

  const byId = (id: string) => services.find((s) => s.id === id);
  const activeService = active ? byId(active) : undefined;

  const switchTo = async (id: string) => {
    const from = activeService;
    const to = byId(id);
    if (!await window.rampa.providers.activate(id)) return;
    await refresh();

    /**
     * T037 · FR-731. Reminded **once**, on the switch itself, and only when the
     * jurisdiction actually changes.
     *
     * Not a permanent banner: a warning that is always there stops being read
     * within a fortnight. And this is the specific fact her school asked about,
     * so it is the one worth interrupting for.
     */
    if (from && to && from.jurisdiction !== to.jurisdiction) {
      setJurisdictionNote(
        `Antes se procesaba en ${from.processedIn}. Ahora se procesará en ${to.processedIn}. `
        + 'Si en tu centro te preguntaron por esto, es el dato que cambió.',
      );
    } else {
      setJurisdictionNote(null);
    }
  };

  return (
    <div className="stack gap6">
      <div className="stack gap2">
        <h1>Tu servicio de IA</h1>
        <p className="lede">
          Puedes cambiarlo cuando quieras. Lo que ya tenías conectado sigue
          conectado: no hay que volver a pedir ninguna clave.
        </p>
      </div>

      {jurisdictionNote ? (
        <Callout intent="decide" title="Ha cambiado dónde se procesan los datos">
          {jurisdictionNote}
        </Callout>
      ) : null}

      {connections.length === 0 ? (
        <Callout intent="info" title="Todavía no hay ninguno conectado">
          Conecta un servicio para poder adaptar fichas.
        </Callout>
      ) : (
        <div className="stack gap3">
          {connections.map((conn) => {
            const s = byId(conn.serviceId);
            const isActive = conn.serviceId === active;
            return (
              <div className="card stack gap3" key={conn.serviceId}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="stack gap1">
                    <span className="svc-name">{s?.label ?? conn.serviceId}</span>
                    <span className="meta">
                      {/*
                        A key migrated from the single-key store has no date,
                        because none was ever recorded. Saying so is better than
                        stamping today on it.
                      */}
                      {conn.verifiedAt
                        ? `comprobada el ${formatDate(conn.verifiedAt)}`
                        : 'sin fecha de comprobación'}
                    </span>
                  </div>
                  {isActive ? <Badge tone="ok">En uso</Badge> : null}
                </div>

                {s ? (
                  <dl className="facts">
                    <dt>{c.colWhere}</dt><dd>{s.processedIn}</dd>
                    <dt>{c.colCost}</dt>
                    <dd>
                      {s.costCents === 0 ? 'gratis' : `~${s.costCents} céntimo${s.costCents === 1 ? '' : 's'}`}
                      {!s.costMeasured ? <span className="meta"> ({c.estimate})</span> : null}
                    </dd>
                  </dl>
                ) : null}

                <div className="row gap2">
                  {!isActive ? (
                    <button className="btn btn-primary btn-sm" onClick={() => void switchTo(conn.serviceId)}>
                      Usar este
                    </button>
                  ) : null}
                  <button className="btn btn-sm" onClick={() => onReconnect(conn.serviceId)}>
                    Cambiar la clave
                  </button>
                  <button className="btn btn-danger btn-sm"
                          onClick={() => void window.rampa.providers.forget(conn.serviceId).then(refresh)}>
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="stack gap3">
        <h2>Conectar otro</h2>
        <div className="row gap2">
          {services
            .filter((s) => !connections.some((conn) => conn.serviceId === s.id))
            .map((s) => (
              <button className="btn btn-sm" key={s.id} onClick={() => onReconnect(s.id)}>
                {s.label}
              </button>
            ))}
        </div>
        <p className="small">{c.residual}</p>
      </div>
    </div>
  );
}
