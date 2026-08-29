import { useEffect, useState } from 'react';
import { Notice } from '../components/Notice.js';

interface Theme {
  text: string;
  occurrences: Array<{ date: string | null; text: string }>;
}
interface Proposals {
  learnerThemes: Array<{ code: string; themes: Theme[] }>;
  archive: Array<{ path: string; because: 'promoted' | 'superseded' }>;
  retention: Array<{ code: string; lastActivity: string | null; daysInactive: number | null }>;
  houseOverflowing: boolean;
  houseChars: number;
}

/**
 * "Revisar lo aprendido" — the maintenance half of the loop (003 US3, T093).
 *
 * Every item here is a proposal with its evidence attached, and nothing happens
 * until she says so. The evidence is the point: "three times, on these dates" is
 * a judgement she can confirm, whereas a bare suggestion is one she
 * rubber-stamps — and a rubber-stamped memory is worse than no memory, because
 * she will believe it.
 */
export function ConsolidateSection({ names }: { names: Record<string, string> }) {
  const [p, setP] = useState<Proposals | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);

  const refresh = async () => {
    setBusy(true);
    try { setP(await window.rampa.memory.consolidate()); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const promote = async (code: string, text: string, destination: 'avoid' | 'works') => {
    await window.rampa.memory.capture({
      scope: 'learner', learner: code, destination,
      heading: text.slice(0, 40), text,
    });
    setApplied((a) => [...a, text]);
    await refresh();
  };

  const archive = async (path: string) => {
    await window.rampa.memory.archive(path);
    setApplied((a) => [...a, path]);
    await refresh();
  };

  const show = (code: string) => names[code] ?? code;
  const nothing = p && !p.learnerThemes.length && !p.archive.length
    && !p.retention.length && !p.houseOverflowing;

  return (
    <div className="stack">
      <h2>Revisar lo aprendido</h2>
      <p className="muted small">
        Cada pocas semanas merece la pena mirar esto. Yo solo propongo: no cambio
        nada sin que me lo digas, y no borro nada nunca.
      </p>

      {busy && !p ? <p className="muted">Mirando…</p> : null}
      {nothing ? <Notice kind="info">Nada que consolidar por ahora.</Notice> : null}

      {p?.houseOverflowing ? (
        <Notice kind="warn" title="Tus notas de cómo trabajas se han hecho largas">
          Van {p.houseChars} caracteres. Esto era una guía de estilo y se está
          convirtiendo en un diario: si la resumes, te sirve más.
        </Notice>
      ) : null}

      {p?.learnerThemes.map(({ code, themes }) => (
        <div className="card stack" key={code}>
          <strong>{show(code)} · esto se repite</strong>
          {themes.map((t, i) => (
            <div key={i} className="stack">
              <p style={{ margin: 0 }}>{t.text}</p>
              <details>
                <summary className="small muted">
                  {t.occurrences.length} veces — ver cuándo
                </summary>
                <ul className="small">
                  {t.occurrences.map((o, j) => (
                    <li key={j}>{o.date ?? 'sin fecha'} — {o.text}</li>
                  ))}
                </ul>
              </details>
              <div className="row">
                <button className="btn" onClick={() => void promote(code, t.text, 'avoid')}>
                  Fijarlo en «evitar»
                </button>
                <button className="btn" onClick={() => void promote(code, t.text, 'works')}>
                  Fijarlo en «lo que funciona»
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {p?.archive.length ? (
        <div className="card stack">
          <strong>Notas que ya han cumplido su función</strong>
          <p className="small muted" style={{ margin: 0 }}>
            No se borran: se guardan aparte, por si algún día hay que mirar de dónde
            salió una regla.
          </p>
          {p.archive.map((a) => (
            <div className="row" key={a.path}>
              <span className="small">
                {a.path.split('/').pop()}{' '}
                <span className="badge">
                  {a.because === 'promoted' ? 'ya promovida' : 'hay una más nueva'}
                </span>
              </span>
              <button className="btn" onClick={() => void archive(a.path)}>Guardar aparte</button>
            </div>
          ))}
        </div>
      ) : null}

      {p?.retention.length ? (
        <Notice kind="warn" title="Hace mucho que no tocas estos alumnos">
          <ul>
            {p.retention.map((r) => (
              <li key={r.code}>
                {show(r.code)} — última nota {r.lastActivity} ({r.daysInactive} días).
                Si ya no está contigo, puedes borrar sus datos desde su ficha.
              </li>
            ))}
          </ul>
          <p className="small" style={{ margin: '8px 0 0' }}>
            No borro nada por mi cuenta. Solo te lo recuerdo.
          </p>
        </Notice>
      ) : null}

      {applied.length ? (
        <Notice kind="info">Hecho. {applied.length} cambio(s) aplicados con tu confirmación.</Notice>
      ) : null}
    </div>
  );
}
