import { basename } from 'node:path';
import {
  buildCoordinationPacket, writeCoordinationPacket, parseCoordinationPacket,
  scanPacket, loadLearner, saveProfile, appendNote, recordFor, VAULT, RampaError, logger,
  parseFrontMatter, stringifyFrontMatter,
  type CoordinationPacket, type PacketItem, type Vault,
} from '@rampa/core';
import { readFile } from 'node:fs/promises';
import { handle } from './wrap.js';
import { pickFile } from './pick.js';
import { currentVault } from './vault.js';
import { knownNames } from './names.js';
import { loadInstruction } from '../corpus/index.js';

/**
 * Two teachers, two vaults, one child (030 US1, FR-2801…2807).
 *
 * ## The door is the whole security model
 *
 * Every channel here divides into two kinds: the ones that **read** and the one that
 * **writes**. Opening a packet, parsing it, scanning it, showing it, holding it and
 * linking it write nothing at all; `coordination:accept` is the only writer, it takes
 * one item, and it is reached by her pressing a button beside that item.
 *
 * That is Principle VIII and it is also the entire answer to «what if the packet is
 * hostile». There is no unattended path from a file somebody emailed to a change in her
 * vault, so a hostile packet's best outcome is a sentence she reads and declines.
 *
 * ## What the sender's identity is
 *
 * A role, claimed. The colleague sending it is somebody she knows and will see in the
 * corridor; cryptographic authorship between two people who share a staff room would be
 * theatre. What matters is that the **file** carries no name, which is `030` T001's job.
 */

const framing = async (): Promise<string> => {
  const raw = await loadInstruction('coordination');
  const said = parseFrontMatter(raw, 'instructions/coordination.md').data['framing'];
  /*
   * Fails **closed**, and this one matters more than most: without the framing sentence
   * the packet arrives as a bare list of claims, which is exactly the anchoring `004`
   * exists to prevent. So a corpus that cannot be read produces the sentence rather than
   * an empty string, and logs.
   */
  if (typeof said === 'string' && said.trim() !== '') return said.trim();
  logger.error('coordination.no-framing', {});
  return '**Esto viene de otra aula.** Son observaciones que otra docente te cuenta, no '
    + 'hechos comprobados en la tuya. Al aceptarlas quedarán como «me lo contaron».';
};

const receivedLine = async (role: string, date: string): Promise<string> => {
  const raw = await loadInstruction('coordination');
  const tpl = parseFrontMatter(raw, 'instructions/coordination.md').data['received_line'];
  const shape = typeof tpl === 'string' && tpl.includes('{rol}')
    ? tpl : '→ recibido por paquete ({rol}, {fecha})';
  return shape.replace('{rol}', role).replace('{fecha}', date === '' ? 'sin fecha' : date);
};

/** The academic year, the way `004` computes it. September starts the new one. */
export function academicYearOf(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return m >= 9 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}`
    : `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * When the last packet about this learner ended, from the filenames already in
 * `handover/`.
 *
 * **The filesystem is the pointer.** A stored `last_packet` field would be a copy of
 * what the directory already says — this repository's most-repeated defect — and it
 * would go stale the first time she moved or deleted a file, which is her right.
 */
export async function lastPacketDate(vault: Vault, code: string): Promise<string | null> {
  const files = await vault.list(VAULT.handover);
  const dates = files
    .map((f) => new RegExp(`^${code}-coord-(\\d{4}-\\d{2}-\\d{2})\\.md$`).exec(f)?.[1])
    .filter((d): d is string => d !== undefined)
    .sort();
  return dates[dates.length - 1] ?? null;
}

