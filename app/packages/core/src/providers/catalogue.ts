import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The service catalogue (009 T003–T005).
 *
 * Every fact a teacher reads on the connection screen — the cost, the free
 * tier, where the request is processed, what the terms say about training —
 * comes from a Markdown file in `instructions/providers/`, not from this file.
 * Principle I: adding the seventh service is a file and no code, and correcting
 * a cost figure does not need a release.
 *
 * Read through the repair-not-reject path the vault uses (`006` R3): a
 * malformed entry degrades to "this service is not offered" and is logged. The
 * screen a teacher is standing on does not crash because a file is wrong.
 */
export type Adapter = 'google' | 'anthropic' | 'openai' | 'compatible';
export type Jurisdiction = 'eu' | 'us' | 'other' | 'varies';
export type TrainsOnInput = 'no' | 'yes' | 'opt-out' | 'unclear';

/** Named differences that are not the endpoint. Never branch on service id. */
export type Quirk = 'no-usage' | 'no-stream-options';

export interface ServiceEntry {
  id: string;
  adapter: Adapter;
  label: string;
  vendor: string;
  /** `compatible` only. The one field that could redirect traffic. */
  endpoint?: string;
  model: string;
  requiresCard: boolean;
  freeTier?: string;
  vision: boolean;
  keyUrl: string;
  /**
   * Prefixes this service's keys are known to start with.
   *
   * A **list**, because a provider can have more than one format live at once —
   * Google issues both `AIza…` and `AQ.…` — and because it is used only to
   * recognise a key pasted from the *wrong* service. It is never a reason to
   * reject a key: see `checkKeyShape`.
   */
  keyPrefixes: string[];
  costCents: number;
  costMeasured: boolean;
  processedIn: string;
  jurisdiction: Jurisdiction;
  trainsOnInput: TrainsOnInput;
  /** A measured rank from `cases/002-model-floor`, or unmeasured. */
  quality: number | 'unmeasured';
  provisionalRank: number;
  suits: string;
  /** What blocks her before step one. Discovering it at step four is the failure. */
  signupFirst?: string;
  quirks: Quirk[];
  lastChecked: string;
  /** Preserved so a newer catalogue works on an older build. */
  unknown: Record<string, unknown>;
  intro: string;
  steps: string[];
  troubleshooting: string[];
  path: string;
}

const ADAPTERS: Adapter[] = ['google', 'anthropic', 'openai', 'compatible'];
const JURISDICTIONS: Jurisdiction[] = ['eu', 'us', 'other', 'varies'];
const TRAINS: TrainsOnInput[] = ['no', 'yes', 'opt-out', 'unclear'];
const QUIRKS: Quirk[] = ['no-usage', 'no-stream-options'];

/** Fields the parser consumes. Anything else is carried in `unknown`. */
const KNOWN_FIELDS = new Set([
  'id', 'adapter', 'label', 'vendor', 'endpoint', 'model', 'requires_card',
  'free_tier', 'vision', 'key_url', 'key_prefix', 'cost_cents', 'cost_measured',
  'processed_in', 'jurisdiction', 'trains_on_input', 'quality',
  'provisional_rank', 'suits', 'signup_first', 'quirks', 'last_checked',
]);

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : typeof v === 'string' ? /^(true|yes|sí|si)$/i.test(v) : fallback;

/** `AIza` or `[AIza, AQ.]` — one format or several, both spellings accepted. */
function prefixList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date as written in the front matter.
 *
 * YAML parses an unquoted `2026-08-28` into a `Date`, and a quoted one into a
 * string, so both arrive here and both must work — otherwise adding quotes to
 * an entry silently drops the service.
 */
function isoDate(v: unknown): string | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = str(v);
  return s && ISO_DATE.test(s) ? s : undefined;
}

/**
 * One entry, or `null` with a log line saying which fact was missing.
 *
 * `id`, `key_url` and `last_checked` are required because a service we cannot
 * name, cannot send her to, or cannot date is a service we cannot describe
 * honestly — and the whole screen is a set of honest claims about third parties.
 */
