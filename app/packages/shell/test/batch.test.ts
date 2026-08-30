import { describe, it, expect } from 'vitest';
import { readFile, readdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { Vault } from '@rampa/core';
import { runBatch, type AdaptOne, type BatchProgress } from '../src/jobs/batch.js';
import { RampaError } from '@rampa/core';

/**
 * One worksheet, several learners — the semantics (005 T001-T009).
 *
 * Written before the implementation, and the one case that matters is not
 * "three sheets appear". It is **the second of three failing**: a batch feature
 * is easy to write and easy to write badly, and the bad version — a `try` around
 * the loop instead of inside it — passes every happy-path test and loses two
 * learners' work the first time a provider times out.
 *
 * ## Why there is no mocking here
 *
 * `runBatch` takes the per-learner adaptation as an argument rather than
 * importing it. That was a design decision made *because* of this file: the real
 * `runAdaptation` reaches `currentVault()` and `activeProvider()`, both of which
 * transitively import Electron, so testing the batch through it would mean
 * mocking three modules to assert a loop.
 *
 * Taking the function makes the batch's own behaviour — isolation, ordering,
 * deduplication, progress — testable as what it is: logic, with no vault, no
 * provider and no window. It is also the honest separation FR-1111 asks for.
 */

/** A stand-in adaptation that records what it was asked to do. */
function recorder(behaviour: (learner: string) => Promise<unknown> = async () => ({})) {
  const calls: string[] = [];
  const fn: AdaptOne = async (jobId, learner) => {
    calls.push(learner);
    return (await behaviour(learner)) as Awaited<ReturnType<AdaptOne>>;
  };
  return { fn, calls, jobId: 'job-1' };
}

const noProgress = (): void => {};

describe('one extraction, N adaptations', () => {
  it('adapts once per learner, in the order given', async () => {
    const r = recorder();
    const outcome = await runBatch('job-1', ['E38', 'M12', 'I07'], r.fn, noProgress);
    expect(r.calls).toEqual(['E38', 'M12', 'I07']);
    expect(outcome.results.map((x) => x.learner)).toEqual(['E38', 'M12', 'I07']);
    expect(outcome.results.every((x) => x.ok)).toBe(true);
  });

  it('accepts a single learner, because that is still the common case', async () => {
    const r = recorder();
    const outcome = await runBatch('job-1', 'E38', r.fn, noProgress);
    expect(r.calls).toEqual(['E38']);
    expect(outcome.results).toHaveLength(1);
  });

  /**
   * T003. She picked the same child twice; she did not ask to pay twice.
   */
  it('adapts once for a learner listed twice', async () => {
    const r = recorder();
    const outcome = await runBatch('job-1', ['E38', 'M12', 'E38'], r.fn, noProgress);
    expect(r.calls).toEqual(['E38', 'M12']);
    expect(outcome.results).toHaveLength(2);
  });

  it('does nothing at all for an empty list', async () => {
    const r = recorder();
    const outcome = await runBatch('job-1', [], r.fn, noProgress);
    expect(r.calls).toEqual([]);
    expect(outcome.results).toEqual([]);
  });

  /**
   * FR-518. Concurrency against a rate-limited provider turns one failure into
   * three, and the saving this feature exists for is the ingest, which happens
   * once either way. Asserted by overlap: if two adaptations are ever in flight
   * together, `inFlight` exceeds one.
   */
  it('runs them one after another, never together', async () => {
    let inFlight = 0;
    let peak = 0;
    const fn: AdaptOne = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return {} as Awaited<ReturnType<AdaptOne>>;
    };
    await runBatch('job-1', ['A', 'B', 'C'], fn, noProgress);
    expect(peak).toBe(1);
  });
});

describe('one of them fails, and the others are still hers', () => {
  /** The defect this whole file exists to prevent. */
  it('completes the third when the second throws', async () => {
    const r = recorder(async (learner) => {
      if (learner === 'M12') throw new RampaError('provider-failed', 'El servicio no ha contestado.');
      return {};
    });
    const outcome = await runBatch('job-1', ['E38', 'M12', 'I07'], r.fn, noProgress);

    expect(r.calls, 'the loop stopped at the failure').toEqual(['E38', 'M12', 'I07']);
    expect(outcome.results.map((x) => [x.learner, x.ok])).toEqual([
      ['E38', true], ['M12', false], ['I07', true],
    ]);
  });

  /** FR-507: a failure belongs to a learner and is never a verdict on the run. */
  it('names the learner and keeps the domain kind', async () => {
    const r = recorder(async (learner) => {
      if (learner === 'M12') throw new RampaError('output-incomplete', 'Ha vuelto incompleto.');
      return {};
    });
    const outcome = await runBatch('job-1', ['E38', 'M12'], r.fn, noProgress);
    const failed = outcome.results.find((x) => !x.ok);
    expect(failed?.learner).toBe('M12');
    if (failed && !failed.ok) {
      expect(failed.kind).toBe('output-incomplete');
      expect(failed.message).toContain('incompleto');
    }
  });

  it('survives a plain Error, not only a RampaError', async () => {
    const r = recorder(async (learner) => {
      if (learner === 'E38') throw new Error('boom');
      return {};
    });
    const outcome = await runBatch('job-1', ['E38', 'M12'], r.fn, noProgress);
    expect(outcome.results.map((x) => x.ok)).toEqual([false, true]);
    const failed = outcome.results[0];
    if (failed && !failed.ok) expect(failed.kind).toBe('unknown');
  });

  it('reports every learner failing without claiming the batch failed', async () => {
    // A learner-level kind: something went wrong for this child's sheet, and it
    // could have gone right for the next one.
    const r = recorder(async () => { throw new RampaError('output-incomplete', 'Vino corto.'); });
    const outcome = await runBatch('job-1', ['E38', 'M12'], r.fn, noProgress);
    // Not a throw, and not a single verdict: two failures, each with an owner.
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results.every((x) => !x.ok)).toBe(true);
  });
});

