import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * Who pictograms can be fetched from (023 T002, FR-2116, `018` FR-1604).
 *
 * ## Why the endpoints are corpus data and not constants
 *
 * Two reasons, and the second is the one that matters.
 *
 * Principle I: a URL that moves should be a Markdown edit rather than a release.
 *
 * And `018` FR-1604 requires the pictogram set to be **replaceable** — nothing in
 * code may assume ARASAAC. A list of publishers compiled into `packages/core` is
 * precisely the dependency that rule forbids, and it would be a quiet one: the
 * feature would work, and the assumption would only surface the day somebody had a
 * different set.
 *
 * So this file knows the *shape* of a publisher and nothing about any particular
 * one. `instructions/pictograms.md` knows ARASAAC.
 *
 * ## `search` is gone (from a review, 2026-09-02)
 *
 * A per-word search endpoint was required here, validated for its `{word}` placeholder,
 * and **read by nobody** since `024` deleted the word-by-word fetch — the sixteenth
 * value in this project written and consumed by nothing.
 *
 * It was not inert. A publisher with a bulk index and no per-word search was **refused
 * from the corpus entirely** for failing a check on a field with no reader, which is the
 * opposite of the replaceability `018` FR-1604 and this file both argue for. And a
 * documented `{word}`-bearing template with no caller is an invitation for the next
 * feature to re-add the leak `024` removed.
 *
 * ## The response is untrusted (Principle IX)
 *
 * Whatever comes back from a publisher is content, not instruction. `readCandidates`
 * in `fetch.ts` takes ids and keywords and validates both; nothing in a response can
 * name a file, choose a path, or reach a template. The templates here are filled by
 * `urlFor` below, which is the only place a URL is ever built.
 */

export interface PublisherAttribution {
  author: string;
  owner: string;
  source: string;
}

export interface Publisher {
  id: string;
  label: string;
  /** `{lang}`: the whole catalogue in one request (024 FR-2202). */
  index: string;
  /** `{id}` and `{size}` — likewise. */
  image: string;
  site: string;
  licence: string;
  licenceUrl: string;
  languages: string[];
  attribution: PublisherAttribution;
}

export interface PictogramFetchCorpus {
  publishers: Publisher[];
  /**
   * Pixels per image (024 FR-2204).
   *
   * From the corpus because it **is** the minimum-print-size decision, which is already
   * corpus data: 12 mm at 300 dpi is 142 pixels, so 300 prints to 25 mm with room. Split
   * across two files, the two stop agreeing.
   */
  imageSize: number;
  /** How many images at once. A CDN's purpose, not a licence to hammer it (FR-2207). */
  concurrency: number;
  /** For «3.140 de 13.802» before the real number arrives with the index. */
  expectedTotal: number;
  /** For the free-space check before the first byte (FR-2208). */
  expectedMegabytes: number;
}

/**
 * The fallback fails **closed**: no publishers, so nothing can be fetched.
 *
 * The opposite of the guide corpus's fallback, and deliberately: there, an empty list
 * meant a diagnosis reached the vault, so a minimum had to be built in. Here an empty
 * list means the download button has nowhere to go, which is a visible, harmless
 * failure — and a built-in URL would reintroduce exactly the compiled-in assumption
 * this file exists to avoid.
 */
const NOTHING: PictogramFetchCorpus = {
  publishers: [],
  /*
   * Zeroes, and every one of them fails closed.
   *
   * `imageSize: 0` builds no URL, `concurrency: 0` starts nothing. A plausible default
   * here — 500, say — would mean a corpus somebody broke still downloaded 200 MB at a
   * size nobody chose, which is worse than a visible failure.
   */
  imageSize: 0, concurrency: 0, expectedTotal: 0, expectedMegabytes: 0,
};

/** A positive integer from the corpus, or 0 — which every caller treats as «refuse». */
const count = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function parsePictogramFetchCorpus(
  raw: string, file = 'instructions/pictograms.md',
): PictogramFetchCorpus {
  const { data } = parseFrontMatter(raw, file);

  const numbers = {
    imageSize: count(data['image_size']),
    concurrency: count(data['fetch_concurrency']),
    expectedTotal: count(data['expected_total']),
    expectedMegabytes: count(data['expected_megabytes']),
  };
  for (const [key, value] of Object.entries(numbers)) {
    if (value === 0) logger.error('pictograms.corpus-number-missing', { file, key });
  }

  const raws = Array.isArray(data['publishers']) ? data['publishers'] : [];
  const publishers: Publisher[] = [];

  for (const entry of raws) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const a = (e['attribution'] ?? {}) as Record<string, unknown>;

    const p: Publisher = {
      id: str(e['id']), label: str(e['label']),
      index: str(e['index']), image: str(e['image']),
      site: str(e['site']), licence: str(e['licence']),
      licenceUrl: str(e['licence_url']),
      languages: Array.isArray(e['languages'])
        ? e['languages'].filter((l): l is string => typeof l === 'string') : [],
      attribution: {
        author: str(a['author']), owner: str(a['owner']), source: str(a['source']),
      },
    };

    /*
     * Every field this code reads, required — the twelfth unread field is not
     * shipping in this feature (backlog G25).
     *
     * A publisher missing its attribution is the sharp case: it would fetch, the
     * pictograms would land, the sheets would render, and the credit the licence
     * requires would be blank. Refused instead, by name.
     */
    const missing = [
      ['id', p.id], ['label', p.label], ['image', p.image],
      ['index', p.index],
      ['site', p.site], ['licence', p.licence], ['licence_url', p.licenceUrl],
      ['attribution.author', p.attribution.author],
      ['attribution.owner', p.attribution.owner],
      ['attribution.source', p.attribution.source],
    ].filter(([, v]) => !v).map(([k]) => k);

    if (missing.length > 0 || p.languages.length === 0) {
      logger.error('pictograms.publisher-incomplete', {
        file, id: p.id || '(sin id)',
        missing: p.languages.length === 0 ? [...missing, 'languages'] : missing,
      });
      continue;
    }
    if (!p.image.includes('{id}')) {
      logger.error('pictograms.publisher-bad-image', { file, id: p.id });
      continue;
    }
    if (!p.index.includes('{lang}')) {
      logger.error('pictograms.publisher-bad-index', { file, id: p.id });
      continue;
    }
    publishers.push(p);
  }

  if (publishers.length === 0) {
    logger.error('pictograms.no-publishers', { file });
    return { ...NOTHING, ...numbers };
  }
  return { publishers, ...numbers };
}

/**
 * The only place a publisher URL is built, and the only place a word is encoded.
 *
 * `encodeURIComponent` on every substitution, and the values are checked before they
 * get here: an id is digits-and-letters (`readCandidates`) and a language is a member of
 * the publisher's own list — the second of which was missing in `checkUpdate` and was a
 * one-shot text-egress channel until a security review found it.
 */
export function urlFor(
  template: string,
  values: Partial<Record<'lang' | 'word' | 'id' | 'size', string>>,
): string {
  return template.replace(/\{(lang|word|id|size)\}/g, (_, key: 'lang' | 'word' | 'id' | 'size') => {
    const v = values[key];
    if (v === undefined) throw new Error(`urlFor: «${key}» no tiene valor`);
    return encodeURIComponent(v);
  });
}
