import { useState } from 'react';
import { Icon } from '../components/Icon.js';
import { Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { InjectionNotice } from '../components/InjectionNotice.js';
import {
  useOpenPacket, useHoldPacket, useLinkPacket, useAcceptItem, useApplyDelta,
  type OpenedPacket, type PacketItem,
} from '../data/coordination.js';

/**
 * The door (`030` T011, FR-2804…2807).
 *
 * ## Accept is the only writer, and it takes one item
 *
 * Opening, scanning, showing, holding and linking write nothing. That is not a
 * courtesy: it is the whole answer to «what if the packet is hostile», because there is
 * no unattended path from a file somebody emailed to a change in her vault. A hostile
 * packet's best outcome is a sentence she reads and declines.
 *
 * ## The conflict is the feature
 *
 * When her profile says one thing and the packet says another, both are shown and she
 * **chooses**. Never merged. A three-way merge is the shared vault wearing a diff, and
 * `030` exists precisely to not build that.
 *
 * ## Unknown code: nothing guesses
 *
 * Codes are opaque and names are absent by design, so matching is a human act. The
 * screen says what the packet claims and offers link-or-hold — and linking is
 * reversible until the first accept, because until then nothing has happened.
 */
/**
 * ## Why this is a block on the caseload and not a screen of its own
 *
 * Because a packet arrives about **somebody in her class**, and until she opens it she
 * does not know which one — so the screen that lists her class is where she is standing
 * when a colleague's file lands. A top-level rail entry would be a fourth category in a
 * rail `020` measured down to two, for something she does once a fortnight; a learner's
 * page would be a lie, because the door's first question is whose packet this is.
 */
export function PacketDoorSections({ learners }: { learners: string[] }) {
  const open = useOpenPacket();
  const hold = useHoldPacket();
  const link = useLinkPacket();
  const accept = useAcceptItem();
  const applyDelta = useApplyDelta();

  const [file, setFile] = useState<OpenedPacket | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [linked, setLinked] = useState<string>('');
  const [done, setDone] = useState<Set<number>>(new Set());

  const packet = file?.packet ?? null;
  /** Whose file this is, once she has said so — or the packet's own code if she has it. */
  const target = linked !== '' ? linked : (file?.known ? packet?.code ?? '' : '');

  const flagsFor = (i: number) => (file?.flags ?? []).filter((f) => f.at === i);

  return (
    <Section
      title="Un paquete que me han mandado"
      lede="Te lo enseño entero y decides tú, cosa por cosa. Nada entra en tu carpeta
            hasta que digas que sí a esa cosa.">
      {/*
        Not `btn-primary`. This screen's one strong control is «Añadir un alumno»
        (`013` FR-1105), and a second solid block here would be the emphasis-everywhere
        failure `023` produced and `primary-control.spec.ts` now catches.
      */}
      <div className="row">
        <button className="btn" disabled={open.busy}
                onClick={() => void open.run().then((f) => {
                  setFile(f ?? null); setHeld(null); setLinked(''); setDone(new Set());
                })}>
          <Icon name="folder" /> Elegir el paquete
        </button>
      </div>

      {open.error ? <Callout intent="danger">{open.error.message}</Callout> : null}
      {file?.refusal ? <Callout intent="danger" title="No he podido leerlo">{file.refusal}</Callout> : null}

      {packet ? (
        <>
          <Callout intent="info" title="Esto viene de otra aula">
            Quien lo manda dice ser <strong>{packet.role}</strong>, y habla de{' '}
            <code>{packet.code}</code> — su código, no el tuyo. Del {packet.period.from} al{' '}
            {packet.period.to}. Lo que aceptes quedará como «me lo contaron».
          </Callout>

          {file?.stale ? (
            <Callout intent="decide" title="Es de otro curso">
              Este paquete es del curso {packet.academicYear}. Puede seguir siendo útil, y
              puede que el niño ya no sea el mismo.
            </Callout>
          ) : null}

          {/* Content is never instruction (Principle IX), and a packet is content. */}
          <InjectionNotice notices={(file?.flags ?? []).map((f) => ({
            block: `punto ${f.at + 1}`, quote: f.quote, message: f.message,
          }))} />

          {packet.unknown && Object.keys(packet.unknown).length ? (
            <Section title="Lo que no he entendido"
                     lede="Estaba en el fichero y no sé qué es. No lo tiro: el paquete es
                           el documento de quien te lo manda antes que un formato mío.">
              <ul>
                {Object.entries(packet.unknown).map(([k, v]) => (
                  <li key={k} className="small"><code>{k}</code>: {String(v)}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {!file?.known && linked === '' ? (
            <Section title="No tengo a nadie con ese código"
                     lede="No intento adivinarlo: los códigos no dicen nada y los nombres
                           no viajan, así que esto lo dices tú.">
              <Field label="¿De quién es?" htmlFor="link-code">
                <select className="input" id="link-code" value={linked}
                        onChange={(e) => setLinked(e.target.value)}>
                  <option value="">Elige…</option>
                  {learners.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Actions
                primary={
                  <button className="btn" disabled={hold.busy || !file}
                          onClick={() => void hold.run(file!.raw, file!.filename)
                            .then((r) => setHeld(r?.path ?? null))}>
                    Guardármelo para luego
                  </button>
                } />
              {held ? (
                <p className="small">Guardado en <code>{held}</code>, tal cual me lo mandaron.</p>
              ) : null}
            </Section>
          ) : null}

          {linked !== '' ? (
            <Callout intent="decide" title="Lo has puesto en un alumno tuyo">
              <p>
                Este paquete quedará como cosa de <code>{linked}</code>. Puedes deshacerlo
                mientras no aceptes nada.
              </p>
              <div className="row gap2">
                <button className="btn btn-ghost" disabled={done.size > 0 || link.busy}
                        onClick={() => {
                          if (held) void link.run(held, '');
                          setLinked('');
                        }}>
                  Deshacer
                </button>
                {held ? (
                  <button className="btn" disabled={link.busy}
                          onClick={() => void link.run(held, linked)}>
                    Dejarlo apuntado en el fichero
                  </button>
                ) : null}
              </div>
            </Callout>
          ) : null}

          <Section title="Lo que trae"
                   lede="Una cosa cada vez. Lo que no aceptes no deja rastro.">
            <ul className="list-roomy">
              {packet.items.map((item, i) => (
                <li key={`${i}-${label(item)}`}>
                  <p>{label(item)}</p>
                  {flagsFor(i).length ? (
                    <p className="small">
                      Ojo: esta línea parece hablarle al programa. La he dejado tal cual.
                    </p>
                  ) : null}
                  <div className="row gap2">
                    <button className="btn btn-sm"
                            disabled={target === '' || done.has(i) || accept.busy}
                            onClick={() => void accept
                              .run(target, packet.role, file!.filename, item)
                              .then(() => setDone((was) => new Set(was).add(i)))}>
                      {done.has(i) ? 'Aceptado' : 'Aceptar'}
                    </button>
                    <button className="btn btn-sm btn-ghost" disabled={done.has(i)}
                            onClick={() => setDone((was) => new Set(was).add(i))}>
                      Saltar
                    </button>
                    {item.of === 'profile-delta' && axisOf(item.text) ? (
                      <button className="btn btn-sm"
                              disabled={target === '' || applyDelta.busy}
                              onClick={() => {
                                const a = axisOf(item.text)!;
                                void applyDelta.run(target, a.axis, a.level);
                              }}>
                        Y cambiar su perfil
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {accept.error ? <Callout intent="danger">{accept.error.message}</Callout> : null}
            {target === '' ? (
              <p className="small">Primero dime de quién es.</p>
            ) : null}
          </Section>
        </>
      ) : null}
    </Section>
  );
}

const label = (item: PacketItem): string => {
  const when = item.date === '' ? 'sin fecha' : item.date;
  if (item.of === 'note') return `${when} · ${item.heading}: ${item.text}`;
  if (item.of === 'material') {
    return `${when} · le preparó «${item.title}» (${item.signed ? 'firmada' : 'sin firmar'})`;
  }
  return `${when} · en su perfil: ${item.text}`;
};

/**
 * «COG = 2» → a change she can apply. Anything else is a note and nothing more.
 *
 * Deliberately narrow: a `works:` line is prose and there is no honest way to merge it
 * into a list somebody else wrote. It lands as a dated note, attributed, where she can
 * copy it herself if she agrees.
 */
const axisOf = (text: string): { axis: string; level: number } | null => {
  const m = /^([A-Z]{3})\s*=\s*([0-3])$/.exec(text.trim());
  return m ? { axis: m[1]!, level: Number(m[2]) } : null;
};
