import type { LoadedLearner } from '../vault/profile.js';
import type { RecordEntry } from '../record/entry.js';
import { redact, isClean, findProbableNames } from '../redact/names.js';
import { detectInjection } from '../ir/injection.js';
import type { Block, Notice } from '../ir/types.js';
import { parseFrontMatter, stringifyFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The coordination packet: two teachers, two vaults, one child (030, FR-2801/2802).
 *
 * ## What `004` could not do
 *
 * `004`'s packet is a **year boundary**: everything about a learner, once, with a
 * confirm/disconfirm lifecycle for the teacher receiving them in September. What a PT
 * and a tutor need on a Tuesday is a fortnight — what I noticed, what I made, what I
 * changed — and grafting the year-boundary lifecycle onto weekly notes would make every
 * Tuesday an audit.
 *
 * So this is a second packet **derived from `004`'s rules** and not from its builder:
 * the same `date: ''` discipline, the same «a claim from elsewhere is `reported`», the
 * same «the receiving colleague may not have Rampa, so the prose alone must be enough».
 *
 * ## Why the file is written once, from one structure
 *
 * Front matter is the machine's copy and the body is the person's, **of the same items**.
 * A renderer that wrote them separately would be the two-copies defect between two
 * machines, where nobody can see the drift: she reads a body saying one thing and her
 * colleague's Rampa imports front matter saying another, and neither of them can tell.
 *
 * ## The name gate
 *
 * A packet travels *because* it is name-free. The bytes go through `redact()` with the
 * machine's whole name map — a note about Marco can name Vega — and then through
 * `isClean()` as a **refusal**: a packet that still carries a name is not written. Never
 * sanitised silently, which is the vault boundary's house rule applied to the one file
 * in this application that is meant to leave the machine.
 */

export type PacketKind = 'coordination' | 'review-request' | 'review';

export type PacketItem =
  | { of: 'note'; date: string; heading: string; text: string }
  | { of: 'material'; date: string; title: string; signed: boolean }
  /** «AUT = 2», «works: + …». `date` is real or `''` — never fabricated. */
  | { of: 'profile-delta'; date: string; text: string };

export interface CoordinationPacket {
  kind: PacketKind;
  /** The sender's learner code. **Opaque** to the receiver by design. */
  code: string;
  /**
   * A claim, never authenticated: «PT», «tutor». Displayed as «dice ser <rol>».
   *
   * The only sender identity there is. **No name field exists on this type**, so a name
   * can only arrive through prose — which is exactly what the byte gate checks.
   */
  role: string;
  academicYear: string;
  period: { from: string; to: string };
  createdAt: string;
  items: PacketItem[];
  /** Only in `review-request`: the draft travelling for a second look. */
  draft?: { job: string; revision: number; fingerprint: string; document: string; report: string };
  /** Only in `review`: corrections coming back. */
  review?: { job: string; revision: number; fingerprint: string; corrections: string[] };
  /** Fields this build did not recognise. Kept and surfaced, never dropped. */
  unknown?: Record<string, unknown>;
}

const within = (date: string, period: { from: string; to: string }): boolean =>
  date !== '' && date >= period.from && date <= period.to;

/**
 * Her notes for the period, from the `## <date> · <heading>` structure `appendNote`
 * writes.
 *
 * Parsed rather than stored: `appendNote` has written that shape since `003` and the
 * file is hers to edit in Obsidian. A second index of «which notes are in which period»
 * would be a stored copy of what the file already says — this repository's most-repeated
 * defect — and it would go stale the first time she edited a heading by hand.
 */
export function notesInPeriod(
  notes: string, period: { from: string; to: string },
): Array<{ date: string; heading: string; text: string }> {
  const out: Array<{ date: string; heading: string; text: string }> = [];
  const re = /^##\s+(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  const marks: Array<{ date: string; heading: string; at: number; end: number }> = [];
  while ((m = re.exec(notes)) !== null) {
    marks.push({ date: m[1]!, heading: m[2]!.trim(), at: m.index, end: re.lastIndex });
  }
  marks.forEach((mark, i) => {
    if (!within(mark.date, period)) return;
    const body = notes.slice(mark.end, marks[i + 1]?.at ?? notes.length).trim();
    out.push({ date: mark.date, heading: mark.heading, text: body });
  });
  return out;
}

export function buildCoordinationPacket(args: {
  learner: LoadedLearner;
  period: { from: string; to: string };
  role: string;
  academicYear: string;
  /** Everything ever made for this learner (`014`). Filtered to the period here. */
  record: readonly RecordEntry[];
  /** Passed in, never read from a clock (Principle II). */
  on: string;
}): CoordinationPacket {
  const { profile, notes } = args.learner;
  const items: PacketItem[] = [];

  for (const n of notesInPeriod(notes, args.period)) {
    items.push({ of: 'note', date: n.date, heading: n.heading, text: n.text });
  }

  for (const e of args.record) {
    if (!within(e.date, args.period)) continue;
    /*
     * The **title and the date**, never the content. What a colleague needs is «hizo
     * fracciones el jueves y la firmó»; the sheet itself is a document with its own
     * provenance, its own draft mark and its own place in a record, and copying it into
     * a packet would put an unmarked duplicate of a child's material in an email.
     *
     * `review-request` is the exception, and it is explicit: a draft travels only when
     * she is asking for a second look at that draft.
     */
    items.push({
      of: 'material', date: e.date,
      title: e.subject ? `${e.jobId} · ${e.subject}` : e.jobId,
      signed: e.signedOff,
    });
  }

  /*
   * Profile deltas, with **real dates or none**.
   *
   * `handover.ts`'s longest comment is about this exact field and it is inherited
   * verbatim: `?? today()` stamped an axis nobody had ever confirmed with today's date,
   * so the receiving teacher read «confirmed today» for a claim never confirmed at all —
   * on the one field whose entire job is to say how old the claim is.
   */
  const confirmed = profile.axes_confirmed ?? {};
  for (const [axis, level] of Object.entries(profile.axes ?? {})) {
    const date = confirmed[axis] ?? '';
    if (date !== '' && !within(date, args.period)) continue;
    items.push({ of: 'profile-delta', date, text: `${axis} = ${level}` });
  }

  const noted = profile.noted_on ?? {};
  for (const [field, values] of [['works', profile.works], ['avoid', profile.avoid]] as const) {
    for (const text of values ?? []) {
      const date = noted[text] ?? '';
      if (date !== '' && !within(date, args.period)) continue;
      items.push({ of: 'profile-delta', date, text: `${field}: ${text}` });
    }
  }

  return {
    kind: 'coordination',
    code: profile.code,
    role: args.role,
    academicYear: args.academicYear,
    period: args.period,
    createdAt: args.on,
    items,
  };
}

/* ── The file ──────────────────────────────────────────────────────────────── */

/**
 * Render, from the packet and nothing else.
 *
 * `framing` is the anti-anchoring sentence on the document's face — «esto viene de otra
 * aula» — and it is **passed in from the corpus**, not written here. Principle I: the
 * judgement about how a colleague should read somebody else's observations is exactly
 * the kind of sentence a PT should be able to correct without touching TypeScript.
 */
export function renderCoordinationPacket(
  packet: CoordinationPacket, framing: string,
): string {
  const data: Record<string, unknown> = {
    rampa_packet: packet.kind,
    code: packet.code,
    role: packet.role,
    academic_year: packet.academicYear,
    period: { from: packet.period.from, to: packet.period.to },
    created: packet.createdAt,
    items: packet.items.map((i) =>
      i.of === 'note' ? { of: 'note', date: i.date, heading: i.heading, text: i.text }
      : i.of === 'material' ? { of: 'material', date: i.date, title: i.title, signed: i.signed }
      : { of: 'profile-delta', date: i.date, text: i.text }),
    ...(packet.draft ? { draft: packet.draft } : {}),
    ...(packet.review ? { review: packet.review } : {}),
  };

  const when = (d: string) => (d === '' ? 'sin fecha' : d);
  const body: string[] = [
    `# Paquete de coordinación · ${packet.code}`,
    '',
    ...framing.trim().split('\n').map((l) => `> ${l}`.trimEnd()),
    '',
    `Del ${packet.period.from} al ${packet.period.to}. Quien lo manda dice ser `
      + `**${packet.role}**. Curso ${packet.academicYear}.`,
    '',
  ];

  const notes = packet.items.filter((i): i is Extract<PacketItem, { of: 'note' }> => i.of === 'note');
  if (notes.length) {
    body.push('## Lo que he ido apuntando', '');
    for (const n of notes) body.push(`### ${when(n.date)} · ${n.heading}`, '', n.text, '');
  }

  const material = packet.items.filter(
    (i): i is Extract<PacketItem, { of: 'material' }> => i.of === 'material');
  if (material.length) {
    body.push('## Lo que le he preparado', '');
    for (const m of material) {
      body.push(`- ${when(m.date)} · ${m.title} — ${m.signed ? 'firmada' : 'sin firmar'}`);
    }
    body.push('');
  }

  const deltas = packet.items.filter(
    (i): i is Extract<PacketItem, { of: 'profile-delta' }> => i.of === 'profile-delta');
  if (deltas.length) {
    body.push('## Lo que he cambiado en su perfil', '');
    for (const d of deltas) body.push(`- ${when(d.date)} · ${d.text}`);
    body.push('');
  }

  if (packet.draft) {
    body.push('## La hoja, para que la mires', '',
      `Trabajo \`${packet.draft.job}\`, revisión ${packet.draft.revision}.`, '',
      packet.draft.document, '', '## Y lo que dice el informe', '', packet.draft.report, '');
  }

  if (packet.review) {
    body.push('## Las correcciones', '',
      `Sobre \`${packet.review.job}\`, revisión ${packet.review.revision}.`, '');
    for (const c of packet.review.corrections) body.push(`- ${c}`);
    body.push('');
  }

  return stringifyFrontMatter(data, body.join('\n'));
}

export type PacketParse =
  | { of: 'packet'; packet: CoordinationPacket }
  /** Readable, and **no partial result**: half a packet is worse than none. */
  | { of: 'refused'; say: string };

const KNOWN_KEYS = new Set([
  'rampa_packet', 'code', 'role', 'academic_year', 'period', 'created', 'items',
  'draft', 'review',
]);

export function parseCoordinationPacket(raw: string, file = 'paquete.md'): PacketParse {
  const { data } = parseFrontMatter(raw, file);

  const kind = data['rampa_packet'];
  if (kind !== 'coordination' && kind !== 'review-request' && kind !== 'review') {
    return { of: 'refused', say: 'Esto no parece un paquete de Rampa: no dice qué tipo '
      + 'de paquete es. Puedes abrirlo como texto y copiar lo que te sirva.' };
  }
  const code = str(data['code']);
  const role = str(data['role']);
  if (!code || !role) {
    return { of: 'refused', say: 'A este paquete le falta de quién viene o sobre quién '
      + 'es, así que no sé dónde ponerlo. Ábrelo como texto y mira qué trae.' };
  }

  const period = data['period'];
  const from = period && typeof period === 'object'
    ? str((period as Record<string, unknown>)['from']) ?? '' : '';
  const to = period && typeof period === 'object'
    ? str((period as Record<string, unknown>)['to']) ?? '' : '';

  const items: PacketItem[] = [];
  for (const entry of Array.isArray(data['items']) ? data['items'] : []) {
    const item = parseItem(entry);
    // Tolerant: a malformed item is dropped and logged, and the rest of a colleague's
    // fortnight still arrives. Rejecting the file would lose nine good notes over one.
    if (item) items.push(item); else logger.warn('coordination.item-dropped', { file });
  }

  const unknown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!KNOWN_KEYS.has(k)) unknown[k] = v;

  return {
    of: 'packet',
    packet: {
      kind,
      code,
      role,
      academicYear: str(data['academic_year']) ?? '',
      period: { from, to },
      createdAt: str(data['created']) ?? dateish(data['created']) ?? '',
      items,
      ...(parseDraft(data['draft']) ? { draft: parseDraft(data['draft'])! } : {}),
      ...(parseReview(data['review']) ? { review: parseReview(data['review'])! } : {}),
      ...(Object.keys(unknown).length ? { unknown } : {}),
    },
  };
}

