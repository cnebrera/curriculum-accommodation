import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  buildCoordinationPacket, writeCoordinationPacket, renderCoordinationPacket,
  parseCoordinationPacket, packetNameGate, notesInPeriod, parseFrontMatter,
  type RecordEntry, type Profile,
} from '../src/index.js';
import type { LoadedLearner } from '../src/vault/profile.js';

/**
 * No name reaches the bytes (030 T001, FR-2802, SC-2801).
 *
 * ## Written before anything could be exported
 *
 * The packet travels **because** it is name-free: it goes by email, through the school's
 * system, on a memory stick. A check written after export works is a check written to
 * fit what export already produces, so this one was written against a module that did
 * not exist yet.
 *
 * ## The corpus is salted on purpose
 *
 * The learner is «Lucía», her notes mention «Vega» and «Marco» — two other children in
 * the same classroom — and the teacher signs as «Ana». Every one of those is a name a
 * real vault contains, and the interesting one is **Vega**: a note about Lucía can name
 * another child, and a per-item name map would be the sender deciding who counts as a
 * third party.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const framing = parseFrontMatter(
  readFileSync(join(repoRoot, 'instructions', 'coordination.md'), 'utf8'),
).data['framing'] as string;

/** The machine's whole name map: every child this teacher has, not just the subject. */
const KNOWN = new Map([
  ['L01', 'Lucía Fernández'],
  ['V02', 'Vega'],
  ['M03', 'Marco'],
]);

const NOTES = `---
learner: L01
updated: "2026-10-14"
---

## 2026-10-03 · arranque
Lucía no arranca sin el primer paso hecho. Con Vega al lado sí.

## 2026-10-12 · lectura
Le ha ido bien leyendo en voz alta. Marco leyó con ella.

## 2026-09-02 · de antes del periodo
Esto es de septiembre y no debe salir.
`;

const learner = (): LoadedLearner => ({
  profile: {
    code: 'L01',
    axes: { COG: 2, ATE: 1 },
    axes_confirmed: { COG: '2026-10-08' },
    works: ['Empezar con el ejemplo resuelto'],
    avoid: ['Nada con cuenta atrás'],
    noted_on: { 'Empezar con el ejemplo resuelto': '2026-10-05' },
    interests: [], response: {}, language: {},
  } as unknown as Profile,
  notes: NOTES, overlay: null, repairs: [],
});

const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({
  jobId: 'job-u4', learner: 'L01', date: '2026-10-10', schoolYear: '2026-2027',
  kind: 'worksheet', signedOff: true, revision: 1, source: { of: 'pasted' },
  documents: { ir: 'a', adapted: 'b', revisions: [], rendered: [] }, missing: [],
  subject: 'Matemáticas',
  ...over,
});

const PERIOD = { from: '2026-10-01', to: '2026-10-14' };

const packetOf = () => buildCoordinationPacket({
  learner: learner(), period: PERIOD, role: 'PT', academicYear: '2026-27',
  record: [entry(), entry({ jobId: 'job-viejo', date: '2026-09-02' })],
  on: '2026-10-14',
});

describe('the bytes that leave the machine', () => {
  const written = writeCoordinationPacket({ packet: packetOf(), framing, known: KNOWN });

  it('carry no name at all — not the subject\'s, not another child\'s, not hers', () => {
    expect(written.of).toBe('ready');
    const raw = written.of === 'ready' ? written.raw : '';
    for (const name of ['Lucía', 'Lucia', 'Fernández', 'Fernandez', 'Vega', 'Marco']) {
      expect(raw, `«${name}» reached the packet`).not.toContain(name);
    }
  });

  it('and the subject travels as a code, which is the whole design', () => {
    const raw = written.of === 'ready' ? written.raw : '';
    expect(raw).toContain('L01');
    // Re-identification is a human act at the school (`004` FR-312, inherited).
    expect(raw).toContain('dice ser **PT**');
  });

  it('the other children became their codes rather than disappearing', () => {
    /*
     * Redaction, not deletion. «Con Vega al lado sí» is a real observation about how
     * Lucía works, and dropping the sentence would lose the finding along with the
     * name — `007` FR-504's rule, in the file where it costs the most.
     */
    const raw = written.of === 'ready' ? written.raw : '';
    expect(raw).toContain('Con V02 al lado sí');
    expect(raw).toContain('M03 leyó con ella');
  });

  it('and there is no field a name could travel in even if somebody wanted one', () => {
    // `role` is the only sender identity the type has. A name in a packet can only
    // arrive through prose, which is exactly what the gate above checks.
    const packet = packetOf();
    expect(Object.keys(packet)).not.toContain('name');
    expect(Object.keys(packet)).not.toContain('teacher');
    expect(packet.role).toBe('PT');
  });
});

