import { useState } from 'react';
import { Icon } from '../components/Icon.js';
import { Page, Section, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useNormativeList, useSelectNormative, useChooseNormative, useActivateNormative,
  type CorpusListing, type NormativeImport,
} from '../data/normative.js';

/**
 * Which normativa her documents are written in (`029` T013, FR-2701/2711).
 *
 * ## Why it is here and not on a learner's page
 *
 * Because it is a fact about her **school**, not about a child — the same category the
 * pictogram set is in, and the same mistake `018` had to undo when «her school uses a
 * different picture for *recreo*» was stored per learner. The per-learner exception
 * exists (`normative_corpus` on the profile, for the child who arrived from another
 * comunidad) and it stays where exceptions belong: on the exception.
 *
 * ## Nothing is pre-selected, and «ninguna» is a real answer
 *
 * A default would be this feature's own failure repeated: Andalucía was the default for
 * a year by being the only thing there. So the list starts with **«Ninguna»** as an
 * ordinary, selectable, described option — generic mode is a product, and the screen
 * says what it gives her rather than apologising for it.
 *
 * ## By id, never by the territory name
 *
 * Two files may both say «Madrid». She picks a **file**, and its id is what the
 * selection records — which is also why the origin and the review status are on every
 * row: «Madrid, subido por ti, sin revisar» and «Madrid, incluido con Rampa» are two
 * different things to be about to draft a document under.
 */
export function NormativeSection() {
  const list = useNormativeList();
  const select = useSelectNormative();

  return (
    <Page
      title="Normativa"
      lede="Cómo se llama aquí el documento de adaptación, quién lo firma y dónde se
            registra. Cambia de una comunidad a otra, así que lo eliges tú.">
      <Loaded from={list}>
        {(loaded) => (
          <>
            {loaded.missing ? (
              <Callout intent="decide" title="La que tenías elegida ya no está">
                Tenías elegida <code>{loaded.missing}</code> y no la encuentro, así que
                estoy trabajando en genérico. <strong>No he puesto otra en su lugar</strong>:
                cuál se usa lo eliges tú.
              </Callout>
            ) : null}

            <Section title="Ninguna, y trabajo en general"
                     lede="Hablo del «documento de adaptación vigente en tu territorio» y de
                           «tu plataforma de registro», y digo por escrito que el
                           procedimiento lo verificas tú con tu orientador.">
              <Actions
                primary={
                  <button className="btn"
                          disabled={loaded.selected === undefined || select.busy}
                          onClick={() => void select.run(null).then(() => list.reload())}>
                    {loaded.selected === undefined ? 'Es lo que tienes' : 'Quitar la que tengo'}
                  </button>
                } />
            </Section>

            {loaded.corpora.map((c) => (
              <CorpusRow key={c.id} corpus={c} selected={loaded.selected === c.id}
                         busy={select.busy}
                         onSelect={() => void select.run(c.id).then(() => list.reload())} />
            ))}

            {select.error ? <Callout intent="danger">{select.error.message}</Callout> : null}

            <BringOne onDone={() => list.reload()} />
          </>
        )}
      </Loaded>
    </Page>
  );
}

const ORIGIN_WORDS: Record<CorpusListing['origin'], string> = {
  bundled: 'incluida con Rampa',
  subido: 'la trajiste tú',
  modificado: 'la trajiste tú y la has editado después',
};

function CorpusRow({ corpus, selected, busy, onSelect }: {
  corpus: CorpusListing;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <Section title={corpus.label}
             lede={corpus.territory ?? undefined}>
      <p className="small">
        {ORIGIN_WORDS[corpus.origin]}
        {corpus.lastChecked ? ` · consultada el ${corpus.lastChecked}` : ''}
        {/*
          Never «revisada» unless somebody disagreed with something in it. The same
          sentence the drafted document prints, so the two cannot say different things
          about the same file.
        */}
        {corpus.reviewed ? ' · revisada por una docente' : ' · sin revisar por ninguna docente'}
      </p>
      {corpus.documents.length ? (
        <p className="small">Sus documentos: {corpus.documents.join(' · ')}</p>
      ) : null}
      {/*
        Not `btn-primary`, and that is a rule rather than a taste (`013` FR-1105).
        This pane is a set of **equal alternatives** — «ninguna», Andalucía, and every
        corpus she brings later — so there is no single next step to emphasise. One
        primary per row would be N solid blocks stacked at `xlarge` on a narrow window,
        which is exactly how `023` broke the same requirement: emphasis that is
        everywhere is emphasis nowhere. Caught before a second corpus existed to catch
        it with.
      */}
      <Actions
        primary={
          <button className="btn"
                  disabled={selected || busy}
                  aria-current={selected ? 'true' : undefined}
                  onClick={onSelect}>
            {selected ? 'Es la que tienes' : `Usar ${corpus.label}`}
          </button>
        } />
    </Section>
  );
}