function parseItem(entry: unknown): PacketItem | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  const date = str(e['date']) ?? dateish(e['date']) ?? '';
  switch (e['of']) {
    case 'note': {
      const heading = str(e['heading']);
      const text = str(e['text']);
      return heading && text ? { of: 'note', date, heading, text } : null;
    }
    case 'material': {
      const title = str(e['title']);
      return title ? { of: 'material', date, title, signed: e['signed'] === true } : null;
    }
    case 'profile-delta': {
      const text = str(e['text']);
      return text ? { of: 'profile-delta', date, text } : null;
    }
    default: return null;
  }
}

const parseDraft = (v: unknown): CoordinationPacket['draft'] => {
  if (!v || typeof v !== 'object') return undefined;
  const d = v as Record<string, unknown>;
  const job = str(d['job']);
  const fingerprint = str(d['fingerprint']);
  if (!job || !fingerprint) return undefined;
  return {
    job, fingerprint,
    revision: typeof d['revision'] === 'number' ? d['revision'] : 1,
    document: str(d['document']) ?? '',
    report: str(d['report']) ?? '',
  };
};

const parseReview = (v: unknown): CoordinationPacket['review'] => {
  if (!v || typeof v !== 'object') return undefined;
  const d = v as Record<string, unknown>;
  const job = str(d['job']);
  const fingerprint = str(d['fingerprint']);
  if (!job || !fingerprint) return undefined;
  return {
    job, fingerprint,
    revision: typeof d['revision'] === 'number' ? d['revision'] : 1,
    corrections: (Array.isArray(d['corrections']) ? d['corrections'] : [])
      .filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.trim()),
  };
};