export function registerCoordinationIpc(): void {
  /**
   * The export, first half: what **would** go, for her to review.
   *
   * Writes nothing — the reviewed-export shape is `004`'s
   * (`memory:handoverDraft`/`handoverWrite`), reused rather than reinvented, and the
   * reason it is two steps is that a packet is a document she is about to email.
   */
  handle('coordination:exportDraft', async (
    code: unknown, from: unknown, to: unknown, role: unknown,
  ) => {
    const vault = currentVault();
    if (typeof code !== 'string' || typeof role !== 'string' || role.trim() === '') {
      throw new RampaError('vault-unreadable', 'Falta el alumno o el papel que dices tener.');
    }
    const on = today();
    /*
     * The period defaults from the newest packet already in `handover/` — «desde la
     * última vez» is what she means, and it is a question the filesystem can answer.
     */
    const start = typeof from === 'string' && from !== ''
      ? from : (await lastPacketDate(vault, code)) ?? on;
    const end = typeof to === 'string' && to !== '' ? to : on;

    const learner = await loadLearner(vault, code);
    const packet = buildCoordinationPacket({
      learner, period: { from: start, to: end }, role: role.trim(),
      academicYear: academicYearOf(on), record: await recordFor(vault, code), on,
    });
    const written = writeCoordinationPacket({
      packet, framing: await framing(), known: await knownNames(vault),
    });

    return {
      period: packet.period,
      items: packet.items,
      /*
       * `findProbableNames` guesses, so it flags rather than gates — beside the item, in
       * the review step, where a person decides. A capitalised word is not a reason to
       * refuse a fortnight's work.
       */
      flags: written.of === 'ready' ? written.flags : [],
      refusal: written.of === 'refused' ? written.say : null,
      preview: written.of === 'ready' ? written.raw : null,
    };
  });

  /**
   * The export, second half: only what survived her review.
   *
   * `keep` is a list of item indices. Anything absent is **gone from the file**, never
   * carried with a «removed» flag — a claim marked as dropped is still a claim in a
   * document she is about to email.
   */
  handle('coordination:exportWrite', async (
    code: unknown, from: unknown, to: unknown, role: unknown, keep: unknown,
  ) => {
    const vault = currentVault();
    if (typeof code !== 'string' || typeof role !== 'string') {
      throw new RampaError('vault-unreadable', 'Falta el alumno o el papel que dices tener.');
    }
    const on = today();
    const start = typeof from === 'string' && from !== ''
      ? from : (await lastPacketDate(vault, code)) ?? on;
    const end = typeof to === 'string' && to !== '' ? to : on;

    const learner = await loadLearner(vault, code);
    const full = buildCoordinationPacket({
      learner, period: { from: start, to: end }, role: role.trim(),
      academicYear: academicYearOf(on), record: await recordFor(vault, code), on,
    });
    const kept = new Set(Array.isArray(keep) ? keep.filter((k) => typeof k === 'number') : []);
    const reviewed: CoordinationPacket = {
      ...full, items: full.items.filter((_, i) => kept.has(i)),
    };

    const written = writeCoordinationPacket({
      packet: reviewed, framing: await framing(), known: await knownNames(vault),
    });
    // Refusal, never sanitisation: the packet is not written and she is told why.
    if (written.of === 'refused') throw new RampaError('vault-unreadable', written.say);

    const path = `${VAULT.handover}/${code}-coord-${on}.md`;
    await vault.writeRaw(path, written.raw);
    logger.info('coordination.exported', {
      items: reviewed.items.length, dropped: full.items.length - reviewed.items.length,
    });
    return { path, dropped: full.items.length - reviewed.items.length };
  });

  /**
   * Open one she was sent. **Writes nothing** (FR-2804).
   *
   * Parse, scan, stale-check, and say whether the code is one she has. The file is not
   * copied anywhere: holding it is a separate, explicit act, because a flow that copied
   * on open would put a stranger's file in her vault for having looked at one.
   */
  handle('coordination:open', async () => {
    const path = await pickFile({
      title: 'Elige el paquete', extensions: ['md'], filterName: 'Paquetes de Rampa',
    });
    if (!path) return null;
    const raw = await readFile(path, 'utf8');
    return { ...(await inspectPacket(currentVault(), raw)), filename: basename(path), raw };
  });

  /**
   * Hold it: the file, **verbatim**, in `handover/received/`.
   *
   * Verbatim because it is somebody else's document and she may need to show it to them
   * — «esto es lo que me mandaste». A re-rendered copy would be Rampa's version of her
   * colleague's file, which is not the same artefact.
   */
  handle('coordination:hold', async (raw: unknown, filename: unknown) => {
    if (typeof raw !== 'string' || typeof filename !== 'string') {
      throw new RampaError('vault-unreadable', 'No he recibido el fichero.');
    }
    return { path: await holdPacket(currentVault(), raw, filename) };
  });

  /**
   * Link a held packet to one of her learners (FR-2807).
   *
   * Written into the **local copy's** front matter and never into a file that travels:
   * `linked: M7` is her note about somebody else's document, and putting it in the
   * packet would send her own code back to the sender.
   *
   * It is also what lets erasure find this file later. `planForget` can match
   * `<code>-*` for her own exports; a received packet's internal code is the sender's
   * and could never be matched — the annotation is the only thing that carries hers.
   */
  handle('coordination:link', async (path: unknown, code: unknown) => {
    if (typeof path !== 'string' || typeof code !== 'string') {
      throw new RampaError('vault-unreadable', 'Falta el fichero o el alumno.');
    }
    await linkPacket(currentVault(), path, code);
    return { ok: true as const };
  });

  /**
   * The only writer (FR-2804/2805).
   *
   * One item, explicitly. Every write carries the packet, the role and the date — and
   * `reported`, which is **assigned here**. There is no parameter for it and the file
   * has no field the importer reads: a packet asserting its own credibility is the
   * anchor `004` exists to avoid, and P44 spent a review making these markers honest.
   */
  handle('coordination:accept', async (
    code: unknown, role: unknown, filename: unknown, item: unknown,
  ) => {
    if (typeof code !== 'string' || typeof role !== 'string' || typeof filename !== 'string') {
      throw new RampaError('vault-unreadable', 'Falta el alumno o de dónde viene esto.');
    }
    return {
      ok: true as const,
      wrote: await acceptItem(currentVault(), {
        code, role, filename, item: item as PacketItem,
      }),
    };
  });

  /**
   * Apply a profile delta she chose to take (FR-2804).
   *
   * Separate from `accept` on purpose: accepting a claim and changing her profile are
   * two different decisions, and the conflict case exists precisely because they can
   * come apart. She may want the note and not the axis.
   */
  handle('coordination:applyDelta', async (
    code: unknown, axis: unknown, level: unknown,
  ) => {
    const vault = currentVault();
    if (typeof code !== 'string' || typeof axis !== 'string' || typeof level !== 'number') {
      throw new RampaError('vault-unreadable', 'No he entendido qué hay que cambiar.');
    }
    const learner = await loadLearner(vault, code);
    const axes = { ...(learner.profile.axes ?? {}), [axis]: level };
    await saveProfile(vault, { ...learner.profile, axes } as never);
    return { ok: true as const };
  });

  /** What she has sent and what she is holding (FR-2803). */
  handle('coordination:list', async (code: unknown) => {
    const vault = currentVault();
    const mine = (await vault.list(VAULT.handover))
      .filter((f) => f.endsWith('.md'))
      .filter((f) => typeof code !== 'string' || f.startsWith(`${code}-`));
    const held: Array<{ file: string; linked: string | null }> = [];
    for (const f of await vault.list(`${VAULT.handover}/received`)) {
      if (!f.endsWith('.md')) continue;
      const raw = await vault.readRaw(`${VAULT.handover}/received/${f}`);
      const linked = raw === null ? null
        : (parseFrontMatter(raw, f).data['linked'] as string | undefined) ?? null;
      held.push({ file: f, linked });
    }
    return { sent: mine, held };
  });
}

