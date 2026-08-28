import type { JournalDoc } from './index.js';
import { HOUSE_STYLE_LIMIT_CHARS } from './index.js';

/**
 * Consolidation: what has accumulated, and what is worth promoting (003 US3).
 *
 * Append-only logs rot. A note that has appeared three times is no longer a
 * note, it is a rule — and until this existed nothing in the application ever
 * said so, so the maintenance half of the memory loop had no implementation at
 * all (FR-211, FR-219, FR-220 had no task).
 *
 * Everything here **proposes**. Nothing is applied, nothing is deleted, and
 * every promotion is confirmed by a human (Principle VIII). That is not
 * politeness: only she knows whether a pattern is a rule or a coincidence, and
 * a system that promotes silently is a system whose memory she cannot trust.
 *
 * Deterministic by requirement — Principle II — so the clustering below is
 * plain arithmetic over words, not a model. It is a *candidate finder*. Being
 * approximately right is fine, because a human reads every suggestion; being
 * unexplainable would not be.
 */

export interface DatedSection {
  date: string | null;
  heading: string;
  body: string;
}

/** Learner notes are `## <date> · <heading>` sections, newest last. */
export function parseDatedSections(notes: string): DatedSection[] {
  const body = notes.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  return body
    .split(/\n(?=##\s)/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('##'))
    .map((chunk) => {
      const firstBreak = chunk.indexOf('\n');
      const title = (firstBreak === -1 ? chunk : chunk.slice(0, firstBreak)).replace(/^#+\s*/, '');
      const rest = firstBreak === -1 ? '' : chunk.slice(firstBreak + 1).trim();
      const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(title);
      const heading = title.replace(/(\d{4}-\d{2}-\d{2})\s*·?\s*/, '').trim();
      return { date: dateMatch ? dateMatch[1]! : null, heading, body: rest };
    });
}

/** Words that carry no theme. Small on purpose: this only has to cluster. */
const STOP = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','se',
  'lo','le','les','su','sus','mi','con','por','para','como','no','si','ya','muy','más','mas',
  'pero','porque','cuando','esto','esta','este','eso','ese','hay','ha','he','es','son','está',
  'están','todo','toda','todos','todas','nada','algo','bien','mal','le','les','me','te','tu',
]);

const words = (s: string): Set<string> =>
  new Set(
    s.toLowerCase()
      .normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );

export function similarity(a: string, b: string): number {
  const wa = words(a), wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size);
}

/** Above this two notes are treated as the same theme. Tuned to over-offer. */
export const SAME_THEME = 0.5;

export interface RepeatedTheme {
  /** The most recent phrasing, which is the one she is most likely to accept. */
  text: string;
  /** Every occurrence, oldest first. This is the evidence she is shown. */
  occurrences: Array<{ date: string | null; text: string }>;
}

/**
 * A theme appearing `minTimes` or more.
 *
 * The evidence matters as much as the proposal: "three times, on these dates,
 * here is what happened each time" is a judgement she can confirm. A bare
 * suggestion is a thing she rubber-stamps, and a rubber-stamped memory is worse
 * than none because she will believe it.
 */
export function findRepeatedThemes(sections: DatedSection[], minTimes = 3): RepeatedTheme[] {
  const items = sections.map((s) => ({
    date: s.date,
    text: `${s.heading} ${s.body}`.trim() || s.heading,
  }));
  const used = new Set<number>();
  const themes: RepeatedTheme[] = [];

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const group = [i];
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (similarity(items[i]!.text, items[j]!.text) >= SAME_THEME) group.push(j);
    }
    if (group.length < minTimes) continue;
    for (const k of group) used.add(k);
    const occurrences = group.map((k) => items[k]!);
    themes.push({ text: occurrences[occurrences.length - 1]!.text, occurrences });
  }
  return themes;
}

export interface RetentionCandidate {
  code: string;
  lastActivity: string | null;
  daysInactive: number | null;
}

/**
 * Learners with no activity past the retention period (003 FR-219).
 *
 * Surfaced as a question, never as an action. The system must not delete a
 * child's record because a date passed — it asks, and she answers.
 */
export const DEFAULT_RETENTION_DAYS = 365;

export function retentionCandidates(
  learners: Array<{ code: string; notes: string }>,
  today: string,
  retentionDays = DEFAULT_RETENTION_DAYS,
): RetentionCandidate[] {
  const now = Date.parse(today);
  const out: RetentionCandidate[] = [];
  for (const l of learners) {
    const dates = parseDatedSections(l.notes)
      .map((s) => s.date)
      .filter((d): d is string => Boolean(d))
      .sort();
    const last = dates.length ? dates[dates.length - 1]! : null;
    if (!last) { out.push({ code: l.code, lastActivity: null, daysInactive: null }); continue; }
    const days = Math.floor((now - Date.parse(last)) / 86_400_000);
    if (days >= retentionDays) out.push({ code: l.code, lastActivity: last, daysInactive: days });
  }
  return out;
}

/** Journal entries already promoted, or superseded by a later one on the same recipes. */
export function archiveCandidates(journal: JournalDoc[]): JournalDoc[] {
  const promoted = journal.filter((e) => e.status === 'promoted');
  const superseded: JournalDoc[] = [];
  const byRecipe = new Map<string, JournalDoc[]>();
  for (const e of journal.filter((x) => x.status === 'open')) {
    for (const r of e.recipes) {
      const list = byRecipe.get(r) ?? [];
      list.push(e);
      byRecipe.set(r, list);
    }
  }
  for (const entries of byRecipe.values()) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    // The newest entry on a recipe stands; older open ones are candidates.
    for (const e of sorted.slice(0, -1)) if (!superseded.includes(e)) superseded.push(e);
  }
  return [...promoted, ...superseded];
}

export interface Proposals {
  /** Per learner: themes worth fixing into the profile. */
  learnerThemes: Array<{ code: string; themes: RepeatedTheme[] }>;
  /** Journal entries that could be archived, with why. */
  archive: Array<{ path: string; because: 'promoted' | 'superseded' }>;
  /** Learners past the retention period. A question, never an action. */
  retention: RetentionCandidate[];
  /** True when house style has stopped being a style guide. */
  houseOverflowing: boolean;
  houseChars: number;
}

export function buildProposals(input: {
  learners: Array<{ code: string; notes: string }>;
  journal: JournalDoc[];
  house: string;
  today: string;
  retentionDays?: number;
}): Proposals {
  const promotedPaths = new Set(input.journal.filter((e) => e.status === 'promoted').map((e) => e.path));
  return {
    learnerThemes: input.learners
      .map((l) => ({ code: l.code, themes: findRepeatedThemes(parseDatedSections(l.notes)) }))
      .filter((x) => x.themes.length > 0),
    archive: archiveCandidates(input.journal).map((e) => ({
      path: e.path,
      because: promotedPaths.has(e.path) ? ('promoted' as const) : ('superseded' as const),
    })),
    retention: retentionCandidates(input.learners, input.today, input.retentionDays)
      .filter((c) => c.daysInactive !== null),
    houseOverflowing: input.house.length > HOUSE_STYLE_LIMIT_CHARS,
    houseChars: input.house.length,
  };
}
