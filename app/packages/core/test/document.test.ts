import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Vault, resolveDocument, startedFor, parseIR } from '../src/index.js';

/**
 * Which document is «the document» of a job (021 T002-T006).
 *
 * ## Why this is the foundation of the feature
 *
 * The answer was hard-coded as `material/<job>/<learner>/adapted.md` in eight places, so
 * everything Rampa can do **to** a document — print, export, sign, correct — could only
 * be done to an adaptation. A composed document existed in her folder and nothing in the
 * application could touch it. She found that out with a sheet she wanted for tomorrow.
 *
 * ## The case, not just a path
 *
 * Printing needs the learner, and the two cases get it from different places: an
 * adaptation from the directory it lives in, a composition from its own front matter. A
 * resolver that returned only a string would push that decision back out to the eight
 * callers it exists to unify.
 *
 * ## Two kinds of nothing
 *
 * «You have not adapted this for Lucía» and «this job has no document at all» are
 * different sentences to a teacher, and before this both produced «Este trabajo todavía
 * no está adaptado» — which for composed material was simply false.
 */
let vault: Vault;

beforeEach(async () => {
  vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-doc-')), 'Rampa'));
});

const composed = (learnerKey?: 'for_learner' | 'composed_for', code = 'E38') =>
  `---\nsource: "generated"\ngenerated: true\nkind: "worksheet"\n`
  + (learnerKey ? `${learnerKey}: "${code}"\n` : '')
  + `---\n\n::: {#g1 .exercise}\n47 × 8 =\n:::\n`;

const adapted = '---\nadapted_on: "2026-05-12"\nkind: "worksheet"\n---\n\n'
  + '::: {#g1 .exercise data-from="g1"}\n47 × 8 =\n:::\n';

describe('the document of a job', () => {
  it('is the adaptation when there is one for this learner', async () => {
    await vault.writeRaw('material/job-1/ir.md', composed('for_learner'));
    await vault.writeRaw('material/job-1/E38/adapted.md', adapted);

    const d = await resolveDocument(vault, 'job-1', 'E38');
    expect(d.of).toBe('adapted');
    if (d.of !== 'adapted') throw new Error('unreachable');
    expect(d.path).toBe('material/job-1/E38/adapted.md');
    expect(d.learner).toBe('E38');
  });

  it('is the composition when nothing has been adapted', async () => {
    await vault.writeRaw('material/job-1/ir.md', composed('for_learner'));

    const d = await resolveDocument(vault, 'job-1');
    expect(d.of).toBe('composed');
    if (d.of !== 'composed') throw new Error('unreachable');
    expect(d.path).toBe('material/job-1/ir.md');
    // The learner comes from the front matter, which is what makes printing possible
    // without asking the caller to know.
    expect(d.learner).toBe('E38');
  });

  it('reads the older spelling too', async () => {
    // `002` wrote `composed_for` before `020` settled on `for_learner`. A vault written
    // last week has documents in it.
    await vault.writeRaw('material/job-1/ir.md', composed('composed_for', 'B7'));
    const d = await resolveDocument(vault, 'job-1');
    if (d.of !== 'composed') throw new Error('unreachable');
    expect(d.learner).toBe('B7');
  });

  it('still resolves a composition that records nobody', async () => {
    /*
     * Every job composed before `020`/`021` is in this state. Refusing to print them
     * would be this feature's own limbo with a newer date on it, so it resolves, renders
     * with the default presentation, and says nobody was recorded.
     */
    await vault.writeRaw('material/job-1/ir.md', composed());
    const d = await resolveDocument(vault, 'job-1');
    expect(d.of).toBe('composed');
    if (d.of !== 'composed') throw new Error('unreachable');
    expect(d.learner).toBeUndefined();
  });

  it('says «not adapted for this learner» when it is composed for another', async () => {
    await vault.writeRaw('material/job-1/ir.md', composed('for_learner', 'E38'));
    await vault.writeRaw('material/job-1/E38/adapted.md', adapted);

    const d = await resolveDocument(vault, 'job-1', 'B7');
    expect(d.of).toBe('none');
    if (d.of !== 'none') throw new Error('unreachable');
    expect(d.because).toBe('not-adapted-for-this-learner');
  });

  it('says «no document at all» when the job is empty', async () => {
    const d = await resolveDocument(vault, 'job-nothing');
    expect(d.of).toBe('none');
    if (d.of !== 'none') throw new Error('unreachable');
    expect(d.because).toBe('no-document-at-all');
  });

  it('does not treat an ingested, unadapted job as a composition', async () => {
    // An ingested reading is not material she can hand out: it is what Rampa read, and
    // it has not been through the verification gate or an adaptation. Printing it would
    // be printing the extraction.
    await vault.writeRaw('material/job-1/ir.md',
      '---\nsource: "photos"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n');
    const d = await resolveDocument(vault, 'job-1');
    expect(d.of).toBe('none');
    if (d.of !== 'none') throw new Error('unreachable');
    expect(d.because).toBe('no-document-at-all');
  });
});

describe('who a job was started for', () => {
  it('prefers the current spelling and accepts the old one', () => {
    expect(startedFor({ for_learner: 'E38', composed_for: 'B7' })).toBe('E38');
    expect(startedFor({ composed_for: 'B7' })).toBe('B7');
    expect(startedFor({})).toBeUndefined();
    // Not a string, not a learner.
    expect(startedFor({ for_learner: true })).toBeUndefined();
  });
});

describe('nobody else builds the path', () => {
  it('is constructed only by the resolver and the writers', () => {
    /*
     * The structural half of this feature, and the reason it is a test: eight call sites
     * read `jobAdapted(...)` before `021`, and a constant that appears in eight places
     * creeps back into a ninth. The writers keep it — `job:adapt` writes there — so the
     * rule is about **readers**.
     */
    const shellSrc = join(dirname(new URL(import.meta.url).pathname),
      '..', '..', 'shell', 'src');
    const offenders: string[] = [];

    /*
     * Two readers legitimately want **a specific adaptation** rather than «the
     * document», and they are listed here with the reason rather than excluded by a
     * pattern that would also hide a real one:
     *
     * - `jobs/adapt.ts` reads the previous adaptation to keep it as a revision. It is
     *   the writer of adaptations; the file it reads is the file it is about to replace.
     * - `jobs/stale.ts` asks «which of her adapted sheets came from a reading she has
     *   since corrected» (`005` FR-520). The question is about adaptations by
     *   definition, and resolving would answer a different one.
     */
    const ALLOWED = new Set(['jobs/adapt.ts', 'jobs/stale.ts']);

    const walk = (dir: string): void => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, name.name);
        if (name.isDirectory()) { walk(full); continue; }
        if (!name.name.endsWith('.ts')) continue;
        const src = readFileSync(full, 'utf8');
        for (const [i, line] of src.split('\n').entries()) {
          if (!line.includes('jobAdapted(')) continue;
          // A write is legitimate: the adaptation is written where it belongs.
          if (/writeRaw\(\s*jobAdapted|jobAdaptedRevision/.test(line)) continue;
          // And a line that is only importing the helper is not a use of it.
          if (/^\s*(import|\s*jobAdapted,)/.test(line)) continue;
          const rel = full.split('/shell/src/')[1]!;
          if (ALLOWED.has(rel)) continue;
          offenders.push(`${rel}:${i + 1}`);
        }
      }
    };
    walk(shellSrc);

    expect(offenders, 'a reader is building the adapted path instead of resolving it')
      .toEqual([]);
  });
});
