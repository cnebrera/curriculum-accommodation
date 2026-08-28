import { useEffect, useState } from 'react';
import { es } from '../i18n/es.js';
import { Notice } from '../components/Notice.js';

interface P { id: string; label: string; keyUrl: string; requiresPaymentCard: boolean }

/**
 * The step most likely to lose her (006 FR-403).
 *
 * Not because it is hard, but because none of the vocabulary is familiar:
 * "create an API key" is five unfamiliar words before anything works. So: one
 * plain sentence, a link straight to the exact page, one box, and a result
 * phrased as the question she is actually asking — does it work, and what will
 * this cost me.
 */
export function ConnectStep({ onDone }: { onDone: (providerId: string) => void }) {
  const [providers, setProviders] = useState<P[]>([]);
  const [chosen, setChosen] = useState<string>('');
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  useEffect(() => {
    void window.rampa.providers.list().then((list: P[]) => {
      setProviders(list);
      setChosen(list.find((p) => !p.requiresPaymentCard)?.id ?? list[0]?.id ?? '');
    });
  }, []);

  const provider = providers.find((p) => p.id === chosen);

  const check = async () => {
    setChecking(true); setResult(null);
    try {
      const r = await window.rampa.providers.validate(chosen, key);
      setResult(r);
      if (r.ok) {
        await window.rampa.providers.save(chosen, key.trim());
        setTimeout(() => onDone(chosen), 900);
      }
    } finally { setChecking(false); }
  };

  return (
    <div className="stack">
      <h2>{es.onboarding.connectTitle}</h2>
      <p>{es.onboarding.connectWhy}</p>

      <div className="row">
        {providers.map((p) => (
          <button key={p.id} aria-pressed={p.id === chosen} className={p.id === chosen ? 'primary' : ''}
                  onClick={() => { setChosen(p.id); setResult(null); }}>
            {p.label}
          </button>
        ))}
      </div>

      {provider ? (
        <div className="card stack">
          <p className="small muted" style={{ margin: 0 }}>
            {provider.requiresPaymentCard
              ? 'Este servicio te pedirá una tarjeta al crear la cuenta.'
              : 'Este servicio no te pide tarjeta.'}
          </p>
          <button onClick={() => window.open(provider.keyUrl, '_blank')}>
            {es.onboarding.connectGet}
          </button>
          <div>
            <label htmlFor="key">{es.onboarding.connectPaste}</label>
            <input id="key" type="password" value={key} autoComplete="off" spellCheck={false}
                   onChange={(e) => { setKey(e.target.value); setResult(null); }} />
          </div>
          <div className="row">
            <button className="primary" disabled={!key.trim() || checking} onClick={() => void check()}>
              {checking ? 'Comprobando…' : es.onboarding.connectCheck}
            </button>
          </div>
        </div>
      ) : null}

      {result?.ok ? (
        <Notice kind="info">{es.onboarding.connectOk('unos 3 céntimos')}</Notice>
      ) : result ? (
        <Notice kind="danger">{result.message ?? 'No he podido comprobar la clave.'}</Notice>
      ) : null}
    </div>
  );
}
