import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { AxisEditor } from './AxisEditor.js';
import { YearPicker, type Who } from './YearPicker.js';
import { Notice } from '../components/Notice.js';
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

  useEffect(() => {
    if (code) {
      void window.rampa.learners.load(code).then((l: any) => {
        const { code: _c, axes, works, avoid, interests, response,
                age, year, stage, age_recorded: _ar, ...rest } = l.profile ?? {};
        setCurrent(l.profile.code);
        setAxes(axes ?? {});
        setWho({ age, year, stage });
        setWorks((works ?? []).join('\n'));
        setAvoid((avoid ?? []).join('\n'));
        setInterests((interests ?? []).join(', '));
        setResponse(Object.entries(response ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'));
        setCarried(rest);
        setRepairs(l.repairs ?? []);
      });
      void window.rampa.names.resolve(code).then((n: string | null) => setName(n ?? ''));
    } else {
      void window.rampa.learners.newCode().then(setCurrent);
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
    await window.rampa.learners.save({
      // Carried fields first so the form's own values win, and nothing the
      // teacher wrote by hand is dropped just because this form has no input.
      ...carried,
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
    });
    if (name.trim()) await window.rampa.names.set(current, name.trim());
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
          {!code ? <button className="btn" onClick={() => void window.rampa.learners.newCode().then(setCurrent)}>
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

      <div className="row">
        <button className="btn btn-primary" disabled={!current} onClick={() => void save()}>{es.learner.save}</button>
        {saved ? <span className="badge badge-accent">Guardado</span> : null}
      </div>
    </div>
  );
}
