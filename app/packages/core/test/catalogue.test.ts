import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  parseServiceEntry, loadCatalogue, freshness, ageInDays, monthsSince,
  type ServiceEntry,
} from '../src/providers/catalogue.js';

/**
 * The catalogue (009 T008, quickstart §1).
 *
 * These tests read the **shipped** entries in `instructions/providers/`, not
 * fixtures, so a fact edited into a real entry is a fact this suite re-checks.
 * The alternative — testing the parser against invented markdown — would pass
 * forever while the six files a teacher actually sees drifted out of contract.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const dir = join(repoRoot, 'instructions', 'providers');

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((f) => ({ path: `instructions/providers/${f}`, raw: readFileSync(join(dir, f), 'utf8') }));

const ALL_ADAPTERS = ['google', 'anthropic', 'openai', 'compatible'] as const;
/** The date the entries were checked. Fixed, so this suite reads the same in January. */
const TODAY = new Date('2026-09-15T00:00:00Z');

describe('the shipped catalogue', () => {
  const catalogue = loadCatalogue(files, { available: ALL_ADAPTERS, today: TODAY });

  it('parses every entry that ships', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    // Not "most of them parse": an entry that silently fails to parse is a
    // service that silently disappears from the screen.
    expect(catalogue).toHaveLength(files.length);
  });

  it('offers the six services the spec names', () => {
    expect(catalogue.map((s) => s.id).sort())
      .toEqual(['anthropic', 'deepseek', 'google', 'groq', 'mistral', 'openai']);
  });

  it('gives every entry the facts the screen cannot be honest without', () => {
    for (const s of catalogue) {
      expect(s.label, `${s.id} label`).toBeTruthy();
      expect(s.keyUrl, `${s.id} key_url`).toMatch(/^https:\/\//);
      expect(s.suits.length, `${s.id} suits`).toBeGreaterThan(10);
      expect(s.processedIn, `${s.id} processed_in`).not.toBe('no consta');
      expect(s.lastChecked, `${s.id} last_checked`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.model, `${s.id} model`).toBeTruthy();
    }
  });

  it('walks her to the key in at most six steps, each an action', () => {
    for (const s of catalogue) {
      expect(s.steps.length, `${s.id} has no steps`).toBeGreaterThan(2);
      // Contract §5: more than about six steps is a fact about the service
      // worth knowing before adding it.
      expect(s.steps.length, `${s.id} has ${s.steps.length} steps`).toBeLessThanOrEqual(6);
      expect(s.troubleshooting.length, `${s.id} has no "no encuentro eso"`).toBeGreaterThan(1);
      expect(s.intro.length, `${s.id} has no intro`).toBeGreaterThan(20);
    }
  });

  it('never puts a model name, a token count or a context size where she can see it', () => {
    // FR-702. `model` is a field she never sees; everything else in the entry is
    // read aloud on screen, so the jargon check runs over exactly that text.
    const jargon = /\b(token|tokens|gpt-|claude-[a-z]|gemini-\d|llama-|mistral-large-|deepseek-chat|contexto de \d|tok\/s|endpoint|prompt|API key de \d)\b/i;
    for (const s of catalogue) {
      const visible = [s.label, s.vendor, s.suits, s.freeTier ?? '', s.signupFirst ?? '',
                       s.intro, ...s.steps, ...s.troubleshooting].join('\n');
      const hit = jargon.exec(visible);
      expect(hit?.[0], `${s.id} shows "${hit?.[0]}" to a teacher`).toBeUndefined();
    }
  });

  it('never ships a loopback endpoint, whatever the parser tolerates', () => {
    // The parser allows http to 127.0.0.1 so the degradation suite can point a
    // real adapter at a real server. Nothing shipped may use that.
    for (const s of catalogue) {
      if (s.endpoint) expect(s.endpoint, `${s.id}`).toMatch(/^https:\/\//);
    }
  });

  it('declares an endpoint only where an endpoint can be honoured', () => {
    for (const s of catalogue) {
      if (s.adapter === 'compatible') {
        expect(s.endpoint, `${s.id} is compatible and needs an endpoint`).toMatch(/^https:\/\//);
      } else {
        expect(s.endpoint, `${s.id} is ${s.adapter} and must not carry an endpoint`).toBeUndefined();
      }
    }
  });

  it('marks every cost as an estimate, because none has been measured yet', () => {
    // `cases/002-model-floor` is the only thing that may set this true. Until it
    // runs, a figure presented as measured would be a fabrication.
    for (const s of catalogue) expect(s.costMeasured, `${s.id}`).toBe(false);
  });

  it('says what will block her before step one, wherever something does', () => {
    // FR-716. Every service in this catalogue needs an account at minimum.
    for (const s of catalogue) {
      expect(s.signupFirst, `${s.id} has no signup_first`).toBeTruthy();
    }
    // And a service requiring a card must say so in that sentence, not only in
    // the boolean — she reads the sentence.
    for (const s of catalogue.filter((x) => x.requiresCard)) {
      expect(s.signupFirst, `${s.id} requires a card and does not say so`).toMatch(/tarjeta|saldo/i);
    }
  });

  it('leads the OpenAI entry with the ChatGPT-Plus warning', () => {
    // T013 names this specifically because it is the single most common way a
    // teacher loses money on this screen: paying twice, or believing she has.
    const openai = catalogue.find((s) => s.id === 'openai')!;
    // Whitespace collapsed, because the source wraps at 78 columns and a
    // renderer reflows it — a test that reads the line breaks tests the editor.
    const intro = openai.intro.replace(/\s+/g, ' ');
    expect(intro.slice(0, 200)).toMatch(/ChatGPT Plus/);
    expect(intro).toMatch(/no sirve/i);
  });

  it('states the free-tier limit plainly wherever there is a free tier', () => {
    for (const s of catalogue.filter((x) => !x.requiresCard)) {
      expect(s.freeTier, `${s.id} is free and does not say what the limit is`).toBeTruthy();
      // Not a token count. A limit she cannot picture is not a limit she can plan around.
      expect(s.freeTier).not.toMatch(/\d{4,}|token/i);
    }
  });
});

describe('the catalogue repairs rather than rejects', () => {
  const base = readFileSync(join(dir, 'groq.md'), 'utf8');
  const without = (field: string) =>
    base.split('\n').filter((l) => !l.startsWith(`${field}:`)).join('\n');

  it('skips an entry with no id, and does not throw', () => {
    expect(parseServiceEntry(without('id'), 'x.md')).toBeNull();
  });

  it('skips an entry with no key_url — we cannot send her anywhere', () => {
    expect(parseServiceEntry(without('key_url'), 'x.md')).toBeNull();
  });

  it('skips an entry with no last_checked — we cannot date the claim', () => {
    expect(parseServiceEntry(without('last_checked'), 'x.md')).toBeNull();
  });

  it('preserves unknown fields, so a newer catalogue runs on an older build', () => {
    const withNew = base.replace('last_checked:', 'audio_output: true\nlast_checked:');
    const entry = parseServiceEntry(withNew, 'x.md')!;
    expect(entry).not.toBeNull();
    expect(entry.unknown['audio_output']).toBe(true);
  });

  it('ignores an endpoint on a non-compatible adapter', () => {
    // The one field that could redirect a teacher's material somewhere else.
    const hijack = readFileSync(join(dir, 'anthropic.md'), 'utf8')
      .replace('model:', 'endpoint: https://evil.example/v1\nmodel:');
    const entry = parseServiceEntry(hijack, 'x.md')!;
    expect(entry.adapter).toBe('anthropic');
    expect(entry.endpoint).toBeUndefined();
  });

  it('skips a compatible entry with no endpoint rather than sending nowhere', () => {
    expect(parseServiceEntry(without('endpoint'), 'x.md')).toBeNull();
  });

  it('skips an entry whose adapter nothing implements', () => {
    const c = loadCatalogue(files, { available: ['google'], today: TODAY });
    expect(c.map((s) => s.id)).toEqual(['google']);
  });

  it('reads an unreadable jurisdiction as the value that can never be recommended', () => {
    const odd = base.replace('jurisdiction: us', 'jurisdiction: martian');
    expect(parseServiceEntry(odd, 'x.md')!.jurisdiction).toBe('other');
  });

  it('reads a date whether YAML quoted it or not', () => {
    // Unquoted, YAML hands back a Date; quoted, a string. Both ship in the wild,
    // and a parser that took only one would silently drop half the catalogue.
    const quoted = base.replace('last_checked: 2026-08-28', 'last_checked: "2026-08-28"');
    expect(parseServiceEntry(quoted, 'x.md')!.lastChecked).toBe('2026-08-28');
    expect(parseServiceEntry(base, 'x.md')!.lastChecked).toBe('2026-08-28');
  });

  it('drops a duplicate id rather than offering the same service twice', () => {
    const c = loadCatalogue([...files, files[0]!], { available: ALL_ADAPTERS, today: TODAY });
    expect(c).toHaveLength(files.length);
  });

  it('degrades a file that is not an entry at all', () => {
    expect(parseServiceEntry('nada de nada', 'x.md')).toBeNull();
    expect(parseServiceEntry('', 'x.md')).toBeNull();
    expect(parseServiceEntry('---\nid: x\n---\n', 'x.md')).toBeNull();
  });
});

describe('staleness', () => {
  const checked = '2026-01-01';
  const on = (iso: string) => freshness(checked, new Date(`${iso}T00:00:00Z`));

  it('shows a fact normally for its first 180 days', () => {
    expect(on('2026-01-01')).toBe('fresh');
    expect(on('2026-06-30')).toBe('fresh');   // 180
  });

  it('marks it between 181 and 365 days', () => {
    expect(on('2026-07-01')).toBe('ageing');  // 181
    expect(on('2027-01-01')).toBe('ageing');  // 365
  });

  it('stops offering the service past a year', () => {
    expect(on('2027-01-02')).toBe('stale');   // 366
    expect(on('2030-01-01')).toBe('stale');
  });

  it('treats an unparseable date as stale, never as fresh', () => {
    // Failing open here would offer a service whose facts have no date at all.
    expect(freshness('not-a-date', new Date('2026-01-01T00:00:00Z'))).toBe('stale');
    expect(ageInDays('nope', new Date('2026-01-01T00:00:00Z'))).toBe(Number.POSITIVE_INFINITY);
  });

  it('takes today as a parameter, so the result never depends on when it runs', () => {
    expect(ageInDays('2026-01-01', new Date('2026-03-02T23:59:00Z'))).toBe(60);
    expect(monthsSince('2026-01-01', new Date('2026-07-01T00:00:00Z'))).toBe(6);
  });

  it('drops a stale entry from the catalogue entirely', () => {
    const c = loadCatalogue(files, { available: ALL_ADAPTERS, today: new Date('2028-01-01T00:00:00Z') });
    expect(c).toEqual([]);
  });
});

describe('display order is stable', () => {
  it('puts better-ranked services first and does not reshuffle', () => {
    const a = loadCatalogue(files, { available: ALL_ADAPTERS, today: TODAY }).map((s: ServiceEntry) => s.id);
    const b = loadCatalogue([...files].reverse(), { available: ALL_ADAPTERS, today: TODAY }).map((s) => s.id);
    expect(a).toEqual(b);
    // Anthropic carries provisional_rank 1, so it leads until quality is measured.
    expect(a[0]).toBe('anthropic');
  });
});

describe('the endpoint rule', () => {
  const withEndpoint = (url: string) =>
    readFileSync(join(dir, 'groq.md'), 'utf8')
      .replace(/^endpoint:.*$/m, `endpoint: ${url}`);

  it('accepts https', () => {
    expect(parseServiceEntry(withEndpoint('https://api.example.test/v1/chat'), 'x.md')).not.toBeNull();
  });

  it('accepts plain http only to this machine', () => {
    for (const url of ['http://127.0.0.1:8931/v1', 'http://localhost:8931/v1']) {
      expect(parseServiceEntry(withEndpoint(url), 'x.md'), url).not.toBeNull();
    }
  });

  it('refuses plain http to anywhere else', () => {
    // A teacher's material crosses this. And `localhost.evil.example` resolves
    // to somebody else's server, which is why the host match is exact.
    for (const url of ['http://api.example.test/v1', 'http://localhost.evil.example/v1',
                       'http://127.0.0.1.evil.example/v1']) {
      expect(parseServiceEntry(withEndpoint(url), 'x.md'), url).toBeNull();
    }
  });

  it('refuses anything that is not http at all', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.test/x', 'not a url']) {
      expect(parseServiceEntry(withEndpoint(url), 'x.md'), url).toBeNull();
    }
  });
});
