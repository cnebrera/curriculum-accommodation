import { useEffect, useRef, useState } from 'react';
import { useLoadLearner, useSaveLearner, useNewLearnerCode, useKnownAreas } from '../data/learners.js';
import { useResolveName, useSetName } from '../data/names.js';
import { useStrings } from '../i18n/context.js';
import { AxisEditor } from './AxisEditor.js';
import { VehicularMark } from './VehicularMark.js';
import { YearPicker, type Who } from './YearPicker.js';
import { LearnerPictograms } from '../pictograms/LearnerPictograms.js';
import { Section, Field, Actions } from '../shell/Page.js';
import { RepairNotice } from '../components/RepairNotice.js';

export function ProfileEditor({ code, onSaved, onConfigure }: {
  code: string | null;
  onSaved: (code: string) => void;
  /**
   * Take her to Configuración ▸ Pictogramas, and bring her back (`025` FR-2303/2304).
   *
   * Passed in rather than dispatched here: the route lives in `App.tsx` and knowing
   * where she came from is route state, which is precisely what both of this project's
   * navigation defects got wrong by keeping it in a component.
   */
  onConfigure: () => void;
}) {
  const { t: es } = useStrings();
  const [current, setCurrent] = useState<string>(code ?? '');
  const [name, setName] = useState('');
  const [axes, setAxes] = useState<Record<string, number>>({});
  /**
   * Per-area CUR (`032` FR-3001). Empty until she details one, and **written only when
   * non-empty** — an empty map sent on every save would bump her vault's schema version
   * for nothing (FR-3005).
   */
  const [curAreas, setCurAreas] = useState<Record<string, number>>({});
  /** The vehicular mark (`033` FR-3101). Absent until she says something about it. */
  const [vehicular, setVehicular] = useState<
    { intensity: number; languages: string[]; noted_on: string } | undefined>(undefined);
  /** The subjects this vault already knows, to suggest from (FR-3007). */
  const areaVocabulary = useKnownAreas(code ?? undefined);
  const [works, setWorks] = useState('');
  const [avoid, setAvoid] = useState('');
  /**
   * When each preference was noted (`004` FR-303 as amended, decision P44).
   *
   * Carried from the profile and **extended, never rewritten**: a line already in
   * the vault keeps whatever date it had — including none — and a line she adds
   * today gets today's. Stamping every line on every save would be the same
   * fabrication the handover packet was fixed for, moved one file upstream: a
   * preference noted in October would be dated whenever she last opened the form.
   */
  const [notedOn, setNotedOn] = useState<Record<string, string>>({});
  /**
   * The preferences as they were on disk, so «new» has a meaning.
   *
   * A `ref` and not state: nothing renders from it, and a re-render must not make
   * a line she has not touched look new.
   */
  const loadedPreferences = useRef<Record<string, true>>({});
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
  const [pictos, setPictos] = useState<{
    enabled: boolean; scope: string; overrides: Record<string, string>;
  }>({ enabled: false, scope: 'vocabulary', overrides: {} });
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
        const { code: _c, axes, cur_areas, vehicular: veh, works, avoid, interests, response,
                age, year, stage, age_recorded: _ar, pictograms, ...rest } = l.profile ?? {};
        setCurrent(l.profile.code);
        setAxes(axes ?? {});
        setCurAreas(cur_areas ?? {});
        setVehicular(veh);
        setWho({ age, year, stage });
        setWorks((works ?? []).join('\n'));
        setAvoid((avoid ?? []).join('\n'));
        setNotedOn((l.profile as { noted_on?: Record<string, string> }).noted_on ?? {});
        loadedPreferences.current = Object.fromEntries(
          [...(works ?? []), ...(avoid ?? [])].map((t) => [t, true as const]));
        setInterests((interests ?? []).join(', '));
        setResponse(Object.entries(response ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'));
        setPictos({
          enabled: pictograms?.enabled === true,
          scope: pictograms?.scope ?? 'vocabulary',
          overrides: pictograms?.overrides ?? {},
        });
        /*
         * `overrides` used to be carried here rather than surfaced, on the argument
         * that «a form field for a map would be a worse editor than a text file».
         * True, and it left a MUST of `018` (FR-1612, the first rung of the
         * precedence in `match.ts`) satisfiable **only** by editing YAML by hand —
         * and G30, which recorded exactly that, was closed «by `024`», which built
         * the vocabulary chooser and not this one (review COD-25, decision P48).
         *
         * It is a control now, and the vault file is still the other editor.
         */
        setCarried({ ...rest });
        setRepairs(l.repairs ?? []);
      });
      void resolveName.run(code).then((n) => setName(n ?? ''));
    } else {
      void newCode.run().then((c) => { if (c) setCurrent(c); });
    }
  }, [code]);

  const save = async () => {
    const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    /*
     * A date for the lines that do not have one **and are new**.
     *
     * «New» is «not in what we loaded», which is why `notedOn` is state and not a
     * derivation: a line that was already in the vault with no date keeps none,
     * because the packet must be able to say «no consta». And a line she removes
     * takes its date with it, so the map does not grow for ever with the history
     * of preferences that are no longer true.
     */
    const datedNow = (
      w: string[], a: string[], previous: Record<string, string>,
    ): Record<string, string> => {
      const stamp = new Date().toISOString().slice(0, 10);
      const out: Record<string, string> = {};
      for (const text of [...w, ...a]) {
        const had = previous[text];
        if (had) { out[text] = had; continue; }
        // Not in the loaded profile at all: she is writing it now.
        if (!(text in loadedPreferences.current)) out[text] = stamp;
      }
      return out;
    };
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
      /*
       * Only when she has detailed one (FR-3005). The alternative — sending `{}` always
       * — would mark her whole vault as carrying a shape older readers do not know, on
       * the first save of any profile, for a field nobody used.
       */
      ...(Object.keys(curAreas).length ? { cur_areas: curAreas } : {}),
      /*
       * Only when she has said something. An absent block means «nobody has observed
       * this», and writing an empty one on every save would turn that into «observed and
       * nothing found» for every learner in her caseload.
       */
      ...(vehicular ? { vehicular } : {}),
      works: lines(works),
      avoid: lines(avoid),
      /*
       * Today's date for what is new, and only for that (decision P44). A line
       * that already had one keeps it; a line that had none and is not new keeps
       * none, because «no consta» is a fact she needs and a plausible date is not.
       */
      noted_on: datedNow(lines(works), lines(avoid), notedOn),
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
          overrides: pictos.overrides,
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

  /*
   * Sections and fields, never a page (`041` T019, FR-3901).
   *
   * The page is the parent's: «Quién es» inside the learner, «Un alumno nuevo» from the
   * caseload, «Tu primer alumno» in the first run — three titles for one form. Before
   * this the form was a bare `stack` with a grey card, an `<h3>`, four `<div><label>`
   * pairs and 1040px selects: every symptom ADR 0009 listed, on the screen with the
   * most work in the product. The placeholders that carried the help are help now —
   * a placeholder is a hint that disappears the moment she starts typing.
   */
  return (
    <>
      <RepairNotice repairs={repairs} />

      <Section lede={es.learner.codeExplain}>
        <div className="row">
          <span className="badge badge-accent">{current || '…'}</span>
          {!code ? <button className="btn btn-sm" onClick={() => void newCode.run().then((c) => { if (c) setCurrent(c); })}>
            {es.learner.newCode}</button> : null}
        </div>
        <Field label={es.learner.nameLabel} htmlFor="name">
          <input className="input" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </Section>

      {/*
        Before the axes, deliberately. Who he is comes before what he finds hard —
        both in how a teacher thinks about a child and in what she can answer
        without stopping to consider.
      */}
      <Section title={es.learner.axesTitle}>
        <YearPicker value={who} onChange={setWho} />

        {/*
          Beside the axes, in its own block (`033` T014). Rendered after them because it is
          the less common case, and never inside the grid — see `VehicularMark`.
        */}
        <VehicularMark value={vehicular} onChange={setVehicular} />

        <AxisEditor axes={axes} onChange={setAxes}
                    curAreas={curAreas} onCurAreasChange={setCurAreas}
                    knownAreas={areaVocabulary.state === 'ready' ? areaVocabulary.value : []} />
      </Section>

      <Section>
        <Field label={es.learner.works} htmlFor="works"
               help="Una cosa por línea. Por ejemplo: con el primer ejercicio hecho arranca sola">
          <textarea className="textarea" id="works" value={works} onChange={(e) => setWorks(e.target.value)} />
        </Field>
        <Field label={es.learner.avoid} htmlFor="avoid"
               help="Una cosa por línea. Por ejemplo: nada con reloj">
          <textarea className="textarea" id="avoid" value={avoid} onChange={(e) => setAvoid(e.target.value)} />
        </Field>
        <Field label="Le interesa" htmlFor="interests"
               help="Separado por comas. Por ejemplo: dinosaurios, fútbol">
          <input className="input" id="interests" type="text" value={interests}
                 onChange={(e) => setInterests(e.target.value)} />
        </Field>
        <Field label="Cómo puede responder" htmlFor="response"
               help="Una por línea, con dos puntos. Por ejemplo: escritura: dicta y un adulto transcribe">
          <textarea className="textarea" id="response" value={response} onChange={(e) => setResponse(e.target.value)} />
        </Field>
      </Section>

      {/*
        The one decision in this form that is about how a child is seen rather than
        about what he can do. It says what it costs, because «por si acaso» has a
        social cost here that no other family has.

        **Three lines, not thirty** (`025` FR-2301). This used to be the switch, the
        scope, and then the whole pictogram set: a licence, four bullets of terms, a
        licence URL, an acceptance, a withdrawal, a 157 MB download, a progress bar, a
        stop button, a folder picker and an update check — inside a profile form. None
        of which is about a child. `020` already taught this project that lesson and I
        repeated it two specifications later, larger.
      */}
      <LearnerPictograms
        enabled={pictos.enabled}
        scope={pictos.scope}
        overrides={pictos.overrides}
        onEnabled={(on) => setPictos((p) => ({ ...p, enabled: on }))}
        onScope={(scope) => setPictos((p) => ({ ...p, scope }))}
        onOverrides={(overrides) => setPictos((p) => ({ ...p, overrides }))}
        onConfigure={onConfigure} />

      <Actions primary={
        <button className="btn btn-primary" disabled={!current || saveLearner.busy}
                aria-busy={saveLearner.busy} onClick={() => void save()}>{es.learner.save}</button>
      }>
        {saved && !failure ? <span className="badge badge-ok">Guardado</span> : null}
        {/* And when it did not save, she is told so instead of being told the
            opposite. */}
        {failure ? <span className="small" role="alert">{failure.message}</span> : null}
      </Actions>
    </>
  );
}
