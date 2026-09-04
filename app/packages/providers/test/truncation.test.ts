import { describe, it, expect, vi, afterEach } from 'vitest';
import { anthropic } from '../src/anthropic.js';
import { google } from '../src/google.js';
import { compatibleProvider } from '../src/compatible.js';
import type { Chunk } from '../src/types.js';

/**
 * The ceiling was hit, and now something says so (review AGE-07).
 *
 * ## The defect
 *
 * All three adapters set a token ceiling — `compose.ts` forces 1.500 for exercises
 * and 4.000 for a study text — and **not one of them read `stop_reason`**. So a text
 * stopped in the middle of the third of four paragraphs arrived looking exactly like
 * a text that finished, and `composeContent` parsed it.
 *
 * That matters most for the `study` kind, whose own failure mode `material-kinds.md`
 * names as «enseñar menos sin que se note». A truncation is that failure, produced by
 * us, and the checks downstream cannot see it: a cut inside an objective leaves blocks
 * that still carry a valid `data-objective` and a valid `data-anchor`, so both
 * `checkObjectives` and `checkAnchored` pass.
 *
 * ## Why it is tested per adapter and not once
 *
 * Because each service spells it differently — `stop_reason: "max_tokens"`, a
 * `finish_reason: "length"` inside `choices`, a `finishReason: "MAX_TOKENS"` on a
 * candidate — and a single shared test would prove only that the one adapter it
 * exercised reads its own field. The negative case is asserted every time too: a
 * complete answer that reported `truncated` would refuse work she is owed.
 */
const collect = async (s: AsyncIterable<Chunk>): Promise<Chunk[]> => {
  const out: Chunk[] = [];
  for await (const c of s) out.push(c);
  return out;
};

const sse = (frames: string[]) => new Response(
  new Blob([frames.map((f) => `data: ${f}\n\n`).join('') + 'data: [DONE]\n\n']).stream(),
  { status: 200 },
);

const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'content-type': 'application/json' },
});

const stubFetch = (make: () => Response) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(make())));

afterEach(() => vi.unstubAllGlobals());

const REQ = { system: 'sys', messages: [{ role: 'user' as const, content: 'hola' }], maxTokens: 10 };
const cut = (chunks: Chunk[]) => chunks.some((c) => c.truncated);
const said = (chunks: Chunk[]) => chunks.filter((c) => c.text).map((c) => c.text).join('');

describe('Claude (Anthropic) says when it stopped at the ceiling', () => {
  const FRAMES = (stop: string | null) => [
    '{"type":"message_start","message":{"usage":{"input_tokens":12}}}',
    '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Las plantas fabrican"}}',
    `{"type":"message_delta","delta":${stop === null ? '{}' : `{"stop_reason":"${stop}"}`},"usage":{"output_tokens":10}}`,
  ];

  it('reports the cut', async () => {
    stubFetch(() => sse(FRAMES('max_tokens')));
    const chunks = await collect(anthropic.send(REQ, 'sk-ant-x'));
    expect(cut(chunks), 'a truncated answer arrived looking complete').toBe(true);
    // And the text still comes through: the caller decides what to do about it,
    // which is the difference between reporting a cut and swallowing an answer.
    expect(said(chunks)).toBe('Las plantas fabrican');
  });

  it('says nothing when it finished its turn', async () => {
    stubFetch(() => sse(FRAMES('end_turn')));
    expect(cut(await collect(anthropic.send(REQ, 'sk-ant-x')))).toBe(false);
  });

  it('says nothing when there is no stop reason at all', async () => {
    stubFetch(() => sse(FRAMES(null)));
    expect(cut(await collect(anthropic.send(REQ, 'sk-ant-x')))).toBe(false);
  });
});

describe('an OpenAI-compatible service says when it stopped at the ceiling', () => {
  const spec = compatibleProvider({
    id: 'test', label: 'Servicio de prueba', endpoint: 'https://example.test/v1/chat/completions',
    model: 'm', keyUrl: 'https://example.test/keys', requiresPaymentCard: false,
    keyPrefixes: ['tk_'], vision: true, quirks: [],
  });
  const FRAMES = (reason: string) => [
    '{"choices":[{"delta":{"content":"Las plantas fabrican"}}]}',
    `{"choices":[{"delta":{},"finish_reason":"${reason}"}]}`,
    '{"usage":{"prompt_tokens":12,"completion_tokens":10}}',
  ];

  it('reports the cut', async () => {
    stubFetch(() => sse(FRAMES('length')));
    const chunks = await collect(spec.send(REQ, 'tk_x'));
    expect(cut(chunks), 'a truncated answer arrived looking complete').toBe(true);
    expect(said(chunks)).toBe('Las plantas fabrican');
  });

  it('says nothing on a normal stop', async () => {
    stubFetch(() => sse(FRAMES('stop')));
    expect(cut(await collect(spec.send(REQ, 'tk_x')))).toBe(false);
  });
});

describe('Gemini (Google) says when it stopped at the ceiling', () => {
  const BODY = (reason: string) => ({
    candidates: [{ content: { parts: [{ text: 'Las plantas fabrican' }] }, finishReason: reason }],
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 10 },
  });

  it('reports the cut', async () => {
    stubFetch(() => json(BODY('MAX_TOKENS')));
    const chunks = await collect(google.send(REQ, 'AIza-x'));
    expect(cut(chunks), 'a truncated answer arrived looking complete').toBe(true);
    expect(said(chunks)).toBe('Las plantas fabrican');
  });

  it('says nothing on a normal stop', async () => {
    stubFetch(() => json(BODY('STOP')));
    expect(cut(await collect(google.send(REQ, 'AIza-x')))).toBe(false);
  });
});
