import { useEffect, useState } from 'react';
import { useChooseVault, useUseVault, useDefaultVaultPath } from '../data/vault.js';
import { useNameStatusCheck } from '../data/names.js';
import { useStrings } from '../i18n/context.js';
import { Notice } from '../components/Notice.js';

/** A default she can accept without making a decision (006 FR-402). */
export function VaultStep({ onDone }: { onDone: (root: string) => void }) {
  const { t: es } = useStrings();
  const [busy, setBusy] = useState(false);
  const chooseVault = useChooseVault();
  const useThisVault = useUseVault();
  const nameStatus = useNameStatusCheck();
  const [encryption, setEncryption] = useState<{ available: boolean; message: string } | null>(null);

  const suggestedPath = useDefaultVaultPath();
  const suggested = suggestedPath.state === 'ready' ? suggestedPath.value : '';

  const accept = async (root?: string) => {
    setBusy(true);
    try {
      const chosen = root ? await useThisVault.run(root) : await chooseVault.run();
      if (!chosen) return;
      setEncryption(await nameStatus.run() as { available: boolean; message: string });
      onDone(chosen);
    } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <h2>{es.onboarding.vaultTitle}</h2>
      <p>{es.onboarding.vaultWhy}</p>
      {/* `030` FR-2812: the absence, said where somebody would otherwise pick a shared
          OneDrive folder. There is no shared-vault mode to offer, and this is why. */}
      <p className="small">{es.onboarding.vaultAlone}</p>
      <div className="card">
        <code>{suggested || '…'}</code>
      </div>
      {encryption && !encryption.available ? (
        <Notice kind="warn" title="Aviso sobre los nombres">{encryption.message}</Notice>
      ) : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !suggested} onClick={() => void accept(suggested)}>
          {es.onboarding.vaultAccept}
        </button>
        <button className="btn" disabled={busy} onClick={() => void accept()}>{es.onboarding.vaultChoose}</button>
      </div>
    </div>
  );
}