describe('the order of the learners cannot change any learner\'s outcome', () => {
  /**
   * T005 · Principle II, and the failure mode no happy-path test can see: a
   * shared accumulator that leaks one learner's state into the next. The
   * symptom would be the third sheet differing depending on who came first,
   * which nobody would notice for months.
   */
  it('produces the same results forwards and backwards', async () => {
    const behaviour = async (learner: string) => ({ who: learner });
    const forwards = await runBatch('job-1', ['E38', 'M12', 'I07'], recorder(behaviour).fn, noProgress);
    const backwards = await runBatch('job-1', ['I07', 'M12', 'E38'], recorder(behaviour).fn, noProgress);

    const byLearner = (o: typeof forwards) =>
      Object.fromEntries(o.results.map((x) => [x.learner, x.ok ? x.result : x.message]));
    expect(byLearner(forwards)).toEqual(byLearner(backwards));
  });

  it('one learner failing does not change what another produced', async () => {
    const behaviour = async (learner: string) => {
      if (learner === 'M12') throw new RampaError('provider-failed', 'no');
      return { who: learner };
    };
    const withFailure = await runBatch('job-1', ['E38', 'M12', 'I07'], recorder(behaviour).fn, noProgress);
    const alone = await runBatch('job-1', ['E38', 'I07'], recorder(behaviour).fn, noProgress);

    const ok = (o: typeof alone) => o.results.filter((x) => x.ok).map((x) => x.result);
    expect(ok(withFailure)).toEqual(ok(alone));
  });
});

describe('she can see whose adaptation is running', () => {
  /** FR-519. A progress stream that cannot say who it is on cannot produce
   *  FR-507's message either. */
  it('reports the learner and the position', async () => {
    const seen: BatchProgress[] = [];
    const fn: AdaptOne = async (_job, _learner, onProgress) => {
      onProgress({ stage: 'Adaptando' });
      return {} as Awaited<ReturnType<AdaptOne>>;
    };
    await runBatch('job-1', ['E38', 'M12'], fn, (p) => seen.push(p));

    expect(seen.map((p) => [p.learner, p.index, p.of])).toEqual([
      ['E38', 1, 2], ['M12', 2, 2],
    ]);
    expect(seen.every((p) => p.stage === 'Adaptando')).toBe(true);
  });

  it('a single learner still reports of: 1, so no caller needs a branch', async () => {
    const seen: BatchProgress[] = [];
    const fn: AdaptOne = async (_j, _l, onProgress) => {
      onProgress({ stage: 'Guardando' });
      return {} as Awaited<ReturnType<AdaptOne>>;
    };
    await runBatch('job-1', 'E38', fn, (p) => seen.push(p));
    expect(seen).toEqual([{ stage: 'Guardando', learner: 'E38', index: 1, of: 1 }]);
  });

  it('keeps reporting after a learner fails', async () => {
    const seen: string[] = [];
    const fn: AdaptOne = async (_j, learner, onProgress) => {
      onProgress({ stage: 'Leyendo el material' });
      if (learner === 'E38') throw new RampaError('output-incomplete', 'no');
      return {} as Awaited<ReturnType<AdaptOne>>;
    };
    await runBatch('job-1', ['E38', 'M12'], fn, (p) => seen.push(p.learner));
    expect(seen).toEqual(['E38', 'M12']);
  });
});

