import { describe, it, expect, vi } from 'vitest';
import { toWire, fromWire, RampaError } from '../src/errors.js';
import { Logger, sanitise, formatLine } from '../src/log.js';

/**
 * The pieces that decide what a teacher sees when something goes wrong, and
 * what ends up in a file she might send to someone.
 */
describe('errors survive the trip to the interface', () => {
  it('keeps the kind, which is what the Spanish mapping matches on', () => {
    const wired = toWire(new RampaError('ir-unverified', 'Comprueba la lectura.'));
    expect(fromWire(wired)).toEqual({ kind: 'ir-unverified', message: 'Comprueba la lectura.' });
  });

  it('survives the prefix Electron adds around a remote call', () => {
    const raw = new Error("Error invoking remote method 'job:adapt': Error: [rampa:key-missing] Falta la clave.");
    expect(fromWire(raw)).toEqual({ kind: 'key-missing', message: 'Falta la clave.' });
  });

  it('degrades to unknown rather than throwing on an ordinary error', () => {
    expect(fromWire(new Error('boom')).kind).toBe('unknown');
    expect(fromWire('boom').kind).toBe('unknown');
  });
});

describe('logs never carry a learner or her material', () => {
  it('omits fields that would hold a name or content', () => {
    const out = sanitise({ name: 'Lucía García', nombre: 'Lucía', texto: 'lo que sea', code: 'A3', ms: 12 });
    expect(out).toEqual({ name: '[omitido]', nombre: '[omitido]', texto: '[omitido]', code: 'A3', ms: 12 });
  });

  it('replaces long free text with its length, since that is material', () => {
    const out = sanitise({ detail: 'x'.repeat(500) })!;
    expect(out['detail']).toBe('[500 caracteres]');
  });

  it('keeps codes, counts and durations, which is what diagnosis needs', () => {
    expect(sanitise({ jobId: '2026-09-04-ab12', recipes: 6, retried: true })).toEqual({
      jobId: '2026-09-04-ab12', recipes: 6, retried: true,
    });
  });

  it('never lets a broken sink take the application down', () => {
    const log = new Logger('debug');
    log.addSink(() => { throw new Error('disk full'); });
    const good = vi.fn();
    log.addSink(good);
    expect(() => log.error('boom')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('respects the level so a packaged build is not chatty', () => {
    const log = new Logger('warn');
    const sink = vi.fn();
    log.addSink(sink);
    log.debug('quiet'); log.info('quiet'); log.warn('loud');
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('formats a line that a person can read', () => {
    const line = formatLine({ at: '2026-09-04T10:00:00.000Z', level: 'error', event: 'ipc.failed', data: { channel: 'job:adapt' } });
    expect(line).toContain('ERROR');
    expect(line).toContain('ipc.failed');
    expect(line).toContain('job:adapt');
  });
});
