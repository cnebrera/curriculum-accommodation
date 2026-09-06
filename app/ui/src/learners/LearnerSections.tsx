import { Page, Section } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { ProfileEditor } from './ProfileEditor.js';
import { RecordScreen } from './RecordScreen.js';
import { HandoverReview } from './HandoverReview.js';
import { ForgetLearner } from './ForgetLearner.js';
import type { LearnerTab } from '../nav/route.js';
import { StructureScreen } from '../structure/StructureScreen.js';
import { ChooseBranch } from '../prepare/PrepareSteps.js';
import { useNormative, documentName, registerName } from '../data/normative.js';
import { ExportPacketSection } from '../coordination/ExportPacket.js';

/**
 * What is inside a learner (020 T011-T014).
 *
 * ## The six cards
 *
 * Until now these were **cards stacked underneath the edit-profile form** in
 * `LearnersScreen`: the record, the guide, the draft of her adaptation document, help
 * with the significant one, the handover and erasure. To reach any of them she opened a
 * learner to *edit* them and scrolled. Each card had a heading, a paragraph explaining
 * itself and a button — which is what a destination looks like when it has nowhere to
 * live.
 *
 * They are destinations now. The paragraphs survive, because they were good: «no la
 * escribo yo, la ordeno» is the sentence that tells a PT what the draft actually is, and
 * it belongs on the section rather than in a card fighting for space with a form.
 *
 * ## And they call the document what her normativa calls it (`029` T009)
 *
 * These paragraphs said «ACNS», «ACS» and «Séneca» — Andalucía's words, on the screen of
 * every teacher in the country. They now come from the corpus she selected, and generic
 * mode says what the document *does* rather than pretending to know its name.
 *
 * ## Nothing here calls a provider
 *
 * Every section is a screen that already existed, reached from a menu instead of from a
 * card. `020` moves things; `003`, `004`, `014` and `017` still own what they do.
 */

/**
 * The two official documents, named as her normativa names them (`029` T009).
 *
 * Its own component because it is the one section that has to **load** something before
 * it can word itself — and a hook cannot live inside the `switch` above.
 */
function CurriculumSection({ code, name, onGuide }: {
  code: string;
  name?: string;
  onGuide: (what: 'guide' | 'acns' | 'acs') => void;
}) {
  const normative = useNormative();
  const n = normative.state === 'ready' ? normative.value : null;
  const unchanged = documentName(n, 'unchanged');
  const modified = documentName(n, 'modified');

  return (
    <Page title={`La adaptación curricular de ${name ?? code}`}
          lede="Lo oficial: lo que te hayan dado, y lo que puedo ordenarte a partir de lo que ya llevas hecho.">
      <Section title="Si te han dado el documento"
               lede="Me quedo con sus medidas y las aplico a todo lo que adapte para él. El diagnóstico no lo guardo.">
        <div className="row gap2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onGuide('guide')}>
            Traer el documento que me han dado
          </button>
          <button className="btn" onClick={() => onGuide('acns')}>
            Borrador de su adaptación
          </button>
        </div>
        <p className="small">
          Aquí es <strong>{unchanged}</strong>. La ordeno con lo que ya llevas hecho —{' '}
          <strong>no la escribo yo</strong>. Y no queda registrada: el registro es{' '}
          {registerName(n)}, y esto es material para llevar allí.
        </p>
        {n?.of === 'generic' && (
          <p className="small">
            No tienes ninguna normativa elegida, así que hablo en general. Si quieres que
            lo llame como se llama en tu comunidad, elígela en Configuración ▸ Normativa.
          </p>
        )}
      </Section>

      {/*
        Last and set apart, because it is the only thing in this application that
        touches what is *asked* of him (Principle III). The card that used to say
        this said it well, so it says it here.
      */}
      <Section title={`Si estás redactando ${modified}`}
               lede="Una adaptación significativa modifica objetivos y criterios.">
        <p className="small">
          Eso lo decide el equipo docente con Orientación, no yo. Cuando ya está
          decidido, te ayudo a redactarlo.
        </p>
        <div className="row">
          <button className="btn" onClick={() => onGuide('acs')}>Ayúdame con ello</button>
        </div>
      </Section>
    </Page>
  );
}