describe('the batch cannot re-read the source, structurally', () => {
  /**
   * T008 · Principle IV, asserted as an absence.
   *
   * The saving this feature exists for is the **ingest** — the provider call
   * that reads a photograph — and it is saved because ingest is a separate step
   * that already runs once per job. Reading `ir.md` from disk once per learner
   * is free and is not what FR-502 is about.
   *
   * So the useful assertion is that the batch has no way to ingest anything: it
   * imports no vault, no provider and no ingest module, and could not call one
   * if a future edit wanted it to without that edit being visible here.
   */
  it('imports no vault, no provider and no ingest', async () => {
    const src = await readFile(
      join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'jobs', 'batch.ts'), 'utf8');
    const imports = [...src.matchAll(/^\s*import\s[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    expect(imports.filter((i) => /vault|provider|ingest|keys/i.test(i ?? ''))).toEqual([]);
    // What it may import: the core's error helpers, and the adaptation's types.
    expect(imports.sort()).toEqual(['./adapt.js', '@rampa/core']);
  });
});

describe('a sheet exists completely or not at all', () => {
  /**
   * T006 · FR-509, and the observable half of it.
   *
   * True atomicity — a crash mid-write — cannot be provoked in process. What can
   * be asserted is the mechanism's visible consequence: the write goes via a
   * sibling temporary and leaves none behind. A leftover `.rampa-tmp` beside an
   * adapted worksheet would be a second document in her folder that looks like
   * hers and is not.
   *
   * It became worth doing with `005`: three adaptations are three times the
   * window in which a cancellation lands mid-write.
   */
  it('leaves no temporary file behind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rampa-atomic-'));
    const vault = new Vault(root);
    await vault.writeRaw('material/job-1/E38/adapted.md', 'x'.repeat(200_000));
    await vault.writeRaw('material/job-1/E38/adapted.md', 'shorter');

    const entries = await readdir(join(root, 'material', 'job-1', 'E38'));
    expect(entries).toEqual(['adapted.md']);
    expect(await vault.readRaw('material/job-1/E38/adapted.md')).toBe('shorter');
  });
});

describe('nothing else gained a list', () => {
  /**
   * T012 · [contracts/job-batch.md](../../../specs/005-group/contracts/job-batch.md)'s
   * most important line.
   *
   * Rendering, signing and reviewing stay per (job × learner), because a
   * signature is per sheet (Principle VII). A `job:signOff` that took a list
   * would be the «firmar todo» button FR-512 forbids — arriving through the API
   * rather than through the interface, which is exactly how a forbidden
   * affordance gets built by accident, one reasonable-looking commit at a time.
   *
   * Asserted over the preload, because that is the surface a renderer can reach.
   */
  it('signing, rendering and reviewing take one learner', async () => {
    const preload = await readFile(
      join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'preload.ts'), 'utf8');

    for (const channel of ['signOff', 'isSignedOff', 'render', 'pdf', 'revise', 'reportData', 'openForEditing']) {
      const line = preload.split('\n').find((l) => l.trim().startsWith(`${channel}:`));
      expect(line, `${channel} is not in the preload`).toBeDefined();
      expect(line, `${channel} takes a list of learners`).not.toMatch(/learners|string\[\]/);
    }
  });

  it('adapting is the only one that does', async () => {
    const preload = await readFile(
      join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'preload.ts'), 'utf8');
    const line = preload.split('\n').find((l) => l.trim().startsWith('adapt:'));
    expect(line).toMatch(/string\[\]/);
  });
});

describe('a failure of the job is not a failure of a learner', () => {
  /**
   * The distinction arrived from a test rather than from design, which is why it
   * is worth its own block.
   *
   * `e2e/onboarding.spec.ts` asserts that adapting unverified material **rejects**
   * with `[rampa:ir-unverified]`. The first version of `runBatch` caught
   * everything, so that call started resolving — and the verification gate, which
   * this project calls its defence against one reading error contaminating every
   * output, quietly became a per-child mishap reported three times.
   *
   * The rule: a job-level kind throws while nothing has been produced, and is
   * recorded once work exists. Preserve work when there is work; preserve the old
   * rejection when there is none.
   */
  it('rejects when the material is not verified', async () => {
    const r = recorder(async () => { throw new RampaError('ir-unverified', 'Sin verificar.'); });
    await expect(runBatch('job-1', ['E38', 'M12', 'I07'], r.fn, noProgress)).rejects.toThrow(/verificar/);
    // And it did not spend two more attempts finding out the same thing.
    expect(r.calls).toEqual(['E38']);
  });

  it.each(['corpus-missing', 'key-missing', 'offline', 'vault-unreadable'] as const)(
    'rejects on %s when nothing has been produced', async (kind) => {
      const r = recorder(async () => { throw new RampaError(kind, 'x'); });
      await expect(runBatch('job-1', ['E38', 'M12'], r.fn, noProgress)).rejects.toThrow();
    });

  /**
   * The half that matters more, and the one a naive "job-level kinds always
   * throw" rule gets wrong: two finished sheets must not be discarded to report
   * that the connection dropped before the third.
   */
  it('keeps two finished sheets when the connection drops before the third', async () => {
    const r = recorder(async (learner) => {
      if (learner === 'I07') throw new RampaError('offline', 'Sin conexión.');
      return {};
    });
    const outcome = await runBatch('job-1', ['E38', 'M12', 'I07'], r.fn, noProgress);
    expect(outcome.results.map((x) => [x.learner, x.ok])).toEqual([
      ['E38', true], ['M12', true], ['I07', false],
    ]);
  });
});
