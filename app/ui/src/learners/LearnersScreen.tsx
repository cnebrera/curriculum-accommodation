import { useEffect, useState } from 'react';
import { ProfileEditor } from './ProfileEditor.js';
import { ForgetLearner } from './ForgetLearner.js';
import { HandoverReview } from './HandoverReview.js';
import { AxisStrip } from './AxisStrip.js';
import { EmptyState } from '../components/EmptyState.js';
import { Badge } from '../components/Badge.js';
import { useStrings } from '../i18n/context.js';

interface Loaded { code: string; name: string; axes: Record<string, number>; works: number; avoid: number }

/**
 * Her caseload (spec 010 T015).
 *
 * A learner is a row with their barriers visible, not a name and a chevron: the
 * axis strip is the fastest way for her to remember who this is, and it is the
 * thing she is actually looking for when she opens this screen.
 */
export function LearnersScreen() {
  const { t: es } = useStrings();
  const [learners, setLearners] = useState<Loaded[]>([]);
  /**
   * A learner she is removing (003 US4).
   *
   * Before this, erasure had no way in at all: `planForget` and `executeForget`
   * were written, tested and exposed over IPC, and no screen called them — so the
   * one action a school is legally obliged to be able to perform was unreachable.
   */
  const [forgetting, setForgetting] = useState<string | null>(null);
  /** A learner she is preparing a handover packet for (004 US1). */
  const [handing, setHanding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const codes: string[] = await window.rampa.learners.list();
      const names: Record<string, string> = await window.rampa.names.all();
      const rows = await Promise.all(codes.map(async (code) => {
        const l = await window.rampa.learners.load(code);
        return {
          code, name: names[code] ?? code,
          axes: l.profile.axes ?? {},
          works: (l.profile.works ?? []).length,
          avoid: (l.profile.avoid ?? []).length,
        };
      }));
      setLearners(rows);
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  if (handing) {
    const who = learners.find((l) => l.code === handing);
    return (
      <div className="stack gap5">
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => setHanding(null)}>
          ← Volver a mis alumnos
        </button>
        <HandoverReview code={handing} name={who?.name} onDone={() => setHanding(null)} />
      </div>
    );
  }

  if (forgetting) {
    const who = learners.find((l) => l.code === forgetting);
    return (
      <div className="stack gap5">
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setForgetting(null); void refresh(); }}>
          ← Volver a mis alumnos
        </button>
        <ForgetLearner code={forgetting} name={who?.name}
                       onDone={() => { setForgetting(null); void refresh(); }} />
      </div>
    );
  }

  if (editing !== undefined) {
    const who = learners.find((l) => l.code === editing);
    return (
      <div className="stack gap5">
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setEditing(undefined); void refresh(); }}>
          ← Volver a mis alumnos
        </button>
        <h1>{who?.name ?? 'Alumno nuevo'}</h1>
        <ProfileEditor code={editing} onSaved={() => void refresh()} />

        {/*
          Below the editor and set apart, because it is not part of editing a
          profile. Not hidden either: a school has to be able to do this, and
          burying it means she asks somebody to do it in the filesystem instead —
          which reaches neither the journal entries nor the adapted sheets.
        */}
        {editing ? (
          <div className="card stack gap3">
            <span className="small"><strong>Si cambia de tutor el año que viene</strong></span>
            <p className="small" style={{ margin: 0 }}>
              Puedo preparar un documento con lo que has aprendido de él, para quien
              lo tenga después. Lo revisas tú antes: decides qué va y qué no.
            </p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => setHanding(editing)}>
                Preparar el traspaso
              </button>
            </div>
          </div>
        ) : null}

        {editing ? (
          <div className="card card-plain stack gap3">
            <span className="small"><strong>Si este alumno ya no está contigo</strong></span>
            <p className="small" style={{ margin: 0 }}>
              Puedo borrar todo lo suyo: su perfil, tus notas sobre él y sus fichas
              adaptadas. Te enseño la lista antes de tocar nada.
            </p>
            <div className="row">
              <button className="btn btn-danger btn-sm" onClick={() => setForgetting(editing)}>
                Borrar todo lo de {who?.name ?? editing}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack gap5">
      <div className="stack gap2">
        <h1>{es.nav.learners}</h1>
        {learners.length > 0 && (
          <p className="small">
            {learners.length} {learners.length === 1 ? 'alumno' : 'alumnos'}. Los nombres
            solo los ves tú: en los ficheros va un código.
          </p>
        )}
      </div>

      {loading ? (
        <div className="stack gap3" aria-busy="true" aria-label="Cargando">
          {[0, 1].map((i) => <div className="card" key={i} style={{ height: 96, opacity: .5 }} />)}
        </div>
      ) : learners.length === 0 ? (
        <EmptyState
          title="Todavía no hay ningún alumno"
          action={<button className="btn btn-primary" onClick={() => setEditing(null)}>Añadir un alumno</button>}
        >
          Empieza por el que más trabajo te dé. No hace falta ningún diagnóstico:
          con lo que ves en clase es suficiente.
        </EmptyState>
      ) : (
        <>
          <div className="stack gap3">
            {learners.map((l) => (
              <button className="card card-action stack gap3" key={l.code} onClick={() => setEditing(l.code)}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="row gap2">
                    <strong>{l.name}</strong>
                    <Badge>{l.code}</Badge>
                  </span>
                  <span className="small">
                    {l.works} {l.works === 1 ? 'apoyo' : 'apoyos'} · {l.avoid} a evitar
                  </span>
                </div>
                <AxisStrip axes={l.axes} />
              </button>
            ))}
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => setEditing(null)}>Añadir un alumno</button>
          </div>
        </>
      )}
    </div>
  );
}
