import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { renderRecord, schoolYearOf, type RecordEntry } from '../src/index.js';

/**
 * `record.md` — written for her, read by nobody (014 T009/T010, FR-1212/1213).
 *
 * The second assertion here is the load-bearing one. An application that parsed
 * this file would have made it a second source of truth, which is the defect
 * this whole feature is designed against and which this project has now found
 * four times. So it is asserted over the source rather than trusted to a
 * comment.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    if (e === 'node_modules' || e === 'out' || e === 'dist') return [];
    const p = join(dir, e);
    return statSync(p).isDirectory() ? sources(p) : (/\.tsx?$/.test(p) ? [p] : []);
  });
}

const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({
  jobId: 'job-a', learner: 'E38', date: '2026-05-12',
  schoolYear: schoolYearOf('2026-05-12'), kind: 'worksheet', subject: 'Naturales',
  signedOff: false, revision: 1,
  source: { of: 'file', paths: ['material/job-a/source/p1.jpg'] },
  documents: {
    ir: 'material/job-a/ir.md',
    adapted: 'material/job-a/E38/adapted.md',
    report: 'material/job-a/E38/report.md',
    revisions: [], rendered: [],
  },
  missing: [],
  ...over,
});

describe('the file in her folder', () => {
  it('links resolve from profiles/<code>/ back into the vault', () => {
    const md = renderRecord('E38', [entry()]);
    // Two levels up: profiles/E38/record.md → material/…
    expect(md).toContain('](../../material/job-a/E38/adapted.md)');
    expect(md).toContain('](../../material/job-a/ir.md)');
  });

  /** FR-1207. A plaintext file carrying names would be a second copy of the
   *  encrypted name map without its encryption. */
  it('carries the code and never a name', () => {
    const md = renderRecord('E38', [entry()]);
    expect(md).toContain('E38');
    expect(md).not.toMatch(/Lucía|Mateo/);
  });

  it('says an unsigned sheet is unsigned', () => {
    expect(renderRecord('E38', [entry({ signedOff: false })])).toMatch(/sin firmar/i);
    expect(renderRecord('E38', [entry({ signedOff: true })])).toMatch(/firmado/i);
  });

  it('groups by school year, newest section first', () => {
    const md = renderRecord('E38', [
      entry({ jobId: 'j2', date: '2026-05-12', schoolYear: '2025-2026' }),
      entry({ jobId: 'j1', date: '2024-11-03', schoolYear: '2024-2025' }),
    ]);
    expect(md.indexOf('## 2025-2026')).toBeLessThan(md.indexOf('## 2024-2025'));
  });

  it('says what she pasted was also what Rampa read', () => {
    const md = renderRecord('E38', [entry({ source: { of: 'pasted' } })]);
    expect(md).toMatch(/es también lo que leyó Rampa/);
    expect(md).not.toMatch(/Lo que traje/);
  });

  it('names the objectives for composed material', () => {
    const md = renderRecord('E38', [entry({
      source: { of: 'composed', objectives: ['Multiplicar con llevadas'], anchor: 'MAT.3.A.2.7' },
    })]);
    expect(md).toContain('Multiplicar con llevadas');
    expect(md).toContain('MAT.3.A.2.7');
  });

  it('says what is missing rather than dropping it', () => {
    const md = renderRecord('E38', [entry({ missing: ['material/job-a/ir.md'] })]);
    expect(md).toMatch(/ya no está/);
    expect(md).toContain('material/job-a/ir.md');
  });

  it('tells her, in the file, that Rampa does not read it back', () => {
    expect(renderRecord('E38', [entry()])).toMatch(/no lo lee|no lo vuelve a leer|se vuelve a escribir/i);
  });

  it('has something to say about a learner with nothing yet', () => {
    expect(renderRecord('E38', [])).toMatch(/Todavía no hay nada/);
  });
});

describe('nothing reads it back', () => {
  /**
   * FR-1213/SC-1203, asserted structurally.
   *
   * `record.md` may be written and may be named in a screen that tells her where
   * it is. What must never happen is a **read**: `readRaw('…/record.md')`,
   * `parse`, anything that would let a stale or hand-edited file influence what
   * the application believes.
   */
  it('no source reads record.md', () => {
    const offenders: string[] = [];
    for (const dir of ['packages/core/src', 'packages/shell/src', 'ui/src']) {
      for (const f of sources(join(appRoot, dir))) {
        const src = readFileSync(f, 'utf8');
        // A read of the file by any of the vault's reading verbs.
        if (/\b(readRaw|readDoc|readFile|readBinary)\s*\([^)]*record\.md/.test(src)) {
          offenders.push(f.slice(appRoot.length + 1));
        }
      }
    }
    expect(offenders, 'record.md is written for her, not read by us').toEqual([]);
  });
});