export function LearnerSection({
  code, name, tab, onGuide, onReuse, onReview, onPrepare, onErased, onConfigure,
}: {
  code: string;
  name?: string;
  tab: LearnerTab;
  /** `017`'s four screens, still routed by whoever owns the route. */
  onGuide: (what: 'guide' | 'acns' | 'acs') => void;
  /** «Hazlo otra vez para otro alumno», from a row of the record (`016` T018). */
  onReuse: (jobId: string, kind: string) => void;
  /**
   * «Revisar y firmar» a draft that is still waiting, from a row of the record (P11).
   *
   * The second half of the answer to P11: pending-to-sign is derived from the vault, so
   * every unsigned sheet is reachable from the learner it belongs to at any time — not
   * only from the run that produced it.
   */
  onReview: (jobId: string, learner: string) => void;
  /**
   * Into the work (`020` US2 replaces this with the flow itself).
   *
   * Until then it hands her to the existing door **with this learner already chosen**,
   * which is what makes US1 shippable without removing anything: the section exists, it
   * works, and US2 changes what is inside it rather than where it is.
   */
  /**
   * Empezar un flujo, con la rama que ha elegido (`020` T019).
   *
   * Era «llévame a la puerta con este alumno ya elegido», que es lo que hacía que US1
   * fuese entregable sin quitar nada. Ahora es «arranca el flujo aquí»: la puerta se
   * retira en T028 y esto ya no la necesita.
   */
  onPrepare: (of: 'adapt' | 'compose') => void;
  /** She erased this learner: there is no learner left to be inside. */
  onErased: () => void;
  /** Into Configuración ▸ Pictogramas, and back to him after (`025` FR-2303/2304). */
  onConfigure: () => void;
}) {
  switch (tab) {
    case 'who':
      /*
       * Only the editor (T011). Everything else that used to hang below it is a sibling
       * of this section rather than a card inside it — and as of `025` that includes the
       * pictogram set, which was the last thing still living in the form.
       */
      return (
        <ProfileEditor code={code} onConfigure={onConfigure}
                       onSaved={() => { /* the list reloads on return */ }} />
      );

    case 'prepare':
      /*
       * Paso 1 (`020` T019, FR-1812): qué necesitas, y nada más — de quién es ya se sabe,
       * porque se ha entrado por él.
       *
       * Los pasos siguientes los dibuja `PrepareFlow` desde `App.tsx`, porque viven en la
       * ruta y no en esta pantalla. Los dos defectos de navegación de este proyecto eran
       * estado sostenido en algo que navegar destruye.
       */
      return <ChooseBranch code={code} {...(name ? { name } : {})} onStart={onPrepare} />;

    case 'structure':
      /*
       * `028` FR-2601: a third kind of work, reached from the learner and routed through
       * neither existing door. It is where a PT starts with a new TEA learner.
       */
      return (
        <StructureScreen learnerCode={code} {...(name ? { learnerName: name } : {})}
                         onMade={() => { /* the record picks it up on the next visit */ }} />
      );

    case 'made':
      /*
       * T012 · the assertion this whole specification exists for: the record is a
       * destination, reached from the learner's menu, and not a button on a card at the
       * bottom of a form.
       */
      return (
        <RecordScreen code={code} {...(name ? { name } : {})}
                      onReuse={onReuse} onReview={onReview} />
      );

    case 'curriculum':
      return <CurriculumSection code={code} {...(name ? { name } : {})} onGuide={onGuide} />;

    case 'handover':
      return (
        <Page title={`El traspaso de ${name ?? code}`}
              lede="Un documento con lo que has aprendido de él, para quien lo tenga el año que viene. Lo revisas tú: decides qué va y qué no.">
          {/*
            `HandoverReview` carries its own heading, so it is **not** wrapped in a
            Section. It was, for about an hour, and looking at the page is what found
            it: «El traspaso de fin de curso» sitting directly above «Traspaso de
            Lucía» — two headings for one thing, which is what a wrapper adds when the
            thing already introduces itself.
          */}
          <HandoverReview code={code} onDone={() => { /* stays here */ }} />
          {/*
            `030`, below it and clearly second. The same child, a different question:
            `004` is «todo, una vez, en septiembre» and this is «una quincena, ahora».
            Grafting the year-boundary confirm/disconfirm lifecycle onto weekly notes
            would make every Tuesday an audit, which is why they are two things on one
            page rather than one thing with a mode.

            And the page keeps `004`'s title, which is the rail's label: a screen whose
            heading disagrees with the entry that reached it is a screen she thinks she
            mis-clicked.
          */}
          <ExportPacketSection code={code} />
        </Page>
      );

    case 'erase':
      return (
        <Page title={`Borrar todo lo de ${name ?? code}`}
              lede="Su perfil, tus notas sobre él y sus fichas adaptadas. Te enseño la lista antes de tocar nada.">
          <ForgetLearner code={code} {...(name ? { name } : {})} onDone={onErased} />
        </Page>
      );
  }
}
