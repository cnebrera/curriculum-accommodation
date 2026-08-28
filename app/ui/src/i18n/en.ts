import type { PartialStrings } from './types.js';

/**
 * English, partial on purpose.
 *
 * It exists to prove the fallback works and to give a translator somewhere to
 * start, not to claim the application is bilingual. Anything missing here shows
 * in Spanish, which is the honest failure mode.
 */
export const en: PartialStrings = {
  nav: { learners: 'My learners', adapt: 'Adapt a worksheet', notes: 'My notes', about: 'About' },
  onboarding: {
    welcome: "Let's get you set up",
    intro: 'Three steps. You can close this and carry on tomorrow: nothing is lost.',
    vaultTitle: 'Where shall I keep your things?',
    vaultWhy: 'Your learners and your notes live here. They are yours: open them in any editor, and back them up by copying the folder.',
    vaultChoose: 'Choose another folder',
    vaultAccept: 'Use this folder',
    connectTitle: 'Connect your AI service',
    connectWhy: 'Rampa uses your own AI account. It needs a key, which is like a password that you give it.',
    connectGet: 'Open the page to get the key',
    connectPaste: 'Paste the key here',
    connectCheck: 'Check',
    noCard: 'no card needed',
    learnerTitle: 'Your first learner',
    learnerWhy: 'Tell me how they get on in class. No diagnosis needed: what you see is enough.',
    done: 'Done. You can adapt your first worksheet.',
  },
};
