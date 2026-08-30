import { defineConfig } from 'vitest/config';

// The core suite runs with no network and no key on purpose: Principle II says
// the deterministic layer never calls a model, and a suite that could reach one
// would not prove it.
export default defineConfig({
  test: {
    environment: 'node',
    // `ui/test` renders components to a string with react-dom/server. No
    // browser, no DOM: enough to assert what the markup says, which is where
    // the draft mark's guarantee lives.
    /*
     * `ui/test/**\/*.test.tsx` only. Both existing UI tests render, so `.tsx`
     * looked like the whole story — and a `.test.ts` added under `ui/test/`
     * was collected by nothing, reported by nothing, and passed by being
     * absent. Found by writing one. Not every UI test renders: a test about
     * the shape of the source tree is plain TypeScript.
     */
    include: ['packages/**/test/**/*.test.ts', 'ui/test/**/*.test.{ts,tsx}'],
    env: { ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', NO_NETWORK: '1' },
  },
});