/* ── The gate ──────────────────────────────────────────────────────────────── */

export type PacketWrite =
  | { of: 'ready'; raw: string; flags: string[] }
  /** A name survived. **Not written**, and the refusal does not print the name. */
  | { of: 'refused'; say: string };

/**
 * The bytes, or a refusal (FR-2802).
 *
 * Three steps, in this order and for three different reasons:
 *
 * 1. **`redact()` over the whole file** with the machine's full name map. Not per item:
 *    a note about Marco can name Vega, and a per-item map would be the sender deciding
 *    which children count as third parties.
 * 2. **`isClean()` as a refusal.** Refusal, never sanitisation — the vault boundary's
 *    house rule, applied to the one file in this application meant to leave the machine.
 *    If redaction did not manage it, something is wrong that a second pass will not fix.
 * 3. **`findProbableNames` as flags, not as a gate.** It guesses; guesses belong in the
 *    review step beside the item, where a person decides. A capitalised word is not a
 *    reason to refuse a fortnight's work.
 *
 * The refusal deliberately **does not name what it found**. A message that printed the
 * leaked name would put it in a log, a screenshot and a bug report — which is the failure
 * arriving through the apology for the failure.
 *
 * ## The honest note about step 2
 *
 * With today's `redact`, step 2 is **unreachable**: it skips name parts shorter than
 * three characters and so does `isClean`, so the two agree by construction and anything
 * one removes the other stops finding. That is not a reason to delete it — it is the
 * relationship this pair is supposed to have, and the check costs nothing and fires the
 * day the two stop agreeing (a `redact` that gains a skip condition, a map loaded twice
 * from different places). What would be dishonest is a test that pretended to reach it,
 * so {@link packetNameGate} is asserted directly instead.
 */
