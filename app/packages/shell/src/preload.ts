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
    /** Her choice, recorded once and used for every learner. */
    chooseWord: (args: { word: string; id: string; language?: string }) =>
      invoke('pictograms:chooseWord', args),
    unchooseWord: (args: { word: string; language?: string }) =>
      invoke('pictograms:unchooseWord', args),
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
    /** The measures **she confirmed**, which may be fewer than the ones read. */
    apply: (learner: string, measures: unknown[], document: string, omitted?: string[]) =>
      invoke('guide:apply', learner, measures, document, omitted),
    acns: (learner: string) => invoke('guide:acns', learner),
    ask: (jobId: string, question: string, history?: unknown[]) =>
      invoke('guide:ask', jobId, question, history),
    acs: (learner: string, evaluationRecorded: boolean, decided: string) =>
      invoke('guide:acs', learner, evaluationRecorded, decided),
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
    run: (jobId: string, paths: string[]) => invoke('ingest:run', jobId, paths),
    extraction: (jobId: string) => invoke('ingest:extraction', jobId),
    /** Extractions she started and has not finished confirming. */
    pending: () => invoke('ingest:pending'),
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
    path: () => invoke('diagnostics:path'),
    reveal: () => invoke('diagnostics:reveal'),
    tail: (lines?: number) => invoke('diagnostics:tail', lines),
  },
  cost: {
    month: () => invoke('cost:month'),
    wouldBeUnusual: (cents: number) => invoke('cost:wouldBeUnusual', cents),
    estimate: (promptChars: number) => invoke('cost:estimate', promptChars),
  },
};

contextBridge.exposeInMainWorld('rampa', api);
export type RampaApi = typeof api;
