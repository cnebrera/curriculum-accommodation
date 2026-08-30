import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault, planForget, executeForget, recordFor, writeRecord } from '../src/index.js';

/**
 * Erasing a learner who shares a worksheet (014 T019-T021, FR-1209…1211).
 *
 * The only genuinely subtle logic in `014`, and it is subtle in **both**
 * directions:
 *
 * - Remove too much, and another child's material is destroyed. She finds out
 *   the next time she opens it, which may be months.
 * - Remove too little, and a photograph of a worksheet stays in her folder for
 *   ever, belonging to a learner who no longer exists, with nobody able to say
 *   why it is there.
 *
 * `005` made this the normal case rather than a curiosity: one worksheet for
 * three learners is now a single action.
 */
let vault: Vault;

beforeEach(async () => {
  vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-erase-')), 'Rampa'));
});

async function sharedJob(jobId: string, learners: string[]): Promise<void> {
  await vault.writeRaw(`material/${jobId}/ir.md`, '---\nsource: "photos"\n---\n\ntexto\n');
  await vault.writeRaw(`material/${jobId}/source/pagina-1.txt`, 'la foto de la ficha');
  for (const l of learners) {
    await vault.writeRaw(`material/${jobId}/${l}/adapted.md`,
      `---\nadapted_on: "2026-05-12"\nschool_year: "2025-2026"\n---\n\n::: {#b1 .explanation}\nhola\n:::\n`);
    await vault.writeRaw(`output/${jobId}/${l}/sheet.html`, '<p>hola</p>');
    await vault.writeRaw(`profiles/${l}/profile.yaml`, `code: ${l}\n`);
  }
}

describe('two learners, one worksheet', () => {
  it('the plan says the shared material stays, and why', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    const plan = await planForget(vault, 'E38');

    expect(plan.sharedKept).toEqual([{ job: 'job-a', alsoUsedBy: 1 }]);
    expect(plan.survives.join(' ')).toMatch(/otros alumnos tuyos también lo usan/);
    // And it says so BEFORE anything is removed — she sees the plan first.
    expect(await vault.exists('material/job-a/M12/adapted.md')).toBe(true);
  });

  it('erasing the first leaves the second untouched, with their source', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    await executeForget(vault, await planForget(vault, 'E38'));

    // Hers is gone.
    expect(await vault.exists('material/job-a/E38/adapted.md')).toBe(false);
    expect(await vault.exists('output/job-a/E38/sheet.html')).toBe(false);
    expect(await vault.exists('profiles/E38')).toBe(false);

    // His is not, and neither is the worksheet they shared.
    expect(await vault.exists('material/job-a/M12/adapted.md')).toBe(true);
    expect(await vault.exists('material/job-a/source/pagina-1.txt')).toBe(true);
    expect(await vault.exists('material/job-a/ir.md')).toBe(true);
    expect(await recordFor(vault, 'M12')).toHaveLength(1);
  });

  it('erasing the second then removes the source, because nobody reads it', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    await executeForget(vault, await planForget(vault, 'E38'));

    const second = await planForget(vault, 'M12');
    expect(second.sharedKept, 'nobody else uses it now').toEqual([]);
    await executeForget(vault, second);

    expect(await vault.exists('material/job-a/source/pagina-1.txt')).toBe(false);
    expect(await vault.exists('material/job-a/ir.md')).toBe(false);
  });

  it('the order does not matter', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    await executeForget(vault, await planForget(vault, 'M12'));
    await executeForget(vault, await planForget(vault, 'E38'));
    expect(await vault.exists('material/job-a/ir.md')).toBe(false);
  });
});

describe('one learner, one worksheet', () => {
  it('takes the source with them, because it is now an orphan', async () => {
    await sharedJob('job-solo', ['E38']);
    const plan = await planForget(vault, 'E38');

    expect(plan.sharedKept).toEqual([]);
    await executeForget(vault, plan);
    expect(await vault.exists('material/job-solo/ir.md')).toBe(false);
  });
});

describe('a directory left behind by a crash is not a reader', () => {
  /**
   * The question is "does anybody still *read* this?", and a directory with the
   * right name and no `adapted.md` in it does not. Treating it as a reader would
   * keep a photograph of a worksheet in her folder for ever, with nobody able to
   * say why it was there.
   */
  it('does not keep a source alive for an empty learner directory', async () => {
    await sharedJob('job-a', ['E38']);
    await vault.ensureDir('material/job-a/M12');   // no adapted.md: a leftover

    const plan = await planForget(vault, 'E38');
    expect(plan.sharedKept).toEqual([]);
    await executeForget(vault, plan);
    expect(await vault.exists('material/job-a/ir.md')).toBe(false);
  });
});

describe('the record goes with the learner', () => {
  it('removes record.md and leaves no trace of the code', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    await writeRecord(vault, 'E38', await recordFor(vault, 'E38'));
    expect(await vault.exists('profiles/E38/record.md')).toBe(true);

    const { remaining } = await executeForget(vault, await planForget(vault, 'E38'));

    expect(await vault.exists('profiles/E38/record.md')).toBe(false);
    // `verifyForgotten` searches the whole vault for the code, so this is the
    // claim made honestly rather than assumed from the delete list.
    expect(remaining).toEqual([]);
  });

  it('does not disturb the other learner\'s record', async () => {
    await sharedJob('job-a', ['E38', 'M12']);
    await writeRecord(vault, 'M12', await recordFor(vault, 'M12'));

    await executeForget(vault, await planForget(vault, 'E38'));

    expect(await vault.exists('profiles/M12/record.md')).toBe(true);
    // And rebuilding it from the vault still finds his work — the record is
    // derived, so erasure could not have quietly emptied it.
    expect(await recordFor(vault, 'M12')).toHaveLength(1);
  });
});
