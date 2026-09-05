import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Correcting composed material is composing again (021 T026-T029).
 *
 * ## What this guards, and why it is a source test
 *
 * `correctComposition` cannot be run offline — it composes, which needs a provider. So
 * what is checked here is the **shape** of the operation, which is where research R3's
 * finding lives: `job:revise` runs `runAdaptation`, and pointing it at a composed job
 * would ask a model to *adapt* the sheet. That produces the wrong kind of document and
 * leaves `answers.md` describing exercises that no longer exist.
 *
 * The consequence is not abstract: she takes the answer key to class and marks against
 * it. FR-1919 exists because a stale key is worse than no key.
 */
const shellSrc = join(dirname(new URL(import.meta.url).pathname), '..', 'src');
const read = (...parts: string[]): string => readFileSync(join(shellSrc, ...parts), 'utf8');

/**
 * Comments stripped, because this project's tests keep failing on their own
 * documentation.
 *
 * Twelfth instance: the first draft of this file asserted `compose.ts` does not mention
 * `runAdaptation` — and the file's own header explains that composed material goes
 * through `runAdaptation` **unchanged** afterwards, which is true and worth saying. An
 * assertion about what code does must not read the prose about it.
 */
const code = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const compose = code(read('jobs', 'compose.ts'));
const composeIpc = code(read('ipc', 'compose.ts'));


describe('it composes again rather than adapting', () => {
  it('does not reach for the adaptation at all', () => {
    // The whole finding of research R3, asserted as an absence: `jobs/compose.ts` must
    // not import or call the adaptation, or «correcting» would silently become
    // «adapting» for the one kind of document that needs the opposite.
    expect(compose).not.toMatch(/runAdaptation/);
    expect(compose).not.toMatch(/from\s+['"]\.\/adapt\.js['"]/);
  });

  it('re-runs the composition, so the key is rebuilt by the same path', () => {
    /*
     * The key is regenerated because `runCompose` writes it — one path, so there is no
     * second place where a correction could update the sheet and forget the answers
     * (FR-1919). Asserted by the call rather than by re-implementing the check.
     */
    expect(compose).toMatch(/return runCompose\(jobId, \{ \.\.\.request/);
  });

  it('has its own channel, not a flag on job:revise', () => {
    expect(composeIpc).toContain("handle('job:correctComposition'");
    // One channel doing two things to two kinds of document is how a caller ends up
    // guessing which it got.
    expect(composeIpc).not.toMatch(/job:revise/);
  });
});

describe('what it keeps and what it drops', () => {
  it('keeps the previous version', () => {
    /*
     * FR-1918, like an adaptation's revisions. She compares «before I told it» with
     * «after», which is how she decides whether the correction landed.
     *
     * Asserted through the **shared** mechanism since `026` T003. This used to look for
     * `ir.r${n}.md` and `nextComposedRevision` — a private copy of «archive the previous,
     * number the next», beside the adaptation's own copy. Two copies is what made the
     * third one likely, so both converged on `core/vault/revisions.ts` and this asserts
     * the call rather than the string it used to build.
     */
    expect(compose).toMatch(/archivePrevious\(vault, \{ dir: jobDir\(jobId\), stem: 'ir' \}\)/);
    expect(compose).not.toContain('nextComposedRevision');
  });

  it('refuses rather than guessing when it does not know what was asked', () => {
    /*
     * Material composed before `021` recorded no request. Reconstructing the objectives
     * from the sheet would be **inventing what she wanted**, and re-composing from an
     * invented request produces material about something else — which she would then
     * have to notice.
     */
    expect(compose).toMatch(/compose-no-objective/);
    expect(compose).toMatch(/Dime otra vez qué quieres que aprenda/);
    // Deliberately no assertion about the comment above it. Pinning prose is the
    // over-specified pattern this file's own header is about; the behaviour is what
    // matters and it is checked.
  });

  it('stores the request outside her material', () => {
    // `.rampa/`, because it is machinery: a folder she is encouraged to open in Obsidian
    // should not fill with request files.
    const paths = readFileSync(
      join(shellSrc, '..', '..', 'core', 'src', 'vault', 'paths.ts'), 'utf8');
    expect(paths).toMatch(/jobComposeRequest[\s\S]{0,200}VAULT\.machine/);
  });
});

describe('a signature does not survive a correction', () => {
  it('is derived from the document, so a rewritten document is unsigned', () => {
    /*
     * FR-1920, and it holds **structurally** rather than by anyone remembering: the
     * signature lives in the document's own front matter and `isSignedOff` reads it
     * there (`007` FR-509). A correction writes a new document from `buildSheet`, which
     * has no signature to carry — so there is nothing to clear and nothing to forget.
     *
     * Asserted so that a future «carry the review block across a correction» has to
     * argue with a test rather than look like a convenience.
     */
    const sheet = readFileSync(
      join(shellSrc, '..', '..', 'core', 'src', 'compose', 'sheet.ts'), 'utf8');
    expect(sheet).not.toMatch(/signed_off/);
    expect(sheet).not.toMatch(/review:/);
  });
});
