/**
 * The catalogue as the renderer sees it (009 T014).
 *
 * A narrower shape than `ServiceEntry`: no `model`, no `endpoint`, no `adapter`,
 * no `quirks`. FR-702 says she never sees a model name, and the endpoint has no
 * reason to cross the IPC boundary at all — a field that cannot reach the
 * renderer cannot be rendered into a screen by mistake.
 */
export interface Service {
  id: string;
  label: string;
  vendor: string;
  requiresCard: boolean;
  freeTier?: string;
  vision: boolean;
  keyUrl: string;
  keyPrefix?: string;
  costCents: number;
  costMeasured: boolean;
  processedIn: string;
  jurisdiction: 'eu' | 'us' | 'other' | 'varies';
  trainsOnInput: 'no' | 'yes' | 'opt-out' | 'unclear';
  quality: number | 'unmeasured';
  provisionalRank: number;
  suits: string;
  signupFirst?: string;
  lastChecked: string;
  freshness: 'fresh' | 'ageing' | 'stale';
  monthsSinceChecked: number;
  intro: string;
  steps: string[];
  troubleshooting: string[];
}

export const loadServices = (): Promise<Service[]> =>
  window.rampa.corpus.services() as Promise<Service[]>;

/** dd/mm/yyyy, because that is how she writes a date. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
