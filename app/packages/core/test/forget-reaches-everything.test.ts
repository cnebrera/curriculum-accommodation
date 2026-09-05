import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault, planForget, jobIR, jobDir, learnerProfile } from '../src/index.js';

/**
 * Erasure reaches material that never had a learner directory (028 T020, FR-2604).
 *
 * ## The shape of the gap
 *
 * `planForget` walks `material/` and asks «is there a `material/<job>/<code>/`?». That is
 * the right question for an **adapted** sheet, because an adaptation lives in a directory
 * named after the child.
 *
 * It is the wrong question for anything Rampa wrote *for* a learner without adapting it.
 * Those documents are `material/<job>/ir.md` with the code in their front matter, and
 * there are two kinds:
 *
 * - a **structure** document — an agenda, a sequence, a story (`028`);
 * - a **composed** sheet she has not adapted yet (`016` T006 made these appear in the
 *   record from the moment they are written, precisely because they are already his).
 *
 * Neither has a learner directory, so neither was planned for deletion. A teacher pressed
 * «borrar todo lo suyo», was told everything was gone, and a file with that child's code
 * in it stayed in her folder. `003` FR-215's whole point is that the list is complete
 * **before** she confirms.
 */
const seedVault = async (): Promise<Vault> =>
  new Vault(await mkdtemp(join(tmpdir(), 'rampa-forget-')));

const agenda = (code: string) => `---
source: structure
structure: agenda
for_learner: ${code}
language: es
created: "2026-09-07"
---

::: {#s1 .agenda-moment}
asamblea
:::
`;

const composition = (code: string) => `---
source: composed
composed_for: ${code}
objectives:
  - multiplicar con llevadas
---

::: {#b1 .exercise}
1. 3 × 4 =
:::
`;

describe('erasing a learner reaches everything with his code in it', () => {
  it('an agenda he never had adapted goes with him', async () => {
    const v = await seedVault();
    await v.writeRaw(learnerProfile('AL-07'), '---\ncode: AL-07\n---\n');
    await v.writeRaw(jobIR('job-a'), agenda('AL-07'));

    const plan = await planForget(v, 'AL-07');
    expect(plan.paths, 'his agenda is a file with his code in it')
      .toContain(jobDir('job-a'));
  });

  it('and so does a composition she wrote for him and never adapted', async () => {
    /*
     * The same gap, one door over, and older than `028`. A composed sheet is his from the
     * moment it is written — `016` T006 put it in the record for exactly that reason —
     * and it carried `composed_for` and no learner directory.
     */
    const v = await seedVault();
    await v.writeRaw(learnerProfile('AL-07'), '---\ncode: AL-07\n---\n');
    await v.writeRaw(jobIR('job-b'), composition('AL-07'));

    const plan = await planForget(v, 'AL-07');
    expect(plan.paths).toContain(jobDir('job-b'));
  });

  it('but another child\'s agenda is not touched', async () => {
    /*
     * The other direction, which is the one that destroys somebody's work. `planForget`
     * already gets this right for adapted material and it has to stay right here: erasing
     * one learner must not remove a strip another child reads every morning.
     */
    const v = await seedVault();
    await v.writeRaw(learnerProfile('AL-07'), '---\ncode: AL-07\n---\n');
    await v.writeRaw(jobIR('job-a'), agenda('AL-07'));
    await v.writeRaw(jobIR('job-c'), agenda('OTRO-01'));

    const plan = await planForget(v, 'AL-07');
    expect(plan.paths).toContain(jobDir('job-a'));
    expect(plan.paths).not.toContain(jobDir('job-c'));
  });

  it('and an ingested reading that nobody adapted stays, because it is not his', async () => {
    /*
     * A photograph she brought and never adapted for anybody has no learner in it at all.
     * Removing it while erasing a child would delete her own source material on the
     * strength of a coincidence of timing.
     */
    const v = await seedVault();
    await v.writeRaw(learnerProfile('AL-07'), '---\ncode: AL-07\n---\n');
    await v.writeRaw(jobIR('job-d'), '---\nsource: pegado\n---\n\n::: {#b1 .explanation}\nx\n:::\n');

    const plan = await planForget(v, 'AL-07');
    expect(plan.paths).not.toContain(jobDir('job-d'));
  });
});
