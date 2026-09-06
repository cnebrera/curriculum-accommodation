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
export * from './corpus-feed.js';
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
/**
 * The same provider, speaking to the model the corpus names.
 *
 * A copy rather than a mutation: the adapters are module-level singletons, and
 * writing `entry.model` into one would make the model a property of whoever built a
 * provider last. `send()` reads `this.defaultModel`, and `this` is the copy.
 *
 * The adapter keeps its own constant as the fallback for a catalogue entry that
 * declares no model — one exists so a service can be added before anyone has decided
 * which of its models to use.
 */
const withModel = (p: Provider, model?: string): Provider =>
  model ? { ...p, defaultModel: model } : p;

export function providerFor(
  entry: ServiceEntry,
  catalogue: readonly ServiceEntry[] = [],
): Provider | undefined {
  // The corpus decides the model, for the hand-written adapters too (Principle I).
  //
  // These two returned their own constants and dropped `entry.model` on the floor,
  // which is how `gemini-2.0-flash` was still being called months after Google shut
  // it down: the corpus said `gemini-2.5-flash`, was dated, and was read by nobody.
  // The teacher saw a 404 on the free-tier path the README recommends for a first run.
  if (entry.adapter === 'anthropic') return withModel(anthropic, entry.model);
  if (entry.adapter === 'google') return withModel(google, entry.model);

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
    keyPrefixes: entry.keyPrefixes,
    vision: entry.vision,
    quirks: entry.quirks,
    // So a wrong-service paste can name the service it belongs to (FR-722).
    otherServices: catalogue
      .filter((s) => s.id !== entry.id)
      .flatMap((s) => s.keyPrefixes.map((prefix) => ({ prefix, label: s.label }))),
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
