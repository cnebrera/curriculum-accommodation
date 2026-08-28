import { useEffect, useState } from 'react';
import { es } from '../i18n/es.js';
import { AxisEditor } from './AxisEditor.js';
import { Notice } from '../components/Notice.js';
import { RepairNotice } from '../components/RepairNotice.js';

export function ProfileEditor({ code, onSaved }: { code: string | null; onSaved: (code: string) => void }) {
  const [current, setCurrent] = useState<string>(code ?? '');
  const [name, setName] = useState('');
  const [axes, setAxes] = useState<Record<string, number>>({});
  const [works, setWorks] = useState('');
  const [avoid, setAvoid] = useState('');
  const [repairs, setRepairs] = useState<Array<{ message: string }>>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (code) {
      void window.rampa.learners.load(code).then((l: any) => {
        setCurrent(l.profile.code);
        setAxes(l.profile.axes ?? {});
        setWorks((l.profile.works ?? []).join('\n'));
        setAvoid((l.profile.avoid ?? []).join('\n'));
        setRepairs(l.repairs ?? []);
      });
      void window.rampa.names.resolve(code).then((n: string | null) => setName(n ?? ''));
    } else {
      void window.rampa.learners.newCode().then(setCurrent);
    }
  }, [code]);

  const save = async () => {
    await window.rampa.learners.save({
      code: current, axes,
      works: works.split('\n').map((s) => s.trim()).filter(Boolean),
      avoid: avoid.split('\n').map((s) => s.trim()).filter(Boolean),
      interests: [], response: {}, language: { instruction: 'es' },
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
          <span className="badge accent">{current || '…'}</span>
          {!code ? <button onClick={() => void window.rampa.learners.newCode().then(setCurrent)}>
            {es.learner.newCode}</button> : null}
        </div>
        <div>
          <label htmlFor="name">{es.learner.nameLabel}</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <h3>{es.learner.axesTitle}</h3>
      <AxisEditor axes={axes} onChange={setAxes} />

      <div>
        <label htmlFor="works">{es.learner.works}</label>
        <textarea id="works" value={works} onChange={(e) => setWorks(e.target.value)}
                  placeholder={'Una cosa por línea\nPor ejemplo: con el primer ejercicio hecho arranca sola'} />
      </div>
      <div>
        <label htmlFor="avoid">{es.learner.avoid}</label>
        <textarea id="avoid" value={avoid} onChange={(e) => setAvoid(e.target.value)}
                  placeholder={'Una cosa por línea\nPor ejemplo: nada con reloj'} />
      </div>

      <div className="row">
        <button className="primary" disabled={!current} onClick={() => void save()}>{es.learner.save}</button>
        {saved ? <span className="badge accent">Guardado</span> : null}
      </div>
    </div>
  );
}
