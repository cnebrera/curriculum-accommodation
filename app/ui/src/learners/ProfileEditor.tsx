import { useEffect, useState } from 'react';
import { useLoadLearner, useSaveLearner, useNewLearnerCode } from '../data/learners.js';
import { useResolveName, useSetName } from '../data/names.js';
import { useStrings } from '../i18n/context.js';
import { AxisEditor } from './AxisEditor.js';
import { YearPicker, type Who } from './YearPicker.js';
import { Notice } from '../components/Notice.js';
import { PictogramSetSection } from '../pictograms/PictogramSetSection.js';
import { RepairNotice } from '../components/RepairNotice.js';

export function ProfileEditor({ code, onSaved }: { code: string | null; onSaved: (code: string) => void }) {
  const { t: es } = useStrings();
  const [current, setCurrent] = useState<string>(code ?? '');
  const [name, setName] = useState('');
  const [axes, setAxes] = useState<Record<string, number>>({});
  const [works, setWorks] = useState('');
  const [avoid, setAvoid] = useState('');
  /** Who he is (011): age, year and stage, filled by one choice. */
  const [who, setWho] = useState<Who>({});
  const [interests, setInterests] = useState('');
  const [response, setResponse] = useState('');
  /**
   * Pictogram support (018 T017, FR-1605/1606).
   *
   * A control and not an inference. This is the one family that **adds** to the
   * page, and it is the most visible difference there is — a child in an aula
   * ordinaria holding a sheet covered in pictograms while thirty classmates hold a
   * plain one is being marked out by the tool meant to include him. No axis value
   * reaches it, so this checkbox is the only way it turns on.
   */
  const [pictos, setPictos] = useState<{ enabled: boolean; scope: string }>(
    { enabled: false, scope: 'vocabulary' });
  /**
   * Everything the schema knows and this form does not (T092c).
   *
   * Before this, save() sent `interests: [], response: {}` unconditionally, so
   * opening a learner in the app and pressing Guardar **deleted** whatever the
   * teacher had written by hand in her own vault. Her words, lost by us — the
   * opposite of what FR-410 promises. Anything not surfaced here is carried
   * through untouched.
   */
  const [carried, setCarried] = useState<Record<string, unknown>>({});
  const [repairs, setRepairs] = useState<Array<{ message: string }>>([]);
  const [saved, setSaved] = useState(false);
  const loadLearner = useLoadLearner();
  const saveLearner = useSaveLearner();
  const newCode = useNewLearnerCode();
  const resolveName = useResolveName();
  const setNameFor = useSetName();
  const failure = saveLearner.error ?? setNameFor.error ?? loadLearner.error ?? null;

  useEffect(() => {
    if (code) {
      void loadLearner.run(code).then((raw) => {
        if (!raw) return;
        const l = raw as any;
        const { code: _c, axes, works, avoid, interests, response,
                age, year, stage, age_recorded: _ar, pictograms, ...rest } = l.profile ?? {};
        setCurrent(l.profile.code);
        setAxes(axes ?? {});
        setWho({ age, year, stage });
        setWorks((works ?? []).join('\n'));
        setAvoid((avoid ?? []).join('\n'));
        setInterests((interests ?? []).join(', '));
        setResponse(Object.entries(response ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'));
        setPictos({
          enabled: pictograms?.enabled === true,
          scope: pictograms?.scope ?? 'vocabulary',
        });
        /*
         * `overrides` is carried rather than surfaced: her school's own picture for
         * «recreo» is a thing she edits in the vault, and a form field for a map
         * would be a worse editor than a text file.
         */
        setCarried({
          ...rest,
          ...(pictograms?.overrides ? { _pictoOverrides: pictograms.overrides } : {}),
        });
        setRepairs(l.repairs ?? []);
      });
      void resolveName.run(code).then((n) => setName(n ?? ''));
    } else {
      void newCode.run().then((c) => { if (c) setCurrent(c); });
    }
  }, [code]);

  const save = async () => {
    const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    const responseMap: Record<string, string> = {};
    for (const line of lines(response)) {
      const at = line.indexOf(':');
      if (at > 0) responseMap[line.slice(0, at).trim()] = line.slice(at + 1).trim();
      else responseMap['default'] = line;
    }
    const stored = await saveLearner.run({
      // Carried fields first so the form's own values win, and nothing the
      // teacher wrote by hand is dropped just because this form has no input.
      ...carried,
      // Not a profile field: it is where this form parks her overrides while it
      // edits everything else.
      _pictoOverrides: undefined,
      code: current, axes,
      works: lines(works),
      avoid: lines(avoid),
      interests: interests.split(',').map((s) => s.trim()).filter(Boolean),
      response: responseMap,
      language: (carried['language'] as Record<string, string>) ?? { instruction: 'es' },
      ...who,
      /*
       * The date she wrote it, so a stale age is visible rather than drifting
       * silently. Only stamped when there is an age to stamp.
       */
      ...(who.age !== undefined ? { age_recorded: new Date().toISOString().slice(0, 10) } : {}),
      /*
       * FR-1606 · the **decision**, not the setting.
       *
       * `decided_on` is stamped when she turns it on, because SC-1603 is «no
       * profile enables pictograms without a recorded human decision» — and a flag
       * with no date is indistinguishable from a flag something else set. When it
       * is off the whole object is omitted rather than written as `false`: absent
       * means off, and there is nothing to date.
       */
      ...(pictos.enabled ? {
        pictograms: {
          enabled: true,
          scope: pictos.scope,
          decided_on: new Date().toISOString().slice(0, 10),
          overrides: (carried['_pictoOverrides'] as Record<string, string>) ?? {},
        },
      } : {}),
    });
    // Nothing follows a failed save. The screen used to set `saved` and call
    // `onSaved` unconditionally, so a profile that never reached disk still said
    // «Guardado» and sent her back to a list that had not changed.
    if (stored === undefined) return;
    if (name.trim() && await setNameFor.run(current, name.trim()) === undefined) return;
    setSaved(true);
    onSaved(current);
  };

  return (
    <div className="stack">
      <RepairNotice repairs={repairs} />

      <div className="card stack">
        <Notice kind="info">{es.learner.codeExplain}</Notice>
        <div className="row">
          <span className="badge badge-accent">{current || '…'}</span>
          {!code ? <button className="btn" onClick={() => void newCode.run().then((c) => { if (c) setCurrent(c); })}>
            {es.learner.newCode}</button> : null}
        </div>
        <div>
          <label htmlFor="name">{es.learner.nameLabel}</label>
          <input className="input" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <h3>{es.learner.axesTitle}</h3>
      {/*
        Before the axes, deliberately. Who he is comes before what he finds hard —
        both in how a teacher thinks about a child and in what she can answer
        without stopping to consider.
      */}
      <YearPicker value={who} onChange={setWho} />

      <AxisEditor axes={axes} onChange={setAxes} />

      <div>
        <label htmlFor="works">{es.learner.works}</label>
        <textarea className="textarea" id="works" value={works} onChange={(e) => setWorks(e.target.value)}
                  placeholder={'Una cosa por línea\nPor ejemplo: con el primer ejercicio hecho arranca sola'} />
      </div>
      <div>
        <label htmlFor="avoid">{es.learner.avoid}</label>
        <textarea className="textarea" id="avoid" value={avoid} onChange={(e) => setAvoid(e.target.value)}
                  placeholder={'Una cosa por línea\nPor ejemplo: nada con reloj'} />
      </div>

      <div>
        <label htmlFor="interests">Le interesa</label>
        <input className="input" id="interests" type="text" value={interests}
               onChange={(e) => setInterests(e.target.value)}
               placeholder="Separado por comas. Por ejemplo: dinosaurios, fútbol" />
      </div>
      <div>
        <label htmlFor="response">Cómo puede responder</label>
        <textarea className="textarea" id="response" value={response} onChange={(e) => setResponse(e.target.value)}
                  placeholder={'Una por línea, con dos puntos\nPor ejemplo: escritura: dicta y un adulto transcribe'} />
      </div>

      {/*
        The one decision in this form that is about how a child is seen rather than
        about what he can do. It says what it costs, because «por si acaso» has a
        social cost here that no other family has.
      */}
      <fieldset className="fieldset-bare">
        <legend><h3>Pictogramas</h3></legend>
        <label className="check" htmlFor="pictos-on">
          <input type="checkbox" id="pictos-on" checked={pictos.enabled}
                 onChange={(e) => setPictos((p) => ({ ...p, enabled: e.target.checked }))} />
          <span>Usa pictogramas</span>
        </label>
        <p className="field-help">
          Sólo si ya los usa. Si lee, aunque sea despacio, los pictogramas le añaden
          trabajo — y una hoja llena de dibujos en un aula donde nadie más la tiene
          se ve desde la última fila.
        </p>
        {pictos.enabled ? (
          <div className="field">
            <label htmlFor="pictos-scope">Dónde</label>
            <select className="select" id="pictos-scope" value={pictos.scope}
                    onChange={(e) => setPictos((p) => ({ ...p, scope: e.target.value }))}>
              <option value="vocabulary">Sólo en el vocabulario clave</option>
              <option value="instructions">Sólo en lo que hay que hacer</option>
              <option value="all">En todo</option>
            </select>
            <p className="field-help">
              «En todo» es para quien lee con pictogramas como vía principal. Es el
              caso menos frecuente.
            </p>
          </div>
        ) : null}
        {/*
          The set, at the moment it becomes necessary. A settings page she has to
          find first would mean turning the family on and getting nothing, with no
          idea why.

          **Outside the `.field`, and that is the point** (023 T024). It was inside
          it, and `.field` carries `max-width: var(--measure-field)` — 480px, which is
          right for a `select` and wrong for a licence, a box she types words into and
          a panel of results. Measured at 1366px wide: the block sat in 480px with a
          third of the screen empty beside it. It is not part of the «Dónde» control,
          so it is not inside its field.
        */}
        {pictos.enabled ? <PictogramSetSection compact /> : null}
      </fieldset>

      <div className="row">
        <button className="btn btn-primary" disabled={!current || saveLearner.busy}
                aria-busy={saveLearner.busy} onClick={() => void save()}>{es.learner.save}</button>
        {saved && !failure ? <span className="badge badge-accent">Guardado</span> : null}
        {/* And when it did not save, she is told so instead of being told the
            opposite. */}
        {failure ? <span className="small" role="alert">{failure.message}</span> : null}
      </div>
    </div>
  );
}
