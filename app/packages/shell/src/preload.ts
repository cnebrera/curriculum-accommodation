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
  },
  providers: {
    list: () => invoke('providers:list'),
    validate: (id: string, key: string) => invoke('providers:validate', id, key),
    save: (id: string, key: string) => invoke('providers:save', id, key),
    current: () => invoke('providers:current'),
  },
  corpus: {
    version: () => invoke('corpus:version'),
    recipes: () => invoke('corpus:recipes'),
    licences: () => invoke('corpus:licences'),
    /** The judgement layer, read from the bundle. Never editable from the UI. */
    instruction: (name: string) => invoke('corpus:instruction', name),
    checklist: (name: string) => invoke('corpus:checklist', name),
    /** Axis descriptors, so the interface never shows an axis code (T014). */
    axes: () => invoke('corpus:axes'),
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
  job: {
    create: (id: string, text: string, lang?: string) => invoke('job:create', id, text, lang),
    verify: (id: string) => invoke('job:verify', id),
    adapt: (id: string, learner: string) => invoke('job:adapt', id, learner),
    /** Re-run with what she just corrected, on this worksheet, now. */
    revise: (id: string, learner: string, corrections: Array<{ text: string; scope: string }>) =>
      invoke('job:revise', id, learner, corrections),
    revisions: (id: string, learner: string) => invoke('job:revisions', id, learner),
    render: (id: string, learner: string, signedOff?: boolean) => invoke('job:render', id, learner, signedOff),
    pdf: (id: string, learner: string, signedOff?: boolean) => invoke('job:pdf', id, learner, signedOff),
    /** Opens the adapted file in her own editor (T094). */
    openForEditing: (id: string, learner: string) => invoke('job:openForEditing', id, learner),
    /** The only way the draft mark comes off. */
    signOff: (id: string, learner: string, role: string) => invoke('job:signOff', id, learner, role),
    isSignedOff: (id: string, learner: string) => invoke('job:isSignedOff', id, learner),
    list: () => invoke('job:list'),
    reportData: (id: string, learner: string) => invoke('job:reportData', id, learner),
    learners: (id: string) => invoke('job:learners', id),
    onProgress: (cb: (p: { stage: string; detail?: string }) => void) => {
      const h = (_e: unknown, p: { stage: string; detail?: string }) => cb(p);
      ipcRenderer.on('job:progress', h);
      return () => { ipcRenderer.off('job:progress', h); };
    },
  },
  memory: {
    capture: (payload: unknown) => invoke('memory:capture', payload),
    index: () => invoke('memory:index'),
    consolidate: () => invoke('memory:consolidate'),
    archive: (path: string) => invoke('memory:archive', path),
    house: () => invoke('memory:house'),
    handover: (code: string, year: string, summary: string, shareable: boolean) =>
      invoke('memory:handover', code, year, summary, shareable),
    forgetPlan: (code: string) => invoke('memory:forgetPlan', code),
    forget: (code: string) => invoke('memory:forget', code),
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
