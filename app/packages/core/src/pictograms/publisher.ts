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
  /** `{lang}` and `{word}` — the only two placeholders permitted. */
  search: string;
  /** `{id}` — likewise. */
  image: string;
  site: string;
  licence: string;
  licenceUrl: string;
  languages: string[];
  attribution: PublisherAttribution;
}

export interface PictogramFetchCorpus {
  publishers: Publisher[];
  /** The bound on one fetch. Reached is reported, never silently applied (FR-2117). */
  wordsPerFetch: number;
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
const NOTHING: PictogramFetchCorpus = { publishers: [], wordsPerFetch: 0 };

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function parsePictogramFetchCorpus(
  raw: string, file = 'instructions/pictograms.md',
): PictogramFetchCorpus {
  const { data } = parseFrontMatter(raw, file);

  const wordsPerFetch = typeof data['words_per_fetch'] === 'number'
    ? Math.max(0, Math.floor(data['words_per_fetch'])) : 0;

  const raws = Array.isArray(data['publishers']) ? data['publishers'] : [];
  const publishers: Publisher[] = [];

  for (const entry of raws) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const a = (e['attribution'] ?? {}) as Record<string, unknown>;

    const p: Publisher = {
      id: str(e['id']), label: str(e['label']),
      search: str(e['search']), image: str(e['image']),
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
      ['id', p.id], ['label', p.label], ['search', p.search], ['image', p.image],
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
    if (!p.search.includes('{word}') || !p.search.includes('{lang}')) {
      logger.error('pictograms.publisher-bad-search', { file, id: p.id });
      continue;
    }
    if (!p.image.includes('{id}')) {
      logger.error('pictograms.publisher-bad-image', { file, id: p.id });
      continue;
    }
    publishers.push(p);
  }

  if (publishers.length === 0) {
    logger.error('pictograms.no-publishers', { file });
    return { ...NOTHING, wordsPerFetch };
  }
  return { publishers, wordsPerFetch };
}

/**
 * The only place a publisher URL is built, and the only place a word is encoded.
 *
 * `encodeURIComponent` on every substitution, and the values are checked by the
 * caller before they get here: a word is a vocabulary word (`wordlist.ts`) and an id
 * is digits-and-letters (`readCandidates`). Two independent reasons a response cannot
 * steer a request, because one of them is somebody else's discipline.
 */
export function urlFor(
  template: string, values: Record<'lang' | 'word' | 'id', string | undefined>,
): string {
  return template.replace(/\{(lang|word|id)\}/g, (_, key: 'lang' | 'word' | 'id') => {
    const v = values[key];
    if (v === undefined) throw new Error(`urlFor: «${key}» no tiene valor`);
    return encodeURIComponent(v);
  });
}