/**
 * Keep somebody else's file, **verbatim**, in `handover/received/`.
 *
 * Verbatim because it is their document and she may need to show it to them — «esto es
 * lo que me mandaste». A re-rendered copy would be Rampa's version of her colleague's
 * file, which is not the same artefact.
 *
 * Its own function so the walk (hold → link → undo → link → accept) is something a test
 * can run, rather than a claim about five handlers.
 */
export async function holdPacket(
  vault: Vault, raw: string, filename: string,
): Promise<string> {
  // Her filename, made safe. `resolveInVault` would refuse a path that leaves the vault
  // rather than sanitising it — this is about the name being readable, not about escape.
  const safe = basename(filename).replace(/[^A-Za-z0-9._-]/g, '_');
  const path = `${VAULT.handover}/received/${safe}`;
  await vault.writeRaw(path, raw);
  return path;
}

/**
 * Say which of her learners a held packet is about — or unsay it (FR-2807).
 *
 * `code === ''` is the undo, and it removes the annotation and **nothing else**, because
 * nothing else happened: until the first accept, linking has written one front-matter
 * key on a copy of somebody else's file.
 */
export async function linkPacket(vault: Vault, path: string, code: string): Promise<void> {
  const raw = await vault.readRaw(path);
  if (raw === null) throw new RampaError('vault-unreadable', 'Ese paquete ya no está.');
  const { data, body } = parseFrontMatter(raw, path);
  await vault.writeRaw(path, stringifyFrontMatter(
    code === '' ? withoutLinked(data) : { ...data, linked: code }, body));
}

