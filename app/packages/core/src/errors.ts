/**
 * Domain errors. Never a status code, never a stack trace in front of a teacher
 * (006 FR-423). The UI maps each `kind` to a sentence in her language.
 */
export type ErrorKind =
  | 'vault-path-escape'      // a path tried to leave the vault
  | 'vault-unreadable'
  | 'ir-unverified'          // adaptation attempted before human verification
  | 'ir-no-provenance'       // a changed block with nothing justifying it
  | 'output-incomplete'      // truncated, or content gone without being declared
  | 'name-unconfirmed'       // a probable name in her own notes, not yet resolved
  | 'corpus-missing'         // the bundled recipes are not there: broken install
  /**
   * Nothing in the profile activates any adaptation, so there is nothing to do
   * (PROD-01, decision P1).
   *
   * A stop, not a warning, and **before the provider is called**: the run used to
   * proceed with «Adaptando: 0 reglas», sending a prompt whose «Reglas
   * seleccionadas» section was empty. Hard rule 6 forbids a change with no recipe
   * to cite, so the model either changed nothing — she paid for a copy of her own
   * worksheet — or invented recipe ids, which is worse because the report then
   * cites rules that do not exist.
   */
  | 'no-recipes-apply'
  | 'render-learner-data'    // learner data reached learner-facing output
  | 'render-undescribed'     // an essential figure with no description
  | 'input-too-large'
  | 'material-kind-missing'  // she was not asked what the material is, or said something unknown
  | 'ingest-empty'           // nothing dropped
  | 'ingest-format'          // a file type we cannot read, or a mixed drop
  | 'ingest-unusable'        // a photo too dark or too small to be worth a call
  | 'ingest-many-sheets'     // two worksheets in one image; she splits, we never do
  | 'ingest-no-vision'       // her service cannot read photographs
  | 'ingest-failed'          // the bound was exhausted on a page
  | 'compose-no-objective'   // she asked to compose and said nothing to compose
  | 'compose-needs-anchor'   // content, which needs something true to rest on
  | 'guide-no-work'          // a draft made from nothing is a form filled in by a model
  | 'guide-no-evaluation'    // modifying objectives with no evaluation is procedurally void
  /**
   * Composing an exam for a course that is not his (`027` FR-2509, decision P12).
   *
   * Its own kind rather than `compose-no-objective`, because it is not a missing input:
   * the request is complete and understood, and what it asks for is a decision that
   * belongs to the teaching team on a psychopedagogical assessment. The sentence has to
   * say that, and the way to get her past it is a registered ACS — so «falta un dato»
   * would send her to fix the wrong thing.
   *
   * Keyed on the **request**, never on the profile: a high CUR is a reason to compose
   * more carefully, never a reason to refuse (P12, and 2.11's correction to `adapt.md`).
   */
  | 'compose-exam-other-course'
  /**
   * A second turn on a document whose first turn is still running (`026` T012).
   *
   * Refused rather than queued: the running turn is about to change the file the second
   * would be sent, so queueing would send a document that no longer exists. Keyed per
   * document — a turn about Marco's sheet does not block a turn about Lucia's.
   */
  | 'turn-in-flight'
  /** A revision number that is not on disk — she may have tidied the folder by hand. */
  | 'revision-missing'
  /**
   * A turn on a sheet made from a reading that has since changed (`026` T013, `005` FR-520).
   *
   * Refused rather than warned, because a warning arrives with the bill: iterating a
   * stale sheet bakes the stale reading in deeper, since the next revision inherits the
   * fingerprint. She unblocks it by re-adapting from the current reading.
   */
  | 'stale-reading'
  | 'pictogram-not-accepted'  // a fetch attempted before she accepted the licence (023 FR-2104)
  | 'pictogram-in-progress'  // a second whole-set download while one is running (024 FR-2118)
  | 'pictogram-language'     // her publisher has no pictograms in this language
  | 'pictogram-no-publisher' // the corpus defines nowhere to fetch from
  | 'key-missing' | 'key-invalid' | 'key-wrong-provider' | 'key-no-credit'
  | 'offline' | 'rate-limited' | 'provider-failed'
  /**
   * The service no longer serves the model Rampa speaks to it with.
   *
   * A 404 from a provider, and separate from `provider-failed` for two reasons that
   * are both about not lying: its sentence says «vuelve a intentarlo en un momento»,
   * and it is in the resilience layer's retryable set — so a retired model would be
   * retried three times with backoff and then blamed on the weather.
   *
   * Added 2026-09-01, when Google's `gemini-2.0-flash` was shut down and the
   * application had no way to say so.
   */
  | 'provider-model-gone';

export class RampaError extends Error {
  constructor(readonly kind: ErrorKind, message: string, readonly detail?: unknown) {
    super(message);
    this.name = 'RampaError';
  }
}

export const isRampaError = (e: unknown): e is RampaError => e instanceof RampaError;

/**
 * Electron serialises an Error across IPC into a string, which loses `kind` —
 * and the interface maps kind to a Spanish sentence, so without this the mapping
 * silently never matched and every failure fell through to "algo ha ido mal".
 *
 * Encoding the kind into the message keeps one channel and survives the round
 * trip through any Electron version.
 */
const WIRE = /^\[rampa:([a-z-]+)\]\s*/;

export const toWire = (e: unknown): Error => {
  if (isRampaError(e)) return new Error(`[rampa:${e.kind}] ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
};

export interface WireError { kind: ErrorKind | 'unknown'; message: string }

export function fromWire(e: unknown): WireError {
  const raw = e instanceof Error ? e.message : String(e);
  // Electron prefixes "Error invoking remote method 'x':" — strip it first.
  const cleaned = raw.replace(/^Error invoking remote method '[^']*':\s*/, '')
                     .replace(/^Error:\s*/, '');
  const m = WIRE.exec(cleaned);
  if (m) return { kind: m[1] as ErrorKind, message: cleaned.slice(m[0].length) };
  return { kind: 'unknown', message: cleaned };
}
