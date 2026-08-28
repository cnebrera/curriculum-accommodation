import { useEffect, useState } from 'react';
import { es } from '../i18n/es.js';
import { Notice } from '../components/Notice.js';

/** A default she can accept without making a decision (006 FR-402). */
export function VaultStep({ onDone }: { onDone: (root: string) => void }) {
  const [suggested, setSuggested] = useState('');
  const [busy, setBusy] = useState(false);
  const [encryption, setEncryption] = useState<{ available: boolean; message: string } | null>(null);

  useEffect(() => { void window.rampa.vault.defaultPath().then(setSuggested); }, []);

  const accept = async (root?: string) => {
    setBusy(true);
    try {
      const chosen = root ? await window.rampa.vault.use(root) : await window.rampa.vault.choose();
      if (!chosen) return;
      setEncryption(await window.rampa.names.status());
      onDone(chosen);
    } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <h2>{es.onboarding.vaultTitle}</h2>
      <p>{es.onboarding.vaultWhy}</p>
      <div className="card">
        <code>{suggested || '…'}</code>
      </div>
      {encryption && !encryption.available ? (
        <Notice kind="warn" title="Aviso sobre los nombres">{encryption.message}</Notice>
      ) : null}
      <div className="row">
        <button className="primary" disabled={busy || !suggested} onClick={() => void accept(suggested)}>
          {es.onboarding.vaultAccept}
        </button>
        <button disabled={busy} onClick={() => void accept()}>{es.onboarding.vaultChoose}</button>
      </div>
    </div>
  );
}