export function parseServiceEntry(raw: string, path: string): ServiceEntry | null {
  const { data, body } = parseFrontMatter(raw, path);

  const id = str(data['id']);
  const keyUrl = str(data['key_url']);
  const lastChecked = isoDate(data['last_checked']);

  const missing = [
    !id && 'id', !keyUrl && 'key_url', !lastChecked && 'last_checked',
  ].filter(Boolean);
  if (missing.length) {
    logger.warn('catalogue.entry.skipped', { path, missing: missing.join(', ') });
    return null;
  }

  const declaredAdapter = str(data['adapter']);
  let adapter = (declaredAdapter ?? id) as Adapter;
  if (!ADAPTERS.includes(adapter)) {
    logger.warn('catalogue.entry.skipped', { path, reason: 'unknown adapter', adapter });
    return null;
  }

  /**
   * `endpoint` is honoured only for `adapter: compatible`, and ignored with a
   * log line otherwise. It is the single field capable of sending a teacher's
   * material somewhere else, so it is narrow by construction rather than by
   * review (contract §"The one thing that is not configurable").
   */
  let endpoint = str(data['endpoint']);
  if (endpoint && adapter !== 'compatible') {
    logger.warn('catalogue.endpoint.ignored', { path, adapter });
    endpoint = undefined;
  }
  if (adapter === 'compatible' && !endpoint) {
    logger.warn('catalogue.entry.skipped', { path, reason: 'compatible adapter with no endpoint' });
    return null;
  }
  /*
   * An endpoint must be https, or loopback.
   *
   * https because a teacher's material crosses it. Loopback because a request
   * to 127.0.0.1 cannot leave the machine, which is what lets the degradation
   * suite point a real adapter at a real HTTP server and exercise timeouts,
   * mid-stream disconnects and retry-after for real — without a
   * production-only backdoor, which `006` T060 correctly refused to add.
   *
   * Anything else is skipped, not downgraded: a plain-http entry pointing
   * somewhere else is either a mistake or an attack, and neither should load.
   */
  if (endpoint && !isAllowedEndpoint(endpoint)) {
    logger.warn('catalogue.entry.skipped', { path, reason: 'endpoint is neither https nor loopback', endpoint });
    return null;
  }

  const jurisdictionRaw = str(data['jurisdiction']);
  const jurisdiction = JURISDICTIONS.includes(jurisdictionRaw as Jurisdiction)
    ? (jurisdictionRaw as Jurisdiction)
    // Not a guess in either direction: an unreadable jurisdiction becomes the
    // value that can never be recommended, so the safe reading is the default.
    : 'other';
  if (!JURISDICTIONS.includes(jurisdictionRaw as Jurisdiction)) {
    logger.warn('catalogue.jurisdiction.unreadable', { path, value: jurisdictionRaw ?? '(absent)' });
  }

  const trainsRaw = str(data['trains_on_input']);
  const trainsOnInput = TRAINS.includes(trainsRaw as TrainsOnInput)
    ? (trainsRaw as TrainsOnInput)
    : 'unclear';

  const qualityRaw = data['quality'];
  const quality: number | 'unmeasured' =
    typeof qualityRaw === 'number' && Number.isFinite(qualityRaw) ? qualityRaw : 'unmeasured';

  const quirksRaw = Array.isArray(data['quirks'])
    ? data['quirks'].map((q) => String(q).trim())
    : typeof data['quirks'] === 'string'
      ? data['quirks'].split(/[,\s]+/).filter(Boolean)
      : [];
  const quirks = quirksRaw.filter((q): q is Quirk => QUIRKS.includes(q as Quirk));
  for (const q of quirksRaw) {
    if (!QUIRKS.includes(q as Quirk)) logger.warn('catalogue.quirk.unknown', { path, quirk: q });
  }

  const unknown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!KNOWN_FIELDS.has(k)) unknown[k] = v;

  const { intro, steps, troubleshooting } = parseBody(body);

  return {
    id: id!,
    adapter,
    label: str(data['label']) ?? id!,
    vendor: str(data['vendor']) ?? str(data['label']) ?? id!,
    endpoint,
    model: str(data['model']) ?? '',
    requiresCard: bool(data['requires_card'], true),
    freeTier: str(data['free_tier']),
    vision: bool(data['vision'], false),
    keyUrl: keyUrl!,
    keyPrefixes: prefixList(data['key_prefix']),
    costCents: Number(data['cost_cents'] ?? 0) || 0,
    costMeasured: bool(data['cost_measured'], false),
    processedIn: str(data['processed_in']) ?? 'no consta',
    jurisdiction,
    trainsOnInput,
    quality,
    provisionalRank: Number(data['provisional_rank'] ?? 99) || 99,
    suits: str(data['suits']) ?? '',
    signupFirst: str(data['signup_first']),
    quirks,
    lastChecked: lastChecked!,
    unknown,
    intro, steps, troubleshooting,
    path,
  };
}

/** https anywhere, or plain http only to this machine. */
export function isAllowedEndpoint(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol === 'https:') return true;
  if (url.protocol !== 'http:') return false;
  // Exact hosts only. `localhost.evil.example` resolves elsewhere.
  return url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === 'localhost';
}

