import { useState } from 'react';
import { Page } from '../shell/Page.js';
import { ProfileEditor } from './ProfileEditor.js';
import { ForgetLearner } from './ForgetLearner.js';
import { HandoverReview } from './HandoverReview.js';
import { RecordScreen } from './RecordScreen.js';
import { AxisStrip } from './AxisStrip.js';
import { Badge } from '../components/Badge.js';
import { useStrings } from '../i18n/context.js';
import { useLearners, type LearnerRow } from '../data/learners.js';
import { Loaded } from '../data/Loaded.js';

/**
 * Her caseload (spec 010 T015).
 *
 * A learner is a row with their barriers visible, not a name and a chevron: the
 * axis strip is the fastest way for her to remember who this is, and it is the
 * thing she is actually looking for when she opens this screen.
 */
export function LearnersScreen() {
  const { t: es } = useStrings();
  /*
   * One hook, and the join lives in it (013 FR-1107). This screen used to list
   * the codes, fetch the name map, load every profile and zip the three by hand
   * — with a `loading` flag it set and cleared itself, a bespoke skeleton, and
   * no error branch at all. `learners:list` rejecting left it loading for ever.
   */
  const roster = useLearners();
  const learners: LearnerRow[] = roster.state === 'ready' ? roster.value : [];
  const refresh = roster.reload;
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
  /** A learner whose record she is reading (014). */
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null | undefined>(undefined);

  if (viewing) {
    const who = learners.find((l) => l.code === viewing);
    return <RecordScreen code={viewing} name={who?.name} onBack={() => setViewing(null)} />;
  }

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
      <Page title={`Borrar todo lo de ${who?.name ?? forgetting}`}>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setForgetting(null); refresh(); }}>
          ← Volver a mis alumnos
        </button>
        <ForgetLearner code={forgetting} name={who?.name}
                       onDone={() => { setForgetting(null); refresh(); }} />
      </Page>
    );
  }

  if (editing !== undefined) {
    const who = learners.find((l) => l.code === editing);
    return (
      <Page title={who?.name ?? 'Alumno nuevo'}>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setEditing(undefined); refresh(); }}>
          ← Volver a mis alumnos
        </button>
        <ProfileEditor code={editing} onSaved={() => refresh()} />

        {/*
          Below the editor and set apart, because it is not part of editing a
          profile. Not hidden either: a school has to be able to do this, and
          burying it means she asks somebody to do it in the filesystem instead —
          which reaches neither the journal entries nor the adapted sheets.
        */}
        {editing ? (
          <div className="card stack gap3">
            <span className="small"><strong>Lo que le has preparado</strong></span>
            <p className="small" style={{ margin: 0 }}>
              Todo lo que ha salido de aquí para este alumno, con lo que trajiste y lo
              que salió. También está en su carpeta, en texto plano.
            </p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => setViewing(editing)}>
                Ver lo que le he preparado
              </button>
            </div>
          </div>
        ) : null}

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
      </Page>
    );
  }

  return (
    <Page title={es.nav.learners}
          lede={learners.length > 0
            ? `${learners.length} ${learners.length === 1 ? 'alumno' : 'alumnos'}. Los nombres solo los ves tú: en los ficheros va un código.`
            : 'Los nombres solo los ves tú: en los ficheros va un código.'}>
      <Loaded
        from={roster}
        busyLabel="Un momento, que busco tus alumnos…"
        empty={{
          title: 'Todavía no hay ningún alumno',
          body: 'Empieza por el que más trabajo te dé. No hace falta ningún diagnóstico: con lo que ves en clase es suficiente.',
          action: <button className="btn btn-primary" onClick={() => setEditing(null)}>Añadir un alumno</button>,
        }}
      >
        {(rows) => (
          <>
            <div className="stack gap3">
              {rows.map((l) => (
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
      </Loaded>
    </Page>
  );
}
