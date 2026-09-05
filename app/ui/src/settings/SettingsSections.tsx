import { Page } from '../shell/Page.js';
import { PictogramSetSection } from '../pictograms/PictogramSetSection.js';
import { MyVocabulary } from '../pictograms/MyVocabulary.js';
import { ConnectionScreen } from './ConnectionScreen.js';
import { AboutScreen } from '../about/AboutScreen.js';
import { NormativeSection } from './NormativeSection.js';
import type { SettingsPane } from '../nav/route.js';

/**
 * Configuración (025 T004, FR-2305/2306).
 *
 * ## Why this exists
 *
 * Because the pictogram set was living inside a learner's profile form. Carlos: «sería
 * mucho más limpio que ensuciar con tantas cosas la hoja del alumno», and he is right
 * twice over — it is `020`'s principle, and it is the same category error `024` had just
 * fixed one layer down when it moved her vocabulary off the learner.
 *
 * The set, the licence, the download and her vocabulary are **one fact about her
 * installation**. None of it is about a child.
 *
 * ## Why it is the rail and not a second menu
 *
 * `020` measured what a second menu costs: 501px of chrome before the content, 37% of a
 * 1366px window, 43% at the large text scale. So the rail becomes Configuración's, the
 * same way it becomes the learner's — the third shape of one column.
 *
 * ## What moved and what did not
 *
 * `ConnectionScreen` and `AboutScreen` are rendered here and **otherwise untouched**
 * (FR-2307). A move that quietly improves things is a move nobody can review.
 *
 * There is deliberately **no «Cómo se ve» section**: the text size, contrast and motion
 * controls live in the rail's foot (`013` FR-1106) and work from every screen. A second
 * home would be the seventh instance of two copies of one truth here, and the copy she
 * found first would be the one that felt broken.
 */
export function SettingsSections({ pane, onReconnect, onEnsayo }: {
  pane: SettingsPane;
  /** App state: the reconnect wizard is `009`'s and stays there (FR-2307). */
  onReconnect: (serviceId: string) => void;
  /** Open the rehearsal, after connecting — for showing a colleague (`035` FR-3304). */
  onEnsayo: (startedAt: string) => void;
}) {
  if (pane === 'service') return <ConnectionScreen onReconnect={onReconnect} onEnsayo={onEnsayo} />;
  if (pane === 'normative') return <NormativeSection />;
  if (pane === 'about') return <AboutScreen />;
  return (
    <Page
      title="Pictogramas"
      lede="El juego de dibujos que usan algunos alumnos. Lo traes una vez y vale para
            todos: no es una cosa de un niño, es una cosa de tu Rampa.">
      <PictogramSetSection />
      {/*
        Her vocabulary, reviewable (FR-2308). It belongs here and not on a learner's
        page for the same reason the set does: she chooses once and it applies to
        everybody.
      */}
      <MyVocabulary />
    </Page>
  );
}
