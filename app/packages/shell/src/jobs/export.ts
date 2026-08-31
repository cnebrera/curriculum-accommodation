import {
  renderHTML, renderODT, renderLinear, renderBrailleReady, parseAudioCorpus,
  parseIR, checkOutput, isSignedOff, RampaError,
} from '@rampa/core';
import { jobAdapted } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { knownNames } from '../ipc/names.js';
import { loadLearner } from '@rampa/core';
import { loadInstruction } from '../corpus/index.js';

/**
 * Exports that are not printed (019).
 *
 * Its own file, and the boundary test is why. `renderOdt` started life next to
 * the PDF in `jobs/print.ts` — which imports `electron` for the offscreen
 * `BrowserWindow` that turns HTML into a PDF, ADR 0008's one surviving argument.
 * `boundary.test.ts` counts the lines of every file that imports Electron, and
 * adding 30 lines of ODF to one of them pushed the recorded surface past its
 * ceiling and failed.
 *
 * The test was right and the fix is not the ceiling. **Nothing in here touches
 * Electron**: an ODT is a ZIP of XML, and putting it beside the PDF renderer made
 * it look like it needed a browser engine when it does not. Moved, and the
 * Electron surface goes back to being a number that means something.
 */
/**
 * The editable export (019 US1).
 *
 * Built from the same adapted IR as the HTML and the PDF — Principle IV, and the
 * claim it makes: a new modality needs no re-adaptation. This function is the
 * first evidence for that claim, and it needed no field the IR did not already
 * have.
 *
 * The draft mark is **derived from the document**, exactly as the print path
 * derives it, rather than accepted as a parameter. `job:render` used to take
 * `signedOff` from the renderer, which meant an unmarked worksheet could be
 * produced with no sign-off having happened (007 FR-509). One reader of one
 * truth.
 */
export async function renderOdt(jobId: string, learnerCode: string): Promise<Uint8Array> {
  const vault = currentVault();
  const raw = await vault.readRaw(jobAdapted(jobId, learnerCode));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro la versión adaptada.');
  const doc = parseIR(raw);

  /*
   * The same output checks as the HTML path, on the same document.
   *
   * A learner's data reaching a learner-facing document is a learner's data
   * reaching it whatever the file extension — and a modality that skipped the
   * check would be the first parallel pipeline Principle IV forbids, arriving as
   * an omission rather than as a design.
   */
  const asHtml = renderHTML(doc, { signedOff: isSignedOff(doc) });
  const check = checkOutput(asHtml, [learnerCode], [...(await knownNames()).values()],
    await learnerFacts(learnerCode));
  if (!check.ok) throw new RampaError('render-learner-data', check.findings.join(' '), check.findings);

  return renderODT(doc, { signedOff: isSignedOff(doc) });
}

/**
 * The heard and the touched modalities (019 Phase 3 and 4).
 *
 * Both from the same adapted IR, both through the same `renderLinear` — and both
 * through the **same output check** as the HTML and the ODT. A modality that
 * skipped it would be the first parallel pipeline Principle IV forbids, arriving as
 * an omission rather than as a design.
 *
 * Neither produces audio or braille. `019`'s spec says audio-*ready*: a bundled
 * speech engine is large and its quality is a per-language problem nobody here can
 * judge, and claiming to produce braille would be claiming expertise this project
 * does not have and cannot check.
 */
async function linearFor(jobId: string, learnerCode: string) {
  const vault = currentVault();
  const raw = await vault.readRaw(jobAdapted(jobId, learnerCode));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro la versión adaptada.');
  const doc = parseIR(raw);

  const corpus = parseAudioCorpus(await loadInstruction('audio'));
  const signedOff = isSignedOff(doc);

  // The same gate, on the same document, as every other modality.
  const asHtml = renderHTML(doc, { signedOff });
  const check = checkOutput(asHtml, [learnerCode], [...(await knownNames()).values()],
    await learnerFacts(learnerCode));
  if (!check.ok) throw new RampaError('render-learner-data', check.findings.join(' '), check.findings);

  return { doc, corpus, signedOff };
}

export async function renderAudioReady(
  jobId: string, learnerCode: string,
): Promise<{ text: string; announced: Array<{ id: string; because: string }> }> {
  const { doc, corpus, signedOff } = await linearFor(jobId, learnerCode);
  const linear = renderLinear(doc, { ...corpus, modality: 'audio', signedOff });
  /*
   * `announced` is returned, not merely written. What could not be read in order is
   * a decision she has to know about — and burying it inside a text file she may
   * hand to somebody else would make it a thing only the learner discovers.
   */
  return { text: linear.text, announced: linear.announced };
}

export async function renderBraille(
  jobId: string, learnerCode: string,
): Promise<{ text: string; announced: Array<{ id: string; because: string }> }> {
  const { doc, corpus, signedOff } = await linearFor(jobId, learnerCode);
  return {
    text: renderBrailleReady(doc, { ...corpus, signedOff }),
    announced: renderLinear(doc, { ...corpus, modality: 'braille', signedOff }).announced,
  };
}

/**
 * The learner's own facts, for `checkOutput` (011 T018, FR-910).
 *
 * One helper rather than three copies: every modality reads it, and a modality that
 * forgot to would be the parallel pipeline Principle IV forbids arriving as an
 * omission. The school is the sharpest of the three (`015` FR-1306).
 */
async function learnerFacts(learnerCode: string): Promise<string[]> {
  const learner = await loadLearner(currentVault(), learnerCode);
  return [learner.profile.school, learner.profile.year, learner.profile.stage]
    .filter((f): f is string => typeof f === 'string' && f.trim() !== '');
}
