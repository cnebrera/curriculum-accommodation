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
    render: (id: string, learner: string, signedOff?: boolean) => invoke('job:render', id, learner, signedOff),
    pdf: (id: string, learner: string, signedOff?: boolean) => invoke('job:pdf', id, learner, signedOff),
    /** The only way the draft mark comes off. */
    signOff: (id: string, role: string) => invoke('job:signOff', id, role),
    isSignedOff: (id: string) => invoke('job:isSignedOff', id),
    list: () => invoke('job:list'),
    onProgress: (cb: (p: { stage: string; detail?: string }) => void) => {
      const h = (_e: unknown, p: { stage: string; detail?: string }) => cb(p);
      ipcRenderer.on('job:progress', h);
      return () => { ipcRenderer.off('job:progress', h); };
    },
  },
  memory: {
    capture: (payload: unknown) => invoke('memory:capture', payload),
    index: () => invoke('memory:index'),
    house: () => invoke('memory:house'),
    handover: (code: string, year: string, summary: string, shareable: boolean) =>
      invoke('memory:handover', code, year, summary, shareable),
    forgetPlan: (code: string) => invoke('memory:forgetPlan', code),
    forget: (code: string) => invoke('memory:forget', code),
  },
  cost: {
    month: () => invoke('cost:month'),
    wouldBeUnusual: (cents: number) => invoke('cost:wouldBeUnusual', cents),
  },
};

contextBridge.exposeInMainWorld('rampa', api);
export type RampaApi = typeof api;