export function writeCoordinationPacket(args: {
  packet: CoordinationPacket;
  framing: string;
  /** Code → name, the machine's whole map. */
  known: ReadonlyMap<string, string>;
}): PacketWrite {
  const rendered = renderCoordinationPacket(args.packet, args.framing);
  const { text } = redact(rendered, args.known);

  const gate = packetNameGate(text, args.known);
  if (!gate.clean) return { of: 'refused', say: gate.say };

  return { of: 'ready', raw: text, flags: findProbableNames(text) };
}

/**
 * The last thing between a name and an email, on the finished bytes.
 *
 * Its own function so it can be asserted on text that never went through `redact` —
 * which is the only way to check a gate whose whole point is to catch what redaction
 * missed. See the note above about why that case is unreachable today.
 */
export function packetNameGate(
  raw: string, known: ReadonlyMap<string, string>,
): { clean: true } | { clean: false; say: string } {
  if (isClean(raw, known)) return { clean: true };
  return {
    clean: false,
    // Deliberately does not name what it found: printing the leaked name would put it
    // in a log, a screenshot and a bug report.
    say: 'No he escrito el paquete: después de quitar los nombres sigue quedando uno '
      + 'dentro, y este fichero está hecho para salir de tu ordenador. Revisa tus notas '
      + 'de este periodo y vuelve a intentarlo.',
  };
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function dateish(v: unknown): string | undefined {
  return v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10) : undefined;
}