/**
 * The only writer (FR-2804/2805).
 *
 * Every write carries the packet, the role and the date — and `reported`, which is
 * **assigned here**. There is no parameter for it and the file has no field the importer
 * reads: a packet asserting its own credibility is the anchor `004` exists to avoid.
 */
export async function acceptItem(vault: Vault, args: {
  code: string; role: string; filename: string; item: PacketItem;
}): Promise<'note' | 'nothing'> {
  const { item } = args;
  const mark = await receivedLine(args.role, item.date);

  if (item.of === 'note') {
    await appendNote(vault, args.code, `${item.heading} (de otra aula)`,
      `${item.text}\n\n${mark} · ${args.filename}`);
    return 'note';
  }

  if (item.of === 'profile-delta') {
    /*
     * The note, always. The **profile itself** changes only when she says so — «tu
     * perfil dice X, el paquete dice Y» ends in a choice, and `applyDelta` is where that
     * choice lands. What is unconditional is that the claim is written down somewhere
     * she will find it, attributed.
     */
    await appendNote(vault, args.code, 'del paquete de coordinación',
      `${item.text}\n\n${mark} · ${args.filename}`);
    return 'note';
  }

  /*
   * A material line is a fact about the **sender's** vault. There is nothing to write
   * into hers, and inventing a record entry for a sheet she does not have would put a
   * row in her record pointing at a file that does not exist.
   */
  return 'nothing';
}

const withoutLinked = (data: Record<string, unknown>): Record<string, unknown> => {
  const { linked: _linked, ...rest } = data;
  return rest;
};

/**
 * Parse, scan and stale-check, with **no writes**. Extracted so the door's promise is
 * a function somebody can call in a test rather than a claim about a handler.
 */
export async function inspectPacket(vault: Vault, raw: string): Promise<{
  refusal: string | null;
  packet: CoordinationPacket | null;
  flags: ReturnType<typeof scanPacket>;
  stale: boolean;
  known: boolean;
}> {
  const parsed = parseCoordinationPacket(raw);
  if (parsed.of === 'refused') {
    return { refusal: parsed.say, packet: null, flags: [], stale: false, known: false };
  }
  const packet = parsed.packet;
  const learners = await vault.list(VAULT.profiles);
  return {
    refusal: null,
    packet,
    flags: scanPacket(packet),
    // `004` FR-311's rule: a packet from a past academic year is marked on sight.
    stale: packet.academicYear !== '' && packet.academicYear !== academicYearOf(today()),
    /*
     * Whether **she** has this code, and nothing more. No automatic match is attempted:
     * codes are opaque and names are absent by design, so matching is a human act
     * (FR-2807).
     */
    known: learners.includes(packet.code),
  };
}
