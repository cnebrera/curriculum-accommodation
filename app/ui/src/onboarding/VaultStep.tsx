import { useEffect, useState } from 'react';
import { useChooseVault, useUseVault, useDefaultVaultPath } from '../data/vault.js';
import { useLookForCorpus, useAcceptCorpus } from '../data/corpus-update.js';
import { useNameStatusCheck } from '../data/names.js';
import { useStrings } from '../i18n/context.js';
import { Notice } from '../components/Notice.js';

/** A default she can accept without making a decision (006 FR-402). */
export function VaultStep({ onDone }: { onDone: (root: string) => void }) {
  const { t: es } = useStrings();
  const [busy, setBusy] = useState(false);
  const chooseVault = useChooseVault();
  const corpus = useLookForCorpus();
  const acceptCorpus = useAcceptCorpus();
  const [corpusSaid, setCorpusSaid] = useState<string | null>(null);

  /**
   * What to say after looking, and why accepting here is automatic.
   *
   * The offer screen exists for a **correction to a corpus she has been using** — that
   * is the case where reading before applying matters, because the criterion changes
   * under work she has already done. On the first run she has done none: there is
   * nothing to change under her, and asking her to review a diff against a corpus she
   * has never used would be asking her to review Rampa's own defaults before she has
   * seen the application.
   *
   * So here it is «traer lo más nuevo» and it applies. In Configuración it is an offer.
   */
  const said = (r: Awaited<ReturnType<typeof corpus.run>>): string => {
    if (!r) return 'No he podido mirarlo ahora. Lo tienes en Configuración cuando quieras.';
    if (r.of === 'none') return 'Ya tienes el criterio más nuevo.';
    if (r.of === 'refused') return r.say;
    void acceptCorpus.run();
    return `Traído: versión ${r.version}. ${r.summary}`;
  };
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

      {/*
        El criterio pedagógico, aquí y no en un paso propio (`034`, decisión de Carlos:
        «no metas más pasos, que sea uno de los pasos de configurarlo»).

        **Debajo de los botones de la carpeta**, y eso lo encontró mirar la pantalla: la
        primera versión lo puso entre la ruta y los botones, así que se leía «¿dónde
        guardo tus cosas?», una ruta, un botón sobre otra cosa, y sólo entonces los
        botones que contestaban a la pregunta. El paso pregunta una cosa; esto es lo
        segundo que hay en él, y va donde va lo segundo.

        Va con el que ya existe porque es la misma pregunta —dejar Rampa lista— y porque
        un paso más en el arranque es un paso más antes de que pueda hacer nada. Trae lo
        que haya publicado el proyecto; si no hay red o no hay nada nuevo, **no dice nada
        y sigue**: Rampa ya lleva un criterio dentro, así que esto es «traerte lo más
        nuevo», nunca «sin esto no funciono».
      */}
      <div className="stack gap2">
        <div className="row gap2" style={{ alignItems: 'center' }}>
          <button className="btn" disabled={busy || corpus.busy}
                  onClick={() => void corpus.run().then((r) => setCorpusSaid(said(r)))}>
            {corpus.busy ? 'Trayendo el criterio…' : 'Traer el criterio más nuevo'}
          </button>
          {corpusSaid ? <span className="small">{corpusSaid}</span> : null}
        </div>
        <p className="field-help">
          Las recetas y las instrucciones con las que adapto ya vienen dentro de Rampa.
          Esto se conecta al repositorio del proyecto y trae la versión más nueva si la
          hay. Puedes hacerlo ahora o luego, en Configuración.
        </p>
      </div>

    </div>
  );
}
