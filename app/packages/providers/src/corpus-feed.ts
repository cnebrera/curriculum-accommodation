/**
 * Where a corpus correction comes from (034 T014, FR-3205, FR-3204, research R6).
 *
 * ## Manifest-first, then raw files — no archive format
 *
 * A corpus release is a GitHub release whose assets are `manifest.json` and
 * `manifest.sig`; the files are fetched per path and checked against the hashes **inside
 * the signed manifest**. So the file host needs no trust of its own: it can serve
 * whatever it likes and every byte is compared to something the project signed.
 *
 * No zip, no tar. An archive format is a parser, a parser is an attack surface, and the
 * one thing this channel must not have is a way to be exploited before the signature has
 * been checked.
 *
 * ## The gate mints the transport
 *
 * There is **no exported transport**. `023`'s own history is the argument, written in
 * `pictograms/download.ts`: `fetchGate` was correct and one caller checked it, then a
 * second caller was written three hours later and did not — so a teacher who had never
 * accepted the licence still reached the publisher. «A gate in a caller is a gate the
 * second caller walks past.» Here the gate is her press, or the recorded launch consent.
 *
 * ## And injectable, so «it did not phone home» is checkable
 *
 * SC-3202's test is «the suite passes while the transport fails the test if called at
 * all», not «we did not notice a request».
 */

export interface CorpusTransport {
  json(url: string): Promise<unknown | null>;
  text(url: string): Promise<string | null>;
  bytes(url: string): Promise<Uint8Array | null>;
}

/** Her press, or the launch consent she recorded. Nothing else opens this. */
export interface UpdateGate { may: boolean }

/** ~15s: a slow morning in a school is not a failure (`006`). */
const TIMEOUT_MS = 15_000;

const REFUSED = 'No he pedido nada: buscar correcciones del criterio es algo que pides tú.';

export function corpusTransportFor(gate: UpdateGate): CorpusTransport {
  if (!gate.may) {
    const refuse = async (): Promise<never> => { throw new Error(REFUSED); };
    return { json: refuse, text: refuse, bytes: refuse };
  }
  return httpTransport;
}

/**
 * Redirect discipline: followed to a declared host or not at all.
 *
 * `redirect: 'manual'` and the location checked against the hosts the corpus declares,
 * because the alternative is that a redirect chain decides where this connects — and
 * «where does this connect» is the question FR-3204 exists to let her answer.
 */
async function get(url: string, allowedHosts: readonly string[], accept?: string): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop < 3; hop += 1) {
    if (!allowedHosts.includes(new URL(current).host)) {
      throw new Error(`destino no declarado: ${new URL(current).host}`);
    }
    const res = await fetch(current, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'manual',
      headers: { 'user-agent': 'Rampa', ...(accept ? { accept } : {}) },
    });
    if (res.status === 404) return null;
    if (res.status >= 300 && res.status < 400) {
      const to = res.headers.get('location');
      if (!to) throw new Error(`HTTP ${res.status} sin destino`);
      current = new URL(to, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }
  throw new Error('demasiados saltos');
}

/**
 * The hosts this transport may reach, set once from the corpus declaration.
 *
 * A module-level list rather than a parameter on every call, because the property that
 * matters is «this transport cannot reach an undeclared host», and a parameter is
 * something a caller can get wrong once.
 */
let allowed: readonly string[] = [];

export const declareHosts = (hosts: readonly string[]): void => { allowed = [...hosts]; };

const httpTransport: CorpusTransport = {
  json: async (url) => {
    const res = await get(url, allowed, 'application/vnd.github+json');
    return res === null ? null : res.json();
  },
  text: async (url) => {
    const res = await get(url, allowed);
    return res === null ? null : res.text();
  },
  bytes: async (url) => {
    const res = await get(url, allowed);
    return res === null ? null : new Uint8Array(await res.arrayBuffer());
  },
};

export interface CorpusRelease {
  /** The corpus version this release publishes. */
  version: number;
  manifestUrl: string;
  signatureUrl: string;
  /** Where the files themselves live, at that tag. */
  filesBase: string;
}

/**
 * The newest published corpus release, or nothing.
 *
 * Discovery is a filtered release listing on the same API host the app check already
 * uses — one host, already declared, rather than a second piece of infrastructure the
 * project would have to run.
 */
export async function newestCorpusRelease(args: {
  transport: CorpusTransport;
  /** The releases listing endpoint, from the declared destinations. */
  listing: string;
  /** Where raw files live, from the declared destinations. */
  filesBase: string;
  /** What she already has. Nothing older than this is offered. */
  currentVersion: number;
}): Promise<CorpusRelease | null> {
  const body = await args.transport.json(args.listing).catch(() => null);
  if (!Array.isArray(body)) return null;

  let best: CorpusRelease | null = null;
  for (const entry of body) {
    if (!entry || typeof entry !== 'object') continue;
    const tag = (entry as Record<string, unknown>)['tag_name'];
    if (typeof tag !== 'string') continue;
    const m = /^corpus-v(\d+)$/.exec(tag);
    if (!m) continue;
    const version = Number(m[1]);
    if (version <= args.currentVersion) continue;
    if (best && best.version >= version) continue;

    const assets = (entry as Record<string, unknown>)['assets'];
    const urlOf = (name: string): string | null => {
      if (!Array.isArray(assets)) return null;
      for (const a of assets) {
        const asset = a as Record<string, unknown>;
        if (asset['name'] === name && typeof asset['browser_download_url'] === 'string') {
          return asset['browser_download_url'];
        }
      }
      return null;
    };
    const manifestUrl = urlOf('manifest.json');
    const signatureUrl = urlOf('manifest.sig');
    /*
     * Both, or neither. A release with a manifest and no signature is not a release this
     * application can do anything with, and offering it would put unverified bytes in
     * front of her while the screen worked out what to say.
     */
    if (!manifestUrl || !signatureUrl) continue;
    best = { version, manifestUrl, signatureUrl, filesBase: `${args.filesBase}corpus-v${version}/` };
  }
  return best;
}
