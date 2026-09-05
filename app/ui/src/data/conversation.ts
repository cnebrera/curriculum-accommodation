import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * The conversation, from the renderer (026 T015).
 *
 * No component calls `window.rampa` — `ui/test/data-layer.test.ts` holds that rule, and
 * the reason is the one `013` found the hard way: a component that calls IPC directly is
 * a component with no loading state, no error state and no Spanish for either.
 */

export type TurnOutcome =
  | { kind: 'revision'; revision: number }
  | { kind: 'refusal'; because: string }
  | { kind: 'no-change' };

export interface Turn {
  at: string;
  text: string;
  outcome: TurnOutcome;
  /** What changed, derived from the two revisions — never the model's account. */
  changed: string[];
  costCents: number | null;
}

export interface Revision {
  n: number;
  path: string;
  signed: boolean;
  current: boolean;
}

export interface ConversationState {
  turns: Turn[];
  revisions: Revision[];
  /** True while a turn is running, so a second send is not offered. */
  running: boolean;
}

export interface TurnResult {
  outcome: TurnOutcome;
  changed: string[];
  notices: Array<{ block: string | null; notice: { kind: string; quote: string; message: string } }>;
  costCents: number | null;
}

/** The turns and the revisions. Read-only and deterministic: safe on every render. */
export function useConversation(job: string, learner?: string): Loadable<ConversationState> {
  return useAsync(
    () => window.rampa.conversation.list(job, learner) as Promise<ConversationState>,
    [job, learner ?? '']);
}

export function useTurn() {
  return useCommand((job: string, learner: string | undefined, text: string) =>
    window.rampa.conversation.turn(job, learner, text) as Promise<TurnResult>);
}

export function useRestoreRevision() {
  return useCommand((job: string, learner: string | undefined, revision: number) =>
    window.rampa.conversation.restore(job, learner, revision) as Promise<{ nowCurrent: number }>);
}
