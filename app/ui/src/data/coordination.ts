import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * The coordination packet, from the renderer's side (`030` T009/T011).
 *
 * Components never call `window.rampa` — `ui/test/data-layer.test.ts` asserts it. Worth
 * restating here: this is the one feature whose input arrives from **another machine**,
 * and a screen that reached past this layer would be a screen composing its own call
 * with data a stranger wrote.
 */

export type PacketItem =
  | { of: 'note'; date: string; heading: string; text: string }
  | { of: 'material'; date: string; title: string; signed: boolean }
  | { of: 'profile-delta'; date: string; text: string };

export interface ExportDraft {
  period: { from: string; to: string };
  items: PacketItem[];
  /** Probable names, for her to look at beside the items. Flags, never a gate. */
  flags: string[];
  /** Set when the name gate refused: then nothing can be written. */
  refusal: string | null;
  preview: string | null;
}

export function useExportDraft() {
  return useCommand((code: string, from: string, to: string, role: string) =>
    window.rampa.coordination.exportDraft(code, from, to, role) as Promise<ExportDraft>);
}

export function useExportWrite() {
  return useCommand((code: string, from: string, to: string, role: string, keep: number[]) =>
    window.rampa.coordination.exportWrite(code, from, to, role, keep) as
      Promise<{ path: string; dropped: number }>);
}

export interface OpenedPacket {
  filename: string;
  raw: string;
  refusal: string | null;
  packet: {
    kind: string; code: string; role: string; academicYear: string;
    period: { from: string; to: string }; createdAt: string; items: PacketItem[];
    unknown?: Record<string, unknown>;
  } | null;
  flags: Array<{ at: number; quote: string; message: string }>;
  stale: boolean;
  /** Whether **she** has this code. No match is attempted (FR-2807). */
  known: boolean;
}

export function useOpenPacket() {
  return useCommand(() => window.rampa.coordination.open() as Promise<OpenedPacket | null>);
}

export function useHoldPacket() {
  return useCommand((raw: string, filename: string) =>
    window.rampa.coordination.hold(raw, filename) as Promise<{ path: string }>);
}

export function useLinkPacket() {
  return useCommand((path: string, code: string) =>
    window.rampa.coordination.link(path, code) as Promise<{ ok: boolean }>);
}

/** The only writer, one item at a time. */
export function useAcceptItem() {
  return useCommand((code: string, role: string, filename: string, item: PacketItem) =>
    window.rampa.coordination.accept(code, role, filename, item) as
      Promise<{ ok: boolean; wrote: string }>);
}

/** Changing the profile is a second decision, taken separately from accepting. */
export function useApplyDelta() {
  return useCommand((code: string, axis: string, level: number) =>
    window.rampa.coordination.applyDelta(code, axis, level) as Promise<{ ok: boolean }>);
}

export interface PacketList {
  sent: string[];
  held: Array<{ file: string; linked: string | null }>;
}

export function usePackets(code?: string): Loadable<PacketList> {
  return useAsync(
    () => window.rampa.coordination.list(code) as Promise<PacketList>, [code]);
}
