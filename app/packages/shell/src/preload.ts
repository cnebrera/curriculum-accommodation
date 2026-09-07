import { contextBridge, ipcRenderer } from 'electron';

/**
 * The renderer has no filesystem access and no node integration. Everything
 * privileged crosses this bridge, exactly as listed in
 * specs/006-desktop-app/contracts/ipc-surface.md.
 */
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api = {
  vault: {
    choose: () => invoke('vault:choose'),
    use: (root: string) => invoke('vault:use', root),
    defaultPath: () => invoke('vault:default'),
    current: () => invoke('vault:current'),
    read: (p: string) => invoke('vault:read', p),
    /**
     * This folder holds shapes this build does not know (`032` FR-3008, P50).
     *
     * The shared-folder case: a colleague on a newer version wrote something here. It is
     * reported and never refused — her work is in there.
     */
    isNewer: () => invoke('vault:isNewer'),
    write: (p: string, c: string) => invoke('vault:write', p, c),
    /** Open a document from the vault in her own editor (014). */
    open: (p: string) => invoke('vault:open', p),
    list: (d: string) => invoke('vault:list', d),
    onChanged: (cb: (p: string) => void) => {
      const h = (_e: unknown, p: string) => cb(p);
      ipcRenderer.on('vault:changed', h);
      return () => { ipcRenderer.off('vault:changed', h); };
    },
  },
  names: {
    status: () => invoke('names:status'),
    set: (code: string, name: string) => invoke('names:set', code, name),
    /** Display only. Never put the result into anything that gets sent. */
    resolve: (code: string) => invoke('names:resolve', code),
    all: () => invoke('names:all'),
    check: (text: string) => invoke('names:check', text),
    /** "No es un nombre": remembered, so she is not asked twice. */
    ignore: (word: string) => invoke('names:ignore', word),
    /** The words in her own text that look like names and are not known (`021`). */
    unknownFor: (code: string) => invoke('names:unknownFor', code),
  },
  providers: {
    list: () => invoke('providers:list'),
    validate: (id: string, key: string) => invoke('providers:validate', id, key),
    /** The offline shape check, so five failures read as five sentences (009). */
    shapeCheck: (id: string, raw: string) => invoke('providers:shapeCheck', id, raw),
    save: (id: string, key: string) => invoke('providers:save', id, key),
    current: () => invoke('providers:current'),
    /** The connection screen (009 T036). Carries verification dates, never keys. */
    connections: () => invoke('providers:connections'),
    activate: (id: string) => invoke('providers:activate', id),
    forget: (id: string) => invoke('providers:forget', id),
  },
  corpus: {
    version: () => invoke('corpus:version'),
    recipes: () => invoke('corpus:recipes'),
    licences: () => invoke('corpus:licences'),
    /** The judgement layer, read from the bundle. Never editable from the UI. */
    instruction: (name: string) => invoke('corpus:instruction', name),
    checklist: (name: string) => invoke('corpus:checklist', name),
    /** What the material can be — she picks one, nothing is preselected (012). */
    materialKinds: () => invoke('corpus:materialKinds'),
    /** Axis descriptors, so the interface never shows an axis code (T014). */
    axes: () => invoke('corpus:axes'),
    /** The vehicular mark's descriptor (`033`). Not an eleventh axis — see the handler. */
    mark: () => invoke('corpus:mark'),
    /**
     * The services she can choose from, and the one recommendation (009).
     * Neither carries a model name or an endpoint across this boundary — a
     * field that cannot reach the renderer cannot be rendered by mistake.
     */
    services: () => invoke('corpus:services'),
    /** Education systems, for the year picker (011). */
    educationSystems: () => invoke('corpus:educationSystems'),
    recommend: (answers: unknown) => invoke('corpus:recommend', answers),
    /**
     * Opens the key page in her browser. Takes a **service id**, not a URL: the
     * main process resolves it from the catalogue, so the renderer cannot ask
     * for an arbitrary destination.
     */
    openKeyPage: (serviceId: string) => invoke('corpus:openKeyPage', serviceId),
    /**
     * Is there a newer Rampa? Only ever called from a button she presses — the
     * corpus ships in the release, so this is how FR-414's "one action" works.
     */
    checkForUpdate: () => invoke('corpus:checkForUpdate'),
    /** Where the update channel may connect, declared in the corpus (`034` FR-3204). */
    destinations: () => invoke('corpus:destinations'),
  },
  /**
   * The update notice (`034` US1).
   *
   * Notify only: there is no channel here that downloads or installs anything, and
   * `notify-only.test.ts` asserts that as an **absence** — over the dependency tree and
   * over the source, because a requirement satisfied by nothing existing is the one that
   * quietly stops being true.
   */
  updates: {
    /** The newest version she dismissed, or nothing. */
    dismissed: () => invoke('updates:dismissed'),
    dismiss: (version: string) => invoke('updates:dismiss', version),
    /** Whether she has said Rampa may look at launch. Absent means no. */
    consent: () => invoke('updates:consent'),
    setConsent: (on: boolean) => invoke('updates:setConsent', on),
  },
  /**
   * El criterio pedagógico: traerlo, leerlo, aceptarlo, volver atrás (`034` US2/US3).
   *
   * Two acts and they are separate on purpose: `look` connects and stages, `accept` is
   * one rename and a pointer. The corpus is the judgement layer, and it changing under
   * her without her reading it is what this feature exists to prevent.
   */
  corpusUpdate: {
    state: () => invoke('corpus:updateState'),
    look: () => invoke('corpus:updateLook'),
    /** One changed file, before and after, so «enséñamelo entero» is possible. */
    file: (path: string) => invoke('corpus:updateFile', path),
    accept: () => invoke('corpus:updateAccept'),
    decline: () => invoke('corpus:updateDecline'),
    /** `null` goes back to the corpus that came with the application. */
    revert: (version: number | null) => invoke('corpus:updateRevert', version),
  },
  /**
   * Which normativa she works under (029).
   *
   * `list` carries labels, origin and review status and **no raw file**: the corpus
   * body is reading material for the model, and a screen that could render it is a
   * screen that could be told something by it (Principle IX).
   */
  normative: {
    list: () => invoke('normative:list'),
    /** By corpus id; nothing deselects. Never by territory string. */
    select: (id: string | null) => invoke('normative:select', id),
    /** What a document drafted right now would say about where its wording came from. */
    resolve: (learnerChoice?: string) => invoke('normative:resolve', learnerChoice),
    /**
     * Pick a file and **read** it. Writes nothing (FR-2707): reading a file she pointed
     * at is not importing it, and a flow that saved on «choose» would put a policy file
     * in her vault for having looked at one.
     */
    choose: () => invoke('normative:choose'),
    /**
     * Activate what `choose` handed back. Refused when the scan found something, unless
     * she says so expressly — and the override is written to the activation log.
     */
    activate: (raw: string, override?: boolean) =>
      invoke('normative:activate', raw, override === true),
  },
  /**
   * The coordination packet (`030`).
   *
   * Every channel here reads except `accept` and `applyDelta`. That split is the door:
   * opening, parsing, scanning, showing, holding and linking write nothing, and the two
   * writers take **one item at a time** and are reached by her pressing a button beside
   * that item.
   */
  coordination: {
    exportDraft: (code: string, from: string, to: string, role: string) =>
      invoke('coordination:exportDraft', code, from, to, role),
    exportWrite: (code: string, from: string, to: string, role: string, keep: number[]) =>
      invoke('coordination:exportWrite', code, from, to, role, keep),
    /** Pick a packet and read it. Writes nothing. */
    open: () => invoke('coordination:open'),
    /** Keep somebody else's file, verbatim, for later. */
    hold: (raw: string, filename: string) => invoke('coordination:hold', raw, filename),
    /** Say which of her learners a held packet is about. `''` undoes it. */
    link: (path: string, code: string) => invoke('coordination:link', path, code),
    /** The only writer, one item at a time. */
    accept: (code: string, role: string, filename: string, item: unknown) =>
      invoke('coordination:accept', code, role, filename, item),
    /** And changing the profile is a second decision, taken separately. */
    applyDelta: (code: string, axis: string, level: number) =>
      invoke('coordination:applyDelta', code, axis, level),
    list: (code?: string) => invoke('coordination:list', code),
    /**
     * «¿Me lo miras antes de firmarlo?» (`030` US2).
     *
     * The draft goes out **with its mark**, derived from the document (`007` FR-509);
     * what comes back is corrections bound to (job, revision, fingerprint), never a
     * second copy of the sheet.
     */
    reviewRequest: (job: string, code: string, role: string) =>
      invoke('coordination:reviewRequest', job, code, role),
    reviewReply: (job: string, revision: number, print: string, role: string, corrections: string[]) =>
      invoke('coordination:reviewReply', job, revision, print, role, corrections),
    reviewOpen: (raw: string, code: string) => invoke('coordination:reviewOpen', raw, code),
    reviewAccept: (code: string, packetFile: string, review: unknown) =>
      invoke('coordination:reviewAccept', code, packetFile, review),
    secondLook: (job: string, code: string) => invoke('coordination:secondLook', job, code),
  },
  learners: {
    list: () => invoke('learners:list'),
    roster: () => invoke('learners:roster'),
    saveRoster: (r: unknown) => invoke('learners:saveRoster', r),
    load: (code: string) => invoke('learners:load', code),
    save: (p: unknown) => invoke('learners:save', p),
    newCode: () => invoke('learners:newCode'),
    validateCode: (c: string) => invoke('learners:validateCode', c),
    nameRisk: () => invoke('learners:nameRisk'),
    /** The subjects this vault already knows, to suggest areas from (`032` FR-3007). */
    areas: (code?: string) => invoke('learners:areas', code),
  },
  /**
   * Her pictogram set (`018`, `023`).
   *
   * `fetch` exists as of `023`, and `acceptLicence` is why it is allowed to: nothing
   * is requested from a publisher until she has accepted its licence, and the check
   * lives in the main process (`ipc/pictograms.ts`) rather than in whatever calls
   * this — a gate in a caller is a gate the second caller walks past.
   *
   * What Rampa still does not do is **bundle or redistribute** them (FR-2101). The
   * bytes travel from the publisher's server to her disk.
   */
  pictograms: {
    current: () => invoke('pictograms:current'),
    choose: () => invoke('pictograms:choose'),
    /** Read a folder and say what is in it, without configuring anything. */
    inspect: (root: string) => invoke('pictograms:inspect', root),
    use: (root: string) => invoke('pictograms:use', root),
    images: (ids: string[]) => invoke('pictograms:images', ids),
    /** Who they can come from, and whether she has accepted (FR-2104/2105). */
    publishers: () => invoke('pictograms:publishers'),
    acceptLicence: (publisherId: string) =>
      invoke('pictograms:acceptLicence', publisherId),
    withdrawLicence: () => invoke('pictograms:withdrawLicence'),
    /**
     * One press, the whole set (`024`). **No word list**: `023` asked her to type the
     * words she needed, which is a task she cannot do — she does not know what the next
     * worksheet contains. One indexed request plus the images.
     *
     * A consequence worth naming: no word leaves her machine now, only a language and
     * numeric ids.
     */
    fetch: (args: { language?: string } = {}) => invoke('pictograms:fetch', args),
    /** What she has, from disk. Costs no request. */
    state: () => invoke('pictograms:state'),
    /** She pressed «Parar». What arrived is already usable (`024` FR-2118). */
    stop: () => invoke('pictograms:stop'),
    /** A download already going, so a reopened screen shows it (`025` FR-2309). */
    bringing: () => invoke('pictograms:bringing'),
    /** One request, and only because she asked. */
    checkUpdate: () => invoke('pictograms:checkUpdate'),
    declineUpdate: (highWater: string) => invoke('pictograms:declineUpdate', highWater),
    /**
     * The words the set cannot decide, with their pictures (`024` US2).
     *
     * Without this, downloading the whole catalogue produces empty worksheets: most
     * words have several candidates and `018` FR-1609 correctly refuses to guess.
     */
    candidates: (args: { words: string[]; language?: string }) =>
      invoke('pictograms:candidates', args),
    /** Everything she has chosen, so she can change her mind (`025` FR-2308). */
    chosenSoFar: (language?: string) => invoke('pictograms:chosenSoFar', language),
    /** Her choice, recorded once and used for every learner. */
    chooseWord: (args: { word: string; id: string; language?: string }) =>
      invoke('pictograms:chooseWord', args),
    unchooseWord: (args: { word: string; language?: string }) =>
      invoke('pictograms:unchooseWord', args),
    /**
     * How many sheets a change would make stale, **before** she makes it (`031` FR-2905).
     *
     * `next: null` is un-choosing. `learner` scopes it to one child's override; absent
     * means the global vocabulary.
     */
    affected: (args: { word: string; language?: string; next: string | null; learner?: string }) =>
      invoke('pictograms:affected', args),
  },
  /**
   * Structure material (`028`): agendas, sequences, social stories.
   *
   * Its own namespace because it is a third kind of work beside adapting and composing —
   * not a mode of either. What it deliberately does **not** have is a `chooseWord`: an
   * ambiguous word is resolved through `pictograms.chooseWord`, so a choice made while
   * building an agenda serves her worksheets too.
   */
  structure: {
    /** Build and write it. Local, deterministic, and it spends nothing. */
    save: (args: unknown) => invoke('structure:save', args),
    /** The words her set cannot decide, with their pictures — `024`'s own chooser. */
    candidates: (args: { words: string[]; language?: string }) =>
      invoke('structure:candidates', args),
    /**
     * A social story. **The one of the three that costs money**, and its own channel so
     * that fact is visible in the surface rather than hidden behind a `kind` field.
     */
    story: (args: unknown) => invoke('structure:story', args),
  },
  /**
   * The rehearsal (`035`): the first night does not depend on a key.
   *
   * Nothing here can spend or send. The two steps that would cost money are **served**
   * from an authored sample rather than faked with a provider-shaped object, and the
   * whole thing lives in its own root — see `ensayo/store.ts`.
   */
  ensayo: {
    state: () => invoke('ensayo:state'),
    /** `startedAt` from here: the main process reads no clock. */
    start: (startedAt: string) => invoke('ensayo:start', startedAt),
    advance: (step: string) => invoke('ensayo:advance', step),
    /** She finished, or connected a real service. The root goes entirely. */
    discard: () => invoke('ensayo:discard'),
    reading: (startedAt: string) => invoke('ensayo:reading', startedAt),
    adaptation: (startedAt: string) => invoke('ensayo:adaptation', startedAt),
    /** What a real run **would** cost. Written to no ledger. */
    wouldCost: () => invoke('ensayo:wouldCost'),
    /** The real name detector, offline — the gate she will meet on her first note. */
    checkNames: (text: string) => invoke('ensayo:checkNames', text),
    /** The existing sign-off and renderer, over the rehearsal root. Not a rehearsal of them. */
    sign: (startedAt: string, role: string) => invoke('ensayo:sign', startedAt, role),
    render: (startedAt: string) => invoke('ensayo:render', startedAt),
  },
  /**
   * The adaptación curricular (`017`).
   *
   * **No `ingest` here on purpose**: a guide comes in through `job:ingest` and
   * through `008`'s verification gate, unchanged. `read` takes a job id that already
   * passed it.
   */
  guide: {
    read: (jobId: string) => invoke('guide:read', jobId),
    /**
     * The measures **she confirmed**, which may be fewer than the ones read.
     *
     * `kind` is what the reading worked out the document was (decision P12): an ACS
     * means the objectives are already modified by the teaching team, and that is
     * the fact that unblocks adapting to the modified level. It was computed, shown
     * once and never written down.
     */
    apply: (learner: string, measures: unknown[], document: string,
            omitted?: string[], kind?: string) =>
      invoke('guide:apply', learner, measures, document, omitted, kind),
    acns: (learner: string, subject?: string) => invoke('guide:acns', learner, subject),
    /** The draft as a document: saved, printable, signable (FR-1516, P46). */
    acnsSave: (learner: string) => invoke('guide:acnsSave', learner),
    acnsRead: (learner: string) => invoke('guide:acnsRead', learner),
    acnsHtml: (learner: string) => invoke('guide:acnsHtml', learner),
    acnsPdf: (learner: string) => invoke('guide:acnsPdf', learner),
    acnsSignOff: (learner: string, role: string) =>
      invoke('guide:acnsSignOff', learner, role),
    ask: (jobId: string, question: string, history?: unknown[]) =>
      invoke('guide:ask', jobId, question, history),
    acs: (learner: string, evaluationRecorded: boolean, decided: string) =>
      invoke('guide:acs', learner, evaluationRecorded, decided),
  },
  /**
   * The conversation about one document (`026`).
   *
   * `learner` is `undefined` for a composition, which is the same pair `resolveDocument`
   * answers for — «which document?» is decided in one place, and this surface does not
   * get to have a second opinion.
   */
  conversation: {
    turn: (job: string, learner: string | undefined, text: string) =>
      invoke('conversation:turn', job, learner, text),
    list: (job: string, learner?: string) => invoke('conversation:list', job, learner),
    restore: (job: string, learner: string | undefined, revision: number) =>
      invoke('conversation:restore', job, learner, revision),
  },
  job: {
    /** `kind` is required and never defaulted (012 FR-1003). */
    create: (id: string, text: string, kind: string, lang?: string) =>
      invoke('job:create', id, text, kind, lang),
    verify: (id: string) => invoke('job:verify', id),
    /**
     * Compose from objectives (`002`, reachable since `016`).
     *
     * It writes the sheet and stops. Adapting it is `adapt` below, with the same
     * job id — one composition, N presentations, and a decision point in between
     * where she reads what nothing could check.
     */
    compose: (id: string, request: unknown) => invoke('job:compose', id, request),
    /**
     * Correcting composed material (`021` FR-1916). Its own channel, because it composes
     * again rather than adapting — see the note in `ipc/compose.ts`.
     */
    correctComposition: (id: string, corrections: string[]) =>
      invoke('job:correctComposition', id, corrections),
    composeDocs: (id: string) => invoke('job:composeDocs', id),
    /**
     * Ask her the level first? (`032` FR-3003.) Costs nothing and sends nothing.
     *
     * Never a gate: `ask: false` means say nothing, `ask: true` means offer. Composing
     * without answering is the same request it always was (FR-3006).
     */
    levelQuestion: (learnerCode: string, subject?: string) =>
      invoke('job:levelQuestion', learnerCode, subject),
    /** One learner or several — 005 FR-501. */
    adapt: (id: string, learners: string | string[]) => invoke('job:adapt', id, learners),
    /** Re-run with what she just corrected, on this worksheet, now. */
    revise: (id: string, learner: string, corrections: Array<{ text: string; scope: string }>) =>
      invoke('job:revise', id, learner, corrections),
    revisions: (id: string, learner: string) => invoke('job:revisions', id, learner),
    /**
     * No `signedOff` parameter, deliberately (007 FR-509).
     *
     * It used to take one, so the renderer could ask for an unmarked worksheet
     * with no sign-off having happened. The main process reads it from the
     * document instead — a signature is not something a caller gets to assert.
     */
    render: (id: string, learner: string) => invoke('job:render', id, learner),
    /**
     * The document, for the viewer (`021` FR-1905). Read-only and writes nothing.
     *
     * `learner` is still required: the resolver needs it to prefer an adaptation over
     * the composition when one exists.
     */
    documentHtml: (id: string, learner: string) => invoke('job:documentHtml', id, learner),
    /** The teacher's copy, as a page. Its own document, never the learner's. */
    answerKeyHtml: (id: string) => invoke('job:answerKeyHtml', id),
    pdf: (id: string, learner: string) => invoke('job:pdf', id, learner),
    /** The editable export she can fix by hand (019). */
    odt: (id: string, learner: string) => invoke('job:odt', id, learner),
    /** For listening, and for a transcriber (019 US2/US3). Neither is audio or braille. */
    audio: (id: string, learner: string) => invoke('job:audio', id, learner),
    brailleReady: (id: string, learner: string) => invoke('job:brailleReady', id, learner),
    /** Opens the adapted file in her own editor (T094). */
    openForEditing: (id: string, learner: string) => invoke('job:openForEditing', id, learner),
    /** The only way the draft mark comes off. */
    signOff: (id: string, learner: string, role: string) => invoke('job:signOff', id, learner, role),
    isSignedOff: (id: string, learner: string) => invoke('job:isSignedOff', id, learner),
    list: () => invoke('job:list'),
    reportData: (id: string, learner: string) => invoke('job:reportData', id, learner),
    learners: (id: string) => invoke('job:learners', id),
    /** Sheets made from a reading that has since changed (`005` FR-520). */
    staleSheets: (id: string) => invoke('job:staleSheets', id),
    /**
     * What the profile is not telling us yet, before she spends (`P15`).
     *
     * A read with no provider and no writes, so the screen can say «voy a aplicar
     * N adaptaciones, estos ejes están sin observar y por eso estas reglas no se
     * activan» *before* the run rather than in the report afterwards.
     */
    profileGap: (id: string, learner: string) => invoke('job:profileGap', id, learner),
    onProgress: (cb: (p: { stage: string; detail?: string }) => void) => {
      const h = (_e: unknown, p: { stage: string; detail?: string }) => cb(p);
      ipcRenderer.on('job:progress', h);
      return () => { ipcRenderer.off('job:progress', h); };
    },
  },
  /** Everything ever made for one learner (014). */
  record: {
    forLearner: (code: string) => invoke('record:forLearner', code),
    rebuild: (code: string) => invoke('record:rebuild', code),
    search: (q: unknown) => invoke('record:search', q),
  },
  memory: {
    capture: (payload: unknown) => invoke('memory:capture', payload),
    index: () => invoke('memory:index'),
    consolidate: () => invoke('memory:consolidate'),
    archive: (path: string) => invoke('memory:archive', path),
    house: () => invoke('memory:house'),
    /**
     * The draft, for review. Returns the claims as well as the prose, because
     * FR-305 says nothing leaves without her review and reviewing needs the
     * claims individually (004).
     */
    handoverDraft: (code: string, year: string, summary: string) =>
      invoke('memory:handoverDraft', code, year, summary),
    /** The reviewed packet. `keep` is what she left in; the rest is dropped. */
    handoverWrite: (code: string, year: string, summary: string, keep: string[]) =>
      invoke('memory:handoverWrite', code, year, summary, keep),
    forgetPlan: (code: string) => invoke('memory:forgetPlan', code),
    forget: (code: string) => invoke('memory:forget', code),
  },
  settings: {
    display: () => invoke('settings:display'),
    setDisplay: (p: unknown) => invoke('settings:setDisplay', p),
  },
  /**
   * Reading the material she actually has (008). `run` takes file **paths** the
   * main process opened through a dialog — never file contents from the
   * renderer, and never a path the renderer composed.
   */
  ingest: {
    accepted: () => invoke('ingest:accepted'),
    /** Opens the OS dialog and returns what she picked. The renderer never composes a path. */
    choose: () => invoke('ingest:choose'),
    run: (jobId: string, paths: string[], forLearner?: string) =>
      invoke('ingest:run', jobId, paths, forLearner),
    extraction: (jobId: string) => invoke('ingest:extraction', jobId),
    /** Extractions she started and has not finished confirming. */
    pending: () => invoke('ingest:pending'),
    claim: (jobId: string, learner: string) => invoke('ingest:claim', jobId, learner),
    confirmPage: (jobId: string, page: number) => invoke('ingest:confirmPage', jobId, page),
    unconfirmPage: (jobId: string, page: number) => invoke('ingest:unconfirmPage', jobId, page),
    budget: () => invoke('ingest:budget'),
    estimate: (pageCount: number) => invoke('ingest:estimate', pageCount),
    pageImage: (jobId: string, page: number) => invoke('ingest:pageImage', jobId, page),
    blocks: (jobId: string) => invoke('ingest:blocks', jobId),
    correctAndConfirm: (jobId: string, page: number,
                        corrections: Array<{ id: string; content: string }>) =>
      invoke('ingest:correctAndConfirm', jobId, page, corrections),
    photoWarningSeen: () => invoke('ingest:photoWarningSeen'),
    acknowledgePhotoWarning: () => invoke('ingest:acknowledgePhotoWarning'),
    onProgress: (cb: (p: { stage: string; detail?: string; page?: number; of?: number }) => void) => {
      const h = (_e: unknown, p: Parameters<typeof cb>[0]) => cb(p);
      ipcRenderer.on('ingest:progress', h);
      return () => { ipcRenderer.off('ingest:progress', h); };
    },
  },

  diagnostics: {
    /** Under `RAMPA_TEST` only: every request this process made. `null` otherwise. */
    network: () => invoke('diagnostics:network'),
    path: () => invoke('diagnostics:path'),
    reveal: () => invoke('diagnostics:reveal'),
    tail: (lines?: number) => invoke('diagnostics:tail', lines),
  },
  cost: {
    month: () => invoke('cost:month'),
    wouldBeUnusual: (cents: number) => invoke('cost:wouldBeUnusual', cents),
    estimate: (materialChars: number, sheets: number) =>
      invoke('cost:estimate', materialChars, sheets),
  },
};

contextBridge.exposeInMainWorld('rampa', api);
export type RampaApi = typeof api;