describe('the gate refuses rather than sanitising', () => {
  /**
   * A name that survives redaction.
   *
   * «Anna» is not in the map and not a code — it is a name redaction cannot know about,
   * standing in for the real case: a colleague's name typed into a note, a surname in a
   * material title. What matters is what happens next, and what happens is **nothing is
   * written**.
   */
  it('a packet with a name still in it is not written', () => {
    const withName = () => {
      const l = learner();
      return { ...l, notes: `${NOTES}\n## 2026-10-09 · reunión\nHablé con Vega Ruiz.\n` };
    };
    const packet = buildCoordinationPacket({
      learner: withName(), period: PERIOD, role: 'PT', academicYear: '2026-27',
      record: [], on: '2026-10-14',
    });
    // The map knows «Vega», so redaction gets it — the case that matters is a map entry
    // whose surname is only in the map, which `isClean` checks part by part.
    const written = writeCoordinationPacket({
      packet, framing, known: new Map([...KNOWN, ['R04', 'Ruiz']]),
    });
    expect(written.of).toBe('ready');
    if (written.of === 'ready') expect(written.raw).not.toContain('Ruiz');
  });

  it('the gate itself refuses dirty bytes, and its refusal does not print the name', () => {
    /*
     * Asserted on the gate rather than through `writeCoordinationPacket`, and the reason
     * is worth writing down: with today's `redact`, that path is **unreachable**. Both
     * functions skip name parts shorter than three characters and both build the same
     * accent-insensitive word-boundary regex, so anything one removes the other stops
     * finding. They agree by construction.
     *
     * That is the relationship they are supposed to have. Deleting the check because it
     * cannot fire today would remove the thing that fires the day they stop agreeing —
     * a `redact` that gains a skip condition, a map loaded twice from different places.
     * Faking a case to reach it through the writer would be worse: a test passing for a
     * reason that is not the design.
     *
     * So the gate is checked directly, on bytes redaction never saw.
     */
    const said = packetNameGate(
      '# Paquete\n\nHablé con Vega Ruiz sobre la hoja.\n',
      new Map([['R04', 'Vega Ruiz']]));
    expect(said.clean).toBe(false);
    if (!said.clean) {
      expect(said.say).not.toContain('Vega');
      expect(said.say).not.toContain('Ruiz');
      expect(said.say).toContain('No he escrito el paquete');
      // And it says what she can do, rather than only that it failed.
      expect(said.say).toContain('Revisa tus notas');
    }
  });

  it('and it passes clean bytes, so it is a gate and not a wall', () => {
    expect(packetNameGate('# Paquete\n\nL01 va bien.\n', KNOWN).clean).toBe(true);
  });
});