/**
 * The body, split on its three headings.
 *
 * Matched on meaning rather than on exact text, so an entry that writes
 * "## Los pasos" still works. A heading we do not recognise leaves its section
 * out of the walkthrough rather than pushing prose into the wrong place.
 */
function parseBody(body: string): { intro: string; steps: string[]; troubleshooting: string[] } {
  const sections = body.split(/^##\s+/m).slice(1);
  let intro = '';
  const steps: string[] = [];
  const troubleshooting: string[] = [];

  for (const section of sections) {
    const nl = section.indexOf('\n');
    const heading = (nl === -1 ? section : section.slice(0, nl)).trim().toLowerCase();
    const content = nl === -1 ? '' : section.slice(nl + 1).trim();

    if (/paso/.test(heading)) {
      for (const line of content.split('\n')) {
        const m = /^\s*(?:\d+[.)]|[-*])\s+(.*)$/.exec(line);
        if (m?.[1]?.trim()) steps.push(m[1].trim());
      }
    } else if (/no encuentro|problema|si algo/.test(heading)) {
      for (const line of content.split('\n')) {
        const m = /^\s*[-*]\s+(.*)$/.exec(line);
        if (m?.[1]?.trim()) troubleshooting.push(m[1].trim());
      }
    } else if (!intro) {
      intro = content.split(/\n\s*\n/)[0]?.trim() ?? '';
    }
  }
  return { intro, steps, troubleshooting };
}

/* ── Staleness (research R3) ─────────────────────────────────────────────── */

export type Freshness = 'fresh' | 'ageing' | 'stale';

export const DAY_MS = 86_400_000;

/**
 * How old the facts are.
 *
 * `today` is a parameter and never `new Date()` inside: a test whose result
 * changes in January is not a test. It matters at run time too — a released
 * build ages after its checks passed, so this runs on her machine and not only
 * in CI.
 */
export function ageInDays(lastChecked: string, today: Date): number {
  const then = Date.parse(`${lastChecked}T00:00:00Z`);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - then) / DAY_MS);
}

export function freshness(lastChecked: string, today: Date): Freshness {
  const age = ageInDays(lastChecked, today);
  if (age <= 180) return 'fresh';
  if (age <= 365) return 'ageing';
  // A year-old jurisdiction claim about children's data is not a current fact.
  return 'stale';
}

/** "comprobado hace N meses", for the marker beside an ageing fact (FR-706). */
export function monthsSince(lastChecked: string, today: Date): number {
  return Math.max(1, Math.round(ageInDays(lastChecked, today) / 30.44));
}

/* ── The catalogue as a whole ────────────────────────────────────────────── */

export interface CatalogueOptions {
  /** Adapter ids with a registered implementation. A file cannot conjure one. */
  available: readonly string[];
  today: Date;
}

/**
 * Parse many entries and drop the ones that cannot be offered.
 *
 * Three reasons an entry is not offered, all logged: it is malformed, its facts
 * are over a year old, or nothing implements its adapter.
 */
export function loadCatalogue(
  files: ReadonlyArray<{ path: string; raw: string }>,
  opts: CatalogueOptions,
): ServiceEntry[] {
  const out: ServiceEntry[] = [];
  const seen = new Set<string>();

  for (const { path, raw } of files) {
    const entry = parseServiceEntry(raw, path);
    if (!entry) continue;

    if (seen.has(entry.id)) {
      logger.warn('catalogue.entry.duplicate', { path, id: entry.id });
      continue;
    }
    if (!opts.available.includes(entry.adapter)) {
      logger.warn('catalogue.entry.skipped', { path, reason: 'no adapter registered', adapter: entry.adapter });
      continue;
    }
    if (freshness(entry.lastChecked, opts.today) === 'stale') {
      logger.warn('catalogue.entry.skipped', { path, reason: 'facts older than a year', lastChecked: entry.lastChecked });
      continue;
    }
    seen.add(entry.id);
    out.push(entry);
  }

  // Stable order, so the comparison does not reshuffle between renders: best
  // known quality first, then cheaper.
  return out.sort(compareForDisplay);
}

/** Measured quality outranks unmeasured; within each, cheaper first. */
export function compareForDisplay(a: ServiceEntry, b: ServiceEntry): number {
  const rank = (s: ServiceEntry) => (s.quality === 'unmeasured' ? 100 + s.provisionalRank : s.quality);
  return rank(a) - rank(b) || a.costCents - b.costCents || a.id.localeCompare(b.id);
}

export const serviceById = (c: readonly ServiceEntry[], id: string): ServiceEntry | undefined =>
  c.find((s) => s.id === id);
