import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CredentialStore, type Crypto } from '../src/credentials.js';

/**
 * The credential store (009 T038).
 *
 * The failure worth protecting against is specific and bad: she switches
 * service, the new key fails, and the working one is gone. That happens on a
 * Tuesday, in a 45-minute gap, and it locks her out of the tool entirely.
 *
 * `safeStorage` is injected rather than imported, which is what lets all of this
 * run in the offline suite. The stub below is deliberately not encryption — it
 * only has to be reversible and to be *absent* on demand, because "no keyring
 * available" is a real state on a Linux box and its behaviour matters.
 */
const reversible: Crypto = {
  available: () => true,
  // Reversible and obviously not encryption, so nobody mistakes the test double
  // for a security claim.
  encrypt: (plain) => Buffer.from(plain, 'utf8').reverse(),
  decrypt: (cipher) => Buffer.from(cipher).reverse().toString('utf8'),
};

const unavailable: Crypto = { ...reversible, available: () => false };

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'rampa-cred-')); });

const file = () => join(dir, 'credentials.enc');

describe('migration from the single-key shape', () => {
  it('moves the old key under its service and keeps it active', async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(file(), reversible.encrypt(JSON.stringify({ providerId: 'google', key: 'AIzaOLD' })));

    const store = new CredentialStore(dir, reversible);
    expect(await store.current()).toEqual({ serviceId: 'google', key: 'AIzaOLD' });

    // And rewritten on disk, so it migrates once rather than on every read.
    const onDisk = JSON.parse(reversible.decrypt(await readFile(file())));
    expect(onDisk).toEqual({ active: 'google', keys: { google: { key: 'AIzaOLD', verifiedAt: '' } } });
  });

  it('does not invent a verification date it never had', async () => {
    // The connection screen reports when a key was last checked. Stamping
    // today's date on a key stored before that field existed would put a
    // fabrication on the one screen whose job is to report that fact.
    await writeFile(file(), reversible.encrypt(JSON.stringify({ providerId: 'anthropic', key: 'sk-ant-OLD' })));
    const s = await new CredentialStore(dir, reversible).summary();
    expect(s.connected).toEqual([{ serviceId: 'anthropic', verifiedAt: '' }]);
  });

  it('treats an old file with no key as a first run', async () => {
    await writeFile(file(), reversible.encrypt(JSON.stringify({ providerId: 'google' })));
    expect(await new CredentialStore(dir, reversible).current()).toBeNull();
  });

  it('reads the new shape without touching it', async () => {
    const shape = { active: 'groq', keys: { groq: { key: 'gsk_x', verifiedAt: '2026-08-28' } } };
    await writeFile(file(), reversible.encrypt(JSON.stringify(shape)));
    const before = await readFile(file());
    const store = new CredentialStore(dir, reversible);
    expect(await store.current()).toEqual({ serviceId: 'groq', key: 'gsk_x' });
    expect(await readFile(file())).toEqual(before);
  });
});

describe('one key per service', () => {
  it('keeps both when she connects a second service', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    await store.put('anthropic', 'sk-ant-2', '2026-08-28');

    const s = await store.summary();
    expect(s.active).toBe('anthropic');
    expect(s.connected.map((c) => c.serviceId).sort()).toEqual(['anthropic', 'google']);
    // The one she had still works, which is the entire point of the migration.
    expect((await store.load()).keys['google']!.key).toBe('AIza1');
  });

  it('switches back without asking for the key again', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    await store.put('groq', 'gsk_2', '2026-08-28');

    expect(await store.activate('google')).toBe(true);
    expect(await store.current()).toEqual({ serviceId: 'google', key: 'AIza1' });
  });

  it('refuses to activate a service she has not connected', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    expect(await store.activate('deepseek')).toBe(false);
    expect((await store.current())!.serviceId).toBe('google');
  });

  it('replacing a key for the same service does not touch the others', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    await store.put('anthropic', 'sk-ant-1', '2026-08-01');
    await store.put('google', 'AIza2', '2026-08-28');

    const c = await store.load();
    expect(c.keys['google']).toEqual({ key: 'AIza2', verifiedAt: '2026-08-28' });
    expect(c.keys['anthropic']).toEqual({ key: 'sk-ant-1', verifiedAt: '2026-08-01' });
  });

  it('moves active on when she forgets the active service', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    await store.put('groq', 'gsk_2', '2026-08-28');
    await store.forget('groq');

    expect((await store.summary()).active).toBe('google');
    expect(await store.current()).toEqual({ serviceId: 'google', key: 'AIza1' });
  });

  it('is empty, not broken, when she forgets the only one', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza1', '2026-08-01');
    await store.forget('google');
    expect(await store.current()).toBeNull();
    expect((await store.summary()).active).toBeNull();
  });
});

describe('a failed replacement is not destructive (FR-730)', () => {
  it('leaves the previous key working, by construction', async () => {
    /*
     * There is no "rollback" here to test, and that is the design: `put` does
     * not validate and is only reached after validation succeeds, so a failed
     * validation simply never calls it. The assertion is that nothing in the
     * store can be reached by a failure path.
     */
    const store = new CredentialStore(dir, reversible);
    await store.put('google', 'AIza-good', '2026-08-01');

    // Simulate the failed attempt exactly as the screen does it: validate,
    // and on failure do not call `put`.
    const validate = async (_k: string) => ({ ok: false });
    const attempt = await validate('sk-ant-bad');
    if (attempt.ok) await store.put('anthropic', 'sk-ant-bad', '2026-08-28');

    expect(await store.current()).toEqual({ serviceId: 'google', key: 'AIza-good' });
    expect((await store.summary()).connected).toHaveLength(1);
  });
});

describe('what the screen may see (FR-729)', () => {
  it('never hands the key to the renderer', async () => {
    const store = new CredentialStore(dir, reversible);
    await store.put('anthropic', 'sk-ant-SECRET', '2026-08-28');
    const s = await store.summary();
    expect(JSON.stringify(s)).not.toContain('SECRET');
    expect(s.connected[0]).toEqual({ serviceId: 'anthropic', verifiedAt: '2026-08-28' });
  });
});

describe('it fails safe rather than throwing', () => {
  it('reads a corrupt file as a first run', async () => {
    await writeFile(file(), Buffer.from('not even close to valid'));
    expect(await new CredentialStore(dir, reversible).current()).toBeNull();
  });

  it('reads a file it cannot decrypt as a first run', async () => {
    await writeFile(file(), reversible.encrypt('{"keys":'));
    expect(await new CredentialStore(dir, reversible).current()).toBeNull();
  });

  it('discards a keys entry that is not a key', async () => {
    await writeFile(file(), reversible.encrypt(JSON.stringify({
      active: 'google', keys: { google: 'just a string', groq: { key: 'gsk_ok' } },
    })));
    const c = await new CredentialStore(dir, reversible).load();
    expect(Object.keys(c.keys)).toEqual(['groq']);
    // `active` pointed at the entry that was discarded, so it moves to the one
    // that survived rather than pointing at nothing.
    expect(c.active).toBe('groq');
  });

  it('keeps the key in memory when the OS offers no keyring', async () => {
    // A Linux box with no keyring. Writing the credential in the clear would be
    // worse than asking for it again tomorrow.
    const store = new CredentialStore(dir, unavailable);
    await store.put('google', 'AIza1', '2026-08-28');
    expect(await store.current()).toEqual({ serviceId: 'google', key: 'AIza1' });
    await expect(readFile(file())).rejects.toThrow();
  });
});
