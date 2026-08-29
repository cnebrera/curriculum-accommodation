import {
  VAULT, loadJournal, writeIndex, houseStyleOverflowing, appendNote, loadLearner,
  saveProfile, buildPacket, packetToMarkdown, toShareable, planForget, executeForget,
  tombstone, listLearners, loadRoster, saveRoster, rosterNameRisk, generateCode, validateCode,
  rosterSchema, profileSchema, buildProposals, learnerNotes, type Profile,
} from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';

/**
 * Memory: the teacher routes every item (Principle VIII).
 *
 * Only she knows whether a correction is about this child, about how she works,
 * or about the recipe. There is no default and no inference here — routing a
 * learner-specific note into shared material is a privacy incident, not a
 * quality problem.
 */
export function registerMemoryIpc(): void {
  handle('memory:capture', async (payload: {
    scope: 'learner' | 'practice' | 'corpus';
    learner?: string; recipes?: string[]; heading: string; text: string;
    /** Where a learner-scope item goes in the profile. She chooses; nothing is inferred. */
    destination?: 'note' | 'avoid' | 'works';
  }) => {
    const vault = currentVault();
    const stamp = new Date().toISOString().slice(0, 10);

    if (payload.scope === 'learner') {
      if (!payload.learner) throw new Error('Falta el alumno.');

      // 003 FR-202: a learner-scope correction updates the profile, not only the
      // notes. Before T085 only the note was written, so `avoid` and `works` —
      // the fields the recipes actually consult — never changed, and the
      // correction had no mechanical effect on the next run.
      const dest = payload.destination ?? 'note';
      let promoted = '';
      if (dest === 'avoid' || dest === 'works') {
        const learner = await loadLearner(vault, payload.learner);
        const list = dest === 'avoid' ? learner.profile.avoid : learner.profile.works;
        if (!list.some((e) => e.trim() === payload.text.trim())) list.push(payload.text.trim());
        await saveProfile(vault, learner.profile);
        promoted = dest === 'avoid' ? 'evitar' : 'lo que funciona';
      }

      await appendNote(vault, payload.learner, payload.heading,
        promoted ? `${payload.text}\n→ añadido a «${promoted}» del perfil.` : payload.text);
      return {
        written: `profiles/${payload.learner}/notes.md`,
        promoted: promoted || null,
      };
    }

    if (payload.scope === 'practice') {
      const existing = (await vault.readRaw(VAULT.house)) ?? '# Cómo trabajo yo\n';
      await vault.writeRaw(VAULT.house, `${existing.trimEnd()}\n\n- ${payload.text.trim()}\n`);
      return { written: VAULT.house, overflowing: houseStyleOverflowing(existing) };
    }

    // Corpus scope: pattern, never passage.
    //
    // The recipes matter mechanically, not decoratively (T086): `loadForRun`
    // filters the journal by intersection with the recipes selected for a run,
    // so an entry written with an empty `recipes:` list is indexed under
    // "(sin receta)" and **never loaded again**. A corpus correction with no
    // tags is a correction with no effect, forever.
    const slug = payload.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const path = `${VAULT.journal}/${stamp}-${slug || 'nota'}.md`;
    await vault.writeRaw(path, [
      // Quoted. Unquoted, YAML parses it into a `Date` — which is what broke
      // every journal entry this application has ever written (003 audit).
      '---', `date: "${stamp}"`, `recipes: [${(payload.recipes ?? []).map((r) => `"${r}"`).join(', ')}]`,
      'scope: corpus', 'status: open', '---', '',
      `## Qué pasó`, '', payload.text.trim(), '',
    ].join('\n'));
    await writeIndex(vault, await loadJournal(vault));
    return { written: path };
  });

  /**
   * What has accumulated, and what is worth promoting (003 US3, T093).
   *
   * Proposals only. Nothing here writes anything: the applying happens through
   * `memory:capture` and `memory:archive`, each on her explicit confirmation.
   */
  handle('memory:consolidate', async () => {
    const vault = currentVault();
    const codes = await listLearners(vault);
    const learners = await Promise.all(codes.map(async (code) => ({
      code,
      notes: (await vault.readRaw(learnerNotes(code))) ?? '',
    })));
    return buildProposals({
      learners,
      journal: await loadJournal(vault),
      house: (await vault.readRaw(VAULT.house)) ?? '',
      today: new Date().toISOString().slice(0, 10),
    });
  });

  /** Archive, never delete: provenance matters when a rule is later questioned. */
  handle('memory:archive', async (path: string) => {
    const vault = currentVault();
    const raw = await vault.readRaw(path);
    if (raw === null) return { archived: false };
    const name = path.split('/').pop()!;
    await vault.writeRaw(`${VAULT.journalArchive}/${name}`, raw);
    await vault.writeRaw(path, '');
    const { rm } = await import('node:fs/promises');
    const { resolveInVault } = await import('@rampa/core');
    await rm(resolveInVault(vault.root, path), { force: true });
    await writeIndex(vault, await loadJournal(vault));
    return { archived: true, to: `${VAULT.journalArchive}/${name}` };
  });

  handle('memory:index', async () => {
    const vault = currentVault();
    await writeIndex(vault, await loadJournal(vault));
    return (await vault.readRaw(VAULT.index)) ?? '';
  });

  handle('memory:house', async () => (await currentVault().readRaw(VAULT.house)) ?? '');

  /**
   * The packet, for review (004 T006, FR-304/305).
   *
   * Returns the **claims** as well as the prose, because FR-305 says nothing
   * leaves without her review and FR-304 says what she removes in review is gone
   * from the packet — not hidden in it. Review needs the claims individually, so
   * a handler that only returned rendered markdown made the requirement
   * unimplementable.
   *
   * `shareable` is gone. `toShareable` can only ever return an empty packet,
   * because a handover packet is entirely about one learner — the concept belongs
   * to `003`'s corpus export, where there is genuinely non-learner material.
   * Leaving the flag would have offered her a button whose only output is nothing.
   */
  handle('memory:handoverDraft', async (code: string, year: string, summary: string) => {
    const learner = await loadLearner(currentVault(), code);
    const packet = buildPacket(learner, year, summary);
    return { packet, markdown: packetToMarkdown(packet) };
  });

  /**
   * The reviewed packet, written where she can send it from.
   *
   * `keep` is the list of claim texts she left in. Anything absent is **dropped
   * from the packet** rather than marked: a claim carried along with a "removed"
   * flag is a claim in a document she is about to email.
   */
  handle('memory:handoverWrite', async (
    code: string, year: string, summary: string, keep: string[],
  ) => {
    const vault = currentVault();
    const learner = await loadLearner(vault, code);
    const full = buildPacket(learner, year, summary);
    const kept = new Set(keep);
    const reviewed = { ...full, claims: full.claims.filter((c) => kept.has(c.text)) };
    const markdown = packetToMarkdown(reviewed);

    // Into the vault, as a file she can attach — the packet has to survive
    // without this application, which is FR-306's whole point.
    const path = `${VAULT.handover}/${code}-${year}.md`;
    await vault.writeRaw(path, markdown);
    return { path, markdown, dropped: full.claims.length - reviewed.claims.length };
  });

  /** Lists everything before removing anything (003 FR-215). */
  handle('memory:forgetPlan', async (code: string) => planForget(currentVault(), code));

  handle('memory:forget', async (code: string) => {
    const vault = currentVault();
    const plan = await planForget(vault, code);
    const result = await executeForget(vault, plan);
    const log = (await vault.readRaw('.rampa/erasures.md')) ?? '# Datos eliminados\n\n';
    await vault.writeRaw('.rampa/erasures.md', log + tombstone(code));
    return result;
  });

  handle('learners:list', async () => listLearners(currentVault()));
  handle('learners:roster', async () => loadRoster(currentVault()));
  handle('learners:saveRoster', async (roster: unknown) => {
    await saveRoster(currentVault(), rosterSchema.parse(roster)); return true; });
  handle('learners:load', async (code: string) => loadLearner(currentVault(), code));
  handle('learners:save', async (profile: unknown) => {
    await saveProfile(currentVault(), profileSchema.parse(profile) as Profile); return true; });
  handle('learners:newCode', async () => generateCode(await listLearners(currentVault())));
  handle('learners:validateCode', (code: string) => validateCode(code));
  handle('learners:nameRisk', async () => rosterNameRisk((await loadRoster(currentVault())).roster));
}
