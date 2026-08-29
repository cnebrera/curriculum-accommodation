import { useEffect, useState } from 'react';
import { load, save, type DisplayPrefs } from './preferences.js';

/**
 * Her display preferences (spec 010 US3, T028).
 *
 * Described in her words, never as standards: "Letra más grande", not
 * "escala tipográfica". A teacher does not need to know what AA is to need
 * bigger type.
 *
 * Deliberately **not** a first-run question (FR-809). It sits in the rail where
 * she can find it when she wants it, and the operating system's own settings are
 * already honoured without asking.
 */
const OPTIONS = {
  text: [
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Grande' },
    { value: 'xlarge', label: 'Muy grande' },
  ],
  theme: [
    { value: 'system', label: 'Como el sistema' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
  ],
} as const;

export function DisplayPreferences() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<DisplayPrefs | null>(null);

  useEffect(() => { void load().then(setPrefs); }, []);

  const set = <K extends keyof DisplayPrefs>(key: K, value: DisplayPrefs[K]) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    void save(next);
  };

  if (!prefs) return null;

  return (
    <>
      <button
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">Aa</span> Cómo se ve
      </button>

      {open && (
        <div className="card stack gap4" role="group" aria-label="Cómo se ve Rampa">
          <div className="stack gap2">
            <span className="small"><strong>Tamaño de la letra</strong></span>
            <div className="segmented" role="group" aria-label="Tamaño de la letra">
              {OPTIONS.text.map((o) => (
                <button key={o.value} type="button"
                        aria-pressed={prefs.text === o.value}
                        onClick={() => set('text', o.value)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="stack gap2">
            <span className="small"><strong>Colores</strong></span>
            <div className="segmented" role="group" aria-label="Colores">
              {OPTIONS.theme.map((o) => (
                <button key={o.value} type="button"
                        aria-pressed={prefs.theme === o.value}
                        onClick={() => set('theme', o.value)}>{o.label}</button>
              ))}
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={prefs.contrast === 'high'}
                   onChange={(e) => set('contrast', e.target.checked ? 'high' : 'normal')} />
            <span className="lbl">Más contraste
              <span className="sub">Negro sobre blanco, sin sombras. Si te cuesta leer la pantalla.</span></span>
          </label>

          <label className="check">
            <input type="checkbox" checked={prefs.motion === 'reduced'}
                   onChange={(e) => set('motion', e.target.checked ? 'reduced' : 'normal')} />
            <span className="lbl">Menos movimiento
              <span className="sub">Quita las transiciones. No se pierde nada: ninguna dice nada.</span></span>
          </label>

          <p className="small" style={{ margin: 0 }}>
            Esto es solo para ti y para este ordenador. No viaja con tus alumnos
            ni con lo que compartes.
          </p>
        </div>
      )}
    </>
  );
}
