import { describe, it, expect } from 'vitest';
import { withoutSecrets, watchNetwork, networkLog, resetNetworkLog } from '../src/net-counter.js';

/**
 * The network log names where a request went, never what authorised it (backlog G66).
 *
 * Google's API carries the key in the query string, so `diagnostics:network` held a live
 * credential in clear — in the one channel built to be read out and pasted into a report.
 * Found the stupidest way there is: a test script printed the log and a real key landed in
 * a transcript.
 *
 * `009` FR-729 already forbids this on the other side, and says why: a screen that
 * receives a credential in order to draw four asterisks is a screen that has the
 * credential. Same rule, different reader.
 */
describe('the request log carries no credential', () => {
  it('drops every query value, not a list of the ones we thought of', () => {
    // The exact shape that leaked.
    expect(withoutSecrets(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash'
      + ':generateContent?key=AQ.Ab8RN6KxrPlV9Hw16H1FoDg4xhqMYBMHAZ',
    )).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash'
      + ':generateContent?key=%E2%80%A6');

    /*
     * A parameter nobody listed. The point of dropping values rather than named keys is
     * that a provider added tomorrow may call it something else, and a redaction list is
     * a list that will be wrong exactly once.
     */
    for (const param of ['api_key', 'access_token', 'sig', 'token', 'auth']) {
      const out = withoutSecrets(`https://example.test/v1/x?${param}=sk-live-abcdef123456`);
      expect(out, `${param} survived`).not.toContain('sk-live-abcdef123456');
    }
  });

  it('keeps what the count is for: where it went', () => {
    const out = withoutSecrets('https://api.anthropic.com/v1/messages?beta=true');
    expect(out).toContain('api.anthropic.com');
    expect(out).toContain('/v1/messages');
  });

  it('leaves a URL with no query exactly as it was', () => {
    const plain = 'https://api.anthropic.com/v1/messages';
    expect(withoutSecrets(plain)).toBe(plain);
  });

  it('does not throw on something that is not a URL', () => {
    expect(withoutSecrets('not a url at all')).toBe('not a url at all');
    expect(withoutSecrets('garbage?key=secret-value')).not.toContain('secret-value');
  });

  it('is applied by the log itself, not only available to be applied', async () => {
    /*
     * The half that matters. `withoutSecrets` being correct and `networkLog` not calling
     * it is this repository's most repeated defect — a function exported and never
     * reached — so the assertion drives the real counter.
     */
    resetNetworkLog();
    const original = globalThis.fetch;
    try {
      watchNetwork({ webRequest: { onBeforeRequest: () => {} } });
      globalThis.fetch = (() => Promise.resolve(new Response('ok'))) as typeof fetch;
      // Re-wrap so the counter sits over the stub, then make one call through it.
      watchNetwork({ webRequest: { onBeforeRequest: () => {} } });
      await globalThis.fetch('https://example.test/v1/go?key=super-secret-value');

      const log = networkLog();
      expect(log.count).toBeGreaterThan(0);
      expect(log.urls.join('\n')).not.toContain('super-secret-value');
      expect(log.urls.join('\n')).toContain('example.test');
    } finally {
      globalThis.fetch = original;
      resetNetworkLog();
    }
  });
});
