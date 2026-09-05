import { Page, Section, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useNormativeList, useSelectNormative, type CorpusListing,
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

            <Section title="La tuya no está"
                     lede="Se escribe en Markdown y no hace falta tocar código.">
              <p className="small">
                Una normativa es un fichero: cómo se llaman aquí los documentos, quién los
                firma, qué secciones llevan y las frases que se imprimen. El contrato está
                en el repositorio, en{' '}
                <code>specs/029-la-normativa-es-un-corpus/contracts/normative-corpus.md</code>,
                y hay un ejemplo completo en <code>instructions/normative/es-an.md</code>.
              </p>
              <p className="small">
                Traer una que te hayan pasado todavía no se puede desde aquí: antes tengo
                que enseñártela entera y revisarla, porque un fichero de normativa entra en
                lo que le digo al modelo y eso no se activa a ciegas.
              </p>
            </Section>
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