/**
 * Bringing one she has been given: shown entire, scanned, refusable (FR-2707/2708).
 *
 * ## Two acts, never one
 *
 * «Elegir el fichero» reads it and shows it. «Activarla» is a separate press. A single
 * button that picked and activated would put a policy file into force for having looked
 * at one — Principle VIII, the same argument that keeps a drafted document out of her
 * folder until she saves it.
 *
 * ## Shown entire, and that is not a formality
 *
 * The whole file, in a `<pre>`, before anything. A summary would be Rampa deciding which
 * parts of somebody else's policy she needs to read, in the one place where what she is
 * about to trust is exactly the part nobody summarised.
 *
 * ## Refused by default, and the override is hers
 *
 * `007` FR-514's non-blocking rule deliberately does **not** apply here. A notice on a
 * worksheet must not block a job she is paying for; activating a file that enters
 * prompts as policy is exactly the moment to stop. So the activate button is not a
 * disabled control with a tooltip: it is replaced by a second one that says what she is
 * overriding, because a button whose label does not change is a button she presses out
 * of habit.
 */
function BringOne({ onDone }: { onDone: () => void }) {
  const choose = useChooseNormative();
  const activate = useActivateNormative();
  const [file, setFile] = useState<NormativeImport | null>(null);

  const dirty = (file?.findings.length ?? 0) > 0;

  return (
    <Section title="Traer una que te hayan pasado"
             lede="Te la enseño entera y te digo lo que he encontrado antes de que decidas.">
      <Actions
        primary={
          <button className="btn" disabled={choose.busy}
                  onClick={() => void choose.run().then((f) => setFile(f ?? null))}>
            <Icon name="folder" /> Elegir el fichero
          </button>
        } />

      {choose.error ? <Callout intent="danger">{choose.error.message}</Callout> : null}
      {activate.error ? <Callout intent="danger">{activate.error.message}</Callout> : null}

      {file ? (
        <>
          <p className="small">
            <strong>{file.filename}</strong>
            {file.label ? ` · dice ser «${file.label}»` : ' · no dice qué normativa es'}
            {file.reviewed ? ' · dice estar revisada' : ' · dice no estar revisada'}
          </p>

          <Callout intent={dirty ? 'decide' : 'info'}
                   title={dirty ? 'Léelo antes de activarla' : 'Lo he mirado'}>
            {file.says}
          </Callout>

          {file.findings.length ? (
            <ul>
              {file.findings.map((f) => (
                <li key={`${f.line}:${f.quote}`} className="small">
                  <strong>Línea {f.line}:</strong> <code>{f.quote}</code>
                  <br />{f.why}
                </li>
              ))}
            </ul>
          ) : null}

          {/*
            The whole file, before anything. A summary here would be Rampa deciding
            which parts of somebody else's policy she needs to read.
          */}
          <details>
            <summary>Ver el fichero entero</summary>
            <pre className="pre-soft">
              {file.raw}
            </pre>
          </details>

          <Actions
            primary={
              <button className="btn" disabled={activate.busy}
                      onClick={() => void activate.run(file.raw, dirty).then((r) => {
                        if (r?.ok) { setFile(null); onDone(); }
                      })}>
                {dirty ? 'Activarla de todas formas' : 'Activarla'}
              </button>
            }>
            <button className="btn btn-ghost" onClick={() => setFile(null)}>
              No activarla
            </button>
          </Actions>
        </>
      ) : (
        <p className="small">
          Una normativa es un fichero Markdown: cómo se llaman aquí los documentos, quién
          los firma, qué secciones llevan y las frases que se imprimen. El contrato y un
          ejemplo completo están en el repositorio, en{' '}
          <code>instructions/normative/</code>.
        </p>
      )}
    </Section>
  );
}
