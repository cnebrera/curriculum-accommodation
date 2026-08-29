import type { ServiceEntry } from './catalogue.js';

/**
 * What arrives in the paste box (009 T006, FR-722).
 *
 * A teacher copying a key from a browser brings whatever came with it: a
 * trailing newline, the surrounding quotes a documentation page wrapped it in,
 * a `KEY=` prefix from a code sample, a non-breaking space from a PDF, or —
 * often enough to matter — the whole page, because she pressed ⌘A first.
 *
 * Rejecting all of that as "clave no válida" would be technically correct and
 * useless. Each case has a different next step, so each is identified here and
 * the shape check runs on what she *meant* to paste.
 */

/** U+2018…U+201F: the quotes a word processor substitutes silently. */
const SMART_QUOTES = /[‘’‚‛“”„‟`´]/g;
/** Non-breaking and zero-width characters, which a PDF or a web page inserts. */
const INVISIBLES = /[ ​‌‍﻿]/g;

/**
 * Strip what a copy brought along without changing what she pasted.
 *
 * Deliberately conservative: it removes wrapping and invisible characters, and
 * nothing else. Silently "fixing" the middle of a credential would turn a wrong
 * key into a differently wrong key, and the error message would then be about
 * something she never typed.
 */
export function normaliseKey(raw: string): string {
  let s = raw.replace(INVISIBLES, '').trim();

  // `API_KEY=sk-…` or `ANTHROPIC_API_KEY: sk-…`, straight out of a code sample.
  s = s.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*[=:]\s*/, '');

  s = s.replace(SMART_QUOTES, '"').trim();
  // Matched wrapping quotes only. An unmatched one is part of what she pasted
  // and removing it would hide the real problem.
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    s = s.slice(1, -1).trim();
  }

  // Internal whitespace: a key never contains any, and a line-wrapped copy
  // from a terminal does.
  return s.replace(/\s+/g, '');
}

/**
 * She pasted a page, not a key.
 *
 * Recognised by shape rather than by length alone: a very long paste that still
 * looks like one token is a long key, while anything carrying spaces, newlines
 * or markup is a page. Telling her "eso parece la página entera" is the
 * difference between one more try and giving up.
 */
export function looksLikeAPage(raw: string): boolean {
  const s = raw.replace(INVISIBLES, '').trim();
  if (!s) return false;
  if (/<\/?[a-z][^>]*>/i.test(s)) return true;
  if (/\n/.test(s) && s.length > 120) return true;
  // Several words with spaces between them is prose, whatever its length.
  return s.length > 200 && (s.match(/\s/g)?.length ?? 0) > 8;
}

export interface KeyIdentification {
  /** The service whose prefix matched, if any. */
  serviceId?: string;
  /** The normalised key, which is what should be sent for validation. */
  key: string;
  /** True when it matched a service other than the one she is setting up. */
  belongsToAnother: boolean;
}

/**
 * Which service a key belongs to, by longest matching prefix.
 *
 * Longest wins, and that is the whole point: `sk-ant-` and `sk-` are both
 * prefixes of an Anthropic key, so a shortest-match or first-match search reads
 * every Anthropic key as an OpenAI one and sends her to the wrong provider's
 * page — with a confident, wrong, sentence.
 */
export function identifyKey(
  raw: string,
  catalogue: readonly ServiceEntry[],
  intendedServiceId?: string,
): KeyIdentification {
  const key = normaliseKey(raw);

  let best: ServiceEntry | undefined;
  for (const s of catalogue) {
    if (!s.keyPrefix) continue;
    if (!key.startsWith(s.keyPrefix)) continue;
    if (!best || s.keyPrefix.length > (best.keyPrefix?.length ?? 0)) best = s;
  }

  return {
    serviceId: best?.id,
    key,
    belongsToAnother: Boolean(best && intendedServiceId && best.id !== intendedServiceId),
  };
}

export type ShapeVerdict =
  | { ok: true; key: string }
  | { ok: false; kind: 'empty' | 'page' | 'wrong-service' | 'bad-prefix' | 'too-short'; ownerId?: string };

/**
 * The check that runs before any network call.
 *
 * Everything decidable offline is decided offline: it costs nothing, it works
 * on a school connection that is down, and it means the five sentences she can
 * see are five different sentences rather than one generic one with five causes.
 */
export function checkKeyShape(
  raw: string,
  service: ServiceEntry,
  catalogue: readonly ServiceEntry[],
): ShapeVerdict {
  if (!raw.replace(INVISIBLES, '').trim()) return { ok: false, kind: 'empty' };
  if (looksLikeAPage(raw)) return { ok: false, kind: 'page' };

  const id = identifyKey(raw, catalogue, service.id);
  if (id.belongsToAnother) return { ok: false, kind: 'wrong-service', ownerId: id.serviceId };

  if (service.keyPrefix && !id.key.startsWith(service.keyPrefix)) {
    return { ok: false, kind: 'bad-prefix' };
  }
  // Short enough to be a truncated copy rather than a credential. Every service
  // in the catalogue issues keys far longer than this.
  if (id.key.length < 20) return { ok: false, kind: 'too-short' };

  return { ok: true, key: id.key };
}
