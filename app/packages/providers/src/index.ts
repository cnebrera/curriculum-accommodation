/**
 * @rampa/providers — the ONLY network-capable code in the application.
 *
 * Nothing in @rampa/core may import from here: Principle II is enforced by a
 * module-graph test, not by convention. The dependency runs one way, which is
 * why the catalogue (a deterministic parser) lives in core and the adapters
 * that read it live here.
 */
export * from './types.js';
export * from './send.js';
export * from './resilience.js';
export * from './releases.js';
export { anthropic } from './anthropic.js';
export { google } from './google.js';
export { compatibleProvider, type CompatibleSpec, type CompatibleQuirk } from './compatible.js';

import type { ServiceEntry } from '@rampa/core';
import { anthropic } from './anthropic.js';
import { google } from './google.js';
import { compatibleProvider } from './compatible.js';
import type { Provider } from './types.js';

/**
 * The adapters that exist, by name.
 *
 * A catalogue entry naming an adapter that is not in here is skipped — a
 * Markdown file cannot conjure a capability (009 data-model, "Validation and
 * repair"). `openai` is absent deliberately: OpenAI speaks the compatible
 * dialect, so its entry declares `adapter: openai` today and is served by
 * `compatible` below rather than by a fourth hand-written file.
 */
export const ADAPTER_IDS = ['google', 'anthropic', 'openai', 'compatible'] as const;
export type AdapterId = typeof ADAPTER_IDS[number];

/**
 * The `Provider` for a catalogue entry (009 T027).
 *
 * Resolved by the entry's `adapter` field and never by its `id`: resolving by id
 * would mean every new service needs a case added here, which is the code change
 * the catalogue format exists to remove.
 */
export function providerFor(
  entry: ServiceEntry,
  catalogue: readonly ServiceEntry[] = [],
): Provider | undefined {
  if (entry.adapter === 'anthropic') return anthropic;
  if (entry.adapter === 'google') return google;

  // `openai` and `compatible` are the same dialect. The endpoint is the only
  // difference, and for `openai` it is fixed rather than declared, because an
  // entry may not carry an endpoint for a non-compatible adapter.
  const endpoint = entry.adapter === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : entry.endpoint;
  if (!endpoint) return undefined;

  return compatibleProvider({
    id: entry.id,
    label: entry.label,
    endpoint,
    model: entry.model,
    keyUrl: entry.keyUrl,
    requiresPaymentCard: entry.requiresCard,
    keyPrefix: entry.keyPrefix,
    vision: entry.vision,
    quirks: entry.quirks,
    // So a wrong-service paste can name the service it belongs to (FR-722).
    otherServices: catalogue
      .filter((s) => s.id !== entry.id && s.keyPrefix)
      .map((s) => ({ prefix: s.keyPrefix!, label: s.label })),
  });
}

/**
 * The three hand-written providers, for `006`'s onboarding.
 *
 * Kept because the connection step and the key store still reference it while
 * `009` lands. New services arrive through the catalogue, not through here.
 */
export const PROVIDERS: Provider[] = [google, anthropic];
export const providerById = (id: string): Provider | undefined => PROVIDERS.find((p) => p.id === id);