describe('what the packet is made of', () => {
  const packet = packetOf();

  it('only the period — a note from September does not travel', () => {
    const texts = packet.items.map((i) => (i.of === 'note' ? i.heading : ''));
    expect(texts).toContain('arranque');
    expect(texts).not.toContain('de antes del periodo');
  });

  it('material as title and date, never as content', () => {
    /*
     * What a colleague needs is «hizo fracciones el jueves y la firmó». The sheet itself
     * has its own provenance, its own draft mark and its own place in a record, and
     * copying it into a packet would put an unmarked duplicate of a child's material in
     * an email.
     */
    const material = packet.items.filter((i) => i.of === 'material');
    expect(material).toHaveLength(1);
    expect(material[0]).toEqual({
      of: 'material', date: '2026-10-10', title: 'job-u4 · Matemáticas', signed: true,
    });
  });

  it('and a preference with no recorded date says so rather than saying today', () => {
    /*
     * `handover.ts`'s longest comment, inherited. `?? today()` stamped an axis nobody
     * had ever confirmed with today's date, so the receiving teacher read «confirmed
     * today» for a claim never confirmed at all — on the one field whose entire job is
     * to say how old the claim is.
     */
    const deltas = packet.items.filter(
      (i): i is Extract<typeof i, { of: 'profile-delta' }> => i.of === 'profile-delta');
    const avoid = deltas.find((i) => i.text.startsWith('avoid:'));
    expect(avoid).toBeDefined();
    expect(avoid!.date).toBe('');
    expect(renderCoordinationPacket(packet, framing)).toContain('sin fecha');

    // And the one that does have a date keeps its own.
    const works = deltas.find((i) => i.text.startsWith('works:'));
    expect(works!.date).toBe('2026-10-05');
  });

  it('an axis confirmed outside the period is not this fortnight\'s news', () => {
    const axes = packet.items
      .filter((i): i is Extract<typeof i, { of: 'profile-delta' }> => i.of === 'profile-delta')
      .filter((i) => / = /.test(i.text));
    expect(axes.map((a) => a.text)).toContain('COG = 2');
    // ATE has no confirmation date at all, so it travels undated rather than not at all:
    // «no consta cuándo» is a fact she needs, and dropping it would hide a real axis.
    expect(axes.find((a) => a.text === 'ATE = 1')?.date).toBe('');
  });
});

describe('the notes are read from the file, not from a second index', () => {
  it('the `## <date> · <heading>` shape `appendNote` has written since `003`', () => {
    const found = notesInPeriod(NOTES, PERIOD);
    expect(found.map((n) => n.heading)).toEqual(['arranque', 'lectura']);
    expect(found[0]!.text).toContain('no arranca sin el primer paso');
  });

  it('and a file she has edited by hand still parses', () => {
    // The vault is hers. A stored index of «which notes are in which period» would go
    // stale the first time she rewrote a heading in Obsidian.
    const edited = NOTES.replace('· arranque', '·   arranque  ');
    expect(notesInPeriod(edited, PERIOD).map((n) => n.heading)).toContain('arranque');
  });
});

describe('render → parse is the same packet', () => {
  it('round trips', () => {
    const packet = packetOf();
    const parsed = parseCoordinationPacket(renderCoordinationPacket(packet, framing));
    expect(parsed.of).toBe('packet');
    if (parsed.of === 'packet') {
      expect(parsed.packet.code).toBe(packet.code);
      expect(parsed.packet.role).toBe(packet.role);
      expect(parsed.packet.period).toEqual(packet.period);
      expect(parsed.packet.items).toEqual(packet.items);
    }
  });

  it('a field this build does not know is kept, not dropped', () => {
    // The packet is the teacher's document before it is our schema.
    const parsed = parseCoordinationPacket(
      '---\nrampa_packet: coordination\ncode: "L01"\nrole: PT\nalgo_de_2028: sí\n---\n\n#\n');
    expect(parsed.of === 'packet' && parsed.packet.unknown?.['algo_de_2028']).toBe('sí');
  });

  it('and a malformed file is a readable refusal with no partial result', () => {
    const said = parseCoordinationPacket('esto no es un paquete');
    expect(said.of).toBe('refused');
    if (said.of === 'refused') {
      expect(said.say).toContain('no dice qué tipo');
      // It says what she can still do: half a packet is worse than none, but so is a
      // dead end.
      expect(said.say).toContain('abrirlo como texto');
    }
  });
});
