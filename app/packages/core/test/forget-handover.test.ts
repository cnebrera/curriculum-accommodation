import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Vault, planForget, executeForget, verifyForgotten, type NameStore,
} from '../src/index.js';

/**
 * Erasure reaches the packets, including the ones she was sent (030 T026, FR-2803).
 *
 * ## Why this lands with the feature and not after it
 *
 * P38's finding was that `handover/` was invisible to erasure: a learner with a packet
 * kept a whole file of his own while the screen said «he borrado todo lo de X» without
 * qualification. That was fixed for the flat directory.
 *
 * `030` adds `handover/received/`, one level down — and the plan's walk was flat while
 * `verifyForgotten`'s recurses. Shipping the feature without this would have been a
 * plan that refuses to collect what the verifier then reports as residue: the same
 * finding, one directory lower, introduced by the thing that created the directory.
 */
const nameStore = (): NameStore => ({
  knows: async () => false,
  forget: async () => {},
});

const scratch = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rampa-forget-h-'));
  return { dir, vault: new Vault(dir) };
};

describe('what the plan collects from `handover/`', () => {
  it('her own coordination packets, by the code in the filename', async () => {
    const { dir, vault } = await scratch();
    await vault.writeRaw('profiles/L01/profile.yaml', '---\ncode: L01\n---\n');
    await vault.writeRaw('handover/L01-coord-2026-10-14.md', '---\ncode: "L01"\n---\n\n#\n');
    await vault.writeRaw('handover/M07-coord-2026-10-14.md', '---\ncode: "M07"\n---\n\n#\n');

    const paths = (await planForget(vault, 'L01')).paths;
    expect(paths).toContain('handover/L01-coord-2026-10-14.md');
    // Another child's packet is another child's file.
    expect(paths).not.toContain('handover/M07-coord-2026-10-14.md');
    await rm(dir, { recursive: true, force: true });
  });

  it('and a packet somebody sent her, found by the link she wrote on it', async () => {
    /*
     * The one erasure could never have matched by name. A received packet's `code:` is
     * the **sender's** — opaque, and about the same child under a different name. What
     * carries hers is the `linked:` annotation, which is why the link is written into the
     * local copy at all.
     */
    const { dir, vault } = await scratch();
    await vault.writeRaw('profiles/L01/profile.yaml', '---\ncode: L01\n---\n');
    await vault.writeRaw('handover/received/K2-coord-2026-10-15.md',
      '---\nrampa_packet: coordination\ncode: "K2"\nrole: tutor\nlinked: L01\n---\n\n#\n');

    const plan = await planForget(vault, 'L01');
    expect((await planForget(vault, 'L01')).paths)
      .toContain('handover/received/K2-coord-2026-10-15.md');
    await rm(dir, { recursive: true, force: true });
  });

  it('but a held packet linked to nobody, or to somebody else, stays', async () => {
    // Somebody else's document that she is holding. It is not this child's file to
    // delete, and deleting it would lose a colleague's work over a name it never had.
    const { dir, vault } = await scratch();
    await vault.writeRaw('profiles/L01/profile.yaml', '---\ncode: L01\n---\n');
    await vault.writeRaw('handover/received/sin-vincular.md',
      '---\nrampa_packet: coordination\ncode: "K2"\nrole: tutor\n---\n\n#\n');
    await vault.writeRaw('handover/received/de-otro.md',
      '---\nrampa_packet: coordination\ncode: "K9"\nrole: tutor\nlinked: M07\n---\n\n#\n');

    const paths = (await planForget(vault, 'L01')).paths;
    expect(paths).not.toContain('handover/received/sin-vincular.md');
    expect(paths).not.toContain('handover/received/de-otro.md');
    await rm(dir, { recursive: true, force: true });
  });
});

describe('and after erasure the verifier finds nothing', () => {
  it('which is the check that would have caught the gap if the plan had missed it', async () => {
    /*
     * The pair is the point. `verifyForgotten` recurses and would have reported the held
     * packet as a residue the plan had refused to collect — «he borrado todo lo suyo»
     * beside a file with his code in it.
     */
    const { dir, vault } = await scratch();
    await vault.writeRaw('profiles/L01/profile.yaml', '---\ncode: L01\n---\n');
    await vault.writeRaw('handover/L01-coord-2026-10-14.md', '---\ncode: "L01"\n---\n\n#\n');
    await vault.writeRaw('handover/received/K2-coord-2026-10-15.md',
      '---\ncode: "K2"\nlinked: L01\n---\n\n#\n');

    const plan = await planForget(vault, 'L01');
    await executeForget(vault, plan, nameStore());
    expect(await verifyForgotten(vault, 'L01', nameStore())).toEqual([]);
    await rm(dir, { recursive: true, force: true });
  });
});
