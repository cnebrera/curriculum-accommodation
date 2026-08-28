import { defineConfig } from 'vitest/config';

// The core suite runs with no network and no key on purpose: Principle II says
// the deterministic layer never calls a model, and a suite that could reach one
// would not prove it.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/test/**/*.test.ts'],
    env: { ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', NO_NETWORK: '1' },
  },
});
