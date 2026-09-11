import { useState } from 'react';
import { Section, Field } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useExportDraft, useExportWrite, usePackets, type ExportDraft, type PacketItem,
} from '../data/coordination.js';

/**
 * «Lo que he aprendido esta quincena, a tu vault» (`030` T009, FR-2801/2802/2803).
 *
 * ## Reviewed before it is written, and the review is per item
 *
 * The same two-step `004` uses, and the reason is the same: this is a document she is
 * about to email. An item she unchecks is **gone from the file** — never carried with a
 * «removed» flag, because a claim marked as dropped is still a claim in a document
 * leaving her machine.
 *
 * ## The flags are flags
 *
 * `findProbableNames` guesses. Guesses belong beside the item, where a person decides;
 * a capitalised word is not a reason to refuse a fortnight's work. What *is* a refusal
 * is a name the machine actually knows surviving redaction — and then nothing is
 * written at all, and this screen says so instead of offering a button.
 */
export function ExportPacketSection({ code }: { code: string }) {
  const draft = useExportDraft();
  const write = useExportWrite();
  const [role, setRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState<ExportDraft | null>(null);
  const [dropped, setDropped] = useState<Set<number>>(new Set());
  const [written, setWritten] = useState<string | null>(null);
  const sent = usePackets(code);

  const toggle = (i: number) => setDropped((was) => {
    const next = new Set(was);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const keep = (result?.items ?? []).map((_, i) => i).filter((i) => !dropped.has(i));

  return (
    <Section
      title="Contarle esta quincena a una compañera"
      lede="Lo que has apuntado, lo que le has preparado y lo que has cambiado en su
            perfil, entre dos fechas. Va sin nombres — viaja el código.">
      {draft.error ? <Callout intent="danger">{draft.error.message}</Callout> : null}
      {write.error ? <Callout intent="danger">{write.error.message}</Callout> : null}

      <Section title="Quién eres, para quien lo recibe"
               lede="No va tu nombre: va el papel que dices tener, y quien lo recibe ya
                     sabe quién eres.">
        <Field label="Tu papel" htmlFor="coord-role">
          <input className="input input-sm" id="coord-role"
                 placeholder="PT, tutora, orientadora…"
                 value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <div className="row gap2">
          <Field label="Desde" htmlFor="coord-from"
                 help="Si lo dejas en blanco, desde el último paquete que le mandaste.">
            <input className="input" id="coord-from" type="date"
                   value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta" htmlFor="coord-to">
            <input className="input" id="coord-to" type="date"
                   value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </Section>

      {result?.refusal ? (
        <Callout intent="danger" title="No he escrito nada">{result.refusal}</Callout>
      ) : null}

      {result && !result.refusal ? (
        <Section title="Lo que se llevaría"
                 lede="Quita lo que no quieras mandar: lo que quites no va en el fichero,
                       ni marcado ni de ninguna otra forma.">
          {result.flags.length ? (
            <Callout intent="decide" title="Míralo antes de mandarlo">
              Hay palabras que parecen nombres: {result.flags.join(', ')}. Puede que no lo
              sean — míralas y quita lo que haga falta.
            </Callout>
          ) : null}

          <ul>
            {result.items.map((item, i) => (
              <li key={`${i}-${describe(item)}`}>
                <label className="row gap2 row-top">
                  <input type="checkbox" checked={!dropped.has(i)} onChange={() => toggle(i)} />
                  <span>{describe(item)}</span>
                </label>
              </li>
            ))}
          </ul>

          {/*
            `btn`, not `btn-primary`, and it took looking at the page to see why: this
            section shares a screen with the year-boundary handover, which owns its one
            strong control (`013` FR-1105). A solid block here would only appear *after*
            she pressed «Ver qué se llevaría» — so the rule's own test, which visits the
            tab without drafting, would never have found it.
          */}
          <div className="row">
            <button className="btn" disabled={write.busy || keep.length === 0}
                    onClick={() => void write.run(code, from, to, role, keep)
                      .then((r) => setWritten(r?.path ?? null))}>
              Guardar el paquete
            </button>
          </div>
        </Section>
      ) : null}

      {written ? (
        <Callout intent="ok" title="Ahí está">
          <p><code>{written}</code></p>
          {/*
            `003`'s honesty about backups, extended to the thing this screen mails: once
            it is sent, «bórralo todo» reaches her copy and nothing else.
          */}
          <p className="small">
            Adjúntalo por donde mandes las cosas del centro. Ojo con una cosa: una copia
            que ya has mandado <strong>está fuera del alcance de «borrar todo lo suyo»</strong>,
            igual que un correo enviado.
          </p>
        </Callout>
      ) : null}

      {/*
        What she has already sent about this child (FR-2803).
        «¿Qué le he contado ya a la tutora?» is answerable without a file manager — and
        it is also the list erasure will delete, which is worth her seeing beforehand.
      */}
      <Loaded from={sent}>
        {(list) => (list.sent.length ? (
          <p className="small">
            Ya le has mandado: {list.sent.join(' · ')}. Una copia enviada está fuera del
            alcance de «borrar todo lo suyo».
          </p>
        ) : null)}
      </Loaded>

      <div className="row">
        {/*
          Not `btn-primary`: this page's one strong control belongs to the handover
          above it (`013` FR-1105).
        */}
        <button className="btn" disabled={draft.busy || role.trim() === ''}
                onClick={() => void draft.run(code, from, to, role).then((d) => {
                  setResult(d ?? null); setDropped(new Set()); setWritten(null);
                })}>
          {result ? 'Volver a mirarlo' : 'Ver qué se llevaría'}
        </button>
      </div>
    </Section>
  );
}

const describe = (item: PacketItem): string => {
  const when = item.date === '' ? 'sin fecha' : item.date;
  if (item.of === 'note') return `${when} · nota · ${item.heading}: ${item.text}`;
  if (item.of === 'material') {
    return `${when} · material · ${item.title} (${item.signed ? 'firmada' : 'sin firmar'})`;
  }
  return `${when} · perfil · ${item.text}`;
};