/* ── The door's first step ─────────────────────────────────────────────────── */

export interface PacketFlag {
  /** Which item it was in, by index, so the screen can put it beside that item. */
  at: number;
  quote: string;
  message: string;
}

/**
 * Every item's text through **the existing scanner**, before anything is displayed
 * (030 T007, FR-2806, Principle IX).
 *
 * ## The scanner, not a second one
 *
 * `detectInjection` is where this application knows what instruction-shaped text looks
 * like — `007`'s two tiers and, since `029`, P18's section spoofing. A second scanner
 * here would be a second thing an attacker only has to beat once, and it would drift:
 * the day somebody adds a shape to one, the other keeps letting it through.
 *
 * ## Why a packet is worth scanning at all
 *
 * The sender is a colleague she knows, so the threat is not really her colleague. It is
 * that a packet passes through a mail system, a shared drive and a memory stick, and
 * that its **items become notes in her vault** — which are read back into every future
 * prompt about that child. A note is a longer-lived surface than a worksheet.
 *
 * Nothing is removed and nothing is auto-skipped: the flags are quoted and located, and
 * she decides. `007` FR-504's posture, and the reason the door is per-item.
 */
export function scanPacket(packet: CoordinationPacket): PacketFlag[] {
  const flags: PacketFlag[] = [];
  packet.items.forEach((item, at) => {
    const text = item.of === 'note' ? `${item.heading}\n${item.text}`
      : item.of === 'material' ? item.title
      : item.text;
    const block = { id: `i${at}`, classes: [], attrs: {}, content: text, notices: [] as Notice[] } as unknown as Block;
    for (const notice of detectInjection(block)) {
      flags.push({ at, quote: notice.quote, message: notice.message });
    }
  });
  /*
   * The corrections of a `review` packet too — they are the one part of a packet that
   * comes back **already addressed to the application**, so «arregla esto» and «ignora
   * lo anterior» sit next to each other legitimately, and that is exactly the shape a
   * vector would wear here.
   */
  (packet.review?.corrections ?? []).forEach((c, i) => {
    const block = { id: `c${i}`, classes: [], attrs: {}, content: c, notices: [] as Notice[] } as unknown as Block;
    for (const notice of detectInjection(block)) {
      flags.push({ at: -1 - i, quote: notice.quote, message: notice.message });
    }
  });
  return flags;
}
