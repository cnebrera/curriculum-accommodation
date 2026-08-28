/**
 * @rampa/providers — the ONLY network-capable code in the application.
 *
 * Nothing here may be imported from @rampa/core: Principle II is enforced by a
 * module-graph test, not by convention.
 */
export * from './types.js';
export * from './send.js';
export { anthropic } from './anthropic.js';
export { google } from './google.js';

import { anthropic } from './anthropic.js';
import { google } from './google.js';
import type { Provider } from './types.js';

/** Onboarding reads this list, so a changed free tier is an update, not a release. */
export const PROVIDERS: Provider[] = [google, anthropic];
export const providerById = (id: string): Provider | undefined => PROVIDERS.find((p) => p.id === id);
