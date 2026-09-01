import { Page, Section } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { ProfileEditor } from './ProfileEditor.js';
import { RecordScreen } from './RecordScreen.js';
import { HandoverReview } from './HandoverReview.js';
import { ForgetLearner } from './ForgetLearner.js';
import type { LearnerTab } from '../nav/route.js';

/**
 * What is inside a learner (020 T011-T014).
 *
 * ## The six cards
 *
 * Until now these were **cards stacked underneath the edit-profile form** in
 * `LearnersScreen`: the record, the guide, the ACNS draft, ACS help, the handover and
 * erasure. To reach any of them she opened a learner to *edit* them and scrolled. Each
 * card had a heading, a paragraph explaining itself and a button — which is what a
 * destination looks like when it has nowhere to live.
 *
 * They are destinations now. The paragraphs survive, because they were good: «no la
 * escribo yo, la ordeno» is the sentence that tells a PT what the ACNS draft actually
 * is, and it belongs on the section rather than in a card fighting for space with a
 * form.
 *
 * ## Nothing here calls a provider
 *
 * Every section is a screen that already existed, reached from a menu instead of from a
 * card. `020` moves things; `003`, `004`, `014` and `017` still own what they do.
 */

export function LearnerSection({ code, name, tab, onGuide, onReuse, onPrepare, onErased }: {
  code: string;
  name?: string;
  tab: LearnerTab;
  /** `017`'s four screens, still routed by whoever owns the route. */
  onGuide: (what: 'guide' | 'acns' | 'acs') => void;
  /** «Hazlo otra vez para otro alumno», from a row of the record (`016` T018). */
  onReuse: (jobId: string, kind: string) => void;
  /**
   * Into the work (`020` US2 replaces this with the flow itself).
   *
   * Until then it hands her to the existing door **with this learner already chosen**,
   * which is what makes US1 shippable without removing anything: the section exists, it
   * works, and US2 changes what is inside it rather than where it is.
   */
  onPrepare: () => void;
  /** She erased this learner: there is no learner left to be inside. */
  onErased: () => void;
}) {
  switch (tab) {
    case 'who':
      /*
       * Only the editor and the pictogram section it already contained (T011).
       * Everything else that used to hang below it is now a sibling of this section
       * rather than a card inside it.
       */
      return <ProfileEditor code={code} onSaved={() => { /* the list reloads on return */ }} />;

    case 'prepare':
      return (
        <Page title={`Prepararle algo a ${name ?? code}`}
              lede="Adaptar algo que ya tienes, o hacer material desde cero para lo que le hace falta.">
          <Section>
            <Callout intent="info" title="Esto se está mudando aquí">
              Ahora mismo esto te lleva al camino de siempre, con {name ?? code} ya
              elegido. Los pasos van a vivir en esta sección: qué material es, tráelo,
              comprueba que lo he leído bien, para quién más, y revisar.
            </Callout>
            <div className="row">
              <button className="btn btn-primary" onClick={onPrepare}>
                Preparar material para {name ?? code}
              </button>
            </div>
          </Section>
        </Page>
      );

    case 'made':
      /*
       * T012 · the assertion this whole specification exists for: the record is a
       * destination, reached from the learner's menu, and not a button on a card at the
       * bottom of a form.
       */
      return <RecordScreen code={code} {...(name ? { name } : {})} onReuse={onReuse} />;

    case 'curriculum':
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
                Borrador de la ACNS
              </button>
            </div>
            <p className="small">
              La ACNS la ordeno con lo que ya llevas hecho — <strong>no la escribo yo</strong>.
              Y no queda registrada: el registro es Séneca, y esto es material para llevar allí.
            </p>
          </Section>

          {/*
            Last and set apart, because it is the only thing in this application that
            touches what is *asked* of him (Principle III). The card that used to say
            this said it well, so it says it here.
          */}
          <Section title="Si estás redactando una ACS"
                   lede="Una adaptación significativa modifica objetivos y criterios.">
            <p className="small">
              Eso lo decide el equipo docente con Orientación, no yo. Cuando ya está
              decidido, te ayudo a redactarlo.
            </p>
            <div className="row">
              <button className="btn" onClick={() => onGuide('acs')}>Ayúdame con la ACS</button>
            </div>
          </Section>
        </Page>
      );

    case 'handover':
      return (
        <Page title={`El traspaso de ${name ?? code}`}
              lede="Un documento con lo que has aprendido de él, para quien lo tenga el año que viene. Lo revisas tú: decides qué va y qué no.">
          <HandoverReview code={code} {...(name ? { name } : {})} onDone={() => { /* stays here */ }} />
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
